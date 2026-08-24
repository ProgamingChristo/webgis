DROP FUNCTION IF EXISTS public.list_community_notifications_v1(INTEGER, INTEGER);

CREATE FUNCTION public.list_community_notifications_v1(
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  type TEXT,
  entity_type TEXT,
  entity_id UUID,
  actor_user_id UUID,
  actor_display_name TEXT,
  actor_avatar_url TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH paged AS (
    SELECT notification.*, COUNT(*) OVER() AS total_count
    FROM public.community_notifications AS notification
    WHERE notification.recipient_user_id = auth.uid()
    ORDER BY notification.created_at DESC, notification.id DESC
    LIMIT LEAST(GREATEST(p_limit, 1), 50)
    OFFSET GREATEST(p_offset, 0)
  )
  SELECT
    paged.id,
    paged.type,
    paged.entity_type,
    paged.entity_id,
    paged.actor_user_id,
    profile.display_name AS actor_display_name,
    profile.avatar_url AS actor_avatar_url,
    paged.metadata,
    paged.created_at,
    paged.read_at,
    paged.total_count
  FROM paged
  LEFT JOIN public.profiles AS profile
    ON profile.id = paged.actor_user_id
  ORDER BY paged.created_at DESC, paged.id DESC;
$$;

REVOKE ALL ON FUNCTION public.list_community_notifications_v1(INTEGER, INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_community_notifications_v1(INTEGER, INTEGER) TO authenticated;
