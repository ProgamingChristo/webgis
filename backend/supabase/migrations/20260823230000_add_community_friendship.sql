DO $$
BEGIN
  ALTER TABLE public.community_notifications
    DROP CONSTRAINT IF EXISTS community_notifications_type_check;
  ALTER TABLE public.community_notifications
    ADD CONSTRAINT community_notifications_type_check
    CHECK (type IN (
      'POST_REPLY',
      'COMMENT_REPLY',
      'POST_CONFIRMED',
      'UMKM_RESPONSE',
      'FRIEND_REQUEST',
      'FRIEND_ACCEPTED'
    ));

  ALTER TABLE public.community_notifications
    DROP CONSTRAINT IF EXISTS community_notifications_entity_type_check;
  ALTER TABLE public.community_notifications
    ADD CONSTRAINT community_notifications_entity_type_check
    CHECK (entity_type IN ('POST', 'COMMENT', 'DEMAND_SIGNAL', 'UMKM_RESPONSE', 'FRIENDSHIP'));

  ALTER TABLE public.community_realtime_events
    DROP CONSTRAINT IF EXISTS community_realtime_events_topic_check;
  ALTER TABLE public.community_realtime_events
    ADD CONSTRAINT community_realtime_events_topic_check
    CHECK (topic IN ('POST', 'SIGNAL', 'NOTIFICATION', 'SOCIAL'));
END $$;

CREATE TABLE IF NOT EXISTS public.community_friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  CHECK (requester_id <> addressee_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS community_friendships_unordered_pair_idx
  ON public.community_friendships (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
  );

CREATE INDEX IF NOT EXISTS community_friendships_requester_idx
  ON public.community_friendships (requester_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS community_friendships_addressee_idx
  ON public.community_friendships (addressee_id, status, updated_at DESC);

ALTER TABLE public.community_friendships ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'community_friendships'
      AND policyname = 'community_friendships_participant_select'
  ) THEN
    CREATE POLICY community_friendships_participant_select
      ON public.community_friendships
      FOR SELECT
      TO authenticated
      USING (requester_id = auth.uid() OR addressee_id = auth.uid());
  END IF;
END $$;

REVOKE ALL ON public.community_friendships FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.community_friendships TO authenticated;

CREATE OR REPLACE FUNCTION public.community_touch_friendship()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS community_friendships_touch_updated_at
  ON public.community_friendships;

CREATE TRIGGER community_friendships_touch_updated_at
  BEFORE UPDATE ON public.community_friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.community_touch_friendship();

CREATE OR REPLACE FUNCTION public.community_emit_social_event(
  p_friendship_id UUID,
  p_recipient_user_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.community_emit_realtime_event(
    'SOCIAL',
    'FRIENDSHIP',
    p_friendship_id,
    NULL,
    NULL,
    p_recipient_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_community_friendship_profile_v1(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  reputation_label TEXT,
  confirmed_contributions INTEGER,
  helpful_received INTEGER,
  findings_count INTEGER,
  friend_count INTEGER,
  relationship_state TEXT,
  friendship_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH reputation AS (
    SELECT *
    FROM public.get_community_reputation_v1(p_user_id)
  ),
  relation AS (
    SELECT friendship.*
    FROM public.community_friendships AS friendship
    WHERE (friendship.requester_id = current_user_id AND friendship.addressee_id = p_user_id)
       OR (friendship.requester_id = p_user_id AND friendship.addressee_id = current_user_id)
    LIMIT 1
  )
  SELECT
    profile.id AS user_id,
    profile.display_name,
    profile.avatar_url,
    COALESCE(reputation.reputation_label, 'Kontributor Baru') AS reputation_label,
    COALESCE(reputation.confirmed_contributions, 0)::INTEGER AS confirmed_contributions,
    COALESCE(reputation.helpful_received, 0)::INTEGER AS helpful_received,
    COALESCE(reputation.findings_count, 0)::INTEGER AS findings_count,
    (
      SELECT COUNT(*)::INTEGER
      FROM public.community_friendships AS accepted
      WHERE accepted.status = 'ACCEPTED'
        AND (accepted.requester_id = profile.id OR accepted.addressee_id = profile.id)
    ) AS friend_count,
    CASE
      WHEN profile.id = current_user_id THEN 'SELF'
      WHEN relation.status = 'ACCEPTED' THEN 'FRIENDS'
      WHEN relation.status = 'PENDING' AND relation.requester_id = current_user_id THEN 'PENDING_OUTGOING'
      WHEN relation.status = 'PENDING' AND relation.addressee_id = current_user_id THEN 'PENDING_INCOMING'
      ELSE 'NONE'
    END AS relationship_state,
    relation.id AS friendship_id
  FROM public.profiles AS profile
  LEFT JOIN reputation ON reputation.user_id = profile.id
  LEFT JOIN relation ON TRUE
  WHERE profile.id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_community_friend_request_v1(
  p_user_id UUID
)
RETURNS TABLE (
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  reputation_label TEXT,
  confirmed_contributions INTEGER,
  helpful_received INTEGER,
  findings_count INTEGER,
  friend_count INTEGER,
  relationship_state TEXT,
  friendship_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  friendship_record public.community_friendships%ROWTYPE;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_user_id = current_user_id THEN
    RAISE EXCEPTION 'Cannot friend yourself' USING ERRCODE = '23514';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Target user not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO friendship_record
  FROM public.community_friendships AS friendship
  WHERE (friendship.requester_id = current_user_id AND friendship.addressee_id = p_user_id)
     OR (friendship.requester_id = p_user_id AND friendship.addressee_id = current_user_id)
  LIMIT 1;

  IF friendship_record.id IS NULL THEN
    INSERT INTO public.community_friendships (requester_id, addressee_id, status)
    VALUES (current_user_id, p_user_id, 'PENDING')
    RETURNING * INTO friendship_record;
  ELSIF friendship_record.status IN ('DECLINED', 'CANCELLED') THEN
    UPDATE public.community_friendships
    SET requester_id = current_user_id,
        addressee_id = p_user_id,
        status = 'PENDING',
        responded_at = NULL
    WHERE id = friendship_record.id
    RETURNING * INTO friendship_record;
  ELSE
    RAISE EXCEPTION 'Friendship request already active' USING ERRCODE = '23514';
  END IF;

  PERFORM public.community_create_notification(
    p_user_id,
    current_user_id,
    'FRIEND_REQUEST',
    'FRIENDSHIP',
    friendship_record.id,
    '{}'::jsonb
  );
  PERFORM public.community_emit_social_event(friendship_record.id, current_user_id);
  PERFORM public.community_emit_social_event(friendship_record.id, p_user_id);

  RETURN QUERY SELECT * FROM public.get_community_friendship_profile_v1(p_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.act_on_community_friendship_v1(
  p_friendship_id UUID,
  p_action TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
  friendship_record public.community_friendships%ROWTYPE;
  next_status TEXT;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO friendship_record
  FROM public.community_friendships
  WHERE id = p_friendship_id;

  IF friendship_record.id IS NULL THEN
    RAISE EXCEPTION 'Friendship not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_action = 'ACCEPT' THEN
    IF friendship_record.status <> 'PENDING' OR friendship_record.addressee_id <> current_user_id THEN
      RAISE EXCEPTION 'Only addressee can accept pending request' USING ERRCODE = '42501';
    END IF;
    next_status := 'ACCEPTED';
  ELSIF p_action = 'DECLINE' THEN
    IF friendship_record.status <> 'PENDING' OR friendship_record.addressee_id <> current_user_id THEN
      RAISE EXCEPTION 'Only addressee can decline pending request' USING ERRCODE = '42501';
    END IF;
    next_status := 'DECLINED';
  ELSIF p_action = 'CANCEL' THEN
    IF friendship_record.status <> 'PENDING' OR friendship_record.requester_id <> current_user_id THEN
      RAISE EXCEPTION 'Only requester can cancel pending request' USING ERRCODE = '42501';
    END IF;
    next_status := 'CANCELLED';
  ELSIF p_action = 'UNFRIEND' THEN
    IF friendship_record.status <> 'ACCEPTED'
      OR (friendship_record.requester_id <> current_user_id AND friendship_record.addressee_id <> current_user_id) THEN
      RAISE EXCEPTION 'Only participants can unfriend accepted friendship' USING ERRCODE = '42501';
    END IF;
    next_status := 'CANCELLED';
  ELSE
    RAISE EXCEPTION 'Invalid friendship action' USING ERRCODE = '23514';
  END IF;

  UPDATE public.community_friendships
  SET status = next_status,
      responded_at = CASE WHEN next_status IN ('ACCEPTED', 'DECLINED', 'CANCELLED') THEN now() ELSE responded_at END
  WHERE id = friendship_record.id
  RETURNING * INTO friendship_record;

  IF p_action = 'ACCEPT' THEN
    PERFORM public.community_create_notification(
      friendship_record.requester_id,
      current_user_id,
      'FRIEND_ACCEPTED',
      'FRIENDSHIP',
      friendship_record.id,
      '{}'::jsonb
    );
  END IF;

  PERFORM public.community_emit_social_event(friendship_record.id, friendship_record.requester_id);
  PERFORM public.community_emit_social_event(friendship_record.id, friendship_record.addressee_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.list_community_friendships_v1(
  p_view TEXT DEFAULT 'FRIENDS',
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  friendship_id UUID,
  user_id UUID,
  display_name TEXT,
  avatar_url TEXT,
  status TEXT,
  direction TEXT,
  updated_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF p_view NOT IN ('FRIENDS', 'INCOMING', 'OUTGOING') THEN
    RAISE EXCEPTION 'Invalid friendship view' USING ERRCODE = '23514';
  END IF;

  RETURN QUERY
  WITH scoped AS (
    SELECT
      friendship.*,
      CASE
        WHEN friendship.requester_id = current_user_id THEN friendship.addressee_id
        ELSE friendship.requester_id
      END AS other_user_id,
      CASE
        WHEN friendship.requester_id = current_user_id THEN 'OUTGOING'
        ELSE 'INCOMING'
      END AS direction
    FROM public.community_friendships AS friendship
    WHERE friendship.requester_id = current_user_id
       OR friendship.addressee_id = current_user_id
  ),
  filtered AS (
    SELECT *, COUNT(*) OVER() AS total_count
    FROM scoped
    WHERE (p_view = 'FRIENDS' AND status = 'ACCEPTED')
       OR (p_view = 'INCOMING' AND status = 'PENDING' AND direction = 'INCOMING')
       OR (p_view = 'OUTGOING' AND status = 'PENDING' AND direction = 'OUTGOING')
    ORDER BY updated_at DESC, id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    filtered.id AS friendship_id,
    profile.id AS user_id,
    profile.display_name,
    profile.avatar_url,
    filtered.status,
    filtered.direction,
    filtered.updated_at,
    filtered.total_count
  FROM filtered
  JOIN public.profiles AS profile ON profile.id = filtered.other_user_id
  ORDER BY filtered.updated_at DESC, filtered.id DESC;
END;
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
    SELECT 1
    FROM public.community_posts AS post
    WHERE post.id = p_post_id
      AND COALESCE(post.moderation_status, 'ACTIVE') NOT IN ('HIDDEN', 'REMOVED')
  ) THEN
    RAISE EXCEPTION 'Post not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF p_parent_comment_id IS NOT NULL THEN
    SELECT *
    INTO parent_record
    FROM public.community_comments AS comment
    WHERE comment.id = p_parent_comment_id
      AND COALESCE(comment.moderation_status, 'ACTIVE') NOT IN ('HIDDEN', 'REMOVED');

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
        AND COALESCE(root.moderation_status, 'ACTIVE') NOT IN ('HIDDEN', 'REMOVED')
    ) AS total_root_count
  FROM public.profiles AS profile
  WHERE profile.id = inserted_comment.author_id;
END;
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
    JOIN public.community_posts AS post ON post.id = comment.post_id
    WHERE comment.post_id = p_post_id
      AND comment.parent_comment_id IS NULL
      AND post.moderation_status NOT IN ('HIDDEN', 'REMOVED')
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
    CASE
      WHEN comment.moderation_status IN ('HIDDEN', 'REMOVED') THEN 'Komentar tidak tersedia.'
      ELSE comment.content
    END AS content,
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

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.community_friendships;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

REVOKE ALL ON FUNCTION public.community_emit_social_event(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_community_friendship_profile_v1(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_community_friend_request_v1(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.act_on_community_friendship_v1(UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_community_friendships_v1(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_community_friendship_profile_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_community_friend_request_v1(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.act_on_community_friendship_v1(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_community_friendships_v1(TEXT, INTEGER, INTEGER) TO authenticated;
