-- GETRA Step 2 - Verification
-- Run after 01_getra_foundation.sql and 02_seed_reference_only.sql.

-- 1. Required extensions
select
  extname,
  extnamespace::regnamespace::text as extension_schema
from pg_extension
where extname in ('postgis', 'pgcrypto')
order by extname;

-- 2. Required tables + RLS state
select
  tablename,
  rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public'
  and tablename in (
    'profiles',
    'user_preferences',
    'categories',
    'data_sources',
    'transit_nodes',
    'merchants',
    'merchant_categories',
    'merchant_source_links',
    'survey_submissions',
    'survey_media',
    'community_activities',
    'mission_menu_records',
    'mission_receipt_records',
    'mission_property_records',
    'evidence_media',
    'dataset_ingestion_runs',
    'moderation_events',
    'audit_events',
    'feature_registry',
    'analysis_runs'
  )
order by tablename;

-- 3. Clean-foundation gate: all observational/spatial source tables should still be empty.
select 'transit_nodes' as table_name, count(*) as row_count from public.transit_nodes
union all
select 'merchants', count(*) from public.merchants
union all
select 'survey_submissions', count(*) from public.survey_submissions
union all
select 'community_activities', count(*) from public.community_activities
union all
select 'mission_menu_records', count(*) from public.mission_menu_records
union all
select 'mission_receipt_records', count(*) from public.mission_receipt_records
union all
select 'mission_property_records', count(*) from public.mission_property_records
order by table_name;

-- Expected immediately after foundation setup: every row_count above = 0.

-- 4. Reference seed check
select count(*) as active_category_count
from public.categories
where is_active = true;

select
  code,
  source_group,
  access_scope,
  redistribution_allowed,
  terms_confirmed
from public.data_sources
order by code;

-- 5. MAPID source records must not be loaded before terms are confirmed.
select
  code,
  terms_confirmed
from public.data_sources
where code like 'MAPID_%'
order by code;

-- Expected foundation state: terms_confirmed = false for MAPID source families.

-- 6. RLS policy inventory
select
  c.relname as table_name,
  p.polname as policy_name,
  p.polcmd as command
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
order by c.relname, p.polname;

-- 7. Browser roles should have no privileges on raw restricted tables.
select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'authenticated')
  and table_name in (
    'community_activities',
    'mission_menu_records',
    'mission_receipt_records',
    'mission_property_records',
    'merchant_source_links',
    'dataset_ingestion_runs',
    'evidence_media',
    'moderation_events',
    'audit_events',
    'analysis_runs'
  )
order by table_name, grantee, privilege_type;

-- Expected: zero rows.
