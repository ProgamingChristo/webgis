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
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  inserted_id UUID;
  normalized_report_type TEXT := upper(btrim(p_report_type));
  contribution_location extensions.geometry(Point, 4326);
  new_location extensions.geometry(Point, 4326);
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF normalized_report_type NOT IN (
    'SIDEWALK_OBSTRUCTION',
    'RAMP_OR_GUIDING_BLOCK',
    'CROSSING',
    'MERCHANT_LOCATION_CHANGED',
    'MERCHANT_PRICE_CHANGED',
    'MERCHANT_HOURS_CHANGED'
  ) THEN
    RAISE EXCEPTION 'Invalid contribution report type' USING ERRCODE = '23514';
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
    RAISE EXCEPTION 'Invalid contribution location' USING ERRCODE = '23514';
  END IF;

  IF p_observed_at IS NULL THEN
    RAISE EXCEPTION 'Contribution observed_at is required' USING ERRCODE = '23514';
  END IF;

  IF NOT public.is_valid_community_contribution_payload_v1(normalized_report_type, p_report_data) THEN
    RAISE EXCEPTION 'Invalid contribution payload' USING ERRCODE = '23514';
  END IF;

  contribution_location := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);

  IF normalized_report_type IN (
    'MERCHANT_LOCATION_CHANGED',
    'MERCHANT_PRICE_CHANGED',
    'MERCHANT_HOURS_CHANGED'
  ) THEN
    IF p_target_merchant_id IS NULL THEN
      RAISE EXCEPTION 'Contribution target merchant is required' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.merchants AS merchant
      WHERE merchant.id = p_target_merchant_id
        AND COALESCE(merchant.publish_status, 'PUBLISHED') <> 'ARCHIVED'
    ) THEN
      RAISE EXCEPTION 'Contribution target merchant not found' USING ERRCODE = '23503';
    END IF;
  ELSIF p_target_merchant_id IS NOT NULL THEN
    RAISE EXCEPTION 'Infrastructure contributions cannot target merchants' USING ERRCODE = '23514';
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
      RAISE EXCEPTION 'Invalid reported merchant location' USING ERRCODE = '23514';
    END IF;

    new_location := ST_SetSRID(
      ST_MakePoint(p_reported_new_longitude, p_reported_new_latitude),
      4326
    );
  ELSIF p_reported_new_longitude IS NOT NULL OR p_reported_new_latitude IS NOT NULL THEN
    RAISE EXCEPTION 'Reported merchant location is only allowed for merchant moved reports' USING ERRCODE = '23514';
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
