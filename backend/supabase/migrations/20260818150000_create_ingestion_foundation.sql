-- Phase 8: Data Ingestion Foundation

-- 1. Create Enums
CREATE TYPE public.data_environment AS ENUM ('PRODUCTION', 'DUMMY', 'FIXTURE', 'TEST', 'DEV');
CREATE TYPE public.import_job_status AS ENUM ('PENDING', 'RUNNING', 'VALIDATING', 'COMPLETED', 'FAILED', 'PARTIAL', 'CANCELLED');

-- 2. Create data_sources Table
-- Registers external/internal providers for data provenance and idempotency
CREATE TABLE public.data_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    environment public.data_environment NOT NULL DEFAULT 'FIXTURE',
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create import_jobs Table
-- Tracks the lifecycle of an ingestion run
CREATE TABLE public.import_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_source_id UUID NOT NULL REFERENCES public.data_sources(id) ON DELETE RESTRICT,
    environment public.data_environment NOT NULL,
    status public.import_job_status NOT NULL DEFAULT 'PENDING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_dry_run BOOLEAN NOT NULL DEFAULT false,
    
    -- Metrics
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    failed_records INTEGER NOT NULL DEFAULT 0,
    inserted_records INTEGER NOT NULL DEFAULT 0,
    updated_records INTEGER NOT NULL DEFAULT 0,
    
    -- Logs & Errors
    error_log JSONB,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_data_sources_environment ON public.data_sources(environment);
CREATE INDEX idx_import_jobs_data_source_id ON public.import_jobs(data_source_id);
CREATE INDEX idx_import_jobs_status ON public.import_jobs(status);
CREATE INDEX idx_import_jobs_environment ON public.import_jobs(environment);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_data_sources
    BEFORE UPDATE ON public.data_sources
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_import_jobs
    BEFORE UPDATE ON public.import_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Only authenticated admins or service_role can access these tables.
-- For now, we allow service_role bypass and explicit admin checks if needed.
-- We will use service_role primarily for ingestion backend.
CREATE POLICY "Allow Service Role full access on data_sources" 
    ON public.data_sources 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow Service Role full access on import_jobs" 
    ON public.import_jobs 
    FOR ALL 
    TO service_role 
    USING (true) 
    WITH CHECK (true);

-- Admins can view/manage data_sources
CREATE POLICY "Allow Admins full access on data_sources"
    ON public.data_sources
    FOR ALL
    TO authenticated
    USING ((SELECT private.is_admin()))
    WITH CHECK ((SELECT private.is_admin()));

-- Admins can view/manage import_jobs
CREATE POLICY "Allow Admins full access on import_jobs"
    ON public.import_jobs
    FOR ALL
    TO authenticated
    USING ((SELECT private.is_admin()))
    WITH CHECK ((SELECT private.is_admin()));
