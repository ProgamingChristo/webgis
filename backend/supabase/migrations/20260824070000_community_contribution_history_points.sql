CREATE TABLE IF NOT EXISTS public.community_contribution_point_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  contribution_id UUID NOT NULL REFERENCES public.community_contributions(id) ON DELETE RESTRICT,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT community_contribution_point_events_points_positive
    CHECK (points > 0),
  CONSTRAINT community_contribution_point_events_reason_valid
    CHECK (reason IN ('APPROVED_CONTRIBUTION')),
  CONSTRAINT community_contribution_point_events_one_award
    UNIQUE (contribution_id)
);

CREATE INDEX IF NOT EXISTS idx_community_contribution_point_events_user_created
  ON public.community_contribution_point_events (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_community_contribution_point_events_user_sum
  ON public.community_contribution_point_events (user_id, points);

ALTER TABLE public.community_contribution_point_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_contribution_point_events_owner_select
  ON public.community_contribution_point_events;

CREATE POLICY community_contribution_point_events_owner_select
  ON public.community_contribution_point_events
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON public.community_contribution_point_events
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_contribution_point_events TO authenticated;
GRANT ALL ON public.community_contribution_point_events TO service_role;

CREATE OR REPLACE FUNCTION public.community_contribution_points_settings_v1()
RETURNS TABLE (
  approved_contribution_points INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_community_contribution_summary_v1()
RETURNS TABLE (
  total_contributions INTEGER,
  pending_count INTEGER,
  approved_count INTEGER,
  rejected_count INTEGER,
  contribution_points INTEGER
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
    SELECT COALESCE(sum(points), 0)::INTEGER AS contribution_points
    FROM public.community_contribution_point_events
    WHERE user_id = auth.uid()
  )
  SELECT
    count(*)::INTEGER AS total_contributions,
    count(*) FILTER (WHERE status = 'PENDING')::INTEGER AS pending_count,
    count(*) FILTER (WHERE status = 'APPROVED')::INTEGER AS approved_count,
    count(*) FILTER (WHERE status = 'REJECTED')::INTEGER AS rejected_count,
    own_points.contribution_points
  FROM own_points
  LEFT JOIN own_contributions ON TRUE
  GROUP BY own_points.contribution_points;
$$;

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
  location_summary TEXT,
  target_merchant_id UUID,
  target_name TEXT,
  points_awarded INTEGER,
  total_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  safe_limit INTEGER := LEAST(GREATEST(COALESCE(p_limit, 20), 1), 50);
  safe_offset INTEGER := GREATEST(COALESCE(p_offset, 0), 0);
  normalized_status TEXT := NULLIF(upper(btrim(COALESCE(p_status, ''))), '');
  normalized_report_type TEXT := NULLIF(upper(btrim(COALESCE(p_report_type, ''))), '');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'GETRA_AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  IF normalized_status IS NOT NULL
    AND normalized_status NOT IN ('PENDING', 'APPROVED', 'REJECTED') THEN
    RAISE EXCEPTION 'GETRA_INVALID_CONTRIBUTION_STATUS_FILTER'
      USING ERRCODE = '23514';
  END IF;

  IF normalized_report_type IS NOT NULL
    AND normalized_report_type NOT IN (
      'SIDEWALK_OBSTRUCTION',
      'RAMP_OR_GUIDING_BLOCK',
      'CROSSING',
      'MERCHANT_LOCATION_CHANGED',
      'MERCHANT_PRICE_CHANGED',
      'MERCHANT_HOURS_CHANGED'
    ) THEN
    RAISE EXCEPTION 'GETRA_INVALID_CONTRIBUTION_REPORT_TYPE_FILTER'
      USING ERRCODE = '23514';
  END IF;

  RETURN QUERY
  WITH filtered AS (
    SELECT contribution.*
    FROM public.community_contributions AS contribution
    WHERE contribution.author_id = auth.uid()
      AND (normalized_status IS NULL OR contribution.status = normalized_status)
      AND (
        normalized_report_type IS NULL
        OR contribution.report_type = normalized_report_type
      )
  ),
  point_totals AS (
    SELECT
      event.contribution_id,
      sum(event.points)::INTEGER AS points_awarded
    FROM public.community_contribution_point_events AS event
    WHERE event.user_id = auth.uid()
    GROUP BY event.contribution_id
  )
  SELECT
    filtered.id,
    filtered.report_type,
    filtered.status,
    filtered.observed_at,
    filtered.submitted_at,
    filtered.created_at,
    (
      'Koordinat '
      || round(ST_Y(filtered.location)::NUMERIC, 4)::TEXT
      || ', '
      || round(ST_X(filtered.location)::NUMERIC, 4)::TEXT
    ) AS location_summary,
    filtered.target_merchant_id,
    merchant.name AS target_name,
    COALESCE(point_totals.points_awarded, 0)::INTEGER AS points_awarded,
    count(*) OVER ()::INTEGER AS total_count
  FROM filtered
  LEFT JOIN point_totals
    ON point_totals.contribution_id = filtered.id
  LEFT JOIN public.merchants AS merchant
    ON merchant.id = filtered.target_merchant_id
  ORDER BY filtered.created_at DESC, filtered.id DESC
  LIMIT safe_limit
  OFFSET safe_offset;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_community_contribution_points_v1(
  p_contribution_id UUID
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  contribution_id UUID,
  points INTEGER,
  reason TEXT,
  created_at TIMESTAMPTZ,
  inserted BOOLEAN
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  contribution_record RECORD;
  point_value INTEGER;
BEGIN
  IF p_contribution_id IS NULL THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_ID_REQUIRED' USING ERRCODE = '23514';
  END IF;

  SELECT contribution.id, contribution.author_id, contribution.status
  INTO contribution_record
  FROM public.community_contributions AS contribution
  WHERE contribution.id = p_contribution_id;

  IF contribution_record.id IS NULL THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_NOT_FOUND' USING ERRCODE = '23503';
  END IF;

  IF contribution_record.status <> 'APPROVED' THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_POINTS_NOT_ELIGIBLE'
      USING ERRCODE = 'P0001';
  END IF;

  SELECT settings.approved_contribution_points
  INTO point_value
  FROM public.community_contribution_points_settings_v1() AS settings;

  RETURN QUERY
  WITH inserted_event AS (
    INSERT INTO public.community_contribution_point_events (
      user_id,
      contribution_id,
      points,
      reason
    )
    VALUES (
      contribution_record.author_id,
      contribution_record.id,
      point_value,
      'APPROVED_CONTRIBUTION'
    )
    ON CONFLICT (contribution_id) DO NOTHING
    RETURNING
      community_contribution_point_events.id,
      community_contribution_point_events.user_id,
      community_contribution_point_events.contribution_id,
      community_contribution_point_events.points,
      community_contribution_point_events.reason,
      community_contribution_point_events.created_at,
      TRUE AS inserted
  )
  SELECT *
  FROM inserted_event
  UNION ALL
  SELECT
    existing_event.id,
    existing_event.user_id,
    existing_event.contribution_id,
    existing_event.points,
    existing_event.reason,
    existing_event.created_at,
    FALSE AS inserted
  FROM public.community_contribution_point_events AS existing_event
  WHERE existing_event.contribution_id = contribution_record.id
    AND NOT EXISTS (SELECT 1 FROM inserted_event)
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.community_contribution_points_settings_v1()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_contribution_summary_v1()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_contribution_history_v1(
  INTEGER,
  INTEGER,
  TEXT,
  TEXT
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_community_contribution_points_v1(UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.community_contribution_points_settings_v1()
  TO service_role;
GRANT EXECUTE ON FUNCTION public.get_community_contribution_summary_v1()
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_contribution_history_v1(
  INTEGER,
  INTEGER,
  TEXT,
  TEXT
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.award_community_contribution_points_v1(UUID)
  TO service_role;
