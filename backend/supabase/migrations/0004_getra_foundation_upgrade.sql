-- GETRA Step 2 / Migration 0004
-- LIVE SCHEMA FOUNDATION UPGRADE
--
-- Designed against the audited schema:
-- profiles, spatial_sources, study_areas, transport_corridors,
-- transport_nodes, umkm_profiles.
--
-- No synthetic spatial/business/survey rows are inserted.

begin;

-- ---------------------------------------------------------------------------
-- 0. REQUIRED EXTENSIONS
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (select 1 from pg_extension where extname = 'postgis') then
    raise exception 'GETRA requires PostGIS before foundation upgrade';
  end if;
end
$$;

-- pgRouting is intentionally NOT enabled in Step 2.

-- ---------------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------------

do $$
begin
  create type public.app_role as enum (
    'USER',
    'CONTRIBUTOR',
    'UMKM_OWNER',
    'MODERATOR',
    'ADMIN'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.stakeholder_mode as enum (
    'COMMUTER',
    'UMKM',
    'INVESTOR',
    'GOVERNMENT'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.data_quality_status as enum (
    'UNVERIFIED',
    'SURVEYED',
    'VERIFIED',
    'STALE',
    'REJECTED',
    'SYNTHETIC'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.publish_status as enum (
    'DRAFT',
    'PUBLISHED',
    'HIDDEN',
    'ARCHIVED'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.privacy_status as enum (
    'PUBLIC',
    'INTERNAL',
    'RESTRICTED',
    'REDACTED'
  );
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  create type public.pipeline_run_status as enum (
    'PENDING',
    'RUNNING',
    'SUCCEEDED',
    'PARTIAL',
    'FAILED'
  );
exception
  when duplicate_object then null;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. PROFILE AUTHORIZATION REFACTOR (NON-DESTRUCTIVE)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists app_role public.app_role,
  add column if not exists trust_score integer not null default 0,
  add column if not exists onboarding_complete boolean not null default false;

-- Map legacy role to the new authorization dimension for any profile
-- that might appear between audit and migration execution.
update public.profiles
set app_role =
  case role::text
    when 'ADMIN' then 'ADMIN'::public.app_role
    when 'UMKM' then 'UMKM_OWNER'::public.app_role
    when 'COMMUNITY' then 'CONTRIBUTOR'::public.app_role
    else 'USER'::public.app_role
  end
where app_role is null;

alter table public.profiles
  alter column app_role set default 'USER'::public.app_role,
  alter column app_role set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_trust_score_range'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_trust_score_range
      check (trust_score between 0 and 100);
  end if;
end
$$;

comment on column public.profiles.role is
'LEGACY persona-style role. Do not use for authorization. Authorization uses app_role. Kept temporarily for compatibility.';
comment on column public.profiles.app_role is
'Application authorization role. Not directly writable by browser clients.';

-- ---------------------------------------------------------------------------
-- 3. USER PREFERENCES
-- ---------------------------------------------------------------------------

create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  default_stakeholder_mode public.stakeholder_mode not null default 'COMMUTER',
  ui_preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_preferences_ui_object check (jsonb_typeof(ui_preferences) = 'object')
);

insert into public.user_preferences (user_id)
select id
from public.profiles
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 4. AUTHORIZATION HELPERS
-- ---------------------------------------------------------------------------

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and app_role = 'ADMIN'::public.app_role
  );
$$;

create or replace function private.has_app_role(allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and app_role = any (allowed_roles)
  );
$$;

revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

revoke all on function private.is_admin() from public;
revoke all on function private.has_app_role(public.app_role[]) from public;

grant execute on function private.is_admin() to authenticated, service_role;
grant execute on function private.has_app_role(public.app_role[]) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. SIGNUP TRIGGER
-- ---------------------------------------------------------------------------
-- Public registration NEVER chooses an authorization role.
-- Every new account starts as USER.
-- Privileged promotion is a backend/admin action.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    app_role
  )
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name'
    ),
    'USER'::public.app_role
  )
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Backfill real auth users if any existed without a profile.
insert into public.profiles (id, display_name, app_role)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'display_name',
    u.raw_user_meta_data->>'full_name'
  ),
  'USER'::public.app_role
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.user_preferences (user_id)
select id from public.profiles
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 6. CATEGORIES / TAXONOMY
-- ---------------------------------------------------------------------------

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  parent_id uuid references public.categories(id) on delete set null,
  category_group text not null default 'GENERAL',
  icon_key text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint categories_slug_nonempty check (btrim(slug) <> ''),
  constraint categories_name_nonempty check (btrim(name) <> ''),
  constraint categories_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_categories_parent_id
  on public.categories(parent_id);

create index if not exists idx_categories_active_sort
  on public.categories(is_active, sort_order);

create table if not exists public.category_aliases (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  source_label text not null,
  source_scope text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint category_aliases_label_nonempty check (btrim(source_label) <> ''),
  constraint category_aliases_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists idx_category_aliases_unique
  on public.category_aliases(category_id, source_label, coalesce(source_scope, ''));

-- ---------------------------------------------------------------------------
-- 7. EXPAND EXISTING SPATIAL SOURCES
-- ---------------------------------------------------------------------------

alter table public.spatial_sources
  add column if not exists source_code text,
  add column if not exists provider text,
  add column if not exists source_url text,
  add column if not exists terms_url text,
  add column if not exists access_scope text,
  add column if not exists redistribution_allowed boolean not null default false,
  add column if not exists terms_confirmed boolean not null default false,
  add column if not exists attribution_text text,
  add column if not exists freshness_policy_days integer,
  add column if not exists is_public boolean not null default false,
  add column if not exists is_active boolean not null default true;

create unique index if not exists idx_spatial_sources_source_code_unique
  on public.spatial_sources(source_code)
  where source_code is not null;

create index if not exists idx_spatial_sources_public_active
  on public.spatial_sources(is_public, is_active);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'spatial_sources_freshness_positive'
      and conrelid = 'public.spatial_sources'::regclass
  ) then
    alter table public.spatial_sources
      add constraint spatial_sources_freshness_positive
      check (freshness_policy_days is null or freshness_policy_days > 0);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 8. PUBLIC GATE FOR EXISTING SPATIAL TABLES
-- ---------------------------------------------------------------------------

alter table public.study_areas
  add column if not exists is_public boolean not null default false;

alter table public.transport_corridors
  add column if not exists is_public boolean not null default false;

alter table public.transport_nodes
  add column if not exists is_public boolean not null default false;

create index if not exists idx_study_areas_public_validation
  on public.study_areas(is_public, validation_status);

create index if not exists idx_transport_corridors_public_validation
  on public.transport_corridors(is_public, validation_status);

create index if not exists idx_transport_nodes_public_validation
  on public.transport_nodes(is_public, validation_status);

-- ---------------------------------------------------------------------------
-- 9. CANONICAL MERCHANTS
-- ---------------------------------------------------------------------------

create table if not exists public.merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text,
  description text,
  primary_category_id uuid references public.categories(id) on delete set null,
  location geometry(POINT, 4326) not null,
  address text,
  price_level text,
  opening_hours jsonb not null default '{}'::jsonb,
  is_mobile boolean not null default false,
  verification_status public.data_quality_status not null default 'UNVERIFIED',
  publish_status public.publish_status not null default 'DRAFT',
  data_quality_score numeric(5,2),
  created_by uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchants_name_nonempty check (btrim(name) <> ''),
  constraint merchants_location_valid check (
    st_srid(location) = 4326
    and geometrytype(location) = 'POINT'
    and st_isvalid(location)
  ),
  constraint merchants_opening_hours_object check (jsonb_typeof(opening_hours) = 'object'),
  constraint merchants_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint merchants_quality_score_range check (
    data_quality_score is null
    or (data_quality_score >= 0 and data_quality_score <= 100)
  )
);

create unique index if not exists idx_merchants_slug_unique
  on public.merchants(slug)
  where slug is not null;

create index if not exists idx_merchants_location_gist
  on public.merchants using gist(location);

create index if not exists idx_merchants_location_geography_gist
  on public.merchants using gist((location::geography));

create index if not exists idx_merchants_publish_quality
  on public.merchants(publish_status, verification_status);

create index if not exists idx_merchants_primary_category
  on public.merchants(primary_category_id);

create table if not exists public.merchant_categories (
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete restrict,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (merchant_id, category_id)
);

create index if not exists idx_merchant_categories_category
  on public.merchant_categories(category_id);

create table if not exists public.merchant_source_links (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  source_id uuid not null references public.spatial_sources(id) on delete restrict,
  source_table text not null,
  source_record_id text not null,
  evidence_type text,
  confidence numeric(5,4),
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint merchant_source_links_source_table_nonempty check (btrim(source_table) <> ''),
  constraint merchant_source_links_source_record_nonempty check (btrim(source_record_id) <> ''),
  constraint merchant_source_links_confidence_range check (
    confidence is null or (confidence >= 0 and confidence <= 1)
  ),
  constraint merchant_source_links_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create unique index if not exists idx_merchant_source_links_unique
  on public.merchant_source_links(
    merchant_id,
    source_id,
    source_table,
    source_record_id
  );

create index if not exists idx_merchant_source_links_source_record
  on public.merchant_source_links(source_id, source_record_id);

-- Existing owner-submitted profile can later claim/link to a canonical merchant.
alter table public.umkm_profiles
  add column if not exists merchant_id uuid references public.merchants(id) on delete set null,
  add column if not exists category_id uuid references public.categories(id) on delete set null;

create unique index if not exists idx_umkm_profiles_merchant_unique
  on public.umkm_profiles(merchant_id)
  where merchant_id is not null;

create index if not exists idx_umkm_profiles_category_id
  on public.umkm_profiles(category_id);

comment on table public.umkm_profiles is
'Owner-submitted/managed UMKM profile. Not the canonical public business layer. Canonical spatial businesses live in merchants.';

-- ---------------------------------------------------------------------------
-- 10. INGESTION RUNS
-- ---------------------------------------------------------------------------

create table if not exists public.dataset_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete set null,
  dataset_kind text not null,
  status public.pipeline_run_status not null default 'PENDING',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  received_count integer not null default 0,
  inserted_count integer not null default 0,
  updated_count integer not null default 0,
  duplicate_count integer not null default 0,
  rejected_count integer not null default 0,
  error_count integer not null default 0,
  error_summary text,
  metadata jsonb not null default '{}'::jsonb,
  constraint ingestion_dataset_kind_nonempty check (btrim(dataset_kind) <> ''),
  constraint ingestion_counts_nonnegative check (
    received_count >= 0
    and inserted_count >= 0
    and updated_count >= 0
    and duplicate_count >= 0
    and rejected_count >= 0
    and error_count >= 0
  ),
  constraint ingestion_metadata_object check (jsonb_typeof(metadata) = 'object'),
  constraint ingestion_finished_after_start check (
    finished_at is null or finished_at >= started_at
  )
);

create index if not exists idx_ingestion_runs_source_started
  on public.dataset_ingestion_runs(source_id, started_at desc);

-- ---------------------------------------------------------------------------
-- 11. RAW MAPID COMPETITION DATA
-- ---------------------------------------------------------------------------
-- Raw datasets remain separate according to their official structures.
-- Browser roles will receive NO access to these tables.

create table if not exists public.community_activities (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text,
  title text,
  description text,
  latitude double precision,
  longitude double precision,
  medias text,
  images text,
  videos text,
  geometry geometry(POINT, 4326),
  validation_status public.validation_status not null default 'PENDING',
  raw_payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  constraint community_activity_raw_payload_object check (jsonb_typeof(raw_payload) = 'object'),
  constraint community_activity_geometry_valid check (
    geometry is null
    or (
      st_srid(geometry) = 4326
      and geometrytype(geometry) = 'POINT'
      and st_isvalid(geometry)
    )
  )
);

create unique index if not exists idx_community_activity_source_record_unique
  on public.community_activities(source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

create index if not exists idx_community_activity_geometry_gist
  on public.community_activities using gist(geometry);

create table if not exists public.mission_menu_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text,
  place_name text,
  place_type text,
  recorded_date text,
  recorded_time text,
  place_photo_url text,
  menu_photo_1_url text,
  menu_photo_2_url text,
  digital_menu_url text,
  main_menu text,
  average_price numeric,
  buyer_condition text,
  mobility text,
  latitude double precision,
  longitude double precision,
  geometry geometry(POINT, 4326),
  validation_status public.validation_status not null default 'PENDING',
  raw_payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  constraint mission_menu_price_nonnegative check (average_price is null or average_price >= 0),
  constraint mission_menu_raw_payload_object check (jsonb_typeof(raw_payload) = 'object'),
  constraint mission_menu_geometry_valid check (
    geometry is null
    or (
      st_srid(geometry) = 4326
      and geometrytype(geometry) = 'POINT'
      and st_isvalid(geometry)
    )
  )
);

create unique index if not exists idx_mission_menu_source_record_unique
  on public.mission_menu_records(source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

create index if not exists idx_mission_menu_geometry_gist
  on public.mission_menu_records using gist(geometry);

create table if not exists public.mission_receipt_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text,
  merchant_name text,
  place_category text,
  transaction_date text,
  transaction_time text,
  payment_method text,
  receipt_photo_url text,
  latitude_raw text,
  longitude_raw text,
  geometry geometry(POINT, 4326),
  validation_status public.validation_status not null default 'PENDING',
  privacy_status public.privacy_status not null default 'RESTRICTED',
  raw_payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  constraint mission_receipt_raw_payload_object check (jsonb_typeof(raw_payload) = 'object'),
  constraint mission_receipt_geometry_valid check (
    geometry is null
    or (
      st_srid(geometry) = 4326
      and geometrytype(geometry) = 'POINT'
      and st_isvalid(geometry)
    )
  )
);

create unique index if not exists idx_mission_receipt_source_record_unique
  on public.mission_receipt_records(source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

create index if not exists idx_mission_receipt_geometry_gist
  on public.mission_receipt_records using gist(geometry);

create table if not exists public.mission_property_records (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete restrict,
  ingestion_run_id uuid references public.dataset_ingestion_runs(id) on delete set null,
  source_record_id text,
  property_category text,
  property_listing_type text,
  recorded_date text,
  address text,
  front_photo_url text,
  promotion_photo_url text,
  latitude double precision,
  longitude double precision,
  geometry geometry(POINT, 4326),
  validation_status public.validation_status not null default 'PENDING',
  raw_payload jsonb not null default '{}'::jsonb,
  ingested_at timestamptz not null default now(),
  constraint mission_property_raw_payload_object check (jsonb_typeof(raw_payload) = 'object'),
  constraint mission_property_geometry_valid check (
    geometry is null
    or (
      st_srid(geometry) = 4326
      and geometrytype(geometry) = 'POINT'
      and st_isvalid(geometry)
    )
  )
);

create unique index if not exists idx_mission_property_source_record_unique
  on public.mission_property_records(source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

create index if not exists idx_mission_property_geometry_gist
  on public.mission_property_records using gist(geometry);

-- ---------------------------------------------------------------------------
-- 12. SURVEY STAGING
-- ---------------------------------------------------------------------------

create table if not exists public.survey_submissions (
  id uuid primary key default gen_random_uuid(),
  contributor_id uuid not null references public.profiles(id) on delete restrict,
  study_area_id uuid references public.study_areas(id) on delete set null,
  source_id uuid references public.spatial_sources(id) on delete set null,
  source_record_id text,
  survey_type text not null,
  title text,
  notes text,
  geometry geometry(POINT, 4326) not null,
  attributes jsonb not null default '{}'::jsonb,
  observed_at timestamptz,
  validation_status public.validation_status not null default 'PENDING',
  privacy_status public.privacy_status not null default 'INTERNAL',
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint survey_type_nonempty check (btrim(survey_type) <> ''),
  constraint survey_geometry_valid check (
    st_srid(geometry) = 4326
    and geometrytype(geometry) = 'POINT'
    and st_isvalid(geometry)
  ),
  constraint survey_attributes_object check (jsonb_typeof(attributes) = 'object')
);

create index if not exists idx_survey_submissions_contributor
  on public.survey_submissions(contributor_id, submitted_at desc);

create index if not exists idx_survey_submissions_geometry_gist
  on public.survey_submissions using gist(geometry);

create index if not exists idx_survey_submissions_status
  on public.survey_submissions(validation_status);

create table if not exists public.survey_media (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.survey_submissions(id) on delete cascade,
  media_type text not null,
  storage_path text,
  external_url text,
  privacy_status public.privacy_status not null default 'INTERNAL',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint survey_media_type_nonempty check (btrim(media_type) <> ''),
  constraint survey_media_location_present check (
    storage_path is not null or external_url is not null
  ),
  constraint survey_media_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_survey_media_submission
  on public.survey_media(submission_id);

-- ---------------------------------------------------------------------------
-- 13. MODERATION / AUDIT / ANALYSIS / AI TRACE
-- ---------------------------------------------------------------------------

create table if not exists public.moderation_events (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  moderator_id uuid references public.profiles(id) on delete set null,
  action text not null,
  before_status text,
  after_status text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint moderation_entity_type_nonempty check (btrim(entity_type) <> ''),
  constraint moderation_action_nonempty check (btrim(action) <> ''),
  constraint moderation_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_moderation_events_entity
  on public.moderation_events(entity_type, entity_id, created_at desc);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  request_id text,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint audit_action_nonempty check (btrim(action) <> ''),
  constraint audit_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_audit_events_entity
  on public.audit_events(entity_type, entity_id, created_at desc);

create index if not exists idx_audit_events_request
  on public.audit_events(request_id)
  where request_id is not null;

create table if not exists public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  study_area_id uuid references public.study_areas(id) on delete set null,
  analysis_type text not null,
  method_version text not null,
  status public.pipeline_run_status not null default 'PENDING',
  input_references jsonb not null default '[]'::jsonb,
  parameters jsonb not null default '{}'::jsonb,
  result_summary jsonb not null default '{}'::jsonb,
  limitations jsonb not null default '[]'::jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  constraint analysis_type_nonempty check (btrim(analysis_type) <> ''),
  constraint analysis_method_version_nonempty check (btrim(method_version) <> ''),
  constraint analysis_input_array check (jsonb_typeof(input_references) = 'array'),
  constraint analysis_parameters_object check (jsonb_typeof(parameters) = 'object'),
  constraint analysis_result_object check (jsonb_typeof(result_summary) = 'object'),
  constraint analysis_limitations_array check (jsonb_typeof(limitations) = 'array'),
  constraint analysis_finished_after_start check (
    finished_at is null or finished_at >= started_at
  )
);

create index if not exists idx_analysis_runs_study_type
  on public.analysis_runs(study_area_id, analysis_type, started_at desc);

create table if not exists public.ai_processing_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model text not null,
  purpose text not null,
  input_references jsonb not null default '[]'::jsonb,
  prompt_version text,
  output jsonb not null default '{}'::jsonb,
  validation_state text not null default 'PENDING',
  analysis_run_id uuid references public.analysis_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint ai_provider_nonempty check (btrim(provider) <> ''),
  constraint ai_model_nonempty check (btrim(model) <> ''),
  constraint ai_purpose_nonempty check (btrim(purpose) <> ''),
  constraint ai_input_array check (jsonb_typeof(input_references) = 'array'),
  constraint ai_output_object check (jsonb_typeof(output) = 'object')
);

create index if not exists idx_ai_processing_runs_analysis
  on public.ai_processing_runs(analysis_run_id, created_at desc);

create table if not exists public.feature_registry (
  feature_key text primary key,
  status text not null,
  description text,
  is_public boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint feature_key_nonempty check (btrim(feature_key) <> ''),
  constraint feature_status_supported check (
    status in ('PLANNED', 'FOUNDATION', 'ACTIVE', 'DISABLED')
  ),
  constraint feature_metadata_object check (jsonb_typeof(metadata) = 'object')
);

-- ---------------------------------------------------------------------------
-- 14. UPDATED_AT TRIGGERS
-- ---------------------------------------------------------------------------

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  tbl text;
  trg text;
begin
  foreach tbl in array array[
    'user_preferences',
    'categories',
    'merchants',
    'survey_submissions'
  ]
  loop
    trg := 'set_' || tbl || '_updated_at';
    execute format('drop trigger if exists %I on public.%I', trg, tbl);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.handle_updated_at()',
      trg,
      tbl
    );
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 15. CANONICAL MERCHANT SPATIAL RPC
-- ---------------------------------------------------------------------------

create or replace function public.find_merchants_near(
  origin geometry,
  radius_meters double precision
)
returns setof public.merchants
language plpgsql
stable
strict
security invoker
set search_path = 'pg_catalog', 'public', 'extensions'
as $$
begin
  if radius_meters <= 0
    or radius_meters = 'Infinity'::double precision
    or radius_meters = '-Infinity'::double precision
    or radius_meters = 'NaN'::double precision then
    raise exception 'Radius must be a finite positive number'
      using errcode = '22023';
  end if;

  if st_srid(origin) <> 4326
    or geometrytype(origin) <> 'POINT'
    or not st_isvalid(origin) then
    raise exception 'Origin must be a valid WGS84 point'
      using errcode = '22023';
  end if;

  return query
  select merchant.*
  from public.merchants merchant
  where st_dwithin(
    merchant.location::geography,
    origin::geography,
    radius_meters
  )
  order by st_distance(
    merchant.location::geography,
    origin::geography
  );
end;
$$;

create or replace function public.find_merchants_within_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns setof public.merchants
language plpgsql
stable
security invoker
set search_path = 'pg_catalog', 'public', 'extensions'
as $$
declare
  bounds geometry;
begin
  if min_lng < -180 or max_lng > 180
    or min_lat < -90 or max_lat > 90
    or min_lng >= max_lng
    or min_lat >= max_lat then
    raise exception 'Invalid WGS84 bounding box'
      using errcode = '22023';
  end if;

  bounds := st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);

  return query
  select merchant.*
  from public.merchants merchant
  where merchant.location && bounds
    and st_intersects(merchant.location, bounds);
end;
$$;

-- Owner-profile spatial RPCs are legacy and must not be a public discovery API.
revoke all on function public.find_umkm_profiles_near(geometry, double precision)
  from public, anon, authenticated;
revoke all on function public.find_umkm_profiles_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) from public, anon, authenticated;

revoke all on function public.find_merchants_near(geometry, double precision)
  from public;
revoke all on function public.find_merchants_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) from public;

grant execute on function public.find_merchants_near(geometry, double precision)
  to anon, authenticated, service_role;
grant execute on function public.find_merchants_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) to anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 16. RLS ENABLE
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.categories enable row level security;
alter table public.category_aliases enable row level security;
alter table public.spatial_sources enable row level security;
alter table public.study_areas enable row level security;
alter table public.transport_corridors enable row level security;
alter table public.transport_nodes enable row level security;
alter table public.merchants enable row level security;
alter table public.merchant_categories enable row level security;
alter table public.merchant_source_links enable row level security;
alter table public.umkm_profiles enable row level security;
alter table public.dataset_ingestion_runs enable row level security;
alter table public.community_activities enable row level security;
alter table public.mission_menu_records enable row level security;
alter table public.mission_receipt_records enable row level security;
alter table public.mission_property_records enable row level security;
alter table public.survey_submissions enable row level security;
alter table public.survey_media enable row level security;
alter table public.moderation_events enable row level security;
alter table public.audit_events enable row level security;
alter table public.analysis_runs enable row level security;
alter table public.ai_processing_runs enable row level security;
alter table public.feature_registry enable row level security;

-- ---------------------------------------------------------------------------
-- 17. DROP OLD POLICIES THAT CONFLICT WITH THE NEW BOUNDARIES
-- ---------------------------------------------------------------------------

drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

drop policy if exists "Admins can manage spatial sources" on public.spatial_sources;
drop policy if exists "Authenticated users can read spatial sources" on public.spatial_sources;

drop policy if exists "Admins can manage study areas" on public.study_areas;
drop policy if exists "Authenticated users can read study areas" on public.study_areas;

drop policy if exists "Admins can manage transport corridors" on public.transport_corridors;
drop policy if exists "Authenticated users can read transport corridors" on public.transport_corridors;

drop policy if exists "Admins can manage transport nodes" on public.transport_nodes;
drop policy if exists "Authenticated users can read transport nodes" on public.transport_nodes;

drop policy if exists "Admins can manage all UMKM profiles" on public.umkm_profiles;
drop policy if exists "Owners can create own UMKM profiles" on public.umkm_profiles;
drop policy if exists "Owners can read own UMKM profiles" on public.umkm_profiles;
drop policy if exists "Owners can update own UMKM profiles" on public.umkm_profiles;

-- ---------------------------------------------------------------------------
-- 18. NEW RLS POLICIES
-- ---------------------------------------------------------------------------

-- Profiles
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "Admins can read profiles"
on public.profiles
for select
to authenticated
using ((select private.is_admin()));

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

-- User preferences
create policy "Users can read own preferences"
on public.user_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update own preferences"
on public.user_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Public taxonomy
create policy "Public can read active categories"
on public.categories
for select
to anon, authenticated
using (is_active = true);

-- Source metadata only when explicitly confirmed/public.
create policy "Public can read publishable source metadata"
on public.spatial_sources
for select
to anon, authenticated
using (
  is_public = true
  and is_active = true
  and terms_confirmed = true
);

-- Existing spatial foundation
create policy "Public can read validated public study areas"
on public.study_areas
for select
to anon, authenticated
using (
  is_public = true
  and validation_status = 'VALIDATED'::public.validation_status
);

create policy "Public can read validated public transport corridors"
on public.transport_corridors
for select
to anon, authenticated
using (
  is_public = true
  and validation_status = 'VALIDATED'::public.validation_status
);

create policy "Public can read validated public transport nodes"
on public.transport_nodes
for select
to anon, authenticated
using (
  is_public = true
  and validation_status = 'VALIDATED'::public.validation_status
);

-- Canonical merchant
create policy "Public can read published merchants"
on public.merchants
for select
to anon, authenticated
using (
  publish_status = 'PUBLISHED'::public.publish_status
  and verification_status in (
    'SURVEYED'::public.data_quality_status,
    'VERIFIED'::public.data_quality_status
  )
);

create policy "Public can read categories of visible merchants"
on public.merchant_categories
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.merchants m
    where m.id = merchant_id
      and m.publish_status = 'PUBLISHED'::public.publish_status
      and m.verification_status in (
        'SURVEYED'::public.data_quality_status,
        'VERIFIED'::public.data_quality_status
      )
  )
);

-- Owner-submitted UMKM profile
create policy "Owners can read own UMKM profiles"
on public.umkm_profiles
for select
to authenticated
using ((select auth.uid()) = owner_id);

create policy "UMKM owners can create own profiles"
on public.umkm_profiles
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and (select private.has_app_role(
    array['UMKM_OWNER'::public.app_role, 'ADMIN'::public.app_role]
  ))
);

create policy "UMKM owners can edit own pending profiles"
on public.umkm_profiles
for update
to authenticated
using (
  owner_id = (select auth.uid())
  and validation_status = 'PENDING'::public.validation_status
)
with check (
  owner_id = (select auth.uid())
  and validation_status = 'PENDING'::public.validation_status
);

-- Contributor survey staging
create policy "Contributors can read own surveys"
on public.survey_submissions
for select
to authenticated
using ((select auth.uid()) = contributor_id);

create policy "Contributors can create surveys"
on public.survey_submissions
for insert
to authenticated
with check (
  contributor_id = (select auth.uid())
  and (select private.has_app_role(
    array[
      'CONTRIBUTOR'::public.app_role,
      'MODERATOR'::public.app_role,
      'ADMIN'::public.app_role
    ]
  ))
);

create policy "Contributors can edit own pending surveys"
on public.survey_submissions
for update
to authenticated
using (
  contributor_id = (select auth.uid())
  and validation_status = 'PENDING'::public.validation_status
)
with check (
  contributor_id = (select auth.uid())
  and validation_status = 'PENDING'::public.validation_status
);

create policy "Contributors can read own survey media"
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

create policy "Contributors can add media to own pending surveys"
on public.survey_media
for insert
to authenticated
with check (
  exists (
    select 1
    from public.survey_submissions s
    where s.id = submission_id
      and s.contributor_id = (select auth.uid())
      and s.validation_status = 'PENDING'::public.validation_status
  )
);

-- Feature flags safe for public UI
create policy "Public can read public active features"
on public.feature_registry
for select
to anon, authenticated
using (is_public = true and status = 'ACTIVE');

-- No browser policies are created for:
-- category_aliases
-- merchant_source_links
-- dataset_ingestion_runs
-- community_activities
-- mission_menu_records
-- mission_receipt_records
-- mission_property_records
-- moderation_events
-- audit_events
-- analysis_runs
-- ai_processing_runs

-- ---------------------------------------------------------------------------
-- 19. PRIVILEGE MODEL
-- ---------------------------------------------------------------------------

-- Reset browser privileges on all foundation tables.
revoke all privileges on table
  public.profiles,
  public.user_preferences,
  public.categories,
  public.category_aliases,
  public.spatial_sources,
  public.study_areas,
  public.transport_corridors,
  public.transport_nodes,
  public.merchants,
  public.merchant_categories,
  public.merchant_source_links,
  public.umkm_profiles,
  public.dataset_ingestion_runs,
  public.community_activities,
  public.mission_menu_records,
  public.mission_receipt_records,
  public.mission_property_records,
  public.survey_submissions,
  public.survey_media,
  public.moderation_events,
  public.audit_events,
  public.analysis_runs,
  public.ai_processing_runs,
  public.feature_registry
from anon, authenticated;

-- Public reference/read data.
grant select on table
  public.categories,
  public.spatial_sources,
  public.study_areas,
  public.transport_corridors,
  public.transport_nodes,
  public.merchants,
  public.merchant_categories,
  public.feature_registry
to anon, authenticated;

-- Authenticated self-service profile/preferences.
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url, onboarding_complete)
  on table public.profiles to authenticated;

grant select on table public.user_preferences to authenticated;
grant update (default_stakeholder_mode, ui_preferences)
  on table public.user_preferences to authenticated;

-- Owner UMKM profile: no trusted/provenance columns writable from browser.
grant select on table public.umkm_profiles to authenticated;

grant insert (
  owner_id,
  business_name,
  category,
  description,
  address,
  geometry,
  category_id
)
on table public.umkm_profiles
to authenticated;

grant update (
  business_name,
  category,
  description,
  address,
  geometry,
  category_id
)
on table public.umkm_profiles
to authenticated;

-- Survey staging: contributor-controlled fields only.
grant select on table public.survey_submissions to authenticated;

grant insert (
  contributor_id,
  study_area_id,
  survey_type,
  title,
  notes,
  geometry,
  attributes,
  observed_at
)
on table public.survey_submissions
to authenticated;

grant update (
  study_area_id,
  survey_type,
  title,
  notes,
  geometry,
  attributes,
  observed_at
)
on table public.survey_submissions
to authenticated;

grant select on table public.survey_media to authenticated;

grant insert (
  submission_id,
  media_type,
  storage_path,
  external_url
)
on table public.survey_media
to authenticated;

-- Raw/protected tables remain without browser grants.

-- Backend service role.
grant all privileges on table
  public.profiles,
  public.user_preferences,
  public.categories,
  public.category_aliases,
  public.spatial_sources,
  public.study_areas,
  public.transport_corridors,
  public.transport_nodes,
  public.merchants,
  public.merchant_categories,
  public.merchant_source_links,
  public.umkm_profiles,
  public.dataset_ingestion_runs,
  public.community_activities,
  public.mission_menu_records,
  public.mission_receipt_records,
  public.mission_property_records,
  public.survey_submissions,
  public.survey_media,
  public.moderation_events,
  public.audit_events,
  public.analysis_runs,
  public.ai_processing_runs,
  public.feature_registry
to service_role;

-- Whole-table privileges must never be browser-facing.
revoke truncate, trigger, references
on table
  public.profiles,
  public.user_preferences,
  public.categories,
  public.category_aliases,
  public.spatial_sources,
  public.study_areas,
  public.transport_corridors,
  public.transport_nodes,
  public.merchants,
  public.merchant_categories,
  public.merchant_source_links,
  public.umkm_profiles,
  public.dataset_ingestion_runs,
  public.community_activities,
  public.mission_menu_records,
  public.mission_receipt_records,
  public.mission_property_records,
  public.survey_submissions,
  public.survey_media,
  public.moderation_events,
  public.audit_events,
  public.analysis_runs,
  public.ai_processing_runs,
  public.feature_registry
from anon, authenticated;

commit;
