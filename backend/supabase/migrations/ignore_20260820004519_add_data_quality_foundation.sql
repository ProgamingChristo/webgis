-- Migration: Add Data Quality and Golden Dataset Foundation
-- Description: Tables to manage dataset versions, logical snapshots, and quality run results.

-- 1. Dataset Version Status Enum
DO $$ BEGIN
    CREATE TYPE public.dataset_version_status AS ENUM (
        'DRAFT',
        'VALIDATING',
        'READY',
        'ACTIVE',
        'ARCHIVED',
        'VALIDATION_FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Quality Run Status Enum
DO $$ BEGIN
    CREATE TYPE public.quality_run_status AS ENUM (
        'RUNNING',
        'PASS',
        'WARN',
        'FAIL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Dataset Versions Table
CREATE TABLE IF NOT EXISTS public.dataset_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) UNIQUE NOT NULL, -- e.g. GETRA_DUMMY_GOLDEN_V1
    version VARCHAR(50) NOT NULL,
    environment public.data_environment NOT NULL,
    status public.dataset_version_status NOT NULL DEFAULT 'DRAFT',
    description TEXT,
    manifest JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores included sources, snapshot config
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Quality Runs Table
CREATE TABLE IF NOT EXISTS public.quality_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dataset_version_id UUID NOT NULL REFERENCES public.dataset_versions(id) ON DELETE CASCADE,
    environment public.data_environment NOT NULL,
    status public.quality_run_status NOT NULL DEFAULT 'RUNNING',
    total_checks INTEGER NOT NULL DEFAULT 0,
    passed_checks INTEGER NOT NULL DEFAULT 0,
    warning_checks INTEGER NOT NULL DEFAULT 0,
    failed_checks INTEGER NOT NULL DEFAULT 0,
    critical_failures INTEGER NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ
);

-- 5. Quality Check Results Table
CREATE TABLE IF NOT EXISTS public.quality_check_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quality_run_id UUID NOT NULL REFERENCES public.quality_runs(id) ON DELETE CASCADE,
    check_code VARCHAR(100) NOT NULL, -- e.g. 'CHK_STUDY_AREA_GEOM'
    category VARCHAR(50) NOT NULL,    -- e.g. 'SPATIAL', 'SCHEMA', 'PROVENANCE'
    status VARCHAR(20) NOT NULL,      -- 'PASS', 'WARN', 'FAIL'
    is_critical BOOLEAN NOT NULL DEFAULT false,
    message TEXT NOT NULL,
    total_records INTEGER,
    affected_records INTEGER,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.dataset_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_check_results ENABLE ROW LEVEL SECURITY;

-- Service Role full access policies (Internal admin use)
CREATE POLICY "Service Role full access on dataset_versions" 
    ON public.dataset_versions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service Role full access on quality_runs" 
    ON public.quality_runs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service Role full access on quality_check_results" 
    ON public.quality_check_results FOR ALL USING (true) WITH CHECK (true);

-- Indexes for querying
CREATE INDEX IF NOT EXISTS idx_dataset_versions_env ON public.dataset_versions(environment);
CREATE INDEX IF NOT EXISTS idx_quality_runs_dataset ON public.quality_runs(dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_quality_check_results_run ON public.quality_check_results(quality_run_id);
