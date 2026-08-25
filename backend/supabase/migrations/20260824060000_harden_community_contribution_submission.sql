CREATE OR REPLACE FUNCTION public.community_contribution_validation_settings_v1()
RETURNS TABLE (
  future_tolerance_minutes INTEGER,
  max_observation_age_days INTEGER,
  report_limit_count INTEGER,
  report_limit_window_minutes INTEGER,
  self_duplicate_radius_meters INTEGER,
  self_duplicate_window_hours INTEGER,
  merchant_same_location_radius_meters INTEGER
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  SELECT
    10,
    365,
    20,
    60,
    25,
    24,
    10;
$$;

CREATE INDEX IF NOT EXISTS idx_community_contributions_pending_author_type_created
  ON public.community_contributions (author_id, report_type, created_at DESC, id DESC)
  WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_community_contributions_pending_author_type_target_created
  ON public.community_contributions (
    author_id,
    report_type,
    target_merchant_id,
    created_at DESC,
    id DESC
  )
  WHERE status = 'PENDING' AND target_merchant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_community_contributions_location_geog_gist
  ON public.community_contributions
  USING GIST ((location::extensions.geography));

CREATE INDEX IF NOT EXISTS idx_community_contributions_reported_new_location_geog_gist
  ON public.community_contributions
  USING GIST ((reported_new_location::extensions.geography))
  WHERE reported_new_location IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_community_contribution_v1(
  p_report_type TEXT,
  p_longitude DOUBLE PRECISION,
  p_latitude DOUBLE PRECISION,
  p_observed_at TIMESTAMPTZ,
  p_report_data JSONB,
  p_target_merchant_id UUID DEFAULT NULL,
  p_reported_new_longitude DOUBLE PRECISION DEFAULT NULL,
  p_reported_new_latitude DOUBLE PRECISION DEFAULT NULL
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
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, gis
AS $$
DECLARE
  inserted_id UUID;
  normalized_report_type TEXT := upper(btrim(p_report_type));
  contribution_location extensions.geometry(Point, 4326);
  merchant_location extensions.geometry(Point, 4326);
  new_location extensions.geometry(Point, 4326);
  validation_settings RECORD;
  submission_time TIMESTAMPTZ := statement_timestamp();
  matching_id UUID;
  rolling_count INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'GETRA_AUTHENTICATION_REQUIRED' USING ERRCODE = '42501';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::TEXT, 2026082406));

  SELECT *
  INTO validation_settings
  FROM public.community_contribution_validation_settings_v1();

  IF normalized_report_type NOT IN (
    'SIDEWALK_OBSTRUCTION',
    'RAMP_OR_GUIDING_BLOCK',
    'CROSSING',
    'MERCHANT_LOCATION_CHANGED',
    'MERCHANT_PRICE_CHANGED',
    'MERCHANT_HOURS_CHANGED'
  ) THEN
    RAISE EXCEPTION 'GETRA_INVALID_CONTRIBUTION_REPORT_TYPE' USING ERRCODE = '23514';
  END IF;

  IF p_longitude IS NULL OR p_latitude IS NULL
    OR p_longitude < -180 OR p_longitude > 180
    OR p_latitude < -90 OR p_latitude > 90
    OR p_longitude = 'Infinity'::DOUBLE PRECISION
    OR p_longitude = '-Infinity'::DOUBLE PRECISION
    OR p_longitude = 'NaN'::DOUBLE PRECISION
    OR p_latitude = 'Infinity'::DOUBLE PRECISION
    OR p_latitude = '-Infinity'::DOUBLE PRECISION
    OR p_latitude = 'NaN'::DOUBLE PRECISION THEN
    RAISE EXCEPTION 'GETRA_INVALID_CONTRIBUTION_LOCATION' USING ERRCODE = '23514';
  END IF;

  IF p_observed_at IS NULL THEN
    RAISE EXCEPTION 'GETRA_OBSERVED_AT_REQUIRED' USING ERRCODE = '23514';
  END IF;

  IF p_observed_at > submission_time + make_interval(mins => validation_settings.future_tolerance_minutes) THEN
    RAISE EXCEPTION 'GETRA_INVALID_OBSERVATION_TIME_FUTURE' USING ERRCODE = 'P0001';
  END IF;

  IF p_observed_at < submission_time - make_interval(days => validation_settings.max_observation_age_days) THEN
    RAISE EXCEPTION 'GETRA_INVALID_OBSERVATION_TIME_TOO_OLD' USING ERRCODE = 'P0001';
  END IF;

  IF NOT public.is_valid_community_contribution_payload_v1(normalized_report_type, p_report_data) THEN
    RAISE EXCEPTION 'GETRA_INVALID_CONTRIBUTION_PAYLOAD' USING ERRCODE = '23514';
  END IF;

  contribution_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);

  IF normalized_report_type IN (
    'MERCHANT_LOCATION_CHANGED',
    'MERCHANT_PRICE_CHANGED',
    'MERCHANT_HOURS_CHANGED'
  ) THEN
    IF p_target_merchant_id IS NULL THEN
      RAISE EXCEPTION 'GETRA_CONTRIBUTION_TARGET_MERCHANT_REQUIRED' USING ERRCODE = '23514';
    END IF;

    SELECT merchant.location
    INTO merchant_location
    FROM public.merchants AS merchant
    WHERE merchant.id = p_target_merchant_id
      AND COALESCE(merchant.publish_status, 'PUBLISHED') <> 'ARCHIVED';

    IF merchant_location IS NULL THEN
      RAISE EXCEPTION 'GETRA_CONTRIBUTION_TARGET_MERCHANT_NOT_FOUND' USING ERRCODE = '23503';
    END IF;
  ELSIF p_target_merchant_id IS NOT NULL THEN
    RAISE EXCEPTION 'GETRA_INFRASTRUCTURE_CONTRIBUTION_TARGET_FORBIDDEN' USING ERRCODE = '23514';
  END IF;

  IF normalized_report_type = 'MERCHANT_LOCATION_CHANGED' THEN
    IF p_reported_new_longitude IS NULL OR p_reported_new_latitude IS NULL
      OR p_reported_new_longitude < -180 OR p_reported_new_longitude > 180
      OR p_reported_new_latitude < -90 OR p_reported_new_latitude > 90
      OR p_reported_new_longitude = 'Infinity'::DOUBLE PRECISION
      OR p_reported_new_longitude = '-Infinity'::DOUBLE PRECISION
      OR p_reported_new_longitude = 'NaN'::DOUBLE PRECISION
      OR p_reported_new_latitude = 'Infinity'::DOUBLE PRECISION
      OR p_reported_new_latitude = '-Infinity'::DOUBLE PRECISION
      OR p_reported_new_latitude = 'NaN'::DOUBLE PRECISION THEN
      RAISE EXCEPTION 'GETRA_INVALID_REPORTED_MERCHANT_LOCATION' USING ERRCODE = '23514';
    END IF;

    new_location := ST_SetSRID(
      ST_MakePoint(p_reported_new_longitude, p_reported_new_latitude),
      4326
    );

    IF ST_DWithin(
      merchant_location::extensions.geography,
      new_location::extensions.geography,
      validation_settings.merchant_same_location_radius_meters
    ) THEN
      RAISE EXCEPTION 'GETRA_INVALID_TARGET_LOCATION_SAME_AS_CANONICAL' USING ERRCODE = 'P0001';
    END IF;
  ELSIF p_reported_new_longitude IS NOT NULL OR p_reported_new_latitude IS NOT NULL THEN
    RAISE EXCEPTION 'GETRA_REPORTED_MERCHANT_LOCATION_FORBIDDEN' USING ERRCODE = '23514';
  END IF;

  SELECT count(*)
  INTO rolling_count
  FROM public.community_contributions AS contribution
  WHERE contribution.author_id = auth.uid()
    AND contribution.created_at >= submission_time - make_interval(
      mins => validation_settings.report_limit_window_minutes
    );

  IF rolling_count >= validation_settings.report_limit_count THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;

  IF normalized_report_type IN (
    'SIDEWALK_OBSTRUCTION',
    'RAMP_OR_GUIDING_BLOCK',
    'CROSSING'
  ) THEN
    SELECT contribution.id
    INTO matching_id
    FROM public.community_contributions AS contribution
    WHERE contribution.author_id = auth.uid()
      AND contribution.report_type = normalized_report_type
      AND contribution.status = 'PENDING'
      AND contribution.created_at >= submission_time - make_interval(
        hours => validation_settings.self_duplicate_window_hours
      )
      AND ST_DWithin(
        contribution.location::extensions.geography,
        contribution_location::extensions.geography,
        validation_settings.self_duplicate_radius_meters
      )
    ORDER BY contribution.created_at DESC, contribution.id DESC
    LIMIT 1;
  ELSE
    SELECT contribution.id
    INTO matching_id
    FROM public.community_contributions AS contribution
    WHERE contribution.author_id = auth.uid()
      AND contribution.report_type = normalized_report_type
      AND contribution.status = 'PENDING'
      AND contribution.target_merchant_id = p_target_merchant_id
      AND contribution.created_at >= submission_time - make_interval(
        hours => validation_settings.self_duplicate_window_hours
      )
    ORDER BY contribution.created_at DESC, contribution.id DESC
    LIMIT 1;
  END IF;

  IF matching_id IS NOT NULL THEN
    RAISE EXCEPTION 'GETRA_CONTRIBUTION_DUPLICATE' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.community_contributions (
    author_id,
    report_type,
    status,
    location,
    observed_at,
    report_data,
    target_merchant_id,
    reported_new_location
  )
  VALUES (
    auth.uid(),
    normalized_report_type,
    'PENDING',
    contribution_location,
    p_observed_at,
    p_report_data,
    p_target_merchant_id,
    new_location
  )
  RETURNING public.community_contributions.id INTO inserted_id;

  RETURN QUERY
  SELECT *
  FROM public.get_community_contribution_v1(inserted_id);
END;
$$;

DROP POLICY IF EXISTS community_contributions_insert_own_pending
  ON public.community_contributions;

REVOKE INSERT ON public.community_contributions FROM authenticated;
GRANT SELECT ON public.community_contributions TO authenticated;
GRANT ALL ON public.community_contributions TO service_role;

REVOKE ALL ON FUNCTION public.community_contribution_validation_settings_v1()
  FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_community_contribution_v1(
  TEXT,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TIMESTAMPTZ,
  JSONB,
  UUID,
  DOUBLE PRECISION,
  DOUBLE PRECISION
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_community_contribution_v1(
  TEXT,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  TIMESTAMPTZ,
  JSONB,
  UUID,
  DOUBLE PRECISION,
  DOUBLE PRECISION
) TO authenticated;
