ALTER TABLE public.profiles
  ALTER COLUMN trust_score SET DEFAULT 50;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_trust_score_range'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_trust_score_range
      CHECK (trust_score BETWEEN 0 AND 100);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_contributions_author_status_reviewed
  ON public.community_contributions (author_id, status, reviewed_at DESC, id DESC)
  WHERE status IN ('APPROVED', 'REJECTED');

CREATE OR REPLACE FUNCTION public.calculate_community_contribution_trust_score_v1(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  trust_score INTEGER,
  reviewed_contributions INTEGER,
  approved_contributions INTEGER,
  rejected_contributions INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH stats AS (
    SELECT
      p_user_id AS user_id,
      COUNT(*) FILTER (WHERE contribution.status IN ('APPROVED', 'REJECTED'))::INTEGER
        AS reviewed_contributions,
      COUNT(*) FILTER (WHERE contribution.status = 'APPROVED')::INTEGER
        AS approved_contributions,
      COUNT(*) FILTER (WHERE contribution.status = 'REJECTED')::INTEGER
        AS rejected_contributions
    FROM public.community_contributions AS contribution
    WHERE contribution.author_id = p_user_id
  )
  SELECT
    stats.user_id,
    CASE
      WHEN stats.reviewed_contributions = 0 THEN 50
      ELSE LEAST(
        100,
        GREATEST(
          0,
          ROUND(
            100::NUMERIC * (stats.approved_contributions + 1)
              / (stats.approved_contributions + stats.rejected_contributions + 2)
          )::INTEGER
        )
      )
    END AS trust_score,
    stats.reviewed_contributions,
    stats.approved_contributions,
    stats.rejected_contributions
  FROM stats;
$$;

CREATE OR REPLACE FUNCTION public.recalculate_community_contribution_trust_score_v1(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  trust_score INTEGER,
  reviewed_contributions INTEGER,
  approved_contributions INTEGER,
  rejected_contributions INTEGER
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculation RECORD;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'GETRA_TRUST_USER_REQUIRED' USING ERRCODE = '23514';
  END IF;

  SELECT *
  INTO calculation
  FROM public.calculate_community_contribution_trust_score_v1(p_user_id)
  LIMIT 1;

  UPDATE public.profiles
  SET trust_score = calculation.trust_score
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'GETRA_TRUST_PROFILE_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  RETURN QUERY
  SELECT
    calculation.user_id::UUID,
    calculation.trust_score::INTEGER,
    calculation.reviewed_contributions::INTEGER,
    calculation.approved_contributions::INTEGER,
    calculation.rejected_contributions::INTEGER;
END;
$$;

DROP FUNCTION IF EXISTS public.get_community_contribution_summary_v1();

CREATE OR REPLACE FUNCTION public.get_community_contribution_summary_v1()
RETURNS TABLE (
  total_contributions INTEGER,
  pending_count INTEGER,
  approved_count INTEGER,
  rejected_count INTEGER,
  contribution_points INTEGER,
  trust_score INTEGER,
  reviewed_contributions INTEGER,
  trust_approved_contributions INTEGER,
  trust_rejected_contributions INTEGER
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH own_contributions AS (
    SELECT status
    FROM public.community_contributions
    WHERE author_id = auth.uid()
  ),
  own_points AS (
    SELECT COALESCE(SUM(points), 0)::INTEGER AS contribution_points
    FROM public.community_contribution_point_events
    WHERE user_id = auth.uid()
  ),
  trust AS (
    SELECT *
    FROM public.calculate_community_contribution_trust_score_v1(auth.uid())
  )
  SELECT
    count(own_contributions.*)::INTEGER AS total_contributions,
    count(*) FILTER (WHERE own_contributions.status = 'PENDING')::INTEGER AS pending_count,
    count(*) FILTER (WHERE own_contributions.status = 'APPROVED')::INTEGER AS approved_count,
    count(*) FILTER (WHERE own_contributions.status = 'REJECTED')::INTEGER AS rejected_count,
    COALESCE(own_points.contribution_points, 0)::INTEGER AS contribution_points,
    COALESCE(trust.trust_score, 50)::INTEGER AS trust_score,
    COALESCE(trust.reviewed_contributions, 0)::INTEGER AS reviewed_contributions,
    COALESCE(trust.approved_contributions, 0)::INTEGER AS trust_approved_contributions,
    COALESCE(trust.rejected_contributions, 0)::INTEGER AS trust_rejected_contributions
  FROM own_points
  CROSS JOIN trust
  LEFT JOIN own_contributions ON TRUE
  GROUP BY
    own_points.contribution_points,
    trust.trust_score,
    trust.reviewed_contributions,
    trust.approved_contributions,
    trust.rejected_contributions;
$$;

CREATE OR REPLACE FUNCTION public.review_community_contribution_v1(
  p_contribution_id UUID,
  p_action TEXT,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author_display_name TEXT,
  author_avatar_url TEXT,
  report_type TEXT,
  status TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  observed_at TIMESTAMPTZ,
  report_data JSONB,
  target_merchant_id UUID,
  target_name TEXT,
  reported_new_longitude DOUBLE PRECISION,
  reported_new_latitude DOUBLE PRECISION,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  points_awarded INTEGER
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
DECLARE
  reviewer_id UUID;
  target_contribution public.community_contributions%ROWTYPE;
  normalized_action TEXT := UPPER(BTRIM(COALESCE(p_action, '')));
  normalized_reason TEXT := NULLIF(UPPER(BTRIM(COALESCE(p_rejection_reason, ''))), '');
  awarded_points INTEGER := 0;
BEGIN
  reviewer_id := public.assert_community_contribution_admin_v1();

  IF normalized_action NOT IN ('APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid moderation action' USING ERRCODE = '22023';
  END IF;

  IF normalized_action = 'APPROVED' AND normalized_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Approved contributions cannot include a rejection reason' USING ERRCODE = '22023';
  END IF;

  IF normalized_action = 'REJECTED' AND normalized_reason NOT IN (
    'DUPLICATE',
    'INSUFFICIENT_INFORMATION',
    'INVALID_LOCATION',
    'INVALID_TARGET',
    'OUTDATED_INFORMATION',
    'OTHER'
  ) THEN
    RAISE EXCEPTION 'Invalid rejection reason' USING ERRCODE = '22023';
  END IF;

  SELECT *
  INTO target_contribution
  FROM public.community_contributions
  WHERE community_contributions.id = p_contribution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution not found' USING ERRCODE = 'P0002';
  END IF;

  IF target_contribution.author_id = reviewer_id THEN
    RAISE EXCEPTION 'GETRA_SELF_REVIEW_FORBIDDEN' USING ERRCODE = '42501';
  END IF;

  IF target_contribution.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Contribution has already been reviewed' USING ERRCODE = '23505';
  END IF;

  UPDATE public.community_contributions
  SET
    status = normalized_action,
    reviewed_by = reviewer_id,
    reviewed_at = statement_timestamp(),
    review_reason = CASE
      WHEN normalized_action = 'REJECTED' THEN normalized_reason
      ELSE NULL
    END
  WHERE community_contributions.id = p_contribution_id
    AND community_contributions.status = 'PENDING'
  RETURNING * INTO target_contribution;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Contribution has already been reviewed' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.community_contribution_moderation_events (
    contribution_id,
    reviewer_id,
    previous_status,
    new_status,
    reason
  )
  VALUES (
    target_contribution.id,
    reviewer_id,
    'PENDING',
    normalized_action,
    CASE WHEN normalized_action = 'REJECTED' THEN normalized_reason ELSE NULL END
  );

  IF normalized_action = 'APPROVED' THEN
    SELECT point_result.points
    INTO awarded_points
    FROM public.award_community_contribution_points_v1(target_contribution.id) AS point_result
    LIMIT 1;
  END IF;

  PERFORM public.recalculate_community_contribution_trust_score_v1(
    target_contribution.author_id
  );

  PERFORM public.community_create_notification(
    target_contribution.author_id,
    reviewer_id,
    CASE
      WHEN normalized_action = 'APPROVED'
        THEN 'CONTRIBUTION_APPROVED'
      ELSE 'CONTRIBUTION_REJECTED'
    END,
    'COMMUNITY_CONTRIBUTION',
    target_contribution.id,
    jsonb_build_object(
      'status', normalized_action,
      'review_reason', CASE
        WHEN normalized_action = 'REJECTED' THEN normalized_reason
        ELSE NULL
      END,
      'points_awarded', awarded_points
    )
  );

  RETURN QUERY
  SELECT *
  FROM public.get_community_contribution_moderation_detail_v1(target_contribution.id);
END;
$$;

REVOKE ALL ON FUNCTION public.calculate_community_contribution_trust_score_v1(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recalculate_community_contribution_trust_score_v1(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.calculate_community_contribution_trust_score_v1(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_community_contribution_trust_score_v1(UUID)
  TO service_role;
