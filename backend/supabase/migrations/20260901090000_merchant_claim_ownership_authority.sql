-- Merchant claim ownership authority
-- Claims are private review history; merchants.owner_id is the canonical active authority.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type type_record
    JOIN pg_namespace namespace_record ON namespace_record.oid = type_record.typnamespace
    WHERE type_record.typname = 'merchant_claim_status'
      AND namespace_record.nspname = 'public'
  ) THEN
    CREATE TYPE public.merchant_claim_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.merchant_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status public.merchant_claim_status NOT NULL DEFAULT 'PENDING',
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  note text,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT merchant_claims_evidence_object CHECK (jsonb_typeof(evidence) = 'object')
);

ALTER TABLE public.merchant_claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'merchant_claims'
      AND policyname = 'Claimants can read own merchant claims'
  ) THEN
    CREATE POLICY "Claimants can read own merchant claims"
      ON public.merchant_claims FOR SELECT
      USING (user_id = (SELECT auth.uid()));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'merchant_claims'
      AND policyname = 'Admins can review merchant claims'
  ) THEN
    CREATE POLICY "Admins can review merchant claims"
      ON public.merchant_claims FOR SELECT
      USING (EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (SELECT auth.uid()) AND account_role = 'ADMIN'
      ));
  END IF;
END
$$;

-- Deterministically close duplicate pending requests before enforcing uniqueness.
WITH ranked_pending AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, merchant_id
           ORDER BY created_at DESC, id DESC
         ) AS pending_rank
  FROM public.merchant_claims
  WHERE status = 'PENDING'
)
UPDATE public.merchant_claims claim
SET status = 'REJECTED',
    reviewed_at = COALESCE(claim.reviewed_at, now()),
    note = COALESCE(claim.note, 'Duplikat pengajuan pending ditutup saat rekonsiliasi.')
FROM ranked_pending ranked
WHERE claim.id = ranked.id AND ranked.pending_rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS merchant_claims_one_pending_per_claimant
  ON public.merchant_claims(user_id, merchant_id)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS merchant_claims_merchant_status_idx
  ON public.merchant_claims(merchant_id, status);

REVOKE INSERT, UPDATE, DELETE ON public.merchant_claims FROM authenticated;
GRANT SELECT ON public.merchant_claims TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_merchant_claim(
  p_merchant_id uuid,
  p_evidence jsonb,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  claimant_id uuid := auth.uid();
  existing_claim_id uuid;
  new_claim_id uuid;
  current_owner_id uuid;
BEGIN
  IF claimant_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_evidence IS NULL OR jsonb_typeof(p_evidence) <> 'object'
     OR length(btrim(COALESCE(p_evidence->>'statement', ''))) < 20 THEN
    RAISE EXCEPTION 'Ownership evidence is incomplete' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(claimant_id::text || ':' || p_merchant_id::text, 0));
  SELECT owner_id INTO current_owner_id
  FROM public.merchants WHERE id = p_merchant_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Merchant not found' USING ERRCODE = 'P0002';
  END IF;
  IF current_owner_id = claimant_id THEN
    RAISE EXCEPTION 'Merchant is already owned by claimant' USING ERRCODE = '23505';
  END IF;

  SELECT id INTO existing_claim_id
  FROM public.merchant_claims
  WHERE user_id = claimant_id AND merchant_id = p_merchant_id AND status = 'PENDING'
  ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF existing_claim_id IS NOT NULL THEN
    RETURN existing_claim_id;
  END IF;

  INSERT INTO public.merchant_claims (merchant_id, user_id, status, evidence, note)
  VALUES (p_merchant_id, claimant_id, 'PENDING', p_evidence, NULLIF(btrim(p_note), ''))
  RETURNING id INTO new_claim_id;

  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES ('MERCHANT_CLAIM_SUBMITTED', claimant_id, 'merchant_claim', new_claim_id,
          jsonb_build_object('merchant_id', p_merchant_id));
  RETURN new_claim_id;
END;
$$;

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

  UPDATE public.merchants
  SET owner_id = claim_record.user_id,
      verification_status = CASE
        WHEN verification_status IN ('UNVERIFIED', 'SURVEYED') THEN 'VERIFIED'
        ELSE verification_status
      END,
      updated_at = now()
  WHERE id = claim_record.merchant_id;

  UPDATE public.merchant_claims
  SET status = 'APPROVED', reviewed_by = reviewer_id, reviewed_at = now(),
      note = COALESCE(NULLIF(btrim(review_note), ''), note)
  WHERE id = claim_id;

  UPDATE public.merchant_claims
  SET status = 'REJECTED', reviewed_by = reviewer_id, reviewed_at = now(),
      note = COALESCE(note, 'Merchant telah memiliki ownership aktif.')
  WHERE merchant_id = claim_record.merchant_id AND id <> claim_id AND status = 'PENDING';

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

CREATE OR REPLACE FUNCTION public.reject_merchant_claim(
  claim_id uuid,
  review_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  reviewer_id uuid := auth.uid();
  claim_record public.merchant_claims%ROWTYPE;
BEGIN
  IF reviewer_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = reviewer_id AND account_role = 'ADMIN'
  ) THEN
    RAISE EXCEPTION 'Admin authorization required' USING ERRCODE = '42501';
  END IF;
  IF length(btrim(COALESCE(review_note, ''))) < 3 THEN
    RAISE EXCEPTION 'Review note is required' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO claim_record FROM public.merchant_claims WHERE id = claim_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Claim not found' USING ERRCODE = 'P0002'; END IF;
  IF claim_record.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Only pending claims can be rejected' USING ERRCODE = '22023';
  END IF;
  IF claim_record.user_id = reviewer_id THEN
    RAISE EXCEPTION 'Self review is not allowed' USING ERRCODE = '42501';
  END IF;

  UPDATE public.merchant_claims
  SET status = 'REJECTED', reviewed_by = reviewer_id, reviewed_at = now(), note = btrim(review_note)
  WHERE id = claim_id;
  INSERT INTO public.audit_events (action, actor_id, entity_type, entity_id, metadata)
  VALUES ('MERCHANT_CLAIM_REJECTED', reviewer_id, 'merchant_claim', claim_id,
          jsonb_build_object('merchant_id', claim_record.merchant_id, 'claimant_id', claim_record.user_id));
  RETURN claim_record.merchant_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_merchant_claim(uuid, jsonb, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_merchant_claim(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.reject_merchant_claim(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_merchant_claim(uuid, jsonb, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_merchant_claim(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_merchant_claim(uuid, text) TO authenticated;

-- Repair only deterministic historical cases. Conflicts are recorded for manual review.
WITH approved_owner_candidates AS (
  SELECT merchant_id, min(user_id::text)::uuid AS claimant_id,
         count(DISTINCT user_id) AS claimant_count
  FROM public.merchant_claims WHERE status = 'APPROVED' GROUP BY merchant_id
), repaired AS (
  UPDATE public.merchants merchant
  SET owner_id = candidate.claimant_id, updated_at = now()
  FROM approved_owner_candidates candidate
  WHERE merchant.id = candidate.merchant_id
    AND merchant.owner_id IS NULL AND candidate.claimant_count = 1
  RETURNING merchant.id, candidate.claimant_id
)
INSERT INTO public.audit_events (action, entity_type, entity_id, metadata)
SELECT 'MERCHANT_OWNERSHIP_RECONCILED', 'merchant', id, jsonb_build_object('owner_id', claimant_id)
FROM repaired;

INSERT INTO public.audit_events (action, entity_type, entity_id, metadata)
SELECT 'MERCHANT_OWNERSHIP_RECONCILIATION_REQUIRED', 'merchant', merchant.id,
       jsonb_build_object('current_owner_id', merchant.owner_id, 'approved_claimants', candidate.claimants)
FROM public.merchants merchant
JOIN (
  SELECT merchant_id, jsonb_agg(DISTINCT user_id) AS claimants, count(DISTINCT user_id) AS claimant_count
  FROM public.merchant_claims WHERE status = 'APPROVED' GROUP BY merchant_id
) candidate ON candidate.merchant_id = merchant.id
WHERE candidate.claimant_count > 1
   OR (merchant.owner_id IS NOT NULL AND NOT (candidate.claimants ? merchant.owner_id::text));
