BEGIN;

ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deletion_actor_role TEXT;

ALTER TABLE public.community_posts DROP CONSTRAINT IF EXISTS community_posts_deletion_actor_role_check;
ALTER TABLE public.community_posts ADD CONSTRAINT community_posts_deletion_actor_role_check
  CHECK (deletion_actor_role IS NULL OR deletion_actor_role IN ('OWNER', 'ADMIN'));

CREATE TABLE IF NOT EXISTS public.community_post_deletion_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('OWNER', 'ADMIN')),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.community_post_deletion_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.community_post_deletion_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.community_post_deletion_audit TO service_role;

CREATE OR REPLACE FUNCTION public.delete_community_post_v1(p_post_id UUID)
RETURNS TABLE (deletion_actor_role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
  post_row public.community_posts%ROWTYPE;
  actor_class TEXT;
BEGIN
  IF actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO post_row FROM public.community_posts
    WHERE id = p_post_id AND moderation_status <> 'REMOVED' FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Community post not found' USING ERRCODE = 'P0002';
  END IF;
  IF post_row.author_id = actor_id THEN
    actor_class := 'OWNER';
  ELSIF public.community_is_admin() THEN
    actor_class := 'ADMIN';
  ELSE
    RAISE EXCEPTION 'Community post deletion forbidden' USING ERRCODE = '42501';
  END IF;
  UPDATE public.community_posts SET moderation_status = 'REMOVED', deleted_at = now(),
    deleted_by = actor_id, deletion_actor_role = actor_class WHERE id = p_post_id;
  INSERT INTO public.community_post_deletion_audit(post_id, author_id, actor_id, actor_role)
    VALUES (post_row.id, post_row.author_id, actor_id, actor_class);
  RETURN QUERY SELECT actor_class;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_community_post_v1(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_community_post_v1(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.analyze_route_umkm_corridor_v1(
  p_route_geojson JSONB,
  p_corridor_meters DOUBLE PRECISION DEFAULT 150
)
RETURNS TABLE (
  nearby_umkm_count INTEGER,
  verified_umkm_count INTEGER,
  distinct_category_count INTEGER
)
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public, extensions
AS $$
  WITH route AS (
    SELECT ST_SetSRID(ST_GeomFromGeoJSON(p_route_geojson::TEXT), 4326)::geography AS geography
    WHERE p_corridor_meters BETWEEN 25 AND 500
  )
  SELECT
    COUNT(DISTINCT merchant.id)::INTEGER,
    COUNT(DISTINCT merchant.id) FILTER (WHERE merchant.verification_status::TEXT = 'VERIFIED')::INTEGER,
    COUNT(DISTINCT category.category_id)::INTEGER
  FROM route
  LEFT JOIN public.merchants AS merchant
   ON merchant.publish_status::TEXT = 'PUBLISHED'
   AND EXISTS (
     SELECT 1
     FROM public.merchant_source_links AS source_link
     WHERE source_link.merchant_id = merchant.id
       AND source_link.source_table IN ('mapid_premium_merchants', 'mapid_mission_observations:MENU_GO')
   )
   AND ST_DWithin(merchant.location::geography, route.geography, p_corridor_meters)
  LEFT JOIN public.merchant_categories AS category ON category.merchant_id = merchant.id;
$$;

REVOKE ALL ON FUNCTION public.analyze_route_umkm_corridor_v1(JSONB, DOUBLE PRECISION) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.analyze_route_umkm_corridor_v1(JSONB, DOUBLE PRECISION) TO service_role;

COMMIT;
