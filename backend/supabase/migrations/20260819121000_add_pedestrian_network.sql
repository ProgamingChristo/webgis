-- Migration: Add Pedestrian Network Schema
-- Description: Tables for pedestrian routing graph (nodes, edges, and transport access links).

CREATE TABLE IF NOT EXISTS public.pedestrian_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_id BIGSERIAL UNIQUE NOT NULL,
    code VARCHAR(50) NOT NULL,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pedestrian_nodes_routing_id ON public.pedestrian_nodes(routing_id);
CREATE INDEX IF NOT EXISTS idx_pedestrian_nodes_geometry ON public.pedestrian_nodes USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_pedestrian_nodes_env ON public.pedestrian_nodes(environment);

CREATE TABLE IF NOT EXISTS public.pedestrian_edges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    routing_id BIGSERIAL UNIQUE NOT NULL,
    code VARCHAR(50) NOT NULL,
    
    -- Network topology
    source BIGINT NOT NULL REFERENCES public.pedestrian_nodes(routing_id) ON DELETE CASCADE,
    target BIGINT NOT NULL REFERENCES public.pedestrian_nodes(routing_id) ON DELETE CASCADE,
    
    geometry extensions.geometry(LineString, 4326) NOT NULL,
    length_meters NUMERIC NOT NULL CHECK (length_meters > 0),
    
    -- Routing weights
    cost NUMERIC NOT NULL CHECK (cost >= 0),
    reverse_cost NUMERIC NOT NULL,
    
    walkable BOOLEAN NOT NULL DEFAULT true,
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
    
    CONSTRAINT pedestrian_edges_source_target_check CHECK (source != target)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pedestrian_edges_routing_id ON public.pedestrian_edges(routing_id);
CREATE INDEX IF NOT EXISTS idx_pedestrian_edges_geometry ON public.pedestrian_edges USING GIST(geometry);
CREATE INDEX IF NOT EXISTS idx_pedestrian_edges_topology ON public.pedestrian_edges(source, target);
CREATE INDEX IF NOT EXISTS idx_pedestrian_edges_env ON public.pedestrian_edges(environment);

CREATE TABLE IF NOT EXISTS public.transport_access_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transport_node_id UUID NOT NULL REFERENCES public.transport_nodes(id) ON DELETE CASCADE,
    pedestrian_node_id UUID NOT NULL REFERENCES public.pedestrian_nodes(id) ON DELETE CASCADE,
    distance_meters NUMERIC NOT NULL CHECK (distance_meters >= 0),
    environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    UNIQUE (transport_node_id, pedestrian_node_id)
);

CREATE INDEX IF NOT EXISTS idx_transport_access_links_env ON public.transport_access_links(environment);

-- Row Level Security
ALTER TABLE public.pedestrian_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedestrian_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_access_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on pedestrian_nodes"
    ON public.pedestrian_nodes FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on pedestrian_edges"
    ON public.pedestrian_edges FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access on transport_access_links"
    ON public.transport_access_links FOR SELECT
    USING (true);
