begin;

set local search_path = public, extensions, gis;

-- A source record may resolve to only one canonical merchant. The existing
-- four-column constraint permits the same evidence to be linked repeatedly.
create unique index if not exists uq_merchant_source_links_source_record
  on public.merchant_source_links (source_table, source_record_id);

create table if not exists public.merchant_reconciliation_decisions (
  id uuid primary key default gen_random_uuid(),
  menu_observation_id uuid not null
    references public.mapid_mission_observations(id) on delete cascade,
  premium_merchant_id uuid
    references public.merchants(id) on delete set null,
  resolved_merchant_id uuid not null
    references public.merchants(id) on delete restrict,
  match_status text not null,
  match_score numeric(6, 5) not null,
  name_score numeric(6, 5) not null,
  distance_meters numeric(12, 3),
  phone_match boolean,
  address_match boolean,
  category_match boolean,
  menu_go_mobile boolean not null default false,
  decision_reason text not null,
  algorithm_version text not null,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchant_reconciliation_menu_observation_unique
    unique (menu_observation_id),
  constraint merchant_reconciliation_status_valid check (
    match_status in (
      'MATCH_CONFIRMED',
      'MATCH_HIGH_CONFIDENCE',
      'MATCH_REVIEW_REQUIRED',
      'NO_MATCH'
    )
  ),
  constraint merchant_reconciliation_score_valid check (
    match_score between 0 and 1 and name_score between 0 and 1
  ),
  constraint merchant_reconciliation_distance_valid check (
    distance_meters is null or distance_meters >= 0
  ),
  constraint merchant_reconciliation_premium_required check (
    match_status = 'NO_MATCH' or premium_merchant_id is not null
  )
);

create index if not exists idx_merchant_reconciliation_status
  on public.merchant_reconciliation_decisions (match_status, updated_at desc);

create index if not exists idx_merchant_reconciliation_premium
  on public.merchant_reconciliation_decisions (premium_merchant_id)
  where premium_merchant_id is not null;

create index if not exists idx_merchant_reconciliation_resolved
  on public.merchant_reconciliation_decisions (resolved_merchant_id);

drop trigger if exists set_merchant_reconciliation_updated_at
  on public.merchant_reconciliation_decisions;
create trigger set_merchant_reconciliation_updated_at
  before update on public.merchant_reconciliation_decisions
  for each row execute function public.handle_updated_at();

alter table public.merchant_reconciliation_decisions enable row level security;
revoke all on table public.merchant_reconciliation_decisions from anon, authenticated;
grant all on table public.merchant_reconciliation_decisions to service_role;

insert into public.spatial_sources (
  source_name,
  source_type,
  source_code,
  provider,
  is_active,
  is_public,
  redistribution_allowed,
  terms_confirmed,
  metadata
)
select
  'MAPID Premium merchant evidence',
  'external',
  'mapid_premium_merchants',
  'MAPID',
  true,
  false,
  false,
  false,
  '{"phase":"PHASE_03","semantics":"PREMIUM_POI_EVIDENCE"}'::jsonb
where not exists (
  select 1 from public.spatial_sources
  where source_code = 'mapid_premium_merchants'
);

insert into public.spatial_sources (
  source_name,
  source_type,
  source_code,
  provider,
  is_active,
  is_public,
  redistribution_allowed,
  terms_confirmed,
  metadata
)
select
  'MAPID Menu Go merchant observations',
  'survey',
  'mapid_menu_go_observations',
  'MAPID',
  true,
  false,
  false,
  false,
  '{"phase":"PHASE_03","semantics":"FIELD_SURVEY_MERCHANT_OBSERVATION"}'::jsonb
where not exists (
  select 1 from public.spatial_sources
  where source_code = 'mapid_menu_go_observations'
);

-- PostGIS owns production distance calculation. The service evaluates the
-- remaining deterministic evidence and deliberately sees every nearby option.
create or replace function public.list_premium_menu_go_candidates_v1(
  p_radius_meters integer default 250
)
returns table (
  menu_observation_id uuid,
  menu_source_record_id text,
  menu_name text,
  menu_category text,
  menu_mobility text,
  menu_properties jsonb,
  menu_observed_at timestamptz,
  menu_longitude double precision,
  menu_latitude double precision,
  premium_merchant_id uuid,
  premium_source_record_id text,
  premium_name text,
  premium_address text,
  premium_phone text,
  premium_category text,
  premium_metadata jsonb,
  premium_longitude double precision,
  premium_latitude double precision,
  distance_meters double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    observation.id,
    observation.source_record_id,
    nullif(btrim(observation.normalized_properties->>'nama_tempat'), ''),
    nullif(btrim(observation.normalized_properties->>'jenis_tempat'), ''),
    nullif(btrim(observation.normalized_properties->>'mobilitas'), ''),
    observation.normalized_properties,
    observation.observed_at,
    extensions.st_x(observation.geometry),
    extensions.st_y(observation.geometry),
    candidate.id,
    candidate.metadata->>'source_record_id',
    candidate.name,
    candidate.address,
    nullif(btrim(candidate.metadata->>'phone'), ''),
    nullif(btrim(candidate.metadata->>'category'), ''),
    candidate.metadata,
    extensions.st_x(candidate.location),
    extensions.st_y(candidate.location),
    candidate.distance_meters
  from public.mapid_mission_observations observation
  left join lateral (
    select
      merchant.*,
      extensions.st_distance(
        merchant.location::extensions.geography,
        observation.geometry::extensions.geography
      ) as distance_meters
    from public.merchants merchant
    where merchant.publish_status = 'PUBLISHED'::public.publish_status
      and merchant.metadata @> '{"admin_map_import":true}'::jsonb
      and merchant.metadata->>'source_type' = 'PUBLIC_API_URL'
      and extensions.st_dwithin(
        merchant.location::extensions.geography,
        observation.geometry::extensions.geography,
        greatest(1, least(coalesce(p_radius_meters, 250), 1000))
      )
    order by distance_meters asc, merchant.id asc
  ) candidate on true
  where observation.source_type = 'MENU_GO'
  order by observation.id, candidate.distance_meters nulls last, candidate.id;
$$;

revoke all on function public.list_premium_menu_go_candidates_v1(integer)
  from public, anon, authenticated;
grant execute on function public.list_premium_menu_go_candidates_v1(integer)
  to service_role;

commit;
