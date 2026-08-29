-- Phase 01: Backend-to-backend MAPID Mission data integration.
-- Additive model for Menu Go, Struk Go, Properti Go, and Activities observations.

CREATE TABLE IF NOT EXISTS public.mapid_mission_sync_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  pages_fetched INTEGER NOT NULL DEFAULT 0,
  records_fetched INTEGER NOT NULL DEFAULT 0,
  inserted_records INTEGER NOT NULL DEFAULT 0,
  updated_records INTEGER NOT NULL DEFAULT 0,
  skipped_records INTEGER NOT NULL DEFAULT 0,
  invalid_records INTEGER NOT NULL DEFAULT 0,
  failed_records INTEGER NOT NULL DEFAULT 0,
  error_log JSONB,
  request_context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mapid_mission_sync_runs_source_type_check
    CHECK (source_type IN ('MENU_GO', 'STRUK_GO', 'PROPERTI_GO', 'ACTIVITIES')),
  CONSTRAINT mapid_mission_sync_runs_status_check
    CHECK (status IN ('RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'BLOCKED'))
);

CREATE TABLE IF NOT EXISTS public.mapid_mission_observations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type TEXT NOT NULL,
  source_record_id TEXT NOT NULL,
  mission_name TEXT,
  geometry extensions.geometry(Point, 4326) NOT NULL,
  normalized_properties JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw_payload JSONB NOT NULL,
  raw_payload_checksum TEXT NOT NULL,
  observed_at TIMESTAMPTZ,
  provider_updated_at TIMESTAMPTZ,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_status TEXT NOT NULL DEFAULT 'SOURCE_OBSERVED',
  freshness_status TEXT NOT NULL DEFAULT 'UNKNOWN',
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  latest_sync_run_id UUID REFERENCES public.mapid_mission_sync_runs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT mapid_mission_observations_source_type_check
    CHECK (source_type IN ('MENU_GO', 'STRUK_GO', 'PROPERTI_GO', 'ACTIVITIES')),
  CONSTRAINT mapid_mission_observations_verification_status_check
    CHECK (verification_status IN ('SOURCE_OBSERVED', 'IMPORTED', 'UNVERIFIED', 'VERIFIED', 'NEEDS_REVIEW')),
  CONSTRAINT mapid_mission_observations_freshness_status_check
    CHECK (freshness_status IN ('FRESH', 'STALE', 'UNKNOWN')),
  CONSTRAINT mapid_mission_observations_source_identity_key
    UNIQUE (source_type, source_record_id),
  CONSTRAINT mapid_mission_observations_geometry_point_check
    CHECK (
      extensions.GeometryType(geometry) = 'POINT'
      AND extensions.ST_SRID(geometry) = 4326
    )
);

CREATE INDEX IF NOT EXISTS idx_mapid_mission_sync_runs_source_started
  ON public.mapid_mission_sync_runs (source_type, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_mapid_mission_observations_source_seen
  ON public.mapid_mission_observations (source_type, last_seen_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_mapid_mission_observations_geometry
  ON public.mapid_mission_observations USING GIST (geometry);

CREATE INDEX IF NOT EXISTS idx_mapid_mission_observations_observed
  ON public.mapid_mission_observations (observed_at DESC)
  WHERE observed_at IS NOT NULL;

DROP TRIGGER IF EXISTS handle_updated_at_mapid_mission_sync_runs
  ON public.mapid_mission_sync_runs;

CREATE TRIGGER handle_updated_at_mapid_mission_sync_runs
  BEFORE UPDATE ON public.mapid_mission_sync_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS handle_updated_at_mapid_mission_observations
  ON public.mapid_mission_observations;

CREATE TRIGGER handle_updated_at_mapid_mission_observations
  BEFORE UPDATE ON public.mapid_mission_observations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.mapid_mission_sync_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mapid_mission_observations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on mapid mission sync runs"
  ON public.mapid_mission_sync_runs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on mapid mission observations"
  ON public.mapid_mission_observations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Admins can read mapid mission sync runs"
  ON public.mapid_mission_sync_runs
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE POLICY "Admins can read mapid mission observations"
  ON public.mapid_mission_observations
  FOR SELECT TO authenticated
  USING ((SELECT private.is_admin()));

CREATE OR REPLACE FUNCTION public.list_mapid_mission_observations_v1(
  p_source_type TEXT DEFAULT NULL,
  p_min_lng DOUBLE PRECISION DEFAULT NULL,
  p_min_lat DOUBLE PRECISION DEFAULT NULL,
  p_max_lng DOUBLE PRECISION DEFAULT NULL,
  p_max_lat DOUBLE PRECISION DEFAULT NULL,
  p_limit INTEGER DEFAULT 100,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  source_type TEXT,
  source_record_id TEXT,
  geometry JSONB,
  normalized_properties JSONB,
  provenance JSONB,
  observed_at TIMESTAMPTZ,
  freshness_status TEXT,
  verification_status TEXT,
  total_count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH filtered AS (
    SELECT observation.*
    FROM public.mapid_mission_observations AS observation
    WHERE (p_source_type IS NULL OR observation.source_type = p_source_type)
      AND (
        p_min_lng IS NULL
        OR extensions.ST_Intersects(
          observation.geometry,
          extensions.ST_MakeEnvelope(p_min_lng, p_min_lat, p_max_lng, p_max_lat, 4326)
        )
      )
  ),
  counted AS (
    SELECT COUNT(*) AS total_count FROM filtered
  )
  SELECT
    filtered.id,
    filtered.source_type,
    filtered.source_record_id,
    extensions.ST_AsGeoJSON(filtered.geometry)::jsonb AS geometry,
    filtered.normalized_properties,
    filtered.provenance,
    filtered.observed_at,
    filtered.freshness_status,
    filtered.verification_status,
    counted.total_count
  FROM filtered
  CROSS JOIN counted
  ORDER BY filtered.last_seen_at DESC, filtered.id DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 500)
  OFFSET GREATEST(p_offset, 0);
$$;

REVOKE ALL ON FUNCTION public.list_mapid_mission_observations_v1(
  TEXT,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  INTEGER
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.list_mapid_mission_observations_v1(
  TEXT,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  DOUBLE PRECISION,
  INTEGER,
  INTEGER
) TO authenticated, service_role;
