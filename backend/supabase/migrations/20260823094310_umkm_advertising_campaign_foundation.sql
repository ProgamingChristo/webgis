-- Create ad_campaigns table
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  name text NOT NULL,
  description text,
  status text NOT NULL CHECK (status IN ('DRAFT', 'CANCELLED')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_merchant_id ON public.ad_campaigns(merchant_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_created_by ON public.ad_campaigns(created_by);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(status);

-- RLS Policies

-- 1. Merchant owner can select their own campaigns
CREATE POLICY "Merchant owners can view their campaigns" ON public.ad_campaigns
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.id = ad_campaigns.merchant_id 
      AND merchants.owner_id = auth.uid()
    )
  );

-- 2. Insert is guarded by backend API (Service Role or strict Auth checks). 
-- If we want RLS level insert protection:
CREATE POLICY "Merchant owners can create campaigns" ON public.ad_campaigns
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.id = ad_campaigns.merchant_id 
      AND merchants.owner_id = auth.uid()
    )
    AND created_by = auth.uid()
  );

-- 3. Update is allowed for merchant owners
CREATE POLICY "Merchant owners can update their campaigns" ON public.ad_campaigns
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.id = ad_campaigns.merchant_id 
      AND merchants.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchants 
      WHERE merchants.id = ad_campaigns.merchant_id 
      AND merchants.owner_id = auth.uid()
    )
  );

-- Function to auto update `updated_at` column
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_ad_campaigns_updated_at
BEFORE UPDATE ON public.ad_campaigns
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();
