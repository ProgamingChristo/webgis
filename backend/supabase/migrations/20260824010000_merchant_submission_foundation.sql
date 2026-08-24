-- Migration: Merchant Submission Foundation (Phase 11B)
-- Creates public.merchant_submissions table with workflow statuses and RLS

CREATE TABLE IF NOT EXISTS public.merchant_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  description text,
  address text,
  location extensions.geometry(Point, 4326) NOT NULL,
  opening_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  image_url text,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
  canonical_merchant_id uuid REFERENCES public.merchants(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT chk_merchant_submissions_name_nonempty CHECK (btrim(name) <> ''),
  CONSTRAINT chk_merchant_submissions_category_nonempty CHECK (btrim(category) <> ''),
  CONSTRAINT chk_merchant_submissions_opening_hours_object CHECK (jsonb_typeof(opening_hours) = 'object')
);

-- Indexes for performance and spatial querying
CREATE INDEX IF NOT EXISTS idx_merchant_submissions_submitted_by
  ON public.merchant_submissions(submitted_by);

CREATE INDEX IF NOT EXISTS idx_merchant_submissions_status
  ON public.merchant_submissions(status);

CREATE INDEX IF NOT EXISTS idx_merchant_submissions_canonical_merchant
  ON public.merchant_submissions(canonical_merchant_id);

CREATE INDEX IF NOT EXISTS idx_merchant_submissions_location_gist
  ON public.merchant_submissions USING gist(location);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_merchant_submissions_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_merchant_submissions_updated_at ON public.merchant_submissions;
CREATE TRIGGER trg_merchant_submissions_updated_at
  BEFORE UPDATE ON public.merchant_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_merchant_submissions_updated_at();

-- Enable RLS
ALTER TABLE public.merchant_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- 1. Users can select their own submissions
CREATE POLICY "Users can view own merchant submissions" ON public.merchant_submissions
  FOR SELECT
  USING (submitted_by = auth.uid());

-- 2. Users can insert their own draft/pending submissions
CREATE POLICY "Users can create draft merchant submissions" ON public.merchant_submissions
  FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND status IN ('DRAFT', 'PENDING_REVIEW')
  );

-- 3. Users can update their own DRAFT submissions
CREATE POLICY "Users can update own draft merchant submissions" ON public.merchant_submissions
  FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status = 'DRAFT'
  )
  WITH CHECK (
    submitted_by = auth.uid()
    AND status IN ('DRAFT', 'PENDING_REVIEW')
  );

-- 4. Users can cancel their PENDING submissions
CREATE POLICY "Users can cancel pending merchant submissions" ON public.merchant_submissions
  FOR UPDATE
  USING (
    submitted_by = auth.uid()
    AND status = 'PENDING_REVIEW'
  )
  WITH CHECK (
    submitted_by = auth.uid()
    AND status = 'CANCELLED'
  );
