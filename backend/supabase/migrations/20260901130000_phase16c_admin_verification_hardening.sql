-- Migration: 20260901130000_phase16c_admin_verification_hardening.sql
-- Phase 16C: Admin Verification, Idempotency, Competing Claims Adjudication, and Verified Owner Profile Updates

-- 1. Hardened approve_merchant_submission with idempotency
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
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency guard: retry or double-click on already-approved submission
  IF submission_record.status = 'APPROVED' AND submission_record.canonical_merchant_id IS NOT NULL THEN
    RETURN submission_record.canonical_merchant_id;
  END IF;

  IF submission_record.status <> 'PENDING_REVIEW' THEN
    RAISE EXCEPTION 'Only pending submissions can be approved' USING ERRCODE = '22023';
  END IF;
  IF submission_record.submitted_by = reviewer_id THEN
    RAISE EXCEPTION 'Self approval is not allowed' USING ERRCODE = '42501';
  END IF;

  -- Create canonical merchant with published status and verified ownership
  INSERT INTO public.merchants (
    name, description, address, location, opening_hours, owner_id,
    publish_status, verification_status, price_level, metadata
  ) VALUES (
    submission_record.name,
    submission_record.description,
    submission_record.address,
    submission_record.location,
    submission_record.opening_hours,
    submission_record.submitted_by,
    'PUBLISHED',
    'VERIFIED',
    submission_record.business_info->>'price_range',
    jsonb_build_object(
      'submitted_from_id', submission_record.id,
      'approved_by', reviewer_id,
      'approved_at', now(),
      'category_label', submission_record.category,
      'public_media', submission_record.public_media,
      'business_info', submission_record.business_info
    )
  ) RETURNING id INTO merchant_id;

  -- Update submission status to APPROVED
  UPDATE public.merchant_submissions
  SET status = 'APPROVED',
      canonical_merchant_id = merchant_id,
      reviewed_by = reviewer_id,
      reviewed_at = now(),
      review_note = COALESCE(NULLIF(btrim(p_review_note), ''), 'Disetujui oleh admin.')
  WHERE id = p_submission_id;

  -- Audit trail
  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES
    ('MERCHANT_SUBMISSION_APPROVED', reviewer_id, 'merchant_submission', p_submission_id,
      jsonb_build_object('merchant_id', merchant_id, 'claimant_id', submission_record.submitted_by)),
    ('MERCHANT_OWNERSHIP_ACTIVATED', reviewer_id, 'merchant', merchant_id,
      jsonb_build_object('owner_id', submission_record.submitted_by, 'submission_id', p_submission_id));

  RETURN merchant_id;
END;
$$;

-- 2. Hardened approve_merchant_claim with idempotency
CREATE OR REPLACE FUNCTION public.approve_merchant_claim(
  claim_id uuid,
  review_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reviewer_id uuid := auth.uid();
  claim_record public.merchant_claims%ROWTYPE;
  current_owner_id uuid;
  previous_verification text;
BEGIN
  IF reviewer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = reviewer_id AND account_role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Admin authorization required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO claim_record
  FROM public.merchant_claims WHERE id = claim_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Claim not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency guard: if already approved, return merchant_id
  IF claim_record.status = 'APPROVED' THEN
    RETURN claim_record.merchant_id;
  END IF;

  IF claim_record.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending claims can be approved' USING ERRCODE = '22023';
  END IF;
  IF claim_record.user_id = reviewer_id THEN
    RAISE EXCEPTION 'Self approval is not allowed' USING ERRCODE = '42501';
  END IF;

  SELECT owner_id, verification_status INTO current_owner_id, previous_verification
  FROM public.merchants WHERE id = claim_record.merchant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found' USING ERRCODE = 'P0002';
  END IF;
  IF current_owner_id IS NOT NULL AND current_owner_id <> claim_record.user_id THEN
    RAISE EXCEPTION 'Merchant already has an active owner' USING ERRCODE = '23505';
  END IF;

  -- Attach verified ownership to existing canonical merchant without altering canonical identity
  UPDATE public.merchants
  SET owner_id = claim_record.user_id,
      verification_status = CASE
        WHEN verification_status IN ('UNVERIFIED', 'SURVEYED') THEN 'VERIFIED'
        ELSE verification_status
      END,
      updated_at = now()
  WHERE id = claim_record.merchant_id;

  -- Mark claim as APPROVED
  UPDATE public.merchant_claims
  SET status = 'APPROVED', reviewed_by = reviewer_id, reviewed_at = now(),
      note = COALESCE(NULLIF(btrim(review_note), ''), note)
  WHERE id = claim_id;

  -- Multi-claim adjudication: deterministically close competing pending claims
  UPDATE public.merchant_claims
  SET status = 'REJECTED', reviewed_by = reviewer_id, reviewed_at = now(),
      note = COALESCE(note, 'Klaim lain telah disetujui admin.')
  WHERE merchant_id = claim_record.merchant_id AND id <> claim_id AND status = 'PENDING';

  -- Audit trail
  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES
    ('MERCHANT_CLAIM_APPROVED', reviewer_id, 'merchant_claim', claim_id,
      jsonb_build_object('merchant_id', claim_record.merchant_id, 'claimant_id', claim_record.user_id)),
    ('MERCHANT_OWNERSHIP_ACTIVATED', reviewer_id, 'merchant', claim_record.merchant_id,
      jsonb_build_object('owner_id', claim_record.user_id, 'claim_id', claim_id));

  IF previous_verification IN ('UNVERIFIED', 'SURVEYED') THEN
    INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
    VALUES ('MERCHANT_VERIFIED', reviewer_id, 'merchant', claim_record.merchant_id,
            jsonb_build_object('claim_id', claim_id));
  END IF;

  RETURN claim_record.merchant_id;
END;
$$;

-- 3. Verified owner profile update: restricted to whitelisted non-GIS, non-provenance fields
CREATE OR REPLACE FUNCTION public.update_owned_merchant_profile(
  p_merchant_id uuid,
  p_description text DEFAULT NULL,
  p_opening_hours jsonb DEFAULT NULL,
  p_metadata_patch jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  caller_id uuid := auth.uid();
  merchant_row public.merchants%ROWTYPE;
  clean_metadata jsonb;
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO merchant_row
  FROM public.merchants
  WHERE id = p_merchant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found' USING ERRCODE = 'P0002';
  END IF;

  IF merchant_row.owner_id IS DISTINCT FROM caller_id THEN
    RAISE EXCEPTION 'Only the verified owner can edit merchant profile' USING ERRCODE = '42501';
  END IF;

  -- Prepare safe metadata patch: strip any attempt to overwrite provenance or system keys
  clean_metadata := COALESCE(merchant_row.metadata, '{}'::jsonb);
  IF p_metadata_patch IS NOT NULL AND jsonb_typeof(p_metadata_patch) = 'object' THEN
    clean_metadata := clean_metadata || (
      p_metadata_patch - 'submitted_from_id' - 'approved_by' - 'approved_at' - 'sources' - 'provenance'
    );
  END IF;

  UPDATE public.merchants
  SET description = COALESCE(p_description, description),
      opening_hours = COALESCE(p_opening_hours, opening_hours),
      metadata = clean_metadata,
      updated_at = now()
  WHERE id = p_merchant_id;

  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES (
    'MERCHANT_PROFILE_UPDATED_BY_OWNER',
    caller_id,
    'merchant',
    p_merchant_id,
    jsonb_build_object(
      'description_updated', p_description IS NOT NULL,
      'opening_hours_updated', p_opening_hours IS NOT NULL,
      'metadata_updated', p_metadata_patch IS NOT NULL
    )
  );

  RETURN jsonb_build_object(
    'merchant_id', p_merchant_id,
    'status', 'UPDATED'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.update_owned_merchant_profile(uuid, text, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_owned_merchant_profile(uuid, text, jsonb, jsonb) TO authenticated;
