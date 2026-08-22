
-- RPC for nearest UMKM
CREATE OR REPLACE FUNCTION public.find_umkm_nearby(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION,
    p_limit INTEGER DEFAULT 20,
    p_category VARCHAR DEFAULT NULL,
    p_environment VARCHAR DEFAULT 'DUMMY'
)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    category VARCHAR,
    description TEXT,
    geometry extensions.geometry,
    study_area_id UUID,
    environment VARCHAR,
    source_id UUID,
    source_record_id VARCHAR,
    data_version VARCHAR,
    metadata JSONB,
    validation_status VARCHAR,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        u.id, u.code, u.name, u.category, u.description, u.geometry, u.study_area_id, u.environment,
        u.source_id, u.source_record_id, u.data_version, u.metadata, u.validation_status, u.validated_at,
        u.created_at, u.updated_at,
        ST_Distance(
            u.geometry::geography, 
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) as distance_meters
    FROM public.umkm u
    WHERE u.environment = p_environment
    AND ST_DWithin(
        u.geometry::geography, 
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, 
        p_radius_meters
    )
    AND (p_category IS NULL OR u.category = p_category)
    ORDER BY u.geometry <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    LIMIT p_limit;
$$;

-- RPC for nearest POI
CREATE OR REPLACE FUNCTION public.find_pois_nearby(
    p_lat DOUBLE PRECISION,
    p_lng DOUBLE PRECISION,
    p_radius_meters DOUBLE PRECISION,
    p_limit INTEGER DEFAULT 20,
    p_category VARCHAR DEFAULT NULL,
    p_environment VARCHAR DEFAULT 'DUMMY'
)
RETURNS TABLE (
    id UUID,
    code VARCHAR,
    name VARCHAR,
    category VARCHAR,
    geometry extensions.geometry,
    study_area_id UUID,
    environment VARCHAR,
    source_id UUID,
    source_record_id VARCHAR,
    data_version VARCHAR,
    metadata JSONB,
    validation_status VARCHAR,
    validated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    distance_meters DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
    SELECT 
        p.id, p.code, p.name, p.category, p.geometry, p.study_area_id, p.environment,
        p.source_id, p.source_record_id, p.data_version, p.metadata, p.validation_status, p.validated_at,
        p.created_at, p.updated_at,
        ST_Distance(
            p.geometry::geography, 
            ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
        ) as distance_meters
    FROM public.pois p
    WHERE p.environment = p_environment
    AND ST_DWithin(
        p.geometry::geography, 
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography, 
        p_radius_meters
    )
    AND (p_category IS NULL OR p.category = p_category)
    ORDER BY p.geometry <-> ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    LIMIT p_limit;
$$;
