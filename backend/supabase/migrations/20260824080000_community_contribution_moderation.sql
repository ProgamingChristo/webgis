ALTER TABLE public.community_contributions
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_reason TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_contributions_review_reason_check'
  ) THEN
    ALTER TABLE public.community_contributions
      ADD CONSTRAINT community_contributions_review_reason_check
      CHECK (
        review_reason IS NULL
        OR review_reason IN (
          'DUPLICATE',
          'INSUFFICIENT_INFORMATION',
          'INVALID_LOCATION',
          'INVALID_TARGET',
          'OUTDATED_INFORMATION',
          'OTHER'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'community_contributions_review_state_check'
  ) THEN
    ALTER TABLE public.community_contributions
      ADD CONSTRAINT community_contributions_review_state_check
      CHECK (
        (
          status = 'PENDING'
          AND reviewed_by IS NULL
          AND reviewed_at IS NULL
          AND review_reason IS NULL
        )
        OR (
          status = 'APPROVED'
          AND reviewed_by IS NOT NULL
          AND reviewed_at IS NOT NULL
          AND review_reason IS NULL
        )
        OR (
          status = 'REJECTED'
          AND reviewed_by IS NOT NULL
          AND reviewed_at IS NOT NULL
          AND review_reason IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_community_contributions_pending_review_queue
  ON public.community_contributions (created_at ASC, id ASC)
  WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS public.community_contribution_moderation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_id UUID NOT NULL REFERENCES public.community_contributions(id) ON DELETE RESTRICT,
  reviewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  previous_status TEXT NOT NULL CHECK (previous_status = 'PENDING'),
  new_status TEXT NOT NULL CHECK (new_status IN ('APPROVED', 'REJECTED')),
  reason TEXT CHECK (
    reason IS NULL
    OR reason IN (
      'DUPLICATE',
      'INSUFFICIENT_INFORMATION',
      'INVALID_LOCATION',
      'INVALID_TARGET',
      'OUTDATED_INFORMATION',
      'OTHER'
    )
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_contribution_moderation_events_one_review
    UNIQUE (contribution_id),
  CONSTRAINT community_contribution_moderation_events_reason_required
    CHECK (
      (new_status = 'APPROVED' AND reason IS NULL)
      OR (new_status = 'REJECTED' AND reason IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_community_contribution_moderation_events_reviewer_created
  ON public.community_contribution_moderation_events (reviewer_id, created_at DESC, id DESC);

ALTER TABLE public.community_contribution_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_contribution_moderation_events_admin_select
  ON public.community_contribution_moderation_events;

CREATE POLICY community_contribution_moderation_events_admin_select
  ON public.community_contribution_moderation_events
  FOR SELECT
  TO authenticated
  USING (public.community_is_admin());

REVOKE ALL ON public.community_contribution_moderation_events
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_contribution_moderation_events TO authenticated;
GRANT ALL ON public.community_contribution_moderation_events TO service_role;

DO $$
BEGIN
  ALTER TABLE public.community_notifications
    DROP CONSTRAINT IF EXISTS community_notifications_type_check;
  ALTER TABLE public.community_notifications
    ADD CONSTRAINT community_notifications_type_check
    CHECK (
      type IN (
        'POST_REPLY',
        'COMMENT_REPLY',
        'POST_CONFIRMED',
        'UMKM_RESPONSE',
        'CONTRIBUTION_APPROVED',
        'CONTRIBUTION_REJECTED'
      )
    );

  ALTER TABLE public.community_notifications
    DROP CONSTRAINT IF EXISTS community_notifications_entity_type_check;
  ALTER TABLE public.community_notifications
    ADD CONSTRAINT community_notifications_entity_type_check
    CHECK (
      entity_type IN (
        'POST',
        'COMMENT',
        'DEMAND_SIGNAL',
        'UMKM_RESPONSE',
        'COMMUNITY_CONTRIBUTION'
      )
    );
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS community_notifications_contribution_moderation_once
  ON public.community_notifications (recipient_user_id, type, entity_id)
  WHERE type IN ('CONTRIBUTION_APPROVED', 'CONTRIBUTION_REJECTED')
    AND entity_type = 'COMMUNITY_CONTRIBUTION';

DROP FUNCTION IF EXISTS public.list_community_contribution_history_v1(INTEGER, INTEGER, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.list_community_contribution_history_v1(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT NULL,
  p_report_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  report_type TEXT,
  status TEXT,
  observed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  location_summary TEXT,
  target_merchant_id UUID,
  target_name TEXT,
  points_awarded INTEGER,
  total_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  WITH scoped AS (
    SELECT contribution.*
    FROM public.community_contributions AS contribution
    WHERE contribution.author_id = auth.uid()
      AND (p_status IS NULL OR contribution.status = p_status)
      AND (p_report_type IS NULL OR contribution.report_type = p_report_type)
  ),
  paged AS (
    SELECT scoped.*, COUNT(*) OVER() AS total_count
    FROM scoped
    ORDER BY scoped.created_at DESC, scoped.id DESC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ),
  awards AS (
    SELECT
      event.contribution_id,
      COALESCE(SUM(event.points), 0)::INTEGER AS points_awarded
    FROM public.community_contribution_point_events AS event
    WHERE event.user_id = auth.uid()
    GROUP BY event.contribution_id
  )
  SELECT
    paged.id,
    paged.report_type,
    paged.status,
    paged.observed_at,
    paged.submitted_at,
    paged.created_at,
    paged.reviewed_at,
    paged.review_reason,
    CONCAT(
      ROUND(ST_Y(paged.location)::NUMERIC, 6),
      ', ',
      ROUND(ST_X(paged.location)::NUMERIC, 6)
    ) AS location_summary,
    paged.target_merchant_id,
    merchant.name AS target_name,
    COALESCE(awards.points_awarded, 0)::INTEGER AS points_awarded,
    paged.total_count::INTEGER
  FROM paged
  LEFT JOIN public.merchants AS merchant
    ON merchant.id = paged.target_merchant_id
  LEFT JOIN awards
    ON awards.contribution_id = paged.id;
$$;

DROP FUNCTION IF EXISTS public.get_community_contribution_v1(UUID);

CREATE OR REPLACE FUNCTION public.get_community_contribution_v1(
  p_contribution_id UUID
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  report_type TEXT,
  status TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  observed_at TIMESTAMPTZ,
  report_data JSONB,
  target_merchant_id UUID,
  reported_new_longitude DOUBLE PRECISION,
  reported_new_latitude DOUBLE PRECISION,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  SELECT
    contribution.id,
    contribution.author_id,
    contribution.report_type,
    contribution.status,
    ST_X(contribution.location) AS location_longitude,
    ST_Y(contribution.location) AS location_latitude,
    contribution.observed_at,
    contribution.report_data,
    contribution.target_merchant_id,
    CASE
      WHEN contribution.reported_new_location IS NULL THEN NULL
      ELSE ST_X(contribution.reported_new_location)
    END AS reported_new_longitude,
    CASE
      WHEN contribution.reported_new_location IS NULL THEN NULL
      ELSE ST_Y(contribution.reported_new_location)
    END AS reported_new_latitude,
    contribution.submitted_at,
    contribution.created_at,
    contribution.updated_at,
    contribution.reviewed_at,
    contribution.review_reason
  FROM public.community_contributions AS contribution
  WHERE contribution.id = p_contribution_id
    AND contribution.author_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.assert_community_contribution_admin_v1()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reviewer_id UUID := auth.uid();
BEGIN
  IF reviewer_id IS NULL OR NOT public.community_is_admin() THEN
    RAISE EXCEPTION 'GETRA_ADMIN_REQUIRED' USING ERRCODE = '42501';
  END IF;

  RETURN reviewer_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_contribution_moderation_queue_v1(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'PENDING',
  p_report_type TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  author_display_name TEXT,
  author_avatar_url TEXT,
  report_type TEXT,
  status TEXT,
  observed_at TIMESTAMPTZ,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_reason TEXT,
  location_summary TEXT,
  target_merchant_id UUID,
  target_name TEXT,
  points_awarded INTEGER,
  total_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
DECLARE
  reviewer_id UUID;
  normalized_status TEXT := COALESCE(p_status, 'PENDING');
BEGIN
  reviewer_id := public.assert_community_contribution_admin_v1();

  IF normalized_status NOT IN ('PENDING', 'APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'Invalid contribution status' USING ERRCODE = '22023';
  END IF;

  IF p_report_type IS NOT NULL
    AND p_report_type NOT IN (
      'SIDEWALK_OBSTRUCTION',
      'RAMP_OR_GUIDING_BLOCK',
      'CROSSING',
      'MERCHANT_LOCATION_CHANGED',
      'MERCHANT_PRICE_CHANGED',
      'MERCHANT_HOURS_CHANGED'
    ) THEN
    RAISE EXCEPTION 'Invalid contribution report type' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT contribution.*
    FROM public.community_contributions AS contribution
    WHERE contribution.status = normalized_status
      AND (p_report_type IS NULL OR contribution.report_type = p_report_type)
  ),
  paged AS (
    SELECT scoped.*, COUNT(*) OVER() AS total_count
    FROM scoped
    ORDER BY
      CASE WHEN normalized_status = 'PENDING' THEN scoped.created_at END ASC,
      CASE WHEN normalized_status <> 'PENDING' THEN scoped.created_at END DESC,
      scoped.id ASC
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50)
    OFFSET GREATEST(COALESCE(p_offset, 0), 0)
  ),
  awards AS (
    SELECT
      event.contribution_id,
      COALESCE(SUM(event.points), 0)::INTEGER AS points_awarded
    FROM public.community_contribution_point_events AS event
    GROUP BY event.contribution_id
  )
  SELECT
    paged.id,
    paged.author_id,
    COALESCE(profile.display_name, profile.username, 'Kontributor GETRA') AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    paged.report_type,
    paged.status,
    paged.observed_at,
    paged.submitted_at,
    paged.created_at,
    paged.reviewed_at,
    paged.review_reason,
    CONCAT(
      ROUND(ST_Y(paged.location)::NUMERIC, 6),
      ', ',
      ROUND(ST_X(paged.location)::NUMERIC, 6)
    ) AS location_summary,
    paged.target_merchant_id,
    merchant.name AS target_name,
    COALESCE(awards.points_awarded, 0)::INTEGER AS points_awarded,
    paged.total_count::INTEGER
  FROM paged
  LEFT JOIN public.profiles AS profile
    ON profile.id = paged.author_id
  LEFT JOIN public.merchants AS merchant
    ON merchant.id = paged.target_merchant_id
  LEFT JOIN awards
    ON awards.contribution_id = paged.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_contribution_moderation_detail_v1(
  p_contribution_id UUID
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
STABLE
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
DECLARE
  reviewer_id UUID;
BEGIN
  reviewer_id := public.assert_community_contribution_admin_v1();

  RETURN QUERY
  SELECT
    contribution.id,
    contribution.author_id,
    COALESCE(profile.display_name, profile.username, 'Kontributor GETRA') AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    contribution.report_type,
    contribution.status,
    ST_X(contribution.location) AS location_longitude,
    ST_Y(contribution.location) AS location_latitude,
    contribution.observed_at,
    contribution.report_data,
    contribution.target_merchant_id,
    merchant.name AS target_name,
    CASE
      WHEN contribution.reported_new_location IS NULL THEN NULL
      ELSE ST_X(contribution.reported_new_location)
    END AS reported_new_longitude,
    CASE
      WHEN contribution.reported_new_location IS NULL THEN NULL
      ELSE ST_Y(contribution.reported_new_location)
    END AS reported_new_latitude,
    contribution.submitted_at,
    contribution.created_at,
    contribution.updated_at,
    contribution.reviewed_at,
    contribution.review_reason,
    COALESCE((
      SELECT SUM(event.points)::INTEGER
      FROM public.community_contribution_point_events AS event
      WHERE event.contribution_id = contribution.id
    ), 0) AS points_awarded
  FROM public.community_contributions AS contribution
  LEFT JOIN public.profiles AS profile
    ON profile.id = contribution.author_id
  LEFT JOIN public.merchants AS merchant
    ON merchant.id = contribution.target_merchant_id
  WHERE contribution.id = p_contribution_id;
END;
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

REVOKE ALL ON FUNCTION public.assert_community_contribution_admin_v1()
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_community_contribution_moderation_queue_v1(INTEGER, INTEGER, TEXT, TEXT)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_contribution_moderation_detail_v1(UUID)
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_community_contribution_v1(UUID, TEXT, TEXT)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_community_contribution_moderation_queue_v1(INTEGER, INTEGER, TEXT, TEXT)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_contribution_moderation_detail_v1(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_community_contribution_v1(UUID, TEXT, TEXT)
  TO authenticated;
