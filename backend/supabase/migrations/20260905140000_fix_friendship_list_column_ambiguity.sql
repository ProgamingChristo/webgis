-- Qualify CTE columns that otherwise collide with PL/pgSQL output variables.
-- CREATE OR REPLACE preserves the existing function owner and execution grants.
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
      CASE WHEN friendship.requester_id = current_user_id
        THEN friendship.addressee_id ELSE friendship.requester_id END AS other_user_id,
      CASE WHEN friendship.requester_id = current_user_id
        THEN 'OUTGOING' ELSE 'INCOMING' END AS direction
    FROM public.community_friendships AS friendship
    WHERE friendship.requester_id = current_user_id
       OR friendship.addressee_id = current_user_id
  ),
  filtered AS (
    SELECT scoped.*, COUNT(*) OVER() AS total_count
    FROM scoped
    WHERE (p_view = 'FRIENDS' AND scoped.status = 'ACCEPTED')
       OR (p_view = 'INCOMING' AND scoped.status = 'PENDING' AND scoped.direction = 'INCOMING')
       OR (p_view = 'OUTGOING' AND scoped.status = 'PENDING' AND scoped.direction = 'OUTGOING')
    ORDER BY scoped.updated_at DESC, scoped.id DESC
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
