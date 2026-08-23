begin;

create schema if not exists extensions;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions, gis;

select no_plan();

select has_column('public', 'community_posts', 'location', 'community_posts.location exists');
select has_column('public', 'community_posts', 'location_visibility', 'community_posts.location_visibility exists');
select has_column('public', 'community_posts', 'location_accuracy_m', 'community_posts.location_accuracy_m exists');

select is(
  (
    select postgis_typmod_srid(attribute.atttypmod)
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'community_posts'
      and attribute.attname = 'location'
  ),
  4326,
  'community post location uses SRID 4326'
);

select is(
  (
    select postgis_typmod_type(attribute.atttypmod)
    from pg_attribute attribute
    join pg_class relation on relation.oid = attribute.attrelid
    join pg_namespace namespace on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname = 'community_posts'
      and attribute.attname = 'location'
  ),
  'Point',
  'community post location uses Point geometry'
);

insert into public.profiles (id, email, display_name)
values
  ('00000000-0000-0000-0000-000000000301', 'community-phase3@example.test', 'Community Phase 3')
on conflict (id) do nothing;

insert into public.community_posts (
  id,
  author_id,
  content,
  location,
  location_visibility,
  location_accuracy_m
)
values (
  '00000000-0000-0000-0000-000000000302',
  '00000000-0000-0000-0000-000000000301',
  'Round-trip location test',
  st_setsrid(st_makepoint(106.8272, -6.1754), 4326),
  'APPROXIMATE',
  18
)
on conflict (id) do update
set
  location = excluded.location,
  location_visibility = excluded.location_visibility,
  location_accuracy_m = excluded.location_accuracy_m;

select is(
  (
    select st_srid(location)
    from public.community_posts
    where id = '00000000-0000-0000-0000-000000000302'
  ),
  4326,
  'stored community post location preserves SRID 4326'
);

select is(
  (
    select st_x(location)::numeric(10, 4)
    from public.community_posts
    where id = '00000000-0000-0000-0000-000000000302'
  ),
  106.8272::numeric(10, 4),
  'stored community post location preserves longitude in X'
);

select is(
  (
    select st_y(location)::numeric(10, 4)
    from public.community_posts
    where id = '00000000-0000-0000-0000-000000000302'
  ),
  (-6.1754)::numeric(10, 4),
  'stored community post location preserves latitude in Y'
);

select is(
  (
    select st_x(st_snaptogrid(location, 0.001))::numeric(10, 3)
    from public.community_posts
    where id = '00000000-0000-0000-0000-000000000302'
  ),
  106.827::numeric(10, 3),
  'approximate projection snaps longitude to the public grid'
);

select is(
  (
    select st_y(st_snaptogrid(location, 0.001))::numeric(10, 3)
    from public.community_posts
    where id = '00000000-0000-0000-0000-000000000302'
  ),
  (-6.175)::numeric(10, 3),
  'approximate projection snaps latitude to the public grid'
);

select throws_ok(
  $$insert into public.community_posts (author_id, content, location, location_visibility)
    values (
      '00000000-0000-0000-0000-000000000301',
      'Invalid coordinate',
      st_setsrid(st_makepoint(181, 0), 4326),
      'APPROXIMATE'
    )$$,
  '23514',
  'invalid community post longitude is rejected'
);

select * from finish();

rollback;
