-- GETRA Step 2 - Foundation Only Baseline
-- Purpose: build a clean production-oriented schema BEFORE survey/competition data exists.
-- IMPORTANT: this script intentionally inserts NO merchants, NO transit points, NO survey records,
-- and NO raw MAPID competition records.
-- Run 00_preflight.sql first.

begin;

-- -----------------------------------------------------------------------------
-- 0. SAFETY GATE
-- -----------------------------------------------------------------------------
-- This baseline is deliberately conservative. It aborts if core GETRA tables
-- already exist, because silently merging unknown historical schemas is unsafe.

do $$
declare
  existing_tables text[];
begin
  select array_agg(tablename order by tablename)
  into existing_tables
  from pg_tables
  where schemaname = 'public'
    and tablename = any (array[
      'profiles',
      'categories',
      'data_sources',
      'transit_nodes',
      'merchants',
      'community_activities',
      'mission_menu_records',
      'mission_receipt_records',
      'mission_property_records'
    ]);

  if existing_tables is not null then
    raise exception
      'GETRA foundation aborted. Existing GETRA tables detected: %. Run 00_preflight.sql and inspect the current schema first.',
      existing_tables;
  end if;
end
$$;

-- -----------------------------------------------------------------------------
-- 1. EXTENSIONS
-- -----------------------------------------------------------------------------
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists postgis with schema extensions;

-- pgRouting is intentionally deferred to the pedestrian-network step.
-- It should be enabled when the graph model and routing method are defined.

-- -----------------------------------------------------------------------------
-- 2. COMMON FUNCTIONS
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 3. APPLICATION IDENTITY
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  app_role text not null default 'user'
    check (app_role in ('user', 'contributor', 'umkm_owner', 'moderator', 'admin')),
  trust_score numeric(5,2) not null default 0
    check (trust_score >= 0 and trust_score <= 100),
  onboarding_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'GETRA application profile. Authentication identity remains in Supabase auth.users.';
comment on column public.profiles.app_role is
  'Authorization role, not stakeholder mode. Stakeholder modes are commuter/umkm/investor/government.';

create table public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  default_stakeholder_mode text not null default 'commuter'
    check (default_stakeholder_mode in ('commuter', 'umkm', 'investor', 'government')),
  preferred_walking_minutes smallint
    check (preferred_walking_minutes is null or preferred_walking_minutes between 1 and 60),
  accessibility_needs text[] not null default '{}',
  locale text not null default 'id-ID',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '')
  );

  insert into public.user_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Backfill profiles for users that may already exist before this baseline.
insert into public.profiles (id, display_name)
select
  u.id,
  nullif(trim(coalesce(u.raw_user_meta_data ->> 'display_name', '')), '')
from auth.users u
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

-- -----------------------------------------------------------------------------
-- 4. REFERENCE TAXONOMY
-- -----------------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  category_group text not null default 'merchant'
    check (category_group in ('merchant', 'service', 'property', 'transit', 'issue', 'other')),
  icon_key text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (slug = lower(slug)),
  check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create index categories_parent_idx on public.categories(parent_id);
create index categories_active_group_idx on public.categories(category_group, is_active, sort_order);

-- -----------------------------------------------------------------------------
-- 5. DATA SOURCE REGISTRY / PROVENANCE
-- -----------------------------------------------------------------------------
create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  source_group text not null
    check (source_group in (
      'mapid_community',
      'mapid_mission',
      'getra_survey',
      'open_data',
      'user_generated',
      'synthetic',
      'other'
    )),
  provider text not null,
  source_url text,
  terms_url text,
  attribution_text text,
  license_or_terms text,
  access_scope text not null default 'backend_only'
    check (access_scope in ('public', 'backend_only', 'reviewer_only')),
  redistribution_allowed boolean not null default false,
  terms_confirmed boolean not null default false,
  freshness_policy_days integer
    check (freshness_policy_days is null or freshness_policy_days > 0),
  is_public_metadata boolean not null default true,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.data_sources is
  'Records source scope, attribution, access and redistribution constraints before any source records are ingested.';

-- -----------------------------------------------------------------------------
-- 6. TRANSIT ORIGINS
-- -----------------------------------------------------------------------------
create table public.transit_nodes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.data_sources(id) on delete restrict,
  source_record_id text,
  name text not null,
  mode text not null
    check (mode in ('mrt', 'lrt', 'krl', 'brt', 'bus', 'rail', 'multimodal', 'other')),
  operator text,
  location extensions.geography(POINT, 4326) not null,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'surveyed', 'verified', 'stale', 'rejected', 'synthetic')),
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_record_id is null or length(trim(source_record_id)) > 0)
);

create unique index transit_nodes_source_record_uidx
  on public.transit_nodes(source_id, source_record_id)
  where source_id is not null and source_record_id is not null;
create index transit_nodes_location_gix on public.transit_nodes using gist(location);
create index transit_nodes_public_idx on public.transit_nodes(publish_status, verification_status);

-- -----------------------------------------------------------------------------
-- 7. CANONICAL MERCHANT LAYER
-- -----------------------------------------------------------------------------
-- This is NOT a raw Menu Go table. It is the publishable canonical business layer
-- after cleaning, deduplication, validation and provenance checks.
create table public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  primary_category_id uuid references public.categories(id) on delete set null,
  location extensions.geography(POINT, 4326) not null,
  address text,
  price_level text
    check (price_level is null or price_level in ('hemat', 'sedang', 'premium', 'unknown')),
  opening_hours jsonb,
  is_mobile boolean,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified', 'surveyed', 'verified', 'stale', 'rejected', 'synthetic')),
  publish_status text not null default 'draft'
    check (publish_status in ('draft', 'published', 'archived')),
  data_quality_score numeric(5,2)
    check (data_quality_score is null or (data_quality_score >= 0 and data_quality_score <= 100)),
  owner_profile_id uuid references public.profiles(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index merchants_location_gix on public.merchants using gist(location);
create index merchants_public_idx on public.merchants(publish_status, verification_status);
create index merchants_primary_category_idx on public.merchants(primary_category_id);

create table public.merchant_categories (
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (merchant_id, category_id)
);

create index merchant_categories_category_idx on public.merchant_categories(category_id, merchant_id);

create table public.merchant_source_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete restrict,
  source_record_type text not null,
  source_record_id text not null,
  validation_status text not null default 'unverified'
    check (validation_status in ('unverified', 'surveyed', 'verified', 'stale', 'rejected', 'synthetic')),
  observed_at timestamptz,
  source_updated_at timestamptz,
  is_primary_source boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  unique (merchant_id, source_id, source_record_type, source_record_id)
);

create index merchant_source_links_merchant_idx on public.merchant_source_links(merchant_id);
create index merchant_source_links_source_idx on public.merchant_source_links(source_id, source_record_type);

-- -----------------------------------------------------------------------------
-- 8. FLEXIBLE SURVEY ENVELOPE
-- -----------------------------------------------------------------------------
-- The organizer has not yet provided the final technical survey contract.
-- Therefore only stable cross-survey fields are normalized now; survey-specific
-- attributes remain in attributes JSONB until the actual contract is known.
create table public.survey_submissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.profiles(id) on delete restrict,
  source_id uuid references public.data_sources(id) on delete restrict,
  survey_type text not null,
  title text,
  notes text,
  location extensions.geography(POINT, 4326),
  attributes jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'revision', 'verified', 'rejected')),
  privacy_status text not null default 'pending'
    check (privacy_status in ('pending', 'clear', 'restricted', 'rejected')),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index survey_submissions_contributor_idx on public.survey_submissions(contributor_id, created_at desc);
create index survey_submissions_location_gix on public.survey_submissions using gist(location);
create index survey_submissions_status_idx on public.survey_submissions(status, privacy_status);

create table public.survey_media (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.survey_submissions(id) on delete cascade,
  media_type text not null check (media_type in ('photo', 'video', 'document', 'other')),
  storage_bucket text not null,
  storage_path text not null,
  caption text,
  privacy_status text not null default 'pending'
    check (privacy_status in ('pending', 'clear', 'restricted', 'rejected')),
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index survey_media_submission_idx on public.survey_media(submission_id);

-- -----------------------------------------------------------------------------
-- 9. INGESTION TRACE
-- -----------------------------------------------------------------------------
create table public.dataset_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete restrict,
  requested_by uuid references public.profiles(id) on delete set null,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'partial', 'failed', 'cancelled')),
  input_reference text,
  import_fingerprint text,
  rows_received integer not null default 0 check (rows_received >= 0),
  rows_inserted integer not null default 0 check (rows_inserted >= 0),
  rows_updated integer not null default 0 check (rows_updated >= 0),
  rows_duplicate integer not null default 0 check (rows_duplicate >= 0),
  rows_rejected integer not null default 0 check (rows_rejected >= 0),
  error_summary jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index dataset_ingestion_runs_source_idx on public.dataset_ingestion_runs(source_id, started_at desc);

-- -----------------------------------------------------------------------------
-- 10. RAW COMPETITION SOURCE TABLES
-- -----------------------------------------------------------------------------
-- These tables stay EMPTY until legitimate organizer/API/survey data is available.
-- They preserve source-specific structures and raw payloads. The browser never reads them directly.

create table public.community_activities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text not null,
  title text,
  description text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(POINT, 4326),
  medias text[] not null default '{}',
  images text[] not null default '{}',
  videos text[] not null default '{}',
  raw_payload jsonb not null default '{}'::jsonb,
  record_status text not null default 'ingested'
    check (record_status in ('ingested', 'normalized', 'rejected', 'stale')),
  collected_at timestamptz,
  ingested_at timestamptz not null default now(),
  unique (source_id, source_record_id)
);

create index community_activities_location_gix on public.community_activities using gist(location);

create table public.mission_menu_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text not null,
  place_name text,
  place_type text,
  recorded_date_raw text,
  recorded_time_raw text,
  place_photo_url text,
  menu_photo_1_url text,
  menu_photo_2_url text,
  digital_menu_url text,
  main_menu text,
  average_price numeric(14,2),
  buyer_condition text,
  mobility text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(POINT, 4326),
  raw_payload jsonb not null default '{}'::jsonb,
  record_status text not null default 'ingested'
    check (record_status in ('ingested', 'normalized', 'rejected', 'stale')),
  collected_at timestamptz,
  ingested_at timestamptz not null default now(),
  unique (source_id, source_record_id)
);

create index mission_menu_records_location_gix on public.mission_menu_records using gist(location);

create table public.mission_receipt_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text not null,
  merchant_name text,
  place_category text,
  transaction_date_raw text,
  transaction_time_raw text,
  payment_method text,
  receipt_media_reference text,
  latitude_raw text,
  longitude_raw text,
  location extensions.geography(POINT, 4326),
  raw_payload jsonb not null default '{}'::jsonb,
  privacy_status text not null default 'restricted'
    check (privacy_status in ('pending', 'clear', 'restricted', 'rejected')),
  record_status text not null default 'ingested'
    check (record_status in ('ingested', 'normalized', 'rejected', 'stale')),
  collected_at timestamptz,
  ingested_at timestamptz not null default now(),
  unique (source_id, source_record_id)
);

create index mission_receipt_records_location_gix on public.mission_receipt_records using gist(location);

create table public.mission_property_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text not null,
  property_category text,
  listing_type text,
  recorded_date date,
  address text,
  front_photo_url text,
  promotion_sign_photo_url text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(POINT, 4326),
  raw_payload jsonb not null default '{}'::jsonb,
  record_status text not null default 'ingested'
    check (record_status in ('ingested', 'normalized', 'rejected', 'stale')),
  collected_at timestamptz,
  ingested_at timestamptz not null default now(),
  unique (source_id, source_record_id)
);

create index mission_property_records_location_gix on public.mission_property_records using gist(location);

-- -----------------------------------------------------------------------------
-- 11. EVIDENCE / MODERATION / AUDIT
-- -----------------------------------------------------------------------------
create table public.evidence_media (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.data_sources(id) on delete restrict,
  owner_kind text not null,
  owner_id text not null,
  media_type text not null check (media_type in ('photo', 'video', 'document', 'other')),
  storage_bucket text,
  storage_path text,
  external_url text,
  privacy_status text not null default 'pending'
    check (privacy_status in ('pending', 'clear', 'restricted', 'rejected')),
  checksum_sha256 text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (storage_path is not null or external_url is not null)
);

create index evidence_media_owner_idx on public.evidence_media(owner_kind, owner_id);

create table public.moderation_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  from_status text,
  to_status text,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index moderation_events_entity_idx on public.moderation_events(entity_type, entity_id, created_at desc);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  actor_type text not null default 'user'
    check (actor_type in ('user', 'service', 'system', 'anonymous')),
  action text not null,
  entity_type text,
  entity_id text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, created_at desc);
create index audit_events_request_idx on public.audit_events(request_id) where request_id is not null;

-- -----------------------------------------------------------------------------
-- 12. FEATURE REGISTRY AND ANALYSIS TRACE
-- -----------------------------------------------------------------------------
create table public.feature_registry (
  feature_key text primary key,
  description text not null,
  enabled boolean not null default false,
  is_public boolean not null default false,
  rollout_stage text not null default 'foundation'
    check (rollout_stage in ('foundation', 'prototype', 'pilot', 'staging', 'production', 'disabled')),
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  analysis_type text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'succeeded', 'partial', 'failed', 'cancelled')),
  created_by uuid references public.profiles(id) on delete set null,
  parameters jsonb not null default '{}'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  method_version text,
  limitation_notes text[] not null default '{}',
  result_summary jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index analysis_runs_type_created_idx on public.analysis_runs(analysis_type, created_at desc);

-- -----------------------------------------------------------------------------
-- 13. UPDATED-AT TRIGGERS
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles',
    'user_preferences',
    'categories',
    'data_sources',
    'transit_nodes',
    'merchants',
    'survey_submissions'
  ]
  loop
    execute format(
      'drop trigger if exists %I on public.%I',
      'set_' || t || '_updated_at',
      t
    );
    execute format(
      'create trigger %I before update on public.%I for each row execute procedure public.set_updated_at()',
      'set_' || t || '_updated_at',
      t
    );
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- 14. ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------
-- All public-schema tables exposed through Supabase API get RLS explicitly.

do $$
declare
  t text;
begin
  foreach t in array array[
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
    'dataset_ingestion_runs',
    'community_activities',
    'mission_menu_records',
    'mission_receipt_records',
    'mission_property_records',
    'evidence_media',
    'moderation_events',
    'audit_events',
    'feature_registry',
    'analysis_runs'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end
$$;

-- Profiles: authenticated user can only see their own application profile.
drop policy if exists profiles_select_self on public.profiles;
create policy profiles_select_self
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- Preferences: own row only.
drop policy if exists user_preferences_select_self on public.user_preferences;
create policy user_preferences_select_self
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists user_preferences_update_self on public.user_preferences;
create policy user_preferences_update_self
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Categories: reference taxonomy is publicly readable when active.
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read
on public.categories
for select
to anon, authenticated
using (is_active = true);

-- Source metadata can be public, but protected source records never are.
drop policy if exists data_sources_public_metadata on public.data_sources;
create policy data_sources_public_metadata
on public.data_sources
for select
to anon, authenticated
using (is_public_metadata = true and is_active = true);

-- Transit only becomes browser-readable after explicit publication and validation.
drop policy if exists transit_nodes_public_read on public.transit_nodes;
create policy transit_nodes_public_read
on public.transit_nodes
for select
to anon, authenticated
using (
  publish_status = 'published'
  and verification_status in ('surveyed', 'verified')
);

-- Canonical merchant public layer only: no unverified/raw/synthetic rows.
drop policy if exists merchants_public_read on public.merchants;
create policy merchants_public_read
on public.merchants
for select
to anon, authenticated
using (
  publish_status = 'published'
  and verification_status in ('surveyed', 'verified')
);

-- Public category links only for public canonical merchants.
drop policy if exists merchant_categories_public_read on public.merchant_categories;
create policy merchant_categories_public_read
on public.merchant_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.merchants m
    where m.id = merchant_id
      and m.publish_status = 'published'
      and m.verification_status in ('surveyed', 'verified')
  )
);

-- Survey contributors can work only with their own submissions, and only if their
-- application role explicitly allows contribution.
drop policy if exists survey_submissions_select_own on public.survey_submissions;
create policy survey_submissions_select_own
on public.survey_submissions
for select
to authenticated
using (
  contributor_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.app_role in ('contributor', 'moderator', 'admin')
  )
);

drop policy if exists survey_submissions_insert_own on public.survey_submissions;
create policy survey_submissions_insert_own
on public.survey_submissions
for insert
to authenticated
with check (
  contributor_id = (select auth.uid())
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.app_role in ('contributor', 'moderator', 'admin')
  )
);

drop policy if exists survey_submissions_update_own_draft on public.survey_submissions;
create policy survey_submissions_update_own_draft
on public.survey_submissions
for update
to authenticated
using (
  contributor_id = (select auth.uid())
  and status in ('draft', 'revision')
  and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.app_role in ('contributor', 'moderator', 'admin')
  )
)
with check (
  contributor_id = (select auth.uid())
  and status in ('draft', 'submitted', 'revision')
);

-- Survey media is only visible/editable to the owner of the parent submission.
drop policy if exists survey_media_select_own on public.survey_media;
create policy survey_media_select_own
on public.survey_media
for select
to authenticated
using (
  exists (
    select 1
    from public.survey_submissions s
    where s.id = submission_id
      and s.contributor_id = (select auth.uid())
  )
);

drop policy if exists survey_media_insert_own on public.survey_media;
create policy survey_media_insert_own
on public.survey_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.survey_submissions s
    where s.id = submission_id
      and s.contributor_id = (select auth.uid())
      and s.status in ('draft', 'revision')
  )
);

-- Public feature flags only when explicitly marked public.
drop policy if exists feature_registry_public_read on public.feature_registry;
create policy feature_registry_public_read
on public.feature_registry
for select
to anon, authenticated
using (is_public = true);

-- IMPORTANT: no anon/authenticated policies are created for:
-- merchant_source_links, raw MAPID tables, evidence_media, ingestion runs,
-- moderation events, audit events, or analysis_runs. They remain backend-only.

-- -----------------------------------------------------------------------------
-- 15. PRIVILEGES
-- -----------------------------------------------------------------------------
-- Start from least privilege and then grant exactly what browser roles need.

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.user_preferences from anon, authenticated;
revoke all on table public.categories from anon, authenticated;
revoke all on table public.data_sources from anon, authenticated;
revoke all on table public.transit_nodes from anon, authenticated;
revoke all on table public.merchants from anon, authenticated;
revoke all on table public.merchant_categories from anon, authenticated;
revoke all on table public.merchant_source_links from anon, authenticated;
revoke all on table public.survey_submissions from anon, authenticated;
revoke all on table public.survey_media from anon, authenticated;
revoke all on table public.dataset_ingestion_runs from anon, authenticated;
revoke all on table public.community_activities from anon, authenticated;
revoke all on table public.mission_menu_records from anon, authenticated;
revoke all on table public.mission_receipt_records from anon, authenticated;
revoke all on table public.mission_property_records from anon, authenticated;
revoke all on table public.evidence_media from anon, authenticated;
revoke all on table public.moderation_events from anon, authenticated;
revoke all on table public.audit_events from anon, authenticated;
revoke all on table public.feature_registry from anon, authenticated;
revoke all on table public.analysis_runs from anon, authenticated;

-- Self profile read and safe-column update.
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, onboarding_complete) on table public.profiles to authenticated;

-- Self preferences.
grant select, update on table public.user_preferences to authenticated;

-- Public reference / publishable layers.
grant select on table public.categories to anon, authenticated;
grant select on table public.data_sources to anon, authenticated;
grant select on table public.transit_nodes to anon, authenticated;
grant select on table public.merchants to anon, authenticated;
grant select on table public.merchant_categories to anon, authenticated;
grant select on table public.feature_registry to anon, authenticated;

-- Contributor staging.
grant select, insert, update on table public.survey_submissions to authenticated;
grant select, insert on table public.survey_media to authenticated;

-- service_role/admin backend receives full table privileges. RLS is bypassed by service role.
grant all on table
  public.profiles,
  public.user_preferences,
  public.categories,
  public.data_sources,
  public.transit_nodes,
  public.merchants,
  public.merchant_categories,
  public.merchant_source_links,
  public.survey_submissions,
  public.survey_media,
  public.dataset_ingestion_runs,
  public.community_activities,
  public.mission_menu_records,
  public.mission_receipt_records,
  public.mission_property_records,
  public.evidence_media,
  public.moderation_events,
  public.audit_events,
  public.feature_registry,
  public.analysis_runs
  to service_role;

grant usage, select on all sequences in schema public to service_role;

commit;
