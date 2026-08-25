-- Phase 7: approved-only public map projection for Community contributions.
-- This does not mutate canonical merchant or accessibility data.

CREATE OR REPLACE FUNCTION public.list_community_contribution_map_features_v1(
  p_min_lng DOUBLE PRECISION,
  p_min_lat DOUBLE PRECISION,
  p_max_lng DOUBLE PRECISION,
  p_max_lat DOUBLE PRECISION,
  p_limit INTEGER DEFAULT 250
)
RETURNS TABLE (
  id UUID,
  report_type TEXT,
  observed_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  target_merchant_id UUID,
  target_name TEXT,
  public_longitude DOUBLE PRECISION,
  public_latitude DOUBLE PRECISION,
  projection_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, extensions
AS $$
DECLARE
  bounds extensions.geometry;
  normalized_limit INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_min_lng IS NULL
    OR p_min_lat IS NULL
    OR p_max_lng IS NULL
    OR p_max_lat IS NULL
    OR p_min_lng < -180
    OR p_max_lng > 180
    OR p_min_lat < -90
    OR p_max_lat > 90
    OR p_min_lng >= p_max_lng
    OR p_min_lat >= p_max_lat
    OR p_min_lng = 'Infinity'::DOUBLE PRECISION
    OR p_min_lng = '-Infinity'::DOUBLE PRECISION
    OR p_min_lng = 'NaN'::DOUBLE PRECISION
    OR p_max_lng = 'Infinity'::DOUBLE PRECISION
    OR p_max_lng = '-Infinity'::DOUBLE PRECISION
    OR p_max_lng = 'NaN'::DOUBLE PRECISION
    OR p_min_lat = 'Infinity'::DOUBLE PRECISION
    OR p_min_lat = '-Infinity'::DOUBLE PRECISION
    OR p_min_lat = 'NaN'::DOUBLE PRECISION
    OR p_max_lat = 'Infinity'::DOUBLE PRECISION
    OR p_max_lat = '-Infinity'::DOUBLE PRECISION
    OR p_max_lat = 'NaN'::DOUBLE PRECISION THEN
    RAISE EXCEPTION 'Invalid bbox' USING ERRCODE = '23514';
  END IF;

  IF (p_max_lng - p_min_lng) > 2 OR (p_max_lat - p_min_lat) > 2 THEN
    RAISE EXCEPTION 'BBox too large' USING ERRCODE = '22023';
  END IF;

  normalized_limit := LEAST(GREATEST(COALESCE(p_limit, 250), 1), 500);
  bounds := public.make_wgs84_bbox(p_min_lng, p_min_lat, p_max_lng, p_max_lat);

  RETURN QUERY
  WITH projected AS (
    SELECT
      contribution.id,
      contribution.report_type,
      contribution.observed_at,
      contribution.reviewed_at,
      contribution.target_merchant_id,
      merchant.name AS target_name,
      CASE
        WHEN contribution.report_type IN (
          'MERCHANT_PRICE_CHANGED',
          'MERCHANT_HOURS_CHANGED'
        ) THEN merchant.location
        WHEN contribution.report_type = 'MERCHANT_LOCATION_CHANGED'
          THEN contribution.reported_new_location
        ELSE contribution.location
      END AS public_location,
      CASE
        WHEN contribution.report_type IN (
          'MERCHANT_PRICE_CHANGED',
          'MERCHANT_HOURS_CHANGED'
        ) THEN 'CANONICAL_MERCHANT_LOCATION'
        WHEN contribution.report_type = 'MERCHANT_LOCATION_CHANGED'
          THEN 'CONFIRMED_REPORTED_MERCHANT_LOCATION'
        ELSE 'CONFIRMED_OBSERVATION_LOCATION'
      END AS projection_source
    FROM public.community_contributions AS contribution
    LEFT JOIN public.merchants AS merchant
      ON merchant.id = contribution.target_merchant_id
    WHERE contribution.status = 'APPROVED'
  )
  SELECT
    projected.id,
    projected.report_type,
    projected.observed_at,
    projected.reviewed_at,
    projected.target_merchant_id,
    projected.target_name,
    ST_X(projected.public_location)::DOUBLE PRECISION AS public_longitude,
    ST_Y(projected.public_location)::DOUBLE PRECISION AS public_latitude,
    projected.projection_source
  FROM projected
  WHERE projected.public_location IS NOT NULL
    AND projected.public_location && bounds
    AND ST_Intersects(projected.public_location, bounds)
  ORDER BY projected.reviewed_at DESC NULLS LAST, projected.observed_at DESC, projected.id DESC
  LIMIT normalized_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.list_community_contribution_map_features_v1(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_community_contribution_map_features_v1(
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER
) TO authenticated;
