-- GETRA Step 2 / Migration 0006
-- READ-ONLY VERIFICATION
--
-- Run after 0003, 0004, 0005.

-- ---------------------------------------------------------------------------
-- A. CORE EXTENSIONS
-- ---------------------------------------------------------------------------

select
  extname,
  extversion
from pg_extension
where extname in ('postgis', 'pgrouting', 'pgcrypto', 'uuid-ossp')
order by extname;

-- Expected:
-- postgis present
-- pgrouting may be absent at Step 2

-- ---------------------------------------------------------------------------
-- B. FOUNDATION TABLE COUNTS
-- ---------------------------------------------------------------------------

select 'categories' as table_name, count(*) as row_count from public.categories
union all select 'spatial_sources', count(*) from public.spatial_sources
union all select 'study_areas', count(*) from public.study_areas
union all select 'transport_corridors', count(*) from public.transport_corridors
union all select 'transport_nodes', count(*) from public.transport_nodes
union all select 'merchants', count(*) from public.merchants
union all select 'umkm_profiles', count(*) from public.umkm_profiles
union all select 'survey_submissions', count(*) from public.survey_submissions
union all select 'community_activities', count(*) from public.community_activities
union all select 'mission_menu_records', count(*) from public.mission_menu_records
union all select 'mission_receipt_records', count(*) from public.mission_receipt_records
union all select 'mission_property_records', count(*) from public.mission_property_records
order by table_name;

-- Expected before real ingestion:
-- categories > 0
-- all spatial/business/raw/survey rows = 0

-- ---------------------------------------------------------------------------
-- C. GEOMETRY CONTRACT
-- ---------------------------------------------------------------------------

select
  f_table_name,
  f_geometry_column,
  coord_dimension,
  srid,
  type
from geometry_columns
where f_table_schema = 'public'
  and f_table_name in (
    'study_areas',
    'transport_corridors',
    'transport_nodes',
    'umkm_profiles',
    'merchants',
    'community_activities',
    'mission_menu_records',
    'mission_receipt_records',
    'mission_property_records',
    'survey_submissions'
  )
order by f_table_name;

-- ---------------------------------------------------------------------------
-- D. DANGEROUS BROWSER TABLE PRIVILEGES
-- ---------------------------------------------------------------------------

select
  table_name,
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and privilege_type in ('TRUNCATE', 'TRIGGER', 'REFERENCES')
  and table_name in (
    'profiles',
    'user_preferences',
    'categories',
    'category_aliases',
    'spatial_sources',
    'study_areas',
    'transport_corridors',
    'transport_nodes',
    'merchants',
    'merchant_categories',
    'merchant_source_links',
    'umkm_profiles',
    'dataset_ingestion_runs',
    'community_activities',
    'mission_menu_records',
    'mission_receipt_records',
    'mission_property_records',
    'survey_submissions',
    'survey_media',
    'moderation_events',
    'audit_events',
    'analysis_runs',
    'ai_processing_runs',
    'feature_registry'
  )
order by table_name, grantee, privilege_type;

-- Expected: ZERO ROWS.

-- ---------------------------------------------------------------------------
-- E. RAW TABLE BROWSER ACCESS
-- ---------------------------------------------------------------------------

select
  table_name,
  has_table_privilege('anon', format('public.%I', table_name), 'SELECT') as anon_select,
  has_table_privilege('authenticated', format('public.%I', table_name), 'SELECT') as authenticated_select
from (
  values
    ('community_activities'),
    ('mission_menu_records'),
    ('mission_receipt_records'),
    ('mission_property_records'),
    ('dataset_ingestion_runs'),
    ('merchant_source_links'),
    ('moderation_events'),
    ('audit_events'),
    ('analysis_runs'),
    ('ai_processing_runs')
) as protected(table_name);

-- Expected: false / false for every row.

-- ---------------------------------------------------------------------------
-- F. RLS STATUS
-- ---------------------------------------------------------------------------

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as force_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'profiles',
    'user_preferences',
    'categories',
    'spatial_sources',
    'study_areas',
    'transport_corridors',
    'transport_nodes',
    'merchants',
    'umkm_profiles',
    'survey_submissions',
    'community_activities',
    'mission_menu_records',
    'mission_receipt_records',
    'mission_property_records'
  )
order by c.relname;

-- Expected rls_enabled = true.

-- ---------------------------------------------------------------------------
-- G. PROFILE AUTHORIZATION CONTRACT
-- ---------------------------------------------------------------------------

select
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'profiles'
  and column_name in (
    'role',
    'app_role',
    'trust_score',
    'onboarding_complete'
  )
order by ordinal_position;

-- Legacy role remains temporarily.
-- app_role is the authorization source of truth.

-- ---------------------------------------------------------------------------
-- H. RLS POLICIES
-- ---------------------------------------------------------------------------

select
  tablename,
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'user_preferences',
    'categories',
    'spatial_sources',
    'study_areas',
    'transport_corridors',
    'transport_nodes',
    'merchants',
    'umkm_profiles',
    'survey_submissions',
    'survey_media'
  )
order by tablename, policyname;
