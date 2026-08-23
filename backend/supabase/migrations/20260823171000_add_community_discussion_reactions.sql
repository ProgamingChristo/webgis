SET search_path = public, extensions, gis;

CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_comment_id UUID NULL REFERENCES public.community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  depth INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_comments_content_not_blank CHECK (char_length(btrim(content)) > 0),
  CONSTRAINT community_comments_content_max_length CHECK (char_length(content) <= 500),
  CONSTRAINT community_comments_depth_valid CHECK (depth >= 0 AND depth <= 2),
  CONSTRAINT community_comments_root_parent_consistent CHECK (
    (parent_comment_id IS NULL AND depth = 0)
    OR (parent_comment_id IS NOT NULL AND depth > 0)
  )
);

CREATE INDEX IF NOT EXISTS community_comments_post_root_created_idx
  ON public.community_comments (post_id, created_at DESC, id DESC)
  WHERE parent_comment_id IS NULL;

CREATE INDEX IF NOT EXISTS community_comments_post_parent_created_idx
  ON public.community_comments (post_id, parent_comment_id, created_at ASC, id ASC);

CREATE INDEX IF NOT EXISTS community_comments_author_id_idx
  ON public.community_comments (author_id);

DROP TRIGGER IF EXISTS handle_updated_at_community_comments ON public.community_comments;

CREATE TRIGGER handle_updated_at_community_comments
  BEFORE UPDATE ON public.community_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_comments'
      AND policyname = 'community_comments_authenticated_read'
  ) THEN
    CREATE POLICY community_comments_authenticated_read
      ON public.community_comments
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_comments'
      AND policyname = 'community_comments_insert_own'
  ) THEN
    CREATE POLICY community_comments_insert_own
      ON public.community_comments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        author_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.community_posts AS post
          WHERE post.id = post_id
        )
      );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.community_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT community_reactions_type_valid CHECK (
    reaction_type IN ('HELPFUL', 'INTERESTING', 'CONFIRMED')
  ),
  CONSTRAINT community_reactions_unique UNIQUE (post_id, user_id, reaction_type)
);

CREATE INDEX IF NOT EXISTS community_reactions_post_type_idx
  ON public.community_reactions (post_id, reaction_type);

CREATE INDEX IF NOT EXISTS community_reactions_user_id_idx
  ON public.community_reactions (user_id);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_reactions'
      AND policyname = 'community_reactions_authenticated_read'
  ) THEN
    CREATE POLICY community_reactions_authenticated_read
      ON public.community_reactions
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_reactions'
      AND policyname = 'community_reactions_insert_own'
  ) THEN
    CREATE POLICY community_reactions_insert_own
      ON public.community_reactions
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1
          FROM public.community_posts AS post
          WHERE post.id = post_id
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_reactions'
      AND policyname = 'community_reactions_delete_own'
  ) THEN
    CREATE POLICY community_reactions_delete_own
      ON public.community_reactions
      FOR DELETE
      TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

GRANT SELECT, INSERT ON TABLE public.community_comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.community_reactions TO authenticated;

CREATE OR REPLACE FUNCTION public.community_reaction_summary(p_post_id UUID)
RETURNS TABLE (
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[]
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  SELECT
    COUNT(*) FILTER (WHERE reaction_type = 'HELPFUL')::INTEGER AS helpful_count,
    COUNT(*) FILTER (WHERE reaction_type = 'INTERESTING')::INTEGER AS interesting_count,
    COUNT(*) FILTER (WHERE reaction_type = 'CONFIRMED')::INTEGER AS confirmed_count,
    COALESCE(
      ARRAY_AGG(reaction_type ORDER BY reaction_type)
        FILTER (WHERE user_id = auth.uid()),
      ARRAY[]::TEXT[]
    ) AS viewer_reactions
  FROM public.community_reactions
  WHERE post_id = p_post_id;
$$;

CREATE OR REPLACE FUNCTION public.list_community_feed_v3(
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
    SELECT
      post.*,
      COUNT(*) OVER() AS total_count
    FROM public.community_posts AS post
    ORDER BY post.created_at DESC, post.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
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
  LEFT JOIN public.profiles AS profile
    ON profile.id = post.author_id
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

CREATE OR REPLACE FUNCTION public.get_community_post_detail_v1(p_post_id UUID)
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
  LEFT JOIN public.profiles AS profile
    ON profile.id = post.author_id
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

CREATE OR REPLACE FUNCTION public.list_community_comments_v1(
  p_post_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  author_id UUID,
  parent_comment_id UUID,
  content TEXT,
  depth INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  total_root_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
  WITH paged_roots AS (
    SELECT
      comment.*,
      COUNT(*) OVER() AS total_root_count
    FROM public.community_comments AS comment
    WHERE comment.post_id = p_post_id
      AND comment.parent_comment_id IS NULL
    ORDER BY comment.created_at DESC, comment.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  ),
  selected_comments AS (
    SELECT * FROM paged_roots
    UNION ALL
    SELECT child.*, root.total_root_count
    FROM public.community_comments AS child
    JOIN paged_roots AS root
      ON child.parent_comment_id = root.id
    UNION ALL
    SELECT grandchild.*, root.total_root_count
    FROM public.community_comments AS child
    JOIN paged_roots AS root
      ON child.parent_comment_id = root.id
    JOIN public.community_comments AS grandchild
      ON grandchild.parent_comment_id = child.id
  )
  SELECT
    comment.id,
    comment.post_id,
    comment.author_id,
    comment.parent_comment_id,
    comment.content,
    comment.depth,
    comment.created_at,
    comment.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    comment.total_root_count
  FROM selected_comments AS comment
  LEFT JOIN public.profiles AS profile
    ON profile.id = comment.author_id
  ORDER BY
    COALESCE(comment.parent_comment_id, comment.id),
    comment.depth,
    comment.created_at ASC,
    comment.id ASC;
$$;

CREATE OR REPLACE FUNCTION public.create_community_comment_v1(
  p_post_id UUID,
  p_content TEXT,
  p_parent_comment_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  post_id UUID,
  author_id UUID,
  parent_comment_id UUID,
  content TEXT,
  depth INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  author_display_name TEXT,
  author_avatar_url TEXT,
  total_root_count BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  parent_record public.community_comments%ROWTYPE;
  inserted_comment public.community_comments%ROWTYPE;
  next_depth INTEGER := 0;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_content IS NULL OR char_length(btrim(p_content)) = 0 OR char_length(btrim(p_content)) > 500 THEN
    RAISE EXCEPTION 'Invalid comment content'
      USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.community_posts AS post WHERE post.id = p_post_id
  ) THEN
    RAISE EXCEPTION 'Post not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_parent_comment_id IS NOT NULL THEN
    SELECT *
    INTO parent_record
    FROM public.community_comments AS comment
    WHERE comment.id = p_parent_comment_id;

    IF parent_record.id IS NULL THEN
      RAISE EXCEPTION 'Parent comment not found'
        USING ERRCODE = 'P0002';
    END IF;

    IF parent_record.post_id <> p_post_id THEN
      RAISE EXCEPTION 'Parent comment belongs to another post'
        USING ERRCODE = '23514';
    END IF;

    IF parent_record.depth >= 2 THEN
      RAISE EXCEPTION 'Maximum thread depth reached'
        USING ERRCODE = '23514';
    END IF;

    next_depth := parent_record.depth + 1;
  END IF;

  INSERT INTO public.community_comments (
    post_id,
    author_id,
    parent_comment_id,
    content,
    depth
  )
  VALUES (
    p_post_id,
    current_user_id,
    p_parent_comment_id,
    btrim(p_content),
    next_depth
  )
  RETURNING *
  INTO inserted_comment;

  RETURN QUERY
  SELECT
    inserted_comment.id,
    inserted_comment.post_id,
    inserted_comment.author_id,
    inserted_comment.parent_comment_id,
    inserted_comment.content,
    inserted_comment.depth,
    inserted_comment.created_at,
    inserted_comment.updated_at,
    profile.display_name AS author_display_name,
    profile.avatar_url AS author_avatar_url,
    (
      SELECT COUNT(*)::BIGINT
      FROM public.community_comments AS root
      WHERE root.post_id = p_post_id
        AND root.parent_comment_id IS NULL
    ) AS total_root_count
  FROM public.profiles AS profile
  WHERE profile.id = inserted_comment.author_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_community_reaction_v1(
  p_post_id UUID,
  p_reaction_type TEXT
)
RETURNS TABLE (
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  post_author_id UUID;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_reaction_type NOT IN ('HELPFUL', 'INTERESTING', 'CONFIRMED') THEN
    RAISE EXCEPTION 'Invalid reaction type'
      USING ERRCODE = '23514';
  END IF;

  SELECT post.author_id
  INTO post_author_id
  FROM public.community_posts AS post
  WHERE post.id = p_post_id;

  IF post_author_id IS NULL THEN
    RAISE EXCEPTION 'Post not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_reaction_type = 'CONFIRMED' AND post_author_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot confirm own post'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.community_reactions (
    post_id,
    user_id,
    reaction_type
  )
  VALUES (
    p_post_id,
    current_user_id,
    p_reaction_type
  )
  ON CONFLICT (post_id, user_id, reaction_type)
  DO NOTHING;

  RETURN QUERY
  SELECT *
  FROM public.community_reaction_summary(p_post_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_community_reaction_v1(
  p_post_id UUID,
  p_reaction_type TEXT
)
RETURNS TABLE (
  helpful_count INTEGER,
  interesting_count INTEGER,
  confirmed_count INTEGER,
  viewer_reactions TEXT[]
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, gis
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF p_reaction_type NOT IN ('HELPFUL', 'INTERESTING', 'CONFIRMED') THEN
    RAISE EXCEPTION 'Invalid reaction type'
      USING ERRCODE = '23514';
  END IF;

  DELETE FROM public.community_reactions
  WHERE post_id = p_post_id
    AND user_id = current_user_id
    AND reaction_type = p_reaction_type;

  RETURN QUERY
  SELECT *
  FROM public.community_reaction_summary(p_post_id);
END;
$$;

REVOKE ALL ON FUNCTION public.community_reaction_summary(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_feed_v3(INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_community_post_detail_v1(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_comments_v1(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_community_comment_v1(UUID, TEXT, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.add_community_reaction_v1(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_community_reaction_v1(UUID, TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.community_reaction_summary(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_feed_v3(INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_post_detail_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_comments_v1(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_comment_v1(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_community_reaction_v1(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_community_reaction_v1(UUID, TEXT) TO authenticated;
