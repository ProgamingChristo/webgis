-- Migration: Add UMKM and POI Foundation
-- Description: Tables for UMKM and POI dummy data ingestion, including entity network access links.

CREATE TABLE IF NOT EXISTS public.umkm (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    geometry extensions.geometry(Point, 4326) NOT NULL,
    study_area_id UUID NOT NULL REFERENCES public.study_areas(id) ON DELETE CASCADE,
    
    -- Provenance metadata
    source_id UUID NOT NULL REFERENCES public.spatial_sources(id),
    source_record_id VARCHAR(100),
    data_version VARCHAR(50) NOT NULL DEFAULT '1',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION',
    validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    validated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT umkm_code_env_unique UNIQUE (environment, code)
);

CREATE INDEX IF NOT EXISTS idx_umkm_geometry ON public.umkm USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_umkm_category ON public.umkm(category);
CREATE INDEX IF NOT EXISTS idx_umkm_study_area ON public.umkm(study_area_id);
CREATE INDEX IF NOT EXISTS idx_umkm_environment ON public.umkm(environment);

CREATE TABLE IF NOT EXISTS public.pois (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    geometry extensions.geometry(Point, 4326) NOT NULL,
    study_area_id UUID NOT NULL REFERENCES public.study_areas(id) ON DELETE CASCADE,
    
    -- Provenance metadata
    source_id UUID NOT NULL REFERENCES public.spatial_sources(id),
    source_record_id VARCHAR(100),
    data_version VARCHAR(50) NOT NULL DEFAULT '1',
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION',
    validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    validated_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT pois_code_env_unique UNIQUE (environment, code)
);

CREATE INDEX IF NOT EXISTS idx_pois_geometry ON public.pois USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_pois_category ON public.pois(category);
CREATE INDEX IF NOT EXISTS idx_pois_study_area ON public.pois(study_area_id);
CREATE INDEX IF NOT EXISTS idx_pois_environment ON public.pois(environment);

CREATE TABLE IF NOT EXISTS public.entity_network_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(20) NOT NULL, -- 'UMKM' or 'POI'
    entity_id UUID NOT NULL,
    pedestrian_node_id UUID NOT NULL REFERENCES public.pedestrian_nodes(id) ON DELETE CASCADE,
    snap_distance_meters FLOAT NOT NULL,
    environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT entity_network_access_type_check CHECK (entity_type IN ('UMKM', 'POI')),
    CONSTRAINT entity_network_access_unique UNIQUE (entity_type, entity_id, environment)
);

CREATE INDEX IF NOT EXISTS idx_entity_network_access_entity ON public.entity_network_access(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_network_access_node ON public.entity_network_access(pedestrian_node_id);

-- RLS Policies
ALTER TABLE public.umkm ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pois ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_network_access ENABLE ROW LEVEL SECURITY;

-- Allow read access to authenticated users
CREATE POLICY "Allow authenticated read access to umkm"
    ON public.umkm FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access to pois"
    ON public.pois FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Allow authenticated read access to entity_network_access"
    ON public.entity_network_access FOR SELECT TO authenticated
    USING (true);

-- Allow service role full access
GRANT ALL ON TABLE public.umkm TO service_role;
GRANT ALL ON TABLE public.pois TO service_role;
GRANT ALL ON TABLE public.entity_network_access TO service_role;
