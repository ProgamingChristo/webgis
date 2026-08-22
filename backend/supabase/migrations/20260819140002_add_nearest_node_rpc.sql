
-- RPC to find nearest pedestrian node
CREATE OR REPLACE FUNCTION public.find_nearest_pedestrian_node(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION,
    p_environment VARCHAR DEFAULT 'DUMMY'
)
RETURNS TABLE (
    id UUID,
    routing_id BIGINT,
    code VARCHAR,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        n.id, n.routing_id, n.code,
        ST_Distance(
            n.geometry::geography, 
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) as distance_meters
    FROM public.pedestrian_nodes n
    WHERE n.environment = p_environment
    AND ST_DWithin(
        n.geometry::geography, 
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, 
        p_radius_meters
    )
    ORDER BY n.geometry <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    LIMIT 1;
$$;
