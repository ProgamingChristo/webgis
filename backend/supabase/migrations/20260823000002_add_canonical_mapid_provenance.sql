-- Migration: Add Canonical MAPID Provenance to Transport Nodes
-- Description: Adds provenance tracking fields and unique constraints to spatial foundation models.

-- Add provenance fields to transport_nodes
ALTER TABLE public.transport_nodes
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS data_version VARCHAR(50) NOT NULL DEFAULT '1',
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION',
    ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

-- We need a UNIQUE constraint to safely deduplicate canonical entities upon map run.
-- If the external provider changes the node, we can UPSERT based on (source_id, source_record_id).
ALTER TABLE public.transport_nodes
    ADD CONSTRAINT transport_nodes_source_record_unique UNIQUE (source_id, source_record_id, environment);

-- Also add to transport_corridors if needed in future
ALTER TABLE public.transport_corridors
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS data_version VARCHAR(50) NOT NULL DEFAULT '1',
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION',
    ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

ALTER TABLE public.transport_corridors
    ADD CONSTRAINT transport_corridors_source_record_unique UNIQUE (source_id, source_record_id, environment);

-- Also add to study_areas if needed in future
ALTER TABLE public.study_areas
    ADD COLUMN IF NOT EXISTS source_record_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS data_version VARCHAR(50) NOT NULL DEFAULT '1',
    ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS environment VARCHAR(20) NOT NULL DEFAULT 'PRODUCTION',
    ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ADD COLUMN IF NOT EXISTS validated_at TIMESTAMPTZ;

ALTER TABLE public.study_areas
    ADD CONSTRAINT study_areas_source_record_unique UNIQUE (source_id, source_record_id, environment);
