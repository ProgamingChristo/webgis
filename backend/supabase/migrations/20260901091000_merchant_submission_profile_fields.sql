-- Structured profile fields for new merchant registration.
-- Public media remains separate from private merchant_claims.evidence.

ALTER TABLE public.merchant_submissions
  ADD COLUMN IF NOT EXISTS public_media jsonb NOT NULL DEFAULT '{"menu_urls":[],"product_urls":[]}'::jsonb,
  ADD COLUMN IF NOT EXISTS business_info jsonb NOT NULL DEFAULT '{"payment_methods":[]}'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_submissions_public_media_object') THEN
    ALTER TABLE public.merchant_submissions
      ADD CONSTRAINT merchant_submissions_public_media_object
      CHECK (jsonb_typeof(public_media) = 'object');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'merchant_submissions_business_info_object') THEN
    ALTER TABLE public.merchant_submissions
      ADD CONSTRAINT merchant_submissions_business_info_object
      CHECK (jsonb_typeof(business_info) = 'object');
  END IF;
END
$$;

COMMENT ON COLUMN public.merchant_submissions.public_media IS
  'Public merchant profile media only. Ownership evidence belongs in private merchant_claims.evidence.';
COMMENT ON COLUMN public.merchant_submissions.business_info IS
  'Structured registration profile information such as contact, price range, and payment methods.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'merchant_submissions'
      AND policyname = 'Admins can review merchant submissions'
  ) THEN
    CREATE POLICY "Admins can review merchant submissions"
      ON public.merchant_submissions FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND account_role = 'ADMIN'
      ));
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.approve_merchant_submission(
  p_submission_id uuid,
  p_review_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reviewer_id uuid := auth.uid();
  submission_record public.merchant_submissions%ROWTYPE;
  merchant_id uuid;
BEGIN
  IF reviewer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = reviewer_id AND account_role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Admin authorization required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO submission_record
  FROM public.merchant_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002'; END IF;
  IF submission_record.status <> 'PENDING_REVIEW' THEN
    RAISE EXCEPTION 'Only pending submissions can be approved' USING ERRCODE = '22023';
  END IF;
  IF submission_record.submitted_by = reviewer_id THEN
    RAISE EXCEPTION 'Self approval is not allowed' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.merchants (
    name, description, address, location, opening_hours, owner_id,
    publish_status, verification_status, price_level, metadata
  ) VALUES (
    submission_record.name, submission_record.description, submission_record.address,
    submission_record.location, submission_record.opening_hours, submission_record.submitted_by,
    'PUBLISHED', 'VERIFIED', submission_record.business_info->>'price_range',
    jsonb_build_object(
      'submitted_from_id', submission_record.id,
      'approved_by', reviewer_id,
      'approved_at', now(),
      'category_label', submission_record.category,
      'public_media', submission_record.public_media,
      'business_info', submission_record.business_info
    )
  ) RETURNING id INTO merchant_id;

  UPDATE public.merchant_submissions
  SET status = 'APPROVED', canonical_merchant_id = merchant_id,
      reviewed_by = reviewer_id, reviewed_at = now(),
      review_note = COALESCE(NULLIF(btrim(p_review_note), ''), 'Disetujui oleh admin.')
  WHERE id = p_submission_id;

  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES
    ('MERCHANT_SUBMISSION_APPROVED', reviewer_id, 'merchant_submission', p_submission_id,
      jsonb_build_object('merchant_id', merchant_id, 'claimant_id', submission_record.submitted_by)),
    ('MERCHANT_OWNERSHIP_ACTIVATED', reviewer_id, 'merchant', merchant_id,
      jsonb_build_object('owner_id', submission_record.submitted_by, 'submission_id', p_submission_id));
  RETURN merchant_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_merchant_submission(
  p_submission_id uuid,
  p_review_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reviewer_id uuid := auth.uid();
  submission_record public.merchant_submissions%ROWTYPE;
BEGIN
  IF reviewer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = reviewer_id AND account_role = 'ADMIN'
  ) THEN RAISE EXCEPTION 'Admin authorization required' USING ERRCODE = '42501'; END IF;
  IF length(btrim(COALESCE(p_review_note, ''))) < 3 THEN
    RAISE EXCEPTION 'Review note is required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO submission_record FROM public.merchant_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002'; END IF;
  IF submission_record.status <> 'PENDING_REVIEW' THEN
    RAISE EXCEPTION 'Only pending submissions can be rejected' USING ERRCODE = '22023';
  END IF;
  IF submission_record.submitted_by = reviewer_id THEN
    RAISE EXCEPTION 'Self review is not allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE public.merchant_submissions
  SET status = 'REJECTED', reviewed_by = reviewer_id, reviewed_at = now(), review_note = btrim(p_review_note)
  WHERE id = p_submission_id;
  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES ('MERCHANT_SUBMISSION_REJECTED', reviewer_id, 'merchant_submission', p_submission_id,
          jsonb_build_object('claimant_id', submission_record.submitted_by));
  RETURN p_submission_id;
END;
$$;

REVOKE ALL ON FUNCTION public.approve_merchant_submission(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_merchant_submission(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_merchant_submission(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_merchant_submission(uuid, text) TO authenticated;
