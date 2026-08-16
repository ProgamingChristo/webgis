begin;

create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, gis;

select no_plan();

select ok(
  to_regtype('public.validation_status') is not null,
  'validation_status enum exists'
);

select is(
  array(
    select enum_value.enumlabel::text
    from pg_enum as enum_value
    where enum_value.enumtypid = 'public.validation_status'::regtype
    order by enum_value.enumsortorder
  ),
  array['PENDING', 'VALIDATED', 'REJECTED', 'ARCHIVED']::text[],
  'validation_status exposes the canonical ordered labels'
);

select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'study_areas',
        'transport_corridors',
        'transport_nodes',
        'umkm_profiles'
      )
      and column_name in (
        'source_record_id',
        'data_version',
        'validation_status',
        'retrieved_at',
        'validated_at',
        'metadata'
      )
  ),
  24::bigint,
  'all spatial entities expose the six Phase 5 provenance columns'
);

select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'study_areas',
        'transport_corridors',
        'transport_nodes',
        'umkm_profiles'
      )
      and column_name = 'validation_status'
      and data_type = 'USER-DEFINED'
      and udt_schema = 'public'
      and udt_name = 'validation_status'
  ),
  4::bigint,
  'all validation_status columns use the shared enum'
);

select is(
  (
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name in (
        'study_areas',
        'transport_corridors',
        'transport_nodes',
        'umkm_profiles'
      )
      and column_name in (
        'data_version',
        'validation_status',
        'retrieved_at',
        'metadata'
      )
      and is_nullable = 'NO'
      and column_default is not null
  ),
  16::bigint,
  'required provenance columns are non-null and database-defaulted'
);

select is(
  (
    select count(*)
    from pg_constraint
    where connamespace = 'public'::regnamespace
      and conname = any(array[
        'study_areas_source_record_id_nonempty',
        'study_areas_data_version_nonempty',
        'study_areas_source_record_requires_source',
        'study_areas_metadata_object',
        'study_areas_validated_at_required',
        'study_areas_pending_validated_at_empty',
        'study_areas_validated_at_order',
        'transport_corridors_source_record_id_nonempty',
        'transport_corridors_data_version_nonempty',
        'transport_corridors_source_record_requires_source',
        'transport_corridors_metadata_object',
        'transport_corridors_validated_at_required',
        'transport_corridors_pending_validated_at_empty',
        'transport_corridors_validated_at_order',
        'transport_nodes_source_record_id_nonempty',
        'transport_nodes_data_version_nonempty',
        'transport_nodes_source_record_requires_source',
        'transport_nodes_metadata_object',
        'transport_nodes_validated_at_required',
        'transport_nodes_pending_validated_at_empty',
        'transport_nodes_validated_at_order',
        'umkm_profiles_source_record_id_nonempty',
        'umkm_profiles_data_version_nonempty',
        'umkm_profiles_source_record_requires_source',
        'umkm_profiles_metadata_object',
        'umkm_profiles_validated_at_required',
        'umkm_profiles_pending_validated_at_empty',
        'umkm_profiles_validated_at_order'
      ]::name[])
      and contype = 'c'
  ),
  28::bigint,
  'all Phase 5 provenance check constraints exist'
);

select is(
  (
    select count(*)
    from pg_index as index_record
    join pg_class as index_relation on index_relation.oid = index_record.indexrelid
    join pg_namespace as index_namespace on index_namespace.oid = index_relation.relnamespace
    where index_namespace.nspname = 'public'
      and index_relation.relname in (
        'idx_study_areas_source_record_unique',
        'idx_transport_corridors_source_record_unique',
        'idx_transport_nodes_source_record_unique',
        'idx_umkm_profiles_source_record_unique'
      )
      and index_record.indisunique
      and index_record.indpred is not null
  ),
  4::bigint,
  'idempotency indexes are unique and partial'
);

select ok(
  to_regclass('public.idx_transport_nodes_geometry_geography_gist') is not null,
  'transport node geography GiST index exists'
);

select ok(
  to_regclass('public.idx_umkm_profiles_geometry_geography_gist') is not null,
  'UMKM geography GiST index exists'
);

select is(
  (
    select count(*)
    from pg_index as index_record
    join pg_class as index_relation on index_relation.oid = index_record.indexrelid
    join pg_namespace as index_namespace on index_namespace.oid = index_relation.relnamespace
    join pg_class as table_relation on table_relation.oid = index_record.indrelid
    join pg_am as access_method on access_method.oid = index_relation.relam
    where index_namespace.nspname = 'public'
      and table_relation.relname in ('transport_nodes', 'umkm_profiles')
      and index_relation.relname in (
        'idx_transport_nodes_geometry_geography_gist',
        'idx_umkm_profiles_geometry_geography_gist'
      )
      and access_method.amname = 'gist'
      and index_record.indexprs is not null
  ),
  2::bigint,
  'near-query indexes are GiST expression indexes'
);

select is(
  (
    select count(*)
    from pg_proc as procedure_record
    join pg_namespace as procedure_namespace
      on procedure_namespace.oid = procedure_record.pronamespace
    where procedure_namespace.nspname = 'public'
      and procedure_record.proname in (
        'find_study_areas_within_bbox',
        'find_transport_corridors_within_bbox',
        'find_transport_nodes_within_bbox',
        'find_umkm_profiles_within_bbox',
        'find_transport_nodes_near',
        'find_umkm_profiles_near'
      )
      and procedure_record.proretset
      and not procedure_record.prosecdef
      and procedure_record.provolatile = 's'
      and array_to_string(procedure_record.proconfig, ',') like
        'search_path=pg_catalog, public, extensions, gis%'
  ),
  6::bigint,
  'all spatial RPCs are stable security-invoker set functions with hardened search paths'
);

select is(
  (
    select count(*)
    from pg_proc as procedure_record
    join pg_namespace as procedure_namespace
      on procedure_namespace.oid = procedure_record.pronamespace
    where procedure_namespace.nspname = 'public'
      and procedure_record.proname in (
        'find_study_areas_within_bbox',
        'find_transport_corridors_within_bbox',
        'find_transport_nodes_within_bbox',
        'find_umkm_profiles_within_bbox',
        'find_transport_nodes_near',
        'find_umkm_profiles_near'
      )
      and not has_function_privilege('anon', procedure_record.oid, 'EXECUTE')
  ),
  6::bigint,
  'anonymous callers cannot execute spatial RPCs'
);

select is(
  (
    select count(*)
    from pg_proc as procedure_record
    join pg_namespace as procedure_namespace
      on procedure_namespace.oid = procedure_record.pronamespace
    where procedure_namespace.nspname = 'public'
      and procedure_record.proname in (
        'find_study_areas_within_bbox',
        'find_transport_corridors_within_bbox',
        'find_transport_nodes_within_bbox',
        'find_umkm_profiles_within_bbox',
        'find_transport_nodes_near',
        'find_umkm_profiles_near'
      )
      and has_function_privilege('authenticated', procedure_record.oid, 'EXECUTE')
      and has_function_privilege('service_role', procedure_record.oid, 'EXECUTE')
  ),
  6::bigint,
  'authenticated and service roles can execute spatial RPCs'
);

select ok(
  to_regprocedure('public.getra_database_health()') is not null,
  'GETRA database health function exists'
);

select is(
  public.getra_database_health(),
  'connected',
  'GETRA database health function returns connected'
);

select ok(
  has_function_privilege(
    'anon',
    'public.getra_database_health()'::regprocedure,
    'EXECUTE'
  )
    and has_function_privilege(
      'authenticated',
      'public.getra_database_health()'::regprocedure,
      'EXECUTE'
    )
    and has_function_privilege(
      'service_role',
      'public.getra_database_health()'::regprocedure,
      'EXECUTE'
    ),
  'all API roles can execute the GETRA database health function'
);

select ok(
  not exists (
    select 1
    from pg_proc as procedure_record
    cross join lateral aclexplode(procedure_record.proacl) as function_acl
    where procedure_record.oid = 'public.getra_database_health()'::regprocedure
      and function_acl.grantee = 0
      and function_acl.privilege_type = 'EXECUTE'
  ),
  'GETRA database health execution is not inherited from PUBLIC'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'UPDATE')
    and not has_table_privilege('authenticated', 'public.profiles', 'UPDATE'),
  'anon and authenticated have no table-wide profile UPDATE privilege'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.profiles',
    'display_name',
    'UPDATE'
  )
    and has_column_privilege(
      'authenticated',
      'public.profiles',
      'avatar_url',
      'UPDATE'
    ),
  'authenticated may update only public profile presentation fields'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'id', 'UPDATE')
    and not has_column_privilege(
      'authenticated',
      'public.profiles',
      'role',
      'UPDATE'
    )
    and not has_column_privilege(
      'authenticated',
      'public.profiles',
      'created_at',
      'UPDATE'
    )
    and not has_column_privilege(
      'authenticated',
      'public.profiles',
      'updated_at',
      'UPDATE'
    ),
  'authenticated cannot update immutable or security-sensitive profile fields'
);

select ok(
  has_table_privilege('service_role', 'public.profiles', 'UPDATE'),
  'service role retains trusted profile write access'
);

select ok(
  not has_table_privilege('anon', 'public.umkm_profiles', 'INSERT')
    and not has_table_privilege(
      'authenticated',
      'public.umkm_profiles',
      'INSERT'
    ),
  'anon and authenticated have no table-wide UMKM INSERT privilege'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.umkm_profiles',
    'owner_id',
    'INSERT'
  )
    and has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'business_name',
      'INSERT'
    )
    and has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'category',
      'INSERT'
    )
    and has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'description',
      'INSERT'
    )
    and has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'address',
      'INSERT'
    )
    and has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'geometry',
      'INSERT'
    ),
  'authenticated may insert only owner and UMKM business fields'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.umkm_profiles',
    'source_id',
    'INSERT'
  )
    and not has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'source_record_id',
      'INSERT'
    )
    and not has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'data_version',
      'INSERT'
    )
    and not has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'validation_status',
      'INSERT'
    )
    and not has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'retrieved_at',
      'INSERT'
    )
    and not has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'validated_at',
      'INSERT'
    )
    and not has_column_privilege(
      'authenticated',
      'public.umkm_profiles',
      'metadata',
      'INSERT'
    ),
  'authenticated cannot insert trusted UMKM provenance or validation fields'
);

select ok(
  has_table_privilege('service_role', 'public.umkm_profiles', 'INSERT'),
  'service role retains trusted UMKM insert access'
);

select ok(
  exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.umkm_profiles'::regclass
      and tgname = 'enforce_umkm_trusted_fields_before_update'
      and not tgisinternal
  ),
  'UMKM trusted-field update trigger exists'
);

select ok(
  exists (
    select 1
    from pg_proc as procedure_record
    join pg_namespace as procedure_namespace
      on procedure_namespace.oid = procedure_record.pronamespace
    where procedure_namespace.nspname = 'private'
      and procedure_record.proname = 'enforce_umkm_trusted_fields_update'
      and not procedure_record.prosecdef
      and array_to_string(procedure_record.proconfig, ',') = 'search_path=""'
      and not has_function_privilege('anon', procedure_record.oid, 'EXECUTE')
      and not has_function_privilege(
        'authenticated',
        procedure_record.oid,
        'EXECUTE'
      )
      and not has_function_privilege('service_role', procedure_record.oid, 'EXECUTE')
  ),
  'UMKM trusted-field trigger function is invoker-safe and not directly executable by API roles'
);

insert into public.spatial_sources (
  id,
  source_name,
  source_type,
  description,
  metadata
) values (
  '92000000-0000-0000-0000-000000000000',
  'TEST PHASE 5 SOURCE',
  'manual',
  'TEST-only provenance source',
  '{"fixture":true,"phase":"05"}'::jsonb
);

insert into public.study_areas (
  id,
  source_id,
  source_record_id,
  name,
  description,
  geometry
) values (
  '92000000-0000-0000-0000-000000000001',
  '92000000-0000-0000-0000-000000000000',
  'TEST-STUDY-001',
  'TEST PHASE 5 STUDY AREA',
  'TEST-only polygon',
  st_geomfromtext(
    'MULTIPOLYGON(((20 20,20 20.01,20.01 20.01,20.01 20,20 20)))',
    4326
  )
);

insert into public.transport_corridors (
  id,
  source_id,
  source_record_id,
  name,
  transport_mode,
  description,
  geometry
) values (
  '92000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000000',
  'TEST-CORRIDOR-001',
  'TEST PHASE 5 CORRIDOR',
  'test_mode',
  'TEST-only line',
  st_geomfromtext('MULTILINESTRING((20 20,20.01 20.01))', 4326)
);

insert into public.transport_nodes (
  id,
  source_id,
  source_record_id,
  name,
  node_type,
  transport_mode,
  geometry
) values (
  '92000000-0000-0000-0000-000000000003',
  '92000000-0000-0000-0000-000000000000',
  'TEST-NODE-001',
  'TEST PHASE 5 NODE',
  'test_node',
  'test_mode',
  st_setsrid(st_makepoint(20.005, 20.005), 4326)
);

insert into public.umkm_profiles (
  id,
  owner_id,
  source_id,
  source_record_id,
  business_name,
  category,
  description,
  address,
  geometry
) values (
  '92000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000002',
  '92000000-0000-0000-0000-000000000000',
  'TEST-UMKM-001',
  'TEST PHASE 5 UMKM',
  'test_category',
  'TEST-only point',
  'TEST ADDRESS - NOT PRODUCTION DATA',
  st_setsrid(st_makepoint(20.006, 20.006), 4326)
);

select is(
  (
    select data_version
    from public.study_areas
    where id = '92000000-0000-0000-0000-000000000001'
  ),
  '1',
  'data version defaults to 1'
);

select is(
  (
    select validation_status
    from public.study_areas
    where id = '92000000-0000-0000-0000-000000000001'
  ),
  'PENDING'::public.validation_status,
  'validation status defaults to PENDING'
);

select ok(
  (
    select retrieved_at is not null
      and validated_at is null
      and metadata = '{}'::jsonb
    from public.study_areas
    where id = '92000000-0000-0000-0000-000000000001'
  ),
  'retrieval, validation timestamp, and metadata defaults are consistent'
);

select throws_ok(
  $$
    insert into public.study_areas (
      id,
      source_id,
      source_record_id,
      name,
      geometry
    ) values (
      '92000000-0000-0000-0000-000000000011',
      '92000000-0000-0000-0000-000000000000',
      '   ',
      'TEST EMPTY SOURCE RECORD',
      st_geomfromtext(
        'MULTIPOLYGON(((21 21,21 21.01,21.01 21.01,21.01 21,21 21)))',
        4326
      )
    )
  $$,
  'empty external source record identifiers are rejected'
);

select throws_ok(
  $$
    insert into public.transport_corridors (
      id,
      data_version,
      name,
      transport_mode,
      geometry
    ) values (
      '92000000-0000-0000-0000-000000000012',
      ' ',
      'TEST EMPTY DATA VERSION',
      'test_mode',
      st_geomfromtext('MULTILINESTRING((21 21,21.01 21.01))', 4326)
    )
  $$,
  'empty data versions are rejected'
);

select throws_ok(
  $$
    insert into public.transport_nodes (
      id,
      source_record_id,
      name,
      node_type,
      transport_mode,
      geometry
    ) values (
      '92000000-0000-0000-0000-000000000013',
      'TEST-ORPHAN-RECORD',
      'TEST ORPHAN SOURCE RECORD',
      'test_node',
      'test_mode',
      st_setsrid(st_makepoint(21, 21), 4326)
    )
  $$,
  'an external record identifier requires a source'
);

select throws_ok(
  $$
    insert into public.umkm_profiles (
      id,
      owner_id,
      business_name,
      category,
      geometry,
      metadata
    ) values (
      '92000000-0000-0000-0000-000000000014',
      '00000000-0000-0000-0000-000000000002',
      'TEST INVALID METADATA',
      'test_category',
      st_setsrid(st_makepoint(21, 21), 4326),
      '[]'::jsonb
    )
  $$,
  'entity metadata must be a JSON object'
);

select throws_ok(
  $$
    insert into public.study_areas (
      id,
      name,
      geometry,
      validation_status
    ) values (
      '92000000-0000-0000-0000-000000000015',
      'TEST VALIDATED WITHOUT TIMESTAMP',
      st_geomfromtext(
        'MULTIPOLYGON(((21 21,21 21.01,21.01 21.01,21.01 21,21 21)))',
        4326
      ),
      'VALIDATED'::public.validation_status
    )
  $$,
  'VALIDATED records require validated_at'
);

select throws_ok(
  $$
    insert into public.transport_nodes (
      id,
      name,
      node_type,
      transport_mode,
      geometry,
      validation_status
    ) values (
      '92000000-0000-0000-0000-000000000018',
      'TEST REJECTED WITHOUT TIMESTAMP',
      'test_node',
      'test_mode',
      st_setsrid(st_makepoint(21, 21), 4326),
      'REJECTED'::public.validation_status
    )
  $$,
  'REJECTED records require validated_at'
);

select throws_ok(
  $$
    insert into public.transport_nodes (
      id,
      name,
      node_type,
      transport_mode,
      geometry,
      retrieved_at,
      validated_at
    ) values (
      '92000000-0000-0000-0000-000000000019',
      'TEST PENDING WITH TIMESTAMP',
      'test_node',
      'test_mode',
      st_setsrid(st_makepoint(21, 21), 4326),
      '2026-08-16 10:00:00+00'::timestamptz,
      '2026-08-16 11:00:00+00'::timestamptz
    )
  $$,
  'PENDING records cannot have validated_at'
);

select throws_ok(
  $$
    insert into public.study_areas (
      id,
      name,
      geometry,
      retrieved_at,
      validated_at
    ) values (
      '92000000-0000-0000-0000-000000000016',
      'TEST INVALID VALIDATION ORDER',
      st_geomfromtext(
        'MULTIPOLYGON(((21 21,21 21.01,21.01 21.01,21.01 21,21 21)))',
        4326
      ),
      '2026-08-16 12:00:00+00'::timestamptz,
      '2026-08-16 11:59:59+00'::timestamptz
    )
  $$,
  'validated_at cannot predate retrieved_at'
);

select throws_ok(
  $$
    insert into public.study_areas (
      id,
      source_id,
      source_record_id,
      name,
      geometry
    ) values (
      '92000000-0000-0000-0000-000000000017',
      '92000000-0000-0000-0000-000000000000',
      'TEST-STUDY-001',
      'TEST DUPLICATE SOURCE RECORD',
      st_geomfromtext(
        'MULTIPOLYGON(((22 22,22 22.01,22.01 22.01,22.01 22,22 22)))',
        4326
      )
    )
  $$,
  'duplicate source records are rejected idempotently'
);

select is(
  (
    select count(*)
    from public.find_study_areas_within_bbox(19.9, 19.9, 20.1, 20.1)
    where id = '92000000-0000-0000-0000-000000000001'
  ),
  1::bigint,
  'study area bbox RPC returns the matching TEST row'
);

select is(
  (
    select count(*)
    from public.find_transport_corridors_within_bbox(19.9, 19.9, 20.1, 20.1)
    where id = '92000000-0000-0000-0000-000000000002'
  ),
  1::bigint,
  'transport corridor bbox RPC returns the matching TEST row'
);

select is(
  (
    select count(*)
    from public.find_transport_nodes_within_bbox(19.9, 19.9, 20.1, 20.1)
    where id = '92000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'transport node bbox RPC returns the matching TEST row'
);

select is(
  (
    select count(*)
    from public.find_umkm_profiles_within_bbox(19.9, 19.9, 20.1, 20.1)
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  1::bigint,
  'UMKM bbox RPC returns the matching TEST row for a privileged caller'
);

select is(
  (
    select count(*)
    from public.find_transport_nodes_near(
      st_setsrid(st_makepoint(20.005, 20.005), 4326),
      100::double precision
    )
    where id = '92000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'transport node near RPC uses meter-based distance filtering'
);

select is(
  (
    select count(*)
    from public.find_umkm_profiles_near(
      st_setsrid(st_makepoint(20.006, 20.006), 4326),
      100::double precision
    )
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  1::bigint,
  'UMKM near RPC uses meter-based distance filtering'
);

select is(
  (
    select st_srid(geometry)
    from public.find_transport_nodes_near(
      st_setsrid(st_makepoint(20.005, 20.005), 4326),
      100::double precision
    )
    where id = '92000000-0000-0000-0000-000000000003'
  ),
  4326,
  'spatial RPC rows preserve WGS84 SRID'
);

select throws_ok(
  $$
    select *
    from public.find_study_areas_within_bbox(20.1, 19.9, 19.9, 20.1)
  $$,
  '22023',
  'Invalid WGS84 bounding box',
  'bbox RPC rejects invalid coordinate ordering'
);

select throws_ok(
  $$
    select *
    from public.find_transport_nodes_near(
      st_setsrid(st_makepoint(20.005, 20.005), 4326),
      0::double precision
    )
  $$,
  '22023',
  'Radius must be a finite positive number',
  'near RPC rejects a non-positive radius'
);

select throws_ok(
  $$
    select *
    from public.find_umkm_profiles_near(
      st_setsrid(st_makepoint(181, 0), 4326),
      100::double precision
    )
  $$,
  '22023',
  'Origin must be a valid WGS84 point',
  'near RPC rejects a point outside WGS84 bounds'
);

select throws_ok(
  $$
    select *
    from public.find_transport_nodes_near(
      st_setsrid(st_makepoint(20.005, 20.005), 3857),
      100::double precision
    )
  $$,
  '22023',
  'Origin must be a valid WGS84 point',
  'near RPC rejects a point with a non-WGS84 SRID'
);

set local role authenticated;
set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000002';
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000002","role":"authenticated"}';

select results_eq(
  $$
    insert into public.umkm_profiles (
      owner_id,
      business_name,
      category,
      description,
      address,
      geometry
    ) values (
      '00000000-0000-0000-0000-000000000002',
      'TEST PHASE 5 OWNER INSERT',
      'test_category',
      'TEST-only owner-created business',
      'TEST OWNER ADDRESS - NOT PRODUCTION DATA',
      st_setsrid(st_makepoint(30, 30), 4326)
    )
    returning business_name
  $$,
  array['TEST PHASE 5 OWNER INSERT'::text],
  'UMKM owner can insert a valid business row through allowed columns'
);

select ok(
  (
    select source_id is null
      and source_record_id is null
      and data_version = '1'
      and validation_status = 'PENDING'::public.validation_status
      and validated_at is null
      and metadata = '{}'::jsonb
    from public.umkm_profiles
    where business_name = 'TEST PHASE 5 OWNER INSERT'
  ),
  'owner-created UMKM provenance is forced to safe database defaults'
);

select throws_ok(
  $$
    insert into public.umkm_profiles (
      owner_id,
      source_id,
      validation_status,
      validated_at,
      business_name,
      category,
      geometry
    ) values (
      '00000000-0000-0000-0000-000000000002',
      '92000000-0000-0000-0000-000000000000',
      'VALIDATED'::public.validation_status,
      now(),
      'TEST FORGED OWNER PROVENANCE',
      'test_category',
      st_setsrid(st_makepoint(30.01, 30.01), 4326)
    )
  $$,
  '42501',
  'permission denied for table umkm_profiles',
  'ordinary owner cannot insert explicit source or validation values'
);

select is(
  (
    select count(*)
    from public.find_umkm_profiles_within_bbox(19.9, 19.9, 20.1, 20.1)
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  1::bigint,
  'UMKM owner can read the owned row through the bbox RPC'
);

select is(
  (
    select count(*)
    from public.find_umkm_profiles_near(
      st_setsrid(st_makepoint(20.006, 20.006), 4326),
      100::double precision
    )
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  1::bigint,
  'UMKM owner can read the owned row through the near RPC'
);

select results_eq(
  $$
    update public.profiles
    set display_name = 'TEST PHASE 5 OWNER'
    where id = '00000000-0000-0000-0000-000000000002'
    returning id
  $$,
  array['00000000-0000-0000-0000-000000000002'::uuid],
  'profile owner can still update an allowed presentation field'
);

select throws_ok(
  $$
    update public.profiles
    set role = 'ADMIN'::public.user_role
    where id = '00000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  'permission denied for table profiles',
  'profile owner cannot self-promote through the role column'
);

select results_eq(
  $$
    update public.umkm_profiles
    set description = 'TEST PHASE 5 OWNER BUSINESS UPDATE'
    where id = '92000000-0000-0000-0000-000000000004'
    returning id
  $$,
  array['92000000-0000-0000-0000-000000000004'::uuid],
  'UMKM owner can still update non-trusted business fields'
);

select throws_ok(
  $$
    update public.umkm_profiles
    set validation_status = 'VALIDATED'::public.validation_status,
        validated_at = retrieved_at + interval '1 second'
    where id = '92000000-0000-0000-0000-000000000004'
  $$,
  '42501',
  'Only administrators or trusted database roles may update immutable UMKM or provenance fields',
  'UMKM owner cannot self-validate or modify trusted provenance fields'
);

select throws_ok(
  $$
    update public.umkm_profiles
    set created_at = created_at - interval '1 second'
    where id = '92000000-0000-0000-0000-000000000004'
  $$,
  '42501',
  'Only administrators or trusted database roles may update immutable UMKM or provenance fields',
  'UMKM owner cannot update immutable base-entity fields'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000003';
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}';

select is(
  (
    select count(*)
    from public.find_umkm_profiles_within_bbox(19.9, 19.9, 20.1, 20.1)
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  0::bigint,
  'another authenticated user cannot read the owner row through the bbox RPC'
);

select is(
  (
    select count(*)
    from public.find_umkm_profiles_near(
      st_setsrid(st_makepoint(20.006, 20.006), 4326),
      100::double precision
    )
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  0::bigint,
  'another authenticated user cannot read the owner row through the near RPC'
);

select is(
  (
    select count(*)
    from public.find_transport_nodes_within_bbox(19.9, 19.9, 20.1, 20.1)
    where id = '92000000-0000-0000-0000-000000000003'
  ),
  1::bigint,
  'authenticated users retain read access to reference data through RPCs'
);

set local request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';
set local request.jwt.claims =
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}';

select results_eq(
  $$
    update public.umkm_profiles
    set data_version = '2',
        validation_status = 'VALIDATED'::public.validation_status,
        validated_at = retrieved_at + interval '1 second'
    where id = '92000000-0000-0000-0000-000000000004'
    returning id
  $$,
  array['92000000-0000-0000-0000-000000000004'::uuid],
  'admin may update UMKM validation and provenance fields'
);

select ok(
  (
    select validation_status = 'VALIDATED'::public.validation_status
      and data_version = '2'
      and validated_at >= retrieved_at
    from public.umkm_profiles
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  'admin validation update satisfies timestamp ordering'
);

select is(
  (
    select count(*)
    from public.find_umkm_profiles_near(
      st_setsrid(st_makepoint(20.006, 20.006), 4326),
      100::double precision
    )
    where id = '92000000-0000-0000-0000-000000000004'
  ),
  1::bigint,
  'admin can read all UMKM rows through a security-invoker RPC'
);

reset role;

select * from finish();
rollback;
