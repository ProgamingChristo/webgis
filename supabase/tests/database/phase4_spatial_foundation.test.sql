begin;

create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, gis;
select no_plan();

select ok(
  exists (select 1 from pg_extension where extname = 'postgis'),
  'PostGIS extension is enabled'
);

select has_table('public', 'study_areas', 'study_areas exists');
select has_table('public', 'transport_corridors', 'transport_corridors exists');
select has_table('public', 'transport_nodes', 'transport_nodes exists');
select has_table('public', 'umkm_profiles', 'umkm_profiles exists');
select has_table('public', 'spatial_sources', 'spatial_sources exists');

select is(
  (
    select postgis_typmod_srid(attribute.atttypmod)
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'study_areas'
      and attribute.attname = 'geometry'
  ),
  4326,
  'study_areas geometry uses SRID 4326'
);

select is(
  (
    select postgis_typmod_type(attribute.atttypmod)
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'transport_corridors'
      and attribute.attname = 'geometry'
  ),
  'MultiLineString',
  'transport_corridors uses MultiLineString geometry'
);

select is(
  (
    select postgis_typmod_type(attribute.atttypmod)
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'transport_nodes'
      and attribute.attname = 'geometry'
  ),
  'Point',
  'transport_nodes uses Point geometry'
);

select is(
  (
    select postgis_typmod_type(attribute.atttypmod)
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'umkm_profiles'
      and attribute.attname = 'geometry'
  ),
  'Point',
  'umkm_profiles uses Point geometry'
);

select ok(
  (select relrowsecurity from pg_class where oid = 'public.study_areas'::regclass),
  'study_areas has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.transport_corridors'::regclass),
  'transport_corridors has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.transport_nodes'::regclass),
  'transport_nodes has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.umkm_profiles'::regclass),
  'umkm_profiles has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.spatial_sources'::regclass),
  'spatial_sources has RLS enabled'
);

select ok(to_regclass('public.idx_study_areas_geometry_gist') is not null, 'study area GiST index exists');
select ok(to_regclass('public.idx_transport_corridors_geometry_gist') is not null, 'corridor GiST index exists');
select ok(to_regclass('public.idx_transport_nodes_geometry_gist') is not null, 'node GiST index exists');
select ok(to_regclass('public.idx_umkm_profiles_geometry_gist') is not null, 'UMKM GiST index exists');
select ok(to_regclass('public.idx_transport_nodes_corridor_id') is not null, 'corridor foreign-key index exists');
select ok(to_regclass('public.idx_umkm_profiles_owner_id') is not null, 'owner foreign-key index exists');

select col_is_fk('public', 'transport_nodes', 'corridor_id', 'transport node corridor relation exists');
select col_is_fk('public', 'umkm_profiles', 'owner_id', 'UMKM owner relation exists');
select col_is_fk('public', 'umkm_profiles', 'source_id', 'UMKM source relation exists');

select ok(
  public.is_valid_wgs84_geometry(
    st_setsrid(st_makepoint(0, 0), 4326),
    array['POINT']::text[]
  ),
  'valid WGS84 point passes database validation'
);

select ok(
  st_isvalid(
    st_geomfromtext(
      'MULTIPOLYGON(((0 0,0 1,1 1,1 0,0 0)))',
      4326
    )
  ),
  'ST_IsValid validates the test multipolygon'
);

select throws_ok(
  $$select public.make_wgs84_bbox(10, -6, 9, -5)$$,
  '22023',
  'Invalid WGS84 bounding box',
  'invalid bbox ordering is rejected'
);

select is(
  public.wgs84_distance_meters(
    st_setsrid(st_makepoint(0, 0), 4326),
    st_setsrid(st_makepoint(0, 0), 4326)
  ),
  0::double precision,
  'distance foundation returns zero for identical points'
);

select cmp_ok(
  public.wgs84_distance_meters(
    st_setsrid(st_makepoint(0, 0), 4326),
    st_setsrid(st_makepoint(0, 0.01), 4326)
  ),
  '>',
  1000::double precision,
  'distance foundation returns meters for distinct WGS84 points'
);

select lives_ok(
  $$
    insert into public.study_areas (id, name, geometry)
    values (
      '90000000-0000-0000-0000-000000000001',
      'TEST INSERT POLYGON',
      st_geomfromtext('MULTIPOLYGON(((1 1,1 1.01,1.01 1.01,1.01 1,1 1)))', 4326)
    )
  $$,
  'valid MultiPolygon insertion succeeds'
);

select lives_ok(
  $$
    insert into public.transport_corridors (id, name, transport_mode, geometry)
    values (
      '90000000-0000-0000-0000-000000000002',
      'TEST INSERT LINE',
      'test_mode',
      st_geomfromtext('MULTILINESTRING((1 1,1.01 1.01))', 4326)
    )
  $$,
  'valid MultiLineString insertion succeeds'
);

select lives_ok(
  $$
    insert into public.transport_nodes (id, name, node_type, transport_mode, geometry)
    values (
      '90000000-0000-0000-0000-000000000003',
      'TEST INSERT POINT',
      'test_node',
      'test_mode',
      st_setsrid(st_makepoint(1, 1), 4326)
    )
  $$,
  'valid Point insertion succeeds'
);

select throws_ok(
  $$
    insert into public.transport_nodes (name, node_type, transport_mode, geometry)
    values ('TEST INVALID COORDINATE', 'test_node', 'test_mode', st_setsrid(st_makepoint(181, 0), 4326))
  $$,
  'coordinates outside WGS84 bounds are rejected'
);

select throws_ok(
  $$
    insert into public.study_areas (name, geometry)
    values (
      'TEST INVALID POLYGON',
      st_geomfromtext('MULTIPOLYGON(((0 0,1 1,1 0,0 1,0 0)))', 4326)
    )
  $$,
  'invalid geometry is rejected'
);

select throws_ok(
  $$insert into public.transport_nodes (name, node_type, transport_mode) values ('TEST MISSING GEOMETRY', 'test_node', 'test_mode')$$,
  'missing geometry is rejected'
);

select throws_ok(
  $$
    insert into public.transport_nodes (name, node_type, transport_mode, corridor_id, geometry)
    values (
      'TEST INVALID CORRIDOR',
      'test_node',
      'test_mode',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      st_setsrid(st_makepoint(0, 0), 4326)
    )
  $$,
  'invalid corridor foreign key is rejected'
);

select is(
  (
    select count(*)
    from public.study_areas
    where geometry && public.make_wgs84_bbox(-0.1, -0.1, 0.1, 0.1)
      and st_intersects(geometry, public.make_wgs84_bbox(-0.1, -0.1, 0.1, 0.1))
      and name = 'TEST STUDY AREA'
  ),
  1::bigint,
  'bbox filtering returns the seeded test area'
);

select ok(
  not has_table_privilege('anon', 'public.umkm_profiles', 'select'),
  'anonymous role has no UMKM table access'
);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select is(
  (select count(*) from public.umkm_profiles where id = '10000000-0000-0000-0000-000000000005'),
  1::bigint,
  'UMKM owner can read the owned row'
);

select results_eq(
  $$
    update public.umkm_profiles
    set description = 'TEST OWNER UPDATE'
    where id = '10000000-0000-0000-0000-000000000005'
    returning id
  $$,
  array['10000000-0000-0000-0000-000000000005'::uuid],
  'UMKM owner can update the owned row'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

select is(
  (select count(*) from public.umkm_profiles where id = '10000000-0000-0000-0000-000000000005'),
  0::bigint,
  'another authenticated user cannot read the owner row'
);

select results_eq(
  $$
    update public.umkm_profiles
    set description = 'TEST UNAUTHORIZED UPDATE'
    where id = '10000000-0000-0000-0000-000000000005'
    returning id
  $$,
  array[]::uuid[],
  'another authenticated user cannot update the owner row'
);

select is(
  (select count(*) from public.study_areas where name = 'TEST STUDY AREA'),
  1::bigint,
  'authenticated users can read spatial reference data'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select is(
  (select count(*) from public.umkm_profiles where id = '10000000-0000-0000-0000-000000000005'),
  1::bigint,
  'admin can read all UMKM rows through the non-recursive role helper'
);

reset role;

select * from finish();
rollback;
