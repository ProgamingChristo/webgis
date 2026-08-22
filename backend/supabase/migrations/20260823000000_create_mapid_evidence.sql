-- Phase 6: MAPID Ingestion Evidence Foundation

CREATE TABLE public.raw_mapid_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_record_id TEXT NOT NULL,
    activity_type TEXT NOT NULL,
    raw_payload JSONB NOT NULL,
    provider_timestamp TIMESTAMPTZ,
    retrieved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    import_job_id UUID REFERENCES public.import_jobs(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique constraint to guarantee idempotency on ingestion
ALTER TABLE public.raw_mapid_evidence ADD CONSTRAINT raw_mapid_evidence_external_id_key UNIQUE (external_record_id);

CREATE TABLE public.staging_mapid_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    raw_evidence_id UUID NOT NULL REFERENCES public.raw_mapid_evidence(id) ON DELETE CASCADE,
    normalized_geometry extensions.geometry(Point, 4326),
    normalized_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    validation_status TEXT NOT NULL DEFAULT 'VALID',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices
CREATE INDEX idx_raw_mapid_activity ON public.raw_mapid_evidence(activity_type);
CREATE INDEX idx_staging_mapid_raw_evidence ON public.staging_mapid_activities(raw_evidence_id);

-- Triggers for updated_at
CREATE TRIGGER handle_updated_at_raw_mapid_evidence
    BEFORE UPDATE ON public.raw_mapid_evidence
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_updated_at_staging_mapid_activities
    BEFORE UPDATE ON public.staging_mapid_activities
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- RLS Policies
ALTER TABLE public.raw_mapid_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staging_mapid_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow Service Role full access on raw_mapid_evidence" 
    ON public.raw_mapid_evidence FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Allow Service Role full access on staging_mapid_activities" 
    ON public.staging_mapid_activities FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Admins can view raw evidence
CREATE POLICY "Allow Admins select access on raw_mapid_evidence"
    ON public.raw_mapid_evidence FOR SELECT TO authenticated
    USING ((SELECT private.is_admin()));

CREATE POLICY "Allow Admins select access on staging_mapid_activities"
    ON public.staging_mapid_activities FOR SELECT TO authenticated
    USING ((SELECT private.is_admin()));
