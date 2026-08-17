begin;

-- Phase 7 database verification uses transaction-local TEST fixtures only.
-- It never depends on or claims production/research data.
create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, gis;
set local enable_seqscan = off;

select no_plan();

insert into public.spatial_sources (
  id,
  source_name,
  source_type,
  description,
  metadata
) values (
  '97000000-0000-4000-8000-000000000001',
  'TEST PHASE 7 SPATIAL SOURCE',
  'manual',
  'TEST FIXTURE - NOT PRODUCTION OR RESEARCH DATA',
  '{"fixture":true,"phase":"07"}'::jsonb
);

insert into public.transport_nodes (
  id,
  source_id,
  name,
  node_type,
  transport_mode,
  geometry
) values
  (
    '97000000-0000-4000-8000-000000000002',
    '97000000-0000-4000-8000-000000000001',
    'TEST PHASE 7 NEAR NODE',
    'TEST',
    'TEST',
    st_setsrid(st_makepoint(10.0005, 10.0005), 4326)
  ),
  (
    '97000000-0000-4000-8000-000000000003',
    '97000000-0000-4000-8000-000000000001',
    'TEST PHASE 7 FAR NODE',
    'TEST',
    'TEST',
    st_setsrid(st_makepoint(10.02, 10.02), 4326)
  );

insert into public.study_areas (
  id,
  source_id,
  name,
  description,
  geometry
) values (
  '97000000-0000-4000-8000-000000000004',
  '97000000-0000-4000-8000-000000000001',
  'TEST PHASE 7 BBOX AREA',
  'TEST FIXTURE - NOT PRODUCTION OR RESEARCH DATA',
  st_geomfromtext(
    'MULTIPOLYGON(((20 20,20 20.01,20.01 20.01,20.01 20,20 20)))',
    4326
  )
);

select is(
  public.wgs84_distance_meters(
    st_setsrid(st_makepoint(0, 0), 4326),
    st_setsrid(st_makepoint(0, 0), 4326)
  ),
  0::double precision,
  'PostGIS geography distance is zero for the same TEST point'
);

select cmp_ok(
  public.wgs84_distance_meters(
    st_setsrid(st_makepoint(0, 0), 4326),
    st_setsrid(st_makepoint(0, 0.01), 4326)
  ),
  '>',
  1000::double precision,
  'PostGIS geography distance returns meters for distinct TEST points'
);

select cmp_ok(
  public.wgs84_distance_meters(
    st_setsrid(st_makepoint(0, 0), 4326),
    st_setsrid(st_makepoint(0, 0.01), 4326)
  ),
  '<',
  1200::double precision,
  'PostGIS geography distance remains within a safe fixture bound'
);

select ok(
  public.is_valid_wgs84_geometry(
    st_setsrid(st_makepoint(106.8, -6.2), 4326),
    array['POINT']::text[]
  ),
  'valid non-empty WGS84 TEST point passes geometry validation'
);

select ok(
  not public.is_valid_wgs84_geometry(
    st_geomfromtext('POINT EMPTY', 4326),
    array['POINT']::text[]
  ),
  'empty geometry is rejected by the PostGIS helper'
);

select ok(
  not public.is_valid_wgs84_geometry(
    st_setsrid(st_makepoint(106.8, -6.2), 3857),
    array['POINT']::text[]
  ),
  'non-WGS84 SRID is rejected by the PostGIS helper'
);

select ok(
  not public.is_valid_wgs84_geometry(
    st_geomfromtext('POLYGON((0 0,1 1,1 0,0 1,0 0))', 4326),
    array['POLYGON']::text[]
  ),
  'self-intersecting TEST polygon is rejected by ST_IsValid'
);

select is(
  (
    select st_srid(geometry)
    from public.transport_nodes
    where id = '97000000-0000-4000-8000-000000000002'
  ),
  4326,
  'stored TEST node preserves EPSG:4326'
);

select ok(
  st_dwithin(
    (
      select geometry::geography
      from public.transport_nodes
      where id = '97000000-0000-4000-8000-000000000002'
    ),
    st_setsrid(st_makepoint(10, 10), 4326)::geography,
    100::double precision
  ),
  'ST_DWithin identifies the near TEST node in meter units'
);

select is(
  (
    select count(*)
    from public.find_transport_nodes_near(
      st_setsrid(st_makepoint(10, 10), 4326),
      100::double precision
    )
    where source_id = '97000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'nearby RPC returns only the TEST node within radius'
);

select is(
  (
    select count(*)
    from public.find_study_areas_within_bbox(19.99, 19.99, 20.02, 20.02)
    where source_id = '97000000-0000-4000-8000-000000000001'
  ),
  1::bigint,
  'bbox RPC returns the intersecting TEST study area'
);

-- Fixed, test-owned statements only: no request input or arbitrary SQL reaches
-- these EXPLAIN helpers. Disabling sequential scans verifies index eligibility,
-- not a production cost estimate on the small fixture table.
create or replace function pg_temp.phase7_near_explain()
returns setof text
language plpgsql
as $$
begin
  return query execute $query$
    explain (costs off)
    select id
    from public.transport_nodes
    where st_dwithin(
      geometry::geography,
      st_setsrid(st_makepoint(10, 10), 4326)::geography,
      100::double precision
    )
  $query$;
end;
$$;

create or replace function pg_temp.phase7_bbox_explain()
returns setof text
language plpgsql
as $$
begin
  return query execute $query$
    explain (costs off)
    select id
    from public.study_areas
    where geometry && public.make_wgs84_bbox(19.99, 19.99, 20.02, 20.02)
      and st_intersects(
        geometry,
        public.make_wgs84_bbox(19.99, 19.99, 20.02, 20.02)
      )
  $query$;
end;
$$;

select matches(
  (select string_agg(plan_line, E'\n') from pg_temp.phase7_near_explain() as plan(plan_line)),
  'idx_transport_nodes_geometry_geography_gist',
  'EXPLAIN confirms the ST_DWithin query is eligible for the geography GiST index'
);

select matches(
  (select string_agg(plan_line, E'\n') from pg_temp.phase7_bbox_explain() as plan(plan_line)),
  'idx_study_areas_geometry_gist',
  'EXPLAIN confirms the bbox query is eligible for the geometry GiST index'
);

select * from finish();
rollback;
