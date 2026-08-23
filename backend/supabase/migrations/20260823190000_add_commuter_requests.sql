CREATE TABLE IF NOT EXISTS public.commuter_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  max_budget BIGINT NOT NULL,
  location extensions.geometry(Point, 4326) NOT NULL,
  location_accuracy_m DOUBLE PRECISION NULL,
  location_visibility TEXT NOT NULL DEFAULT 'APPROXIMATE',
  radius_meters INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT commuter_requests_title_length
    CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT commuter_requests_description_length
    CHECK (char_length(btrim(description)) BETWEEN 1 AND 500),
  CONSTRAINT commuter_requests_category_valid
    CHECK (category IN ('FOOD', 'DRINK', 'DAILY_NEEDS', 'SERVICE', 'OTHER_LOCAL_NEED')),
  CONSTRAINT commuter_requests_budget_valid
    CHECK (max_budget > 0 AND max_budget <= 10000000),
  CONSTRAINT commuter_requests_location_visibility_valid
    CHECK (location_visibility IN ('APPROXIMATE', 'EXACT')),
  CONSTRAINT commuter_requests_radius_valid
    CHECK (radius_meters BETWEEN 100 AND 5000),
  CONSTRAINT commuter_requests_status_valid
    CHECK (status IN ('ACTIVE', 'CLOSED')),
  CONSTRAINT commuter_requests_location_srid_valid
    CHECK (ST_SRID(location) = 4326),
  CONSTRAINT commuter_requests_location_point_valid
    CHECK (GeometryType(location) = 'POINT'),
  CONSTRAINT commuter_requests_accuracy_valid
    CHECK (location_accuracy_m IS NULL OR (location_accuracy_m > 0 AND location_accuracy_m <= 100000)),
  CONSTRAINT commuter_requests_expiry_valid
    CHECK (expires_at > created_at)
);

ALTER TABLE public.commuter_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "commuter_requests_authenticated_select"
  ON public.commuter_requests
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "commuter_requests_insert_own"
  ON public.commuter_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid());

CREATE POLICY "commuter_requests_update_own"
  ON public.commuter_requests
  FOR UPDATE
  TO authenticated
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

CREATE INDEX IF NOT EXISTS commuter_requests_location_gist_idx
  ON public.commuter_requests USING GIST (location);

CREATE INDEX IF NOT EXISTS commuter_requests_active_created_idx
  ON public.commuter_requests (status, expires_at, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS commuter_requests_category_created_idx
  ON public.commuter_requests (category, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS commuter_requests_author_created_idx
  ON public.commuter_requests (author_id, created_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.create_commuter_request_v1(
  p_request_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_category TEXT,
  p_max_budget BIGINT,
  p_longitude DOUBLE PRECISION,
  p_latitude DOUBLE PRECISION,
  p_location_visibility TEXT DEFAULT 'APPROXIMATE',
  p_location_accuracy_m DOUBLE PRECISION DEFAULT NULL,
  p_radius_meters INTEGER DEFAULT 1000,
  p_expires_in_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  max_budget BIGINT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  radius_meters INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  distance_meters DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  inserted_request public.commuter_requests%ROWTYPE;
  normalized_title TEXT := btrim(p_title);
  normalized_description TEXT := btrim(p_description);
  normalized_category TEXT := upper(btrim(p_category));
  normalized_visibility TEXT := COALESCE(upper(btrim(p_location_visibility)), 'APPROXIMATE');
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Request id is required' USING ERRCODE = '23514';
  END IF;

  IF char_length(normalized_title) < 1 OR char_length(normalized_title) > 120 THEN
    RAISE EXCEPTION 'Invalid request title' USING ERRCODE = '23514';
  END IF;

  IF char_length(normalized_description) < 1 OR char_length(normalized_description) > 500 THEN
    RAISE EXCEPTION 'Invalid request description' USING ERRCODE = '23514';
  END IF;

  IF normalized_category NOT IN ('FOOD', 'DRINK', 'DAILY_NEEDS', 'SERVICE', 'OTHER_LOCAL_NEED') THEN
    RAISE EXCEPTION 'Invalid request category' USING ERRCODE = '23514';
  END IF;

  IF p_max_budget IS NULL OR p_max_budget <= 0 OR p_max_budget > 10000000 THEN
    RAISE EXCEPTION 'Invalid request budget' USING ERRCODE = '23514';
  END IF;

  IF p_longitude IS NULL OR p_latitude IS NULL
    OR p_longitude < -180 OR p_longitude > 180
    OR p_latitude < -90 OR p_latitude > 90 THEN
    RAISE EXCEPTION 'Invalid request location' USING ERRCODE = '23514';
  END IF;

  IF normalized_visibility NOT IN ('APPROXIMATE', 'EXACT') THEN
    RAISE EXCEPTION 'Invalid location visibility' USING ERRCODE = '23514';
  END IF;

  IF p_location_accuracy_m IS NOT NULL
    AND (p_location_accuracy_m <= 0 OR p_location_accuracy_m > 100000) THEN
    RAISE EXCEPTION 'Invalid location accuracy' USING ERRCODE = '23514';
  END IF;

  IF p_radius_meters IS NULL OR p_radius_meters < 100 OR p_radius_meters > 5000 THEN
    RAISE EXCEPTION 'Invalid request radius' USING ERRCODE = '23514';
  END IF;

  IF p_expires_in_days IS NULL OR p_expires_in_days NOT IN (1, 3, 7) THEN
    RAISE EXCEPTION 'Invalid request expiry' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.commuter_requests (
    id,
    author_id,
    title,
    description,
    category,
    max_budget,
    location,
    location_accuracy_m,
    location_visibility,
    radius_meters,
    status,
    expires_at
  )
  VALUES (
    p_request_id,
    auth.uid(),
    normalized_title,
    normalized_description,
    normalized_category,
    p_max_budget,
    ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326),
    p_location_accuracy_m,
    normalized_visibility,
    p_radius_meters,
    'ACTIVE',
    now() + make_interval(days => p_expires_in_days)
  )
  RETURNING * INTO inserted_request;

  RETURN QUERY
  SELECT *
  FROM public.get_commuter_request_detail_v1(inserted_request.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_commuter_requests_v1(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_category TEXT DEFAULT NULL,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_radius_meters INTEGER DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  max_budget BIGINT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  radius_meters INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  distance_meters DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  query_point extensions.geometry(Point, 4326);
  normalized_category TEXT := NULLIF(upper(btrim(p_category)), '');
BEGIN
  IF normalized_category IS NOT NULL
    AND normalized_category NOT IN ('FOOD', 'DRINK', 'DAILY_NEEDS', 'SERVICE', 'OTHER_LOCAL_NEED') THEN
    RAISE EXCEPTION 'Invalid request category' USING ERRCODE = '23514';
  END IF;

  IF (p_longitude IS NULL) <> (p_latitude IS NULL) THEN
    RAISE EXCEPTION 'Nearby longitude and latitude must be provided together' USING ERRCODE = '23514';
  END IF;

  IF p_longitude IS NOT NULL THEN
    IF p_longitude < -180 OR p_longitude > 180 OR p_latitude < -90 OR p_latitude > 90 THEN
      RAISE EXCEPTION 'Invalid nearby location' USING ERRCODE = '23514';
    END IF;

    IF p_radius_meters IS NOT NULL AND (p_radius_meters < 100 OR p_radius_meters > 5000) THEN
      RAISE EXCEPTION 'Invalid nearby radius' USING ERRCODE = '23514';
    END IF;

    query_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326);
  END IF;

  RETURN QUERY
  WITH active_requests AS (
    SELECT
      request.*,
      CASE
        WHEN query_point IS NULL THEN NULL::DOUBLE PRECISION
        ELSE ST_Distance(request.location::geography, query_point::geography)
      END AS computed_distance_meters
    FROM public.commuter_requests AS request
    WHERE request.status = 'ACTIVE'
      AND request.expires_at > now()
      AND (normalized_category IS NULL OR request.category = normalized_category)
      AND (
        query_point IS NULL
        OR ST_DWithin(
          request.location::geography,
          query_point::geography,
          LEAST(request.radius_meters, COALESCE(p_radius_meters, request.radius_meters))::DOUBLE PRECISION
        )
      )
  ), paged_requests AS (
    SELECT active_requests.*, COUNT(*) OVER() AS total_count
    FROM active_requests
    ORDER BY
      active_requests.computed_distance_meters ASC NULLS LAST,
      active_requests.created_at DESC,
      active_requests.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    request.id,
    request.author_id,
    request.title,
    request.description,
    request.category,
    request.max_budget,
    CASE
      WHEN request.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(request.location, 0.001))
      ELSE ST_X(request.location)
    END AS location_longitude,
    CASE
      WHEN request.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(request.location, 0.001))
      ELSE ST_Y(request.location)
    END AS location_latitude,
    request.location_visibility,
    request.radius_meters,
    CASE
      WHEN request.expires_at <= now() THEN 'EXPIRED'
      ELSE request.status
    END AS status,
    request.created_at,
    request.updated_at,
    request.expires_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    request.computed_distance_meters,
    request.total_count
  FROM paged_requests AS request
  LEFT JOIN public.profiles AS profile ON profile.id = request.author_id
  ORDER BY
    request.computed_distance_meters ASC NULLS LAST,
    request.created_at DESC,
    request.id DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_commuter_request_detail_v1(p_request_id UUID)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  title TEXT,
  description TEXT,
  category TEXT,
  max_budget BIGINT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  radius_meters INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  distance_meters DOUBLE PRECISION,
  total_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  SELECT
    request.id,
    request.author_id,
    request.title,
    request.description,
    request.category,
    request.max_budget,
    CASE
      WHEN request.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(request.location, 0.001))
      ELSE ST_X(request.location)
    END AS location_longitude,
    CASE
      WHEN request.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(request.location, 0.001))
      ELSE ST_Y(request.location)
    END AS location_latitude,
    request.location_visibility,
    request.radius_meters,
    CASE
      WHEN request.expires_at <= now() THEN 'EXPIRED'
      ELSE request.status
    END AS status,
    request.created_at,
    request.updated_at,
    request.expires_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    NULL::DOUBLE PRECISION AS distance_meters,
    1::BIGINT AS total_count
  FROM public.commuter_requests AS request
  LEFT JOIN public.profiles AS profile ON profile.id = request.author_id
  WHERE request.id = p_request_id;
$$;

REVOKE ALL ON TABLE public.commuter_requests FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.commuter_requests TO authenticated;

REVOKE ALL ON FUNCTION public.create_commuter_request_v1(UUID, TEXT, TEXT, TEXT, BIGINT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_commuter_requests_v1(INTEGER, INTEGER, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_commuter_request_detail_v1(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_commuter_request_v1(UUID, TEXT, TEXT, TEXT, BIGINT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_commuter_requests_v1(INTEGER, INTEGER, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_commuter_request_detail_v1(UUID) TO authenticated;
