begin;

set local search_path = public, extensions, gis;

create type public.validation_status as enum (
  'PENDING',
  'VALIDATED',
  'REJECTED',
  'ARCHIVED'
);

alter table public.study_areas
  add column source_record_id text,
  add column data_version text not null default '1',
  add column validation_status public.validation_status not null
    default 'PENDING'::public.validation_status,
  add column retrieved_at timestamptz not null default now(),
  add column validated_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb,
  add constraint study_areas_source_record_id_nonempty check (
    source_record_id is null or btrim(source_record_id) <> ''
  ),
  add constraint study_areas_data_version_nonempty check (
    btrim(data_version) <> ''
  ),
  add constraint study_areas_source_record_requires_source check (
    source_record_id is null or source_id is not null
  ),
  add constraint study_areas_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  add constraint study_areas_validated_at_required check (
    validation_status not in (
      'VALIDATED'::public.validation_status,
      'REJECTED'::public.validation_status
    )
      or validated_at is not null
  ),
  add constraint study_areas_pending_validated_at_empty check (
    validation_status <> 'PENDING'::public.validation_status
      or validated_at is null
  ),
  add constraint study_areas_validated_at_order check (
    validated_at is null or validated_at >= retrieved_at
  );

alter table public.transport_corridors
  add column source_record_id text,
  add column data_version text not null default '1',
  add column validation_status public.validation_status not null
    default 'PENDING'::public.validation_status,
  add column retrieved_at timestamptz not null default now(),
  add column validated_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb,
  add constraint transport_corridors_source_record_id_nonempty check (
    source_record_id is null or btrim(source_record_id) <> ''
  ),
  add constraint transport_corridors_data_version_nonempty check (
    btrim(data_version) <> ''
  ),
  add constraint transport_corridors_source_record_requires_source check (
    source_record_id is null or source_id is not null
  ),
  add constraint transport_corridors_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  add constraint transport_corridors_validated_at_required check (
    validation_status not in (
      'VALIDATED'::public.validation_status,
      'REJECTED'::public.validation_status
    )
      or validated_at is not null
  ),
  add constraint transport_corridors_pending_validated_at_empty check (
    validation_status <> 'PENDING'::public.validation_status
      or validated_at is null
  ),
  add constraint transport_corridors_validated_at_order check (
    validated_at is null or validated_at >= retrieved_at
  );

alter table public.transport_nodes
  add column source_record_id text,
  add column data_version text not null default '1',
  add column validation_status public.validation_status not null
    default 'PENDING'::public.validation_status,
  add column retrieved_at timestamptz not null default now(),
  add column validated_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb,
  add constraint transport_nodes_source_record_id_nonempty check (
    source_record_id is null or btrim(source_record_id) <> ''
  ),
  add constraint transport_nodes_data_version_nonempty check (
    btrim(data_version) <> ''
  ),
  add constraint transport_nodes_source_record_requires_source check (
    source_record_id is null or source_id is not null
  ),
  add constraint transport_nodes_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  add constraint transport_nodes_validated_at_required check (
    validation_status not in (
      'VALIDATED'::public.validation_status,
      'REJECTED'::public.validation_status
    )
      or validated_at is not null
  ),
  add constraint transport_nodes_pending_validated_at_empty check (
    validation_status <> 'PENDING'::public.validation_status
      or validated_at is null
  ),
  add constraint transport_nodes_validated_at_order check (
    validated_at is null or validated_at >= retrieved_at
  );

alter table public.umkm_profiles
  add column source_record_id text,
  add column data_version text not null default '1',
  add column validation_status public.validation_status not null
    default 'PENDING'::public.validation_status,
  add column retrieved_at timestamptz not null default now(),
  add column validated_at timestamptz,
  add column metadata jsonb not null default '{}'::jsonb,
  add constraint umkm_profiles_source_record_id_nonempty check (
    source_record_id is null or btrim(source_record_id) <> ''
  ),
  add constraint umkm_profiles_data_version_nonempty check (
    btrim(data_version) <> ''
  ),
  add constraint umkm_profiles_source_record_requires_source check (
    source_record_id is null or source_id is not null
  ),
  add constraint umkm_profiles_metadata_object check (
    jsonb_typeof(metadata) = 'object'
  ),
  add constraint umkm_profiles_validated_at_required check (
    validation_status not in (
      'VALIDATED'::public.validation_status,
      'REJECTED'::public.validation_status
    )
      or validated_at is not null
  ),
  add constraint umkm_profiles_pending_validated_at_empty check (
    validation_status <> 'PENDING'::public.validation_status
      or validated_at is null
  ),
  add constraint umkm_profiles_validated_at_order check (
    validated_at is null or validated_at >= retrieved_at
  );

create unique index idx_study_areas_source_record_unique
  on public.study_areas (source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

create unique index idx_transport_corridors_source_record_unique
  on public.transport_corridors (source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

create unique index idx_transport_nodes_source_record_unique
  on public.transport_nodes (source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

create unique index idx_umkm_profiles_source_record_unique
  on public.umkm_profiles (source_id, source_record_id)
  where source_id is not null and source_record_id is not null;

-- A profile owner may edit public presentation fields only. Role assignment remains
-- a trusted server-side/service-role operation even when RLS allows the row itself.
revoke update on table public.profiles from anon, authenticated;
revoke update (id, display_name, avatar_url, role, created_at, updated_at)
  on table public.profiles from anon, authenticated;
grant update (display_name, avatar_url)
  on table public.profiles to authenticated;
grant all on table public.profiles to service_role;

-- Owner-created UMKM rows use database provenance defaults. Imported/trusted
-- provenance must use a reviewed server-side service-role operation; even an
-- authenticated admin cannot supply these columns through the ordinary insert path.
revoke insert on table public.umkm_profiles from anon, authenticated;
revoke insert (
  id,
  owner_id,
  source_id,
  business_name,
  category,
  description,
  address,
  geometry,
  created_at,
  updated_at,
  source_record_id,
  data_version,
  validation_status,
  retrieved_at,
  validated_at,
  metadata
) on table public.umkm_profiles from anon, authenticated;
grant insert (
  owner_id,
  business_name,
  category,
  description,
  address,
  geometry
) on table public.umkm_profiles to authenticated;
grant all on table public.umkm_profiles to service_role;

-- Owners retain normal UMKM business editing, but trusted ownership, lineage,
-- versioning, and validation fields cannot be forged through the Data API.
create or replace function private.enforce_umkm_trusted_fields_update()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if private.is_admin() then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.created_at is distinct from old.created_at
    or new.owner_id is distinct from old.owner_id
    or new.source_id is distinct from old.source_id
    or new.source_record_id is distinct from old.source_record_id
    or new.data_version is distinct from old.data_version
    or new.validation_status is distinct from old.validation_status
    or new.retrieved_at is distinct from old.retrieved_at
    or new.validated_at is distinct from old.validated_at
    or new.metadata is distinct from old.metadata then
    raise exception
      'Only administrators or trusted database roles may update immutable UMKM or provenance fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger enforce_umkm_trusted_fields_before_update
  before update on public.umkm_profiles
  for each row execute function private.enforce_umkm_trusted_fields_update();

revoke all on function private.enforce_umkm_trusted_fields_update()
  from public, anon, authenticated, service_role;

create or replace function public.find_study_areas_within_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns setof public.study_areas
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions, gis
as $$
  with bounds as (
    select public.make_wgs84_bbox(min_lng, min_lat, max_lng, max_lat) as geometry
  )
  select study_area.*
  from public.study_areas as study_area
  cross join bounds
  where study_area.geometry && bounds.geometry
    and st_intersects(study_area.geometry, bounds.geometry);
$$;

create or replace function public.find_transport_corridors_within_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns setof public.transport_corridors
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions, gis
as $$
  with bounds as (
    select public.make_wgs84_bbox(min_lng, min_lat, max_lng, max_lat) as geometry
  )
  select corridor.*
  from public.transport_corridors as corridor
  cross join bounds
  where corridor.geometry && bounds.geometry
    and st_intersects(corridor.geometry, bounds.geometry);
$$;

create or replace function public.find_transport_nodes_within_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns setof public.transport_nodes
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions, gis
as $$
  with bounds as (
    select public.make_wgs84_bbox(min_lng, min_lat, max_lng, max_lat) as geometry
  )
  select transport_node.*
  from public.transport_nodes as transport_node
  cross join bounds
  where transport_node.geometry && bounds.geometry
    and st_intersects(transport_node.geometry, bounds.geometry);
$$;

create or replace function public.find_umkm_profiles_within_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns setof public.umkm_profiles
language sql
stable
security invoker
set search_path = pg_catalog, public, extensions, gis
as $$
  with bounds as (
    select public.make_wgs84_bbox(min_lng, min_lat, max_lng, max_lat) as geometry
  )
  select umkm_profile.*
  from public.umkm_profiles as umkm_profile
  cross join bounds
  where umkm_profile.geometry && bounds.geometry
    and st_intersects(umkm_profile.geometry, bounds.geometry);
$$;

create index idx_transport_nodes_geometry_geography_gist
  on public.transport_nodes using gist ((geometry::geography));

create index idx_umkm_profiles_geometry_geography_gist
  on public.umkm_profiles using gist ((geometry::geography));

create or replace function public.find_transport_nodes_near(
  origin geometry,
  radius_meters double precision
)
returns setof public.transport_nodes
language plpgsql
stable
strict
security invoker
set search_path = pg_catalog, public, extensions, gis
as $$
begin
  if radius_meters <= 0
    or radius_meters = 'Infinity'::double precision
    or radius_meters = '-Infinity'::double precision
    or radius_meters = 'NaN'::double precision then
    raise exception 'Radius must be a finite positive number'
      using errcode = '22023';
  end if;

  if not public.is_valid_wgs84_geometry(
    origin,
    array['POINT']::text[]
  ) then
    raise exception 'Origin must be a valid WGS84 point'
      using errcode = '22023';
  end if;

  return query
  select transport_node.*
  from public.transport_nodes as transport_node
  where st_dwithin(
    transport_node.geometry::geography,
    origin::geography,
    radius_meters
  )
  order by st_distance(transport_node.geometry::geography, origin::geography);
end;
$$;

create or replace function public.find_umkm_profiles_near(
  origin geometry,
  radius_meters double precision
)
returns setof public.umkm_profiles
language plpgsql
stable
strict
security invoker
set search_path = pg_catalog, public, extensions, gis
as $$
begin
  if radius_meters <= 0
    or radius_meters = 'Infinity'::double precision
    or radius_meters = '-Infinity'::double precision
    or radius_meters = 'NaN'::double precision then
    raise exception 'Radius must be a finite positive number'
      using errcode = '22023';
  end if;

  if not public.is_valid_wgs84_geometry(
    origin,
    array['POINT']::text[]
  ) then
    raise exception 'Origin must be a valid WGS84 point'
      using errcode = '22023';
  end if;

  return query
  select umkm_profile.*
  from public.umkm_profiles as umkm_profile
  where st_dwithin(
    umkm_profile.geometry::geography,
    origin::geography,
    radius_meters
  )
  order by st_distance(umkm_profile.geometry::geography, origin::geography);
end;
$$;

revoke all on function public.find_study_areas_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) from public, anon;
revoke all on function public.find_transport_corridors_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) from public, anon;
revoke all on function public.find_transport_nodes_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) from public, anon;
revoke all on function public.find_umkm_profiles_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) from public, anon;
revoke all on function public.find_transport_nodes_near(geometry, double precision)
  from public, anon;
revoke all on function public.find_umkm_profiles_near(geometry, double precision)
  from public, anon;

grant execute on function public.find_study_areas_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) to authenticated, service_role;
grant execute on function public.find_transport_corridors_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) to authenticated, service_role;
grant execute on function public.find_transport_nodes_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) to authenticated, service_role;
grant execute on function public.find_umkm_profiles_within_bbox(
  double precision,
  double precision,
  double precision,
  double precision
) to authenticated, service_role;
grant execute on function public.find_transport_nodes_near(geometry, double precision)
  to authenticated, service_role;
grant execute on function public.find_umkm_profiles_near(geometry, double precision)
  to authenticated, service_role;

-- This probe exists only after the GETRA schema migration is applied. It checks
-- PostgreSQL/Data API reachability without reading domain or Supabase-managed data.
create or replace function public.getra_database_health()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select 'connected'::text;
$$;

revoke all on function public.getra_database_health() from public;
grant execute on function public.getra_database_health()
  to anon, authenticated, service_role;

commit;
