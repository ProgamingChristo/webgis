begin;

set local search_path = public, extensions, gis;

create index if not exists idx_merchants_location_gist
  on public.merchants using gist (location);

create or replace function public.list_canonical_merchant_ids_in_bbox_v1(
  p_west double precision,
  p_south double precision,
  p_east double precision,
  p_north double precision,
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  merchant_id uuid,
  total_count bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with eligible as (
    select distinct merchant.id
    from public.merchants merchant
    inner join public.merchant_source_links source_link
      on source_link.merchant_id = merchant.id
    where merchant.publish_status = 'PUBLISHED'::public.publish_status
      and source_link.source_table in (
        'mapid_premium_merchants',
        'mapid_mission_observations:MENU_GO'
      )
      and extensions.st_intersects(
        merchant.location,
        extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
      )
  )
  select
    eligible.id,
    count(*) over () as total_count
  from eligible
  order by eligible.id
  limit greatest(1, least(coalesce(p_limit, 100), 250))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.list_canonical_merchant_ids_in_bbox_v1(
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  integer
) from public, anon, authenticated;

grant execute on function public.list_canonical_merchant_ids_in_bbox_v1(
  double precision,
  double precision,
  double precision,
  double precision,
  integer,
  integer
) to service_role;

commit;
