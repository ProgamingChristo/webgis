-- GETRA Step 2 - Preflight
-- Run this FIRST in Supabase SQL Editor.
-- It does not modify data or schema.

select
  current_database() as database_name,
  current_user as database_user,
  now() as checked_at;

select
  extname,
  extnamespace::regnamespace::text as extension_schema
from pg_extension
where extname in ('postgis', 'pgcrypto', 'pgrouting')
order by extname;

select
  schemaname,
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

select
  n.nspname as schema_name,
  c.relname as table_name,
  p.polname as policy_name,
  p.polcmd as command
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles',
    'user_preferences',
    'categories',
    'data_sources',
    'transit_nodes',
    'merchants',
    'survey_submissions'
  )
order by c.relname, p.polname;

-- Interpretation:
-- 1) If none of the GETRA tables above exist, the database is clean for 01_getra_foundation.sql.
-- 2) If any GETRA table already exists, STOP. Do not run the foundation baseline blindly.
--    Existing migrations/schema must be inspected first so data or RLS is not overwritten.
