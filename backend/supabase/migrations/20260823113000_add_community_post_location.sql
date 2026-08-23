SET search_path = public, extensions, gis;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS location extensions.geometry(Point, 4326) NULL,
  ADD COLUMN IF NOT EXISTS location_visibility TEXT NULL,
  ADD COLUMN IF NOT EXISTS location_accuracy_m DOUBLE PRECISION NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_location_visibility_valid'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_location_visibility_valid
      CHECK (
        location_visibility IS NULL
        OR location_visibility IN ('APPROXIMATE', 'EXACT')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_location_consistent'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_location_consistent
      CHECK (
        (
          location IS NULL
          AND location_visibility IS NULL
          AND location_accuracy_m IS NULL
        )
        OR (
          location IS NOT NULL
          AND location_visibility IS NOT NULL
          AND public.is_valid_wgs84_geometry(location, ARRAY['POINT']::TEXT[])
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_location_accuracy_valid'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_location_accuracy_valid
      CHECK (
        location_accuracy_m IS NULL
        OR (
          location_accuracy_m > 0
          AND location_accuracy_m <= 100000
          AND location_accuracy_m <> 'Infinity'::DOUBLE PRECISION
          AND location_accuracy_m <> '-Infinity'::DOUBLE PRECISION
          AND location_accuracy_m <> 'NaN'::DOUBLE PRECISION
        )
      );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.create_community_post(
  p_content TEXT,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_location_visibility TEXT DEFAULT NULL,
  p_location_accuracy_m DOUBLE PRECISION DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT
)
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions, gis
AS $$
DECLARE
  inserted_post public.community_posts%ROWTYPE;
  post_location extensions.geometry(Point, 4326);
  normalized_visibility TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF (
    p_longitude IS NULL
    OR p_latitude IS NULL
    OR p_location_visibility IS NULL
  ) THEN
    IF NOT (
      p_longitude IS NULL
      AND p_latitude IS NULL
      AND p_location_visibility IS NULL
      AND p_location_accuracy_m IS NULL
    ) THEN
      RAISE EXCEPTION 'Location input is incomplete' USING ERRCODE = '22023';
    END IF;
  ELSE
    IF p_longitude < -180
      OR p_longitude > 180
      OR p_longitude = 'Infinity'::DOUBLE PRECISION
      OR p_longitude = '-Infinity'::DOUBLE PRECISION
      OR p_longitude = 'NaN'::DOUBLE PRECISION
      OR p_latitude < -90
      OR p_latitude > 90
      OR p_latitude = 'Infinity'::DOUBLE PRECISION
      OR p_latitude = '-Infinity'::DOUBLE PRECISION
      OR p_latitude = 'NaN'::DOUBLE PRECISION THEN
      RAISE EXCEPTION 'Invalid WGS84 coordinate' USING ERRCODE = '22023';
    END IF;

    normalized_visibility := upper(p_location_visibility);

    IF normalized_visibility NOT IN ('APPROXIMATE', 'EXACT') THEN
      RAISE EXCEPTION 'Invalid location visibility' USING ERRCODE = '22023';
    END IF;

    post_location := st_setsrid(st_makepoint(p_longitude, p_latitude), 4326);
  END IF;

  INSERT INTO public.community_posts (
    author_id,
    content,
    location,
    location_visibility,
    location_accuracy_m
  )
  VALUES (
    auth.uid(),
    p_content,
    post_location,
    normalized_visibility,
    p_location_accuracy_m
  )
  RETURNING * INTO inserted_post;

  RETURN QUERY
  SELECT
    inserted_post.id,
    inserted_post.author_id,
    inserted_post.content,
    inserted_post.created_at,
    inserted_post.updated_at,
    profile.display_name,
    profile.avatar_url,
    CASE
      WHEN inserted_post.location IS NULL THEN NULL
      WHEN inserted_post.location_visibility = 'APPROXIMATE' THEN ST_X(ST_SnapToGrid(inserted_post.location, 0.001))
      ELSE ST_X(inserted_post.location)
    END,
    CASE
      WHEN inserted_post.location IS NULL THEN NULL
      WHEN inserted_post.location_visibility = 'APPROXIMATE' THEN ST_Y(ST_SnapToGrid(inserted_post.location, 0.001))
      ELSE ST_Y(inserted_post.location)
    END,
    inserted_post.location_visibility
  FROM public.profiles AS profile
  WHERE profile.id = inserted_post.author_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_feed(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog, public, extensions, gis
AS $$
  SELECT
    post.id,
    post.author_id,
    post.content,
    post.created_at,
    post.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE' THEN ST_X(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_X(post.location)
    END AS location_longitude,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE' THEN ST_Y(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_Y(post.location)
    END AS location_latitude,
    post.location_visibility,
    COUNT(*) OVER () AS total_count
  FROM public.community_posts AS post
  LEFT JOIN public.profiles AS profile
    ON profile.id = post.author_id
  ORDER BY post.created_at DESC, post.id DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

REVOKE ALL ON FUNCTION public.create_community_post(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_feed(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_community_post(TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_feed(INTEGER, INTEGER) TO authenticated;
