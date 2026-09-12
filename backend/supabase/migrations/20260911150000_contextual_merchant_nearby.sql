begin;

set local search_path = public, extensions;

create index if not exists idx_merchants_location_geography_gist
  on public.merchants using gist ((location::geography))
  where publish_status = 'PUBLISHED'::public.publish_status;

create or replace function public.search_canonical_merchants_nearby_v1(
  p_longitude double precision,
  p_latitude double precision,
  p_radius_meters integer,
  p_keyword text default null,
  p_category text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  merchant_id uuid,
  total_count bigint,
  relevance_score integer,
  distance_meters double precision,
  region_ids text[],
  region_names text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with input as (
    select
      nullif(lower(regexp_replace(btrim(coalesce(p_keyword, '')), '\s+', ' ', 'g')), '') as keyword,
      nullif(lower(regexp_replace(btrim(coalesce(p_category, '')), '\s+', ' ', 'g')), '') as category,
      extensions.st_setsrid(extensions.st_makepoint(p_longitude, p_latitude), 4326)::geography as origin
  ),
  candidates as (
    select distinct
      merchant.id,
      merchant.name,
      extensions.st_distance(merchant.location::geography, input.origin) as distance_meters,
      case
        when input.keyword is null then 0
        when lower(merchant.name) = input.keyword then 400
        when starts_with(lower(merchant.name), input.keyword) then 300
        when strpos(lower(merchant.name), input.keyword) > 0 then 200
        when strpos(lower(coalesce(merchant.metadata->>'category_label', merchant.metadata->>'category', '')), input.keyword) > 0 then 140
        when strpos(lower(coalesce(menu_observation.search_text, '')), input.keyword) > 0 then 120
        when strpos(lower(coalesce(merchant.address, '')), input.keyword) > 0 then 80
        else 0
      end as relevance_score
    from public.merchants merchant
    inner join public.merchant_source_links source_link
      on source_link.merchant_id = merchant.id
     and source_link.source_table in ('mapid_premium_merchants', 'mapid_mission_observations:MENU_GO')
    cross join input
    left join lateral (
      select string_agg(concat_ws(' ',
        observation.normalized_properties->>'nama_tempat',
        observation.normalized_properties->>'jenis_tempat',
        observation.normalized_properties->>'menu_utama'
      ), ' ') as search_text
      from public.merchant_source_links menu_link
      inner join public.mapid_mission_observations observation
        on observation.source_type = 'MENU_GO'
       and observation.source_record_id = menu_link.source_record_id
      where menu_link.merchant_id = merchant.id
        and menu_link.source_table = 'mapid_mission_observations:MENU_GO'
    ) menu_observation on true
    where merchant.publish_status = 'PUBLISHED'::public.publish_status
      and p_radius_meters between 250 and 3000
      and extensions.st_dwithin(merchant.location::geography, input.origin, p_radius_meters)
      and (
        input.keyword is null
        or lower(merchant.name) = input.keyword
        or starts_with(lower(merchant.name), input.keyword)
        or strpos(lower(merchant.name), input.keyword) > 0
        or strpos(lower(coalesce(merchant.description, '')), input.keyword) > 0
        or strpos(lower(coalesce(merchant.address, '')), input.keyword) > 0
        or strpos(lower(coalesce(merchant.metadata->>'category_label', merchant.metadata->>'category', '')), input.keyword) > 0
        or strpos(lower(coalesce(merchant.metadata->>'brand', '')), input.keyword) > 0
        or strpos(lower(coalesce(menu_observation.search_text, '')), input.keyword) > 0
      )
      and (
        input.category is null
        or lower(coalesce(merchant.metadata->>'brand', '')) = input.category
        or lower(coalesce(merchant.metadata->>'category_label', merchant.metadata->>'category', '')) = input.category
      )
  ),
  enriched as (
    select candidate.*,
      coalesce(region_match.ids, '{}'::text[]) as region_ids,
      coalesce(region_match.names, '{}'::text[]) as region_names
    from candidates candidate
    inner join public.merchants merchant on merchant.id = candidate.id
    left join lateral (
      select array_agg(region.id order by region.name) as ids,
        array_agg(region.name order by region.name) as names
      from public.administrative_regions region
      where extensions.st_intersects(merchant.location, region.geometry)
    ) region_match on true
  )
  select enriched.id, count(*) over (), enriched.relevance_score,
    enriched.distance_meters, enriched.region_ids, enriched.region_names
  from enriched
  order by enriched.relevance_score desc, enriched.distance_meters, lower(enriched.name), enriched.id
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.search_canonical_merchants_nearby_v1(
  double precision, double precision, integer, text, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.search_canonical_merchants_nearby_v1(
  double precision, double precision, integer, text, text, integer, integer
) to service_role;

commit;
