SET search_path = public, extensions, gis;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS post_type TEXT NOT NULL DEFAULT 'GENERAL',
  ADD COLUMN IF NOT EXISTS category TEXT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_type_valid'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_type_valid
      CHECK (post_type IN ('GENERAL', 'FINDING'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_category_valid'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_category_valid
      CHECK (
        category IS NULL
        OR category IN (
          'LEGENDARY_EATERY',
          'LOCAL_FOOD',
          'CRAFT_CENTER',
          'LANDMARK',
          'LOCAL_HISTORY',
          'COMMUNITY_ACTIVITY'
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'community_posts_finding_required_fields'
      AND conrelid = 'public.community_posts'::regclass
  ) THEN
    ALTER TABLE public.community_posts
      ADD CONSTRAINT community_posts_finding_required_fields
      CHECK (
        post_type = 'GENERAL'
        OR (
          post_type = 'FINDING'
          AND category IS NOT NULL
          AND location IS NOT NULL
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS community_posts_type_category_created_idx
  ON public.community_posts (post_type, category, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS community_posts_finding_location_gist_idx
  ON public.community_posts USING GIST (location)
  WHERE post_type = 'FINDING' AND location IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_community_post_v4(
  p_post_id UUID,
  p_content TEXT,
  p_post_type TEXT DEFAULT 'GENERAL',
  p_category TEXT DEFAULT NULL,
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
  post_type TEXT,
  category TEXT,
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
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[],
  reply_count INTEGER,
  total_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  inserted_post public.community_posts%ROWTYPE;
  normalized_type TEXT := COALESCE(p_post_type, 'GENERAL');
  normalized_category TEXT := NULLIF(p_category, '');
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_post_id IS NULL THEN
    RAISE EXCEPTION 'Post id is required' USING ERRCODE = '23502';
  END IF;

  IF p_content IS NULL OR char_length(btrim(p_content)) = 0 OR char_length(btrim(p_content)) > 500 THEN
    RAISE EXCEPTION 'Invalid post content' USING ERRCODE = '23514';
  END IF;

  IF normalized_type NOT IN ('GENERAL', 'FINDING') THEN
    RAISE EXCEPTION 'Invalid post type' USING ERRCODE = '23514';
  END IF;

  IF normalized_category IS NOT NULL AND normalized_category NOT IN (
    'LEGENDARY_EATERY',
    'LOCAL_FOOD',
    'CRAFT_CENTER',
    'LANDMARK',
    'LOCAL_HISTORY',
    'COMMUNITY_ACTIVITY'
  ) THEN
    RAISE EXCEPTION 'Invalid finding category' USING ERRCODE = '23514';
  END IF;

  IF normalized_type = 'FINDING' AND normalized_category IS NULL THEN
    RAISE EXCEPTION 'Finding category is required' USING ERRCODE = '23514';
  END IF;

  IF (p_longitude IS NULL) <> (p_latitude IS NULL)
    OR (p_longitude IS NULL) <> (p_location_visibility IS NULL) THEN
    RAISE EXCEPTION 'Location fields must be provided together' USING ERRCODE = '23514';
  END IF;

  IF normalized_type = 'FINDING' AND p_longitude IS NULL THEN
    RAISE EXCEPTION 'Finding location is required' USING ERRCODE = '23514';
  END IF;

  IF p_location_visibility IS NOT NULL AND p_location_visibility NOT IN ('APPROXIMATE', 'EXACT') THEN
    RAISE EXCEPTION 'Invalid location visibility' USING ERRCODE = '23514';
  END IF;

  IF p_longitude IS NOT NULL AND (p_longitude < -180 OR p_longitude > 180 OR p_latitude < -90 OR p_latitude > 90) THEN
    RAISE EXCEPTION 'Invalid coordinate' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.community_posts (
    id,
    author_id,
    content,
    post_type,
    category,
    location,
    location_visibility,
    location_accuracy_m
  )
  VALUES (
    p_post_id,
    current_user_id,
    btrim(p_content),
    normalized_type,
    CASE WHEN normalized_type = 'FINDING' THEN normalized_category ELSE NULL END,
    CASE
      WHEN p_longitude IS NULL THEN NULL
      ELSE ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)
    END,
    p_location_visibility,
    p_location_accuracy_m
  )
  RETURNING * INTO inserted_post;

  IF p_media_id IS NOT NULL THEN
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
      current_user_id,
      p_media_storage_path,
      p_media_mime_type,
      p_media_size_bytes,
      p_media_width,
      p_media_height
    );
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.get_community_post_detail_v2(inserted_post.id);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_feed_v4(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0,
  p_post_type TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  post_type TEXT,
  category TEXT,
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
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[],
  reply_count INTEGER,
  total_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  WITH paged_posts AS (
    SELECT post.*, COUNT(*) OVER() AS total_count
    FROM public.community_posts AS post
    WHERE (p_post_type IS NULL OR post.post_type = p_post_type)
      AND (p_category IS NULL OR post.category = p_category)
    ORDER BY post.created_at DESC, post.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    post.id,
    post.author_id,
    post.content,
    post.post_type,
    post.category,
    post.created_at,
    post.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_X(post.location)
    END AS location_longitude,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_Y(post.location)
    END AS location_latitude,
    post.location_visibility,
    media.media_id,
    media.media_storage_path,
    media.media_mime_type,
    media.media_size_bytes,
    media.media_width,
    media.media_height,
    reactions.helpful_count,
    reactions.interesting_count,
    reactions.confirmed_count,
    reactions.viewer_reactions,
    COALESCE(comments.reply_count, 0)::INTEGER AS reply_count,
    post.total_count
  FROM paged_posts AS post
  LEFT JOIN public.profiles AS profile ON profile.id = post.author_id
  LEFT JOIN LATERAL (
    SELECT
      media_row.id AS media_id,
      media_row.storage_path AS media_storage_path,
      media_row.mime_type AS media_mime_type,
      media_row.size_bytes AS media_size_bytes,
      media_row.width AS media_width,
      media_row.height AS media_height
    FROM public.community_media AS media_row
    WHERE media_row.post_id = post.id
    ORDER BY media_row.created_at ASC, media_row.id ASC
    LIMIT 1
  ) AS media ON TRUE
  LEFT JOIN LATERAL public.community_reaction_summary(post.id) AS reactions ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS reply_count
    FROM public.community_comments AS comment
    WHERE comment.post_id = post.id
  ) AS comments ON TRUE
  ORDER BY post.created_at DESC, post.id DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_community_post_detail_v2(p_post_id UUID)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  post_type TEXT,
  category TEXT,
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
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[],
  reply_count INTEGER,
  total_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  SELECT
    post.id,
    post.author_id,
    post.content,
    post.post_type,
    post.category,
    post.created_at,
    post.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_X(post.location)
    END AS location_longitude,
    CASE
      WHEN post.location IS NULL THEN NULL
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_Y(post.location)
    END AS location_latitude,
    post.location_visibility,
    media.media_id,
    media.media_storage_path,
    media.media_mime_type,
    media.media_size_bytes,
    media.media_width,
    media.media_height,
    reactions.helpful_count,
    reactions.interesting_count,
    reactions.confirmed_count,
    reactions.viewer_reactions,
    COALESCE(comments.reply_count, 0)::INTEGER AS reply_count,
    1::BIGINT AS total_count
  FROM public.community_posts AS post
  LEFT JOIN public.profiles AS profile ON profile.id = post.author_id
  LEFT JOIN LATERAL (
    SELECT
      media_row.id AS media_id,
      media_row.storage_path AS media_storage_path,
      media_row.mime_type AS media_mime_type,
      media_row.size_bytes AS media_size_bytes,
      media_row.width AS media_width,
      media_row.height AS media_height
    FROM public.community_media AS media_row
    WHERE media_row.post_id = post.id
    ORDER BY media_row.created_at ASC, media_row.id ASC
    LIMIT 1
  ) AS media ON TRUE
  LEFT JOIN LATERAL public.community_reaction_summary(post.id) AS reactions ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS reply_count
    FROM public.community_comments AS comment
    WHERE comment.post_id = post.id
  ) AS comments ON TRUE
  WHERE post.id = p_post_id;
$$;

CREATE OR REPLACE FUNCTION public.list_community_cultural_map_v1(
  p_west DOUBLE PRECISION,
  p_south DOUBLE PRECISION,
  p_east DOUBLE PRECISION,
  p_north DOUBLE PRECISION,
  p_categories TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  author_id UUID,
  content TEXT,
  post_type TEXT,
  category TEXT,
  created_at TIMESTAMPTZ,
  author_display_name TEXT,
  location_longitude DOUBLE PRECISION,
  location_latitude DOUBLE PRECISION,
  location_visibility TEXT,
  confirmed_count INTEGER,
  reply_count INTEGER
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
BEGIN
  IF p_west < -180 OR p_west > 180
    OR p_east < -180 OR p_east > 180
    OR p_south < -90 OR p_south > 90
    OR p_north < -90 OR p_north > 90
    OR p_south >= p_north
    OR p_west >= p_east THEN
    RAISE EXCEPTION 'Invalid bbox' USING ERRCODE = '23514';
  END IF;

  RETURN QUERY
  SELECT
    post.id,
    post.author_id,
    post.content,
    post.post_type,
    post.category,
    post.created_at,
    profile.display_name AS author_display_name,
    CASE
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_X(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_X(post.location)
    END AS location_longitude,
    CASE
      WHEN post.location_visibility = 'APPROXIMATE'
        THEN ST_Y(ST_SnapToGrid(post.location, 0.001))
      ELSE ST_Y(post.location)
    END AS location_latitude,
    post.location_visibility,
    reactions.confirmed_count,
    COALESCE(comments.reply_count, 0)::INTEGER AS reply_count
  FROM public.community_posts AS post
  LEFT JOIN public.profiles AS profile ON profile.id = post.author_id
  LEFT JOIN LATERAL public.community_reaction_summary(post.id) AS reactions ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::INTEGER AS reply_count
    FROM public.community_comments AS comment
    WHERE comment.post_id = post.id
  ) AS comments ON TRUE
  WHERE post.post_type = 'FINDING'
    AND post.location IS NOT NULL
    AND (p_categories IS NULL OR post.category = ANY(p_categories))
    AND ST_Intersects(
      post.location,
      ST_MakeEnvelope(p_west, p_south, p_east, p_north, 4326)
    )
  ORDER BY post.created_at DESC, post.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;

REVOKE ALL ON FUNCTION public.create_community_post_v4(UUID, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_feed_v4(INTEGER, INTEGER, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_post_detail_v2(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_cultural_map_v1(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.create_community_post_v4(UUID, TEXT, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, TEXT, DOUBLE PRECISION, UUID, TEXT, TEXT, INTEGER, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_feed_v4(INTEGER, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_post_detail_v2(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_cultural_map_v1(DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION, TEXT[], INTEGER) TO authenticated;
