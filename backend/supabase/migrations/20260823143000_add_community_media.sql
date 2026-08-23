SET search_path = public, extensions, gis;

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'community-media',
  'community-media',
  false,
  10485760,
  ARRAY['image/webp']::TEXT[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/webp']::TEXT[];

CREATE TABLE IF NOT EXISTS public.community_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  uploader_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  storage_bucket TEXT NOT NULL DEFAULT 'community-media',
  storage_path TEXT NOT NULL,
  media_type TEXT NOT NULL DEFAULT 'IMAGE',
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_media_type_valid CHECK (media_type = 'IMAGE'),
  CONSTRAINT community_media_bucket_valid CHECK (storage_bucket = 'community-media'),
  CONSTRAINT community_media_mime_type_valid CHECK (mime_type = 'image/webp'),
  CONSTRAINT community_media_size_valid CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  CONSTRAINT community_media_dimensions_valid CHECK (
    width > 0
    AND height > 0
    AND width <= 2048
    AND height <= 2048
  ),
  CONSTRAINT community_media_storage_path_valid CHECK (
    storage_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}/[0-9a-fA-F-]{36}\.webp$'
  ),
  UNIQUE (storage_bucket, storage_path)
);

CREATE INDEX IF NOT EXISTS community_media_post_id_idx
  ON public.community_media (post_id);

CREATE INDEX IF NOT EXISTS community_media_uploader_id_idx
  ON public.community_media (uploader_id);

ALTER TABLE public.community_media ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_media'
      AND policyname = 'community_media_authenticated_read'
  ) THEN
    CREATE POLICY community_media_authenticated_read
      ON public.community_media
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_media'
      AND policyname = 'community_media_insert_own_post'
  ) THEN
    CREATE POLICY community_media_insert_own_post
      ON public.community_media
      FOR INSERT
      TO authenticated
      WITH CHECK (
        uploader_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.community_posts AS post
          WHERE post.id = post_id
            AND post.author_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT ON TABLE public.community_media TO authenticated;

CREATE OR REPLACE FUNCTION public.create_community_post_with_media(
  p_post_id UUID,
  p_content TEXT,
  p_longitude DOUBLE PRECISION DEFAULT NULL,
  p_latitude DOUBLE PRECISION DEFAULT NULL,
  p_location_visibility TEXT DEFAULT NULL,
  p_location_accuracy_m DOUBLE PRECISION DEFAULT NULL,
  p_media_id UUID DEFAULT NULL,
  p_media_storage_path TEXT DEFAULT NULL,
  p_media_mime_type TEXT DEFAULT NULL,
  p_media_size_bytes INTEGER DEFAULT NULL,
  p_media_width INTEGER DEFAULT NULL,
  p_media_height INTEGER DEFAULT NULL
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
  media_id UUID,
  media_storage_path TEXT,
  media_mime_type TEXT,
  media_size_bytes INTEGER,
  media_width INTEGER,
  media_height INTEGER
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
  has_media BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'Post id is required' USING ERRCODE = '22023';
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

  has_media := p_media_id IS NOT NULL
    OR p_media_storage_path IS NOT NULL
    OR p_media_mime_type IS NOT NULL
    OR p_media_size_bytes IS NOT NULL
    OR p_media_width IS NOT NULL
    OR p_media_height IS NOT NULL;

  IF has_media AND NOT (
    p_media_id IS NOT NULL
    AND p_media_storage_path IS NOT NULL
    AND p_media_mime_type = 'image/webp'
    AND p_media_size_bytes IS NOT NULL
    AND p_media_width IS NOT NULL
    AND p_media_height IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Media input is incomplete' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.community_posts (
    id,
    author_id,
    content,
    location,
    location_visibility,
    location_accuracy_m
  )
  VALUES (
    p_post_id,
    auth.uid(),
    p_content,
    post_location,
    normalized_visibility,
    p_location_accuracy_m
  )
  RETURNING * INTO inserted_post;

  IF has_media THEN
    INSERT INTO public.community_media (
      id,
      post_id,
      uploader_id,
      storage_path,
      mime_type,
      size_bytes,
      width,
      height
    )
    VALUES (
      p_media_id,
      inserted_post.id,
      auth.uid(),
      p_media_storage_path,
      p_media_mime_type,
      p_media_size_bytes,
      p_media_width,
      p_media_height
    );
  END IF;

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
    inserted_post.location_visibility,
    media.id,
    media.storage_path,
    media.mime_type,
    media.size_bytes,
    media.width,
    media.height
  FROM public.profiles AS profile
  LEFT JOIN public.community_media AS media
    ON media.post_id = inserted_post.id
  WHERE profile.id = inserted_post.author_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_feed_v2(
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
  media_id UUID,
  media_storage_path TEXT,
  media_mime_type TEXT,
  media_size_bytes INTEGER,
  media_width INTEGER,
  media_height INTEGER,
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
    media.id AS media_id,
    media.storage_path AS media_storage_path,
    media.mime_type AS media_mime_type,
    media.size_bytes AS media_size_bytes,
    media.width AS media_width,
    media.height AS media_height,
    COUNT(*) OVER () AS total_count
  FROM public.community_posts AS post
  LEFT JOIN public.profiles AS profile
    ON profile.id = post.author_id
  LEFT JOIN LATERAL (
    SELECT media_row.*
    FROM public.community_media AS media_row
    WHERE media_row.post_id = post.id
    ORDER BY media_row.created_at ASC, media_row.id ASC
    LIMIT 1
  ) AS media ON true
  ORDER BY post.created_at DESC, post.id DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

REVOKE ALL ON FUNCTION public.create_community_post_with_media(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_feed_v2(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_community_post_with_media(UUID, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_feed_v2(INTEGER, INTEGER) TO authenticated;
