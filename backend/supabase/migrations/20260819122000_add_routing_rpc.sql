-- Migration: Add pgRouting RPC wrappers
-- Description: Creates the calculate_walking_route RPC that invokes pgRouting

CREATE OR REPLACE FUNCTION public.calculate_walking_route(
    p_origin_id BIGINT,
    p_destination_id BIGINT,
    p_environment VARCHAR DEFAULT 'DUMMY'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    route_result JSONB;
BEGIN
    -- Ensure pgrouting extension is available (should be from previous migration)
    -- This function wraps pgr_dijkstra

    WITH route AS (
        SELECT * FROM pgr_dijkstra(
            'SELECT routing_id AS id, source, target, cost, reverse_cost FROM public.pedestrian_edges WHERE environment = ''' || p_environment || '''',
            p_origin_id,
            p_destination_id,
            directed := true
        )
    ),
    route_geom AS (
        SELECT 
            ST_MakeLine(e.geometry) AS geom,
            SUM(e.length_meters) AS total_distance,
            array_agg(e.id) AS edge_ids
        FROM route r
        JOIN public.pedestrian_edges e ON r.edge = e.routing_id
        WHERE r.edge != -1
    )
    SELECT jsonb_build_object(
        'origin_node_id', p_origin_id,
        'destination_node_id', p_destination_id,
        'edge_ids', rg.edge_ids,
        'total_distance_meters', rg.total_distance,
        'total_duration_seconds', (rg.total_distance / 1.4), -- 1.4 m/s walking speed
        'geometry', ST_AsGeoJSON(rg.geom)::jsonb
    ) INTO route_result
    FROM route_geom rg;

    IF route_result IS NULL THEN
        RETURN jsonb_build_object('error', 'No route found');
    END IF;

    RETURN route_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.calculate_walking_route(BIGINT, BIGINT, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_walking_route(BIGINT, BIGINT, VARCHAR) TO service_role;

-- RPC: Snap Transport Node to Pedestrian Network
-- Description: Finds the nearest pedestrian node to a transport node and creates an access link.

CREATE OR REPLACE FUNCTION public.snap_transport_node_to_pedestrian_network(
    p_transport_node_id UUID,
    p_max_distance_meters NUMERIC DEFAULT 50,
    p_environment VARCHAR DEFAULT 'DUMMY'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    nearest_pedestrian_node RECORD;
    new_link_id UUID;
BEGIN
    -- Find the nearest pedestrian node within max distance
    SELECT 
        pn.id,
        pn.code,
        ST_Distance(tn.geometry::geography, pn.geometry::geography) AS distance_meters
    INTO nearest_pedestrian_node
    FROM public.transport_nodes tn
    CROSS JOIN LATERAL (
        SELECT id, code, geometry
        FROM public.pedestrian_nodes
        WHERE environment = p_environment
        ORDER BY tn.geometry <-> geometry
        LIMIT 1
    ) pn
    WHERE tn.id = p_transport_node_id
      AND ST_Distance(tn.geometry::geography, pn.geometry::geography) <= p_max_distance_meters;

    IF nearest_pedestrian_node IS NULL THEN
        RETURN jsonb_build_object('error', 'No pedestrian node found within the maximum distance.');
    END IF;

    -- Upsert the access link
    INSERT INTO public.transport_access_links (
        transport_node_id,
        pedestrian_node_id,
        distance_meters,
        environment
    ) VALUES (
        p_transport_node_id,
        nearest_pedestrian_node.id,
        nearest_pedestrian_node.distance_meters,
        p_environment
    )
    ON CONFLICT (transport_node_id, pedestrian_node_id) 
    DO UPDATE SET 
        distance_meters = EXCLUDED.distance_meters,
        updated_at = NOW()
    RETURNING id INTO new_link_id;

    RETURN jsonb_build_object(
        'success', true,
        'link_id', new_link_id,
        'pedestrian_node_id', nearest_pedestrian_node.id,
        'distance_meters', nearest_pedestrian_node.distance_meters
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.snap_transport_node_to_pedestrian_network(UUID, NUMERIC, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION public.snap_transport_node_to_pedestrian_network(UUID, NUMERIC, VARCHAR) TO service_role;

