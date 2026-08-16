begin;

-- Keep PostGIS in the conventional Supabase extension schema when it is not yet enabled.
-- IF NOT EXISTS preserves projects where the extension was enabled previously.
create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- Resolve PostGIS objects for the common Supabase installation schemas.
set local search_path = public, extensions, gis;

-- Security-definer helpers stay outside the Data API exposed schemas.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

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
      and role = 'ADMIN'::public.user_role
  );
$$;

revoke all on function private.is_admin() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated, service_role;

-- Harden the Phase 2 trigger functions without changing their external behavior.
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  role_val text;
  final_role public.user_role;
begin
  role_val := new.raw_user_meta_data->>'role';

  if role_val = 'ADMIN' then
    raise exception 'ROLE_NOT_ALLOWED: Admin role cannot be created via public registration';
  end if;

  if role_val = 'UMKM' then
    final_role := 'UMKM'::public.user_role;
  elsif role_val = 'COMMUNITY' then
    final_role := 'COMMUNITY'::public.user_role;
  else
    final_role := 'COMMUTER'::public.user_role;
  end if;

  insert into public.profiles (id, display_name, role)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name'
    ),
    final_role
  );

  return new;
end;
$$;

-- Replace recursive profile admin policies with a private security-definer helper.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update all profiles" on public.profiles;

create policy "Users can read own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "Admins can read all profiles"
  on public.profiles
  for select
  to authenticated
  using ((select private.is_admin()));

create policy "Admins can update all profiles"
  on public.profiles
  for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

-- Reusable validation for WGS84 geometry columns.
create or replace function public.is_valid_wgs84_geometry(
  input_geometry geometry,
  allowed_types text[]
)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = pg_catalog, public, extensions, gis
as $$
  select
    st_srid(input_geometry) = 4326
    and not st_isempty(input_geometry)
    and st_isvalid(input_geometry)
    and geometrytype(input_geometry) = any(allowed_types)
    and st_xmin(box3d(input_geometry)) >= -180
    and st_xmax(box3d(input_geometry)) <= 180
    and st_ymin(box3d(input_geometry)) >= -90
    and st_ymax(box3d(input_geometry)) <= 90;
$$;

create or replace function public.make_wgs84_bbox(
  min_lng double precision,
  min_lat double precision,
  max_lng double precision,
  max_lat double precision
)
returns geometry
language plpgsql
immutable
strict
parallel safe
set search_path = pg_catalog, public, extensions, gis
as $$
begin
  if min_lng < -180
    or max_lng > 180
    or min_lat < -90
    or max_lat > 90
    or min_lng >= max_lng
    or min_lat >= max_lat then
    raise exception 'Invalid WGS84 bounding box' using errcode = '22023';
  end if;

  return st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326);
end;
$$;

create or replace function public.wgs84_distance_meters(
  origin geometry,
  destination geometry
)
returns double precision
language plpgsql
immutable
strict
parallel safe
set search_path = pg_catalog, public, extensions, gis
as $$
begin
  if not public.is_valid_wgs84_geometry(origin, array['POINT']::text[])
    or not public.is_valid_wgs84_geometry(destination, array['POINT']::text[]) then
    raise exception 'Distance inputs must be valid WGS84 points'
      using errcode = '22023';
  end if;

  return st_distance(origin::geography, destination::geography);
end;
$$;

revoke all on function public.is_valid_wgs84_geometry(geometry, text[]) from public, anon;
revoke all on function public.make_wgs84_bbox(double precision, double precision, double precision, double precision) from public, anon;
revoke all on function public.wgs84_distance_meters(geometry, geometry) from public, anon;
grant execute on function public.is_valid_wgs84_geometry(geometry, text[]) to authenticated, service_role;
grant execute on function public.make_wgs84_bbox(double precision, double precision, double precision, double precision) to authenticated, service_role;
grant execute on function public.wgs84_distance_meters(geometry, geometry) to authenticated, service_role;

create table public.spatial_sources (
  id uuid primary key default gen_random_uuid(),
  source_name text not null,
  source_type text not null,
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spatial_sources_name_nonempty check (btrim(source_name) <> ''),
  constraint spatial_sources_type_supported check (
    source_type in ('external', 'survey', 'manual', 'imported', 'system')
  ),
  constraint spatial_sources_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table public.study_areas (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete set null,
  name text not null,
  description text,
  geometry geometry(MultiPolygon, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint study_areas_name_nonempty check (btrim(name) <> ''),
  constraint study_areas_geometry_valid check (
    public.is_valid_wgs84_geometry(geometry, array['MULTIPOLYGON']::text[])
  )
);

create table public.transport_corridors (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete set null,
  name text not null,
  transport_mode text not null,
  description text,
  geometry geometry(MultiLineString, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transport_corridors_name_nonempty check (btrim(name) <> ''),
  constraint transport_corridors_mode_nonempty check (btrim(transport_mode) <> ''),
  constraint transport_corridors_geometry_valid check (
    public.is_valid_wgs84_geometry(geometry, array['MULTILINESTRING']::text[])
  )
);

create table public.transport_nodes (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.spatial_sources(id) on delete set null,
  corridor_id uuid references public.transport_corridors(id) on delete set null,
  name text not null,
  node_type text not null,
  transport_mode text not null,
  geometry geometry(Point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transport_nodes_name_nonempty check (btrim(name) <> ''),
  constraint transport_nodes_type_nonempty check (btrim(node_type) <> ''),
  constraint transport_nodes_mode_nonempty check (btrim(transport_mode) <> ''),
  constraint transport_nodes_geometry_valid check (
    public.is_valid_wgs84_geometry(geometry, array['POINT']::text[])
  )
);

create table public.umkm_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete restrict,
  source_id uuid references public.spatial_sources(id) on delete set null,
  business_name text not null,
  category text not null,
  description text,
  address text,
  geometry geometry(Point, 4326) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint umkm_profiles_business_name_nonempty check (btrim(business_name) <> ''),
  constraint umkm_profiles_category_nonempty check (btrim(category) <> ''),
  constraint umkm_profiles_geometry_valid check (
    public.is_valid_wgs84_geometry(geometry, array['POINT']::text[])
  )
);

-- Spatial indexes support bbox/intersection filtering directly in PostGIS.
create index idx_study_areas_geometry_gist
  on public.study_areas using gist (geometry);
create index idx_transport_corridors_geometry_gist
  on public.transport_corridors using gist (geometry);
create index idx_transport_nodes_geometry_gist
  on public.transport_nodes using gist (geometry);
create index idx_umkm_profiles_geometry_gist
  on public.umkm_profiles using gist (geometry);

-- Relational and expected filter indexes; avoid speculative indexing of every column.
create index idx_study_areas_source_id on public.study_areas (source_id);
create index idx_transport_corridors_source_id on public.transport_corridors (source_id);
create index idx_transport_corridors_mode on public.transport_corridors (transport_mode);
create index idx_transport_nodes_source_id on public.transport_nodes (source_id);
create index idx_transport_nodes_corridor_id on public.transport_nodes (corridor_id);
create index idx_transport_nodes_mode_type
  on public.transport_nodes (transport_mode, node_type);
create index idx_umkm_profiles_owner_id on public.umkm_profiles (owner_id);
create index idx_umkm_profiles_source_id on public.umkm_profiles (source_id);
create index idx_umkm_profiles_category on public.umkm_profiles (category);
create index idx_spatial_sources_type on public.spatial_sources (source_type);

create trigger set_spatial_sources_updated_at
  before update on public.spatial_sources
  for each row execute function public.handle_updated_at();
create trigger set_study_areas_updated_at
  before update on public.study_areas
  for each row execute function public.handle_updated_at();
create trigger set_transport_corridors_updated_at
  before update on public.transport_corridors
  for each row execute function public.handle_updated_at();
create trigger set_transport_nodes_updated_at
  before update on public.transport_nodes
  for each row execute function public.handle_updated_at();
create trigger set_umkm_profiles_updated_at
  before update on public.umkm_profiles
  for each row execute function public.handle_updated_at();

alter table public.spatial_sources enable row level security;
alter table public.study_areas enable row level security;
alter table public.transport_corridors enable row level security;
alter table public.transport_nodes enable row level security;
alter table public.umkm_profiles enable row level security;

-- API roles receive SQL privileges; RLS remains the authorization boundary.
revoke all on table public.spatial_sources from anon;
revoke all on table public.study_areas from anon;
revoke all on table public.transport_corridors from anon;
revoke all on table public.transport_nodes from anon;
revoke all on table public.umkm_profiles from anon;

grant select, insert, update, delete on table public.spatial_sources to authenticated;
grant select, insert, update, delete on table public.study_areas to authenticated;
grant select, insert, update, delete on table public.transport_corridors to authenticated;
grant select, insert, update, delete on table public.transport_nodes to authenticated;
grant select, insert, update, delete on table public.umkm_profiles to authenticated;

grant all on table public.spatial_sources to service_role;
grant all on table public.study_areas to service_role;
grant all on table public.transport_corridors to service_role;
grant all on table public.transport_nodes to service_role;
grant all on table public.umkm_profiles to service_role;

create policy "Authenticated users can read spatial sources"
  on public.spatial_sources for select to authenticated
  using (true);
create policy "Admins can manage spatial sources"
  on public.spatial_sources for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Authenticated users can read study areas"
  on public.study_areas for select to authenticated
  using (true);
create policy "Admins can manage study areas"
  on public.study_areas for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Authenticated users can read transport corridors"
  on public.transport_corridors for select to authenticated
  using (true);
create policy "Admins can manage transport corridors"
  on public.transport_corridors for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Authenticated users can read transport nodes"
  on public.transport_nodes for select to authenticated
  using (true);
create policy "Admins can manage transport nodes"
  on public.transport_nodes for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "Owners can read own UMKM profiles"
  on public.umkm_profiles for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "Owners can create own UMKM profiles"
  on public.umkm_profiles for insert to authenticated
  with check (owner_id = (select auth.uid()));
create policy "Owners can update own UMKM profiles"
  on public.umkm_profiles for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
create policy "Admins can manage all UMKM profiles"
  on public.umkm_profiles for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

commit;
