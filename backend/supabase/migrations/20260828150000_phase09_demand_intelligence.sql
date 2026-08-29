begin;

set local search_path = public, extensions, gis;

insert into public.categories (id, slug, name, parent_id, category_group, icon_key, sort_order, metadata)
select
  '09000000-0000-4000-8000-000000000001'::uuid,
  'bakso',
  'Bakso',
  parent.id,
  'FOOD',
  'soup',
  25,
  '{"phase":"09","taxonomy":"GETRA_ANALYTICS_V1"}'::jsonb
from public.categories parent
where parent.slug = 'food'
on conflict (slug) do nothing;

insert into public.categories (id, slug, name, parent_id, category_group, icon_key, sort_order, metadata)
select
  '09000000-0000-4000-8000-000000000002'::uuid,
  'nasi-goreng',
  'Nasi Goreng',
  parent.id,
  'FOOD',
  'utensils',
  26,
  '{"phase":"09","taxonomy":"GETRA_ANALYTICS_V1"}'::jsonb
from public.categories parent
where parent.slug = 'food'
on conflict (slug) do nothing;

create or replace function public.analytics_category_slug_v1(p_text text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_text is null or btrim(p_text) = '' then null
    when lower(p_text) ~ '(^|[^a-z])bakso([^a-z]|$)' then 'bakso'
    when lower(p_text) ~ 'nasi[[:space:]_-]*goreng' then 'nasi-goreng'
    when lower(p_text) ~ 'kopi|coffee|kafe|cafe' then 'coffee'
    when lower(p_text) ~ 'minimarket|supermarket|indomaret|alfamart|family[[:space:]]*mart|circle[[:space:]]*k|lawson' then 'minimarket'
    when lower(p_text) ~ 'apotek|pharmacy' then 'pharmacy'
    when lower(p_text) ~ 'fast[[:space:]_-]*food|(^|[^a-z])kfc([^a-z]|$)|mcdonald' then 'fast-food'
    when lower(p_text) ~ 'kaki[[:space:]_-]*lima|gerobak|street[[:space:]_-]*food' then 'street-food'
    when lower(p_text) ~ 'warung|tenda' then 'warung'
    when lower(p_text) ~ 'restoran|restaurant' then 'restaurant'
    when lower(p_text) ~ 'minuman|beverage' then 'beverage'
    when lower(p_text) ~ 'roti|kue|pastri|donat|makanan|food' then 'food'
    when lower(p_text) ~ 'retail|e-commerce' then 'retail'
    when lower(p_text) ~ 'laundry' then 'laundry'
    when lower(p_text) ~ 'jasa|service' then 'services'
    when lower(p_text) ~ 'transport' then 'transport'
    else null
  end;
$$;

create or replace function public.analytics_category_matches_v1(
  p_actual_slug text,
  p_requested_slug text
)
returns boolean
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when p_actual_slug is null or p_requested_slug is null then false
    when p_actual_slug = p_requested_slug then true
    when p_requested_slug = 'food' then p_actual_slug = any(array[
      'restaurant', 'warung', 'street-food', 'fast-food', 'bakso', 'nasi-goreng'
    ]::text[])
    when p_requested_slug = 'beverage' then p_actual_slug = 'coffee'
    when p_requested_slug = 'retail' then p_actual_slug = 'minimarket'
    when p_requested_slug = 'health' then p_actual_slug = 'pharmacy'
    when p_requested_slug = 'services' then p_actual_slug = 'laundry'
    else false
  end;
$$;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  dedup_key text not null,
  category_slug text not null references public.categories(slug) on delete restrict,
  region_ids text[] not null default '{}'::text[],
  result_count integer,
  outcome text,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint analytics_events_type_valid check (event_type in ('SEARCH', 'ROUTE_REQUEST')),
  constraint analytics_events_dedup_unique unique (dedup_key),
  constraint analytics_events_region_count check (cardinality(region_ids) between 1 and 5),
  constraint analytics_events_result_count check (result_count is null or result_count between 0 and 100000),
  constraint analytics_events_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists idx_analytics_events_category_time
  on public.analytics_events (category_slug, occurred_at desc);

create index if not exists idx_analytics_events_type_time
  on public.analytics_events (event_type, occurred_at desc);

create index if not exists idx_analytics_events_regions_gin
  on public.analytics_events using gin (region_ids);

alter table public.analytics_events enable row level security;
revoke all on table public.analytics_events from public, anon, authenticated;
grant select, insert on table public.analytics_events to service_role;

create policy "Service role manages aggregate-safe analytics events"
  on public.analytics_events
  for all to service_role
  using (true)
  with check (true);

create or replace function public.get_analytics_merchant_context_v1(p_merchant_id uuid)
returns table (
  category_slug text,
  region_ids text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    public.analytics_category_slug_v1(concat_ws(' ',
      merchant.name,
      merchant.description,
      merchant.metadata->>'category',
      merchant.metadata->>'brand',
      coalesce((
        select string_agg(concat_ws(' ',
          observation.normalized_properties->>'jenis_tempat',
          observation.normalized_properties->>'menu_utama'
        ), ' ')
        from public.merchant_source_links link
        inner join public.mapid_mission_observations observation
          on observation.source_type = 'MENU_GO'
         and observation.source_record_id = link.source_record_id
        where link.merchant_id = merchant.id
          and link.source_table = 'mapid_mission_observations:MENU_GO'
      ), '')
    )),
    coalesce((
      select array_agg(region.id order by region.name)
      from public.administrative_regions region
      where extensions.st_intersects(merchant.location, region.geometry)
    ), '{}'::text[])
  from public.merchants merchant
  where merchant.id = p_merchant_id
    and merchant.publish_status = 'PUBLISHED'::public.publish_status;
$$;

create or replace function public.get_demand_intelligence_v1(
  p_region_ids text[] default null,
  p_category_slug text default null,
  p_start_at timestamptz default null,
  p_end_at timestamptz default null,
  p_west double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_north double precision default null,
  p_limit integer default 5
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_category text := lower(btrim(coalesce(p_category_slug, '')));
  requested_regions text[] := coalesce(p_region_ids, '{}'::text[]);
  result jsonb;
begin
  if normalized_category = '' or not exists (
    select 1 from public.categories where slug = normalized_category and is_active
  ) then
    raise exception 'Invalid analytics category' using errcode = '23514';
  end if;

  if p_start_at is null or p_end_at is null or p_start_at >= p_end_at
    or p_end_at - p_start_at > interval '90 days'
    or p_end_at > now() + interval '5 minutes' then
    raise exception 'Invalid analytics time window' using errcode = '23514';
  end if;

  if p_limit is null or p_limit < 1 or p_limit > 5 then
    raise exception 'Invalid analytics limit' using errcode = '23514';
  end if;

  if cardinality(requested_regions) > 0 and (
    cardinality(requested_regions) > 5
    or exists (
      select 1 from unnest(requested_regions) requested(id)
      where not exists (select 1 from public.administrative_regions region where region.id = requested.id)
    )
  ) then
    raise exception 'Invalid analytics region' using errcode = '23514';
  end if;

  if cardinality(requested_regions) = 0 then
    if p_west is null or p_south is null or p_east is null or p_north is null
      or p_west >= p_east or p_south >= p_north
      or p_east - p_west > 1 or p_north - p_south > 1 then
      raise exception 'Region ids or a valid bounded bbox are required' using errcode = '23514';
    end if;

    select coalesce(array_agg(region.id order by region.name), '{}'::text[])
    into requested_regions
    from public.administrative_regions region
    where extensions.st_intersects(
      region.geometry,
      extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
    );
  end if;

  if cardinality(requested_regions) = 0 then
    raise exception 'Analytics scope does not intersect a supported region' using errcode = '23514';
  end if;

  with reference_regions as (
    select region.id, region.name, region.geometry
    from public.administrative_regions region
  ),
  platform_event_rows as (
    select
      region.id as region_id,
      event.event_type,
      event.occurred_at
    from public.analytics_events event
    cross join lateral unnest(event.region_ids) event_region(id)
    inner join reference_regions region on region.id = event_region.id
    where event.occurred_at >= p_start_at and event.occurred_at < p_end_at
      and public.analytics_category_matches_v1(event.category_slug, normalized_category)
  ),
  struk_rows as (
    select
      region.id as region_id,
      coalesce(observation.observed_at, observation.imported_at) as occurred_at
    from public.mapid_mission_observations observation
    inner join reference_regions region
      on extensions.st_intersects(observation.geometry, region.geometry)
    where observation.source_type = 'STRUK_GO'
      and coalesce(observation.observed_at, observation.imported_at) >= p_start_at
      and coalesce(observation.observed_at, observation.imported_at) < p_end_at
      and public.analytics_category_matches_v1(
        public.analytics_category_slug_v1(concat_ws(' ',
          observation.normalized_properties->>'kategori_tempat',
          observation.normalized_properties->>'nama_tempat'
        )),
        normalized_category
      )
  ),
  commuter_rows as (
    select region.id as region_id, request.created_at as occurred_at
    from public.commuter_requests request
    inner join reference_regions region
      on extensions.st_intersects(request.location, region.geometry)
    where request.created_at >= p_start_at and request.created_at < p_end_at
      and public.analytics_category_matches_v1(
        case request.category
          when 'FOOD' then 'food'
          when 'DRINK' then 'beverage'
          when 'DAILY_NEEDS' then 'retail'
          when 'SERVICE' then 'services'
          else null
        end,
        normalized_category
      )
  ),
  campaign_rows as (
    select region.id as region_id, event.occurred_at
    from public.campaign_events event
    inner join public.merchants merchant on merchant.id = event.merchant_id
    inner join reference_regions region
      on extensions.st_intersects(merchant.location, region.geometry)
    where event.occurred_at >= p_start_at and event.occurred_at < p_end_at
      and event.event_type in ('SPONSORED_PIN_CLICK', 'PROFILE_OPEN', 'ROUTE_REQUEST')
      and public.analytics_category_matches_v1(
        public.analytics_category_slug_v1(concat_ws(' ',
          merchant.name,
          merchant.description,
          merchant.metadata->>'category',
          merchant.metadata->>'brand'
        )),
        normalized_category
      )
  ),
  demand_counts as (
    select
      region.id as region_id,
      count(*) filter (where platform.event_type = 'SEARCH')::integer as search_count,
      count(*) filter (where platform.event_type = 'ROUTE_REQUEST')::integer as route_count,
      (select count(*)::integer from commuter_rows row where row.region_id = region.id) as commuter_count,
      (select count(*)::integer from struk_rows row where row.region_id = region.id) as transaction_count,
      (select count(*)::integer from campaign_rows row where row.region_id = region.id) as campaign_count,
      max(platform.occurred_at) as latest_platform_at,
      (select max(row.occurred_at) from commuter_rows row where row.region_id = region.id) as latest_commuter_at,
      (select max(row.occurred_at) from struk_rows row where row.region_id = region.id) as latest_transaction_at,
      (select max(row.occurred_at) from campaign_rows row where row.region_id = region.id) as latest_campaign_at
    from reference_regions region
    left join platform_event_rows platform on platform.region_id = region.id
    group by region.id
  ),
  supply_counts as (
    select
      region.id as region_id,
      count(distinct merchant.id)::integer as merchant_count
    from reference_regions region
    left join public.merchants merchant
      on merchant.publish_status = 'PUBLISHED'::public.publish_status
     and extensions.st_intersects(merchant.location, region.geometry)
     and public.analytics_category_matches_v1(
       public.analytics_category_slug_v1(concat_ws(' ',
         merchant.name,
         merchant.description,
         merchant.metadata->>'category',
         merchant.metadata->>'brand',
         coalesce((
           select string_agg(concat_ws(' ',
             observation.normalized_properties->>'jenis_tempat',
             observation.normalized_properties->>'menu_utama'
           ), ' ')
           from public.merchant_source_links link
           inner join public.mapid_mission_observations observation
             on observation.source_type = 'MENU_GO'
            and observation.source_record_id = link.source_record_id
           where link.merchant_id = merchant.id
             and link.source_table = 'mapid_mission_observations:MENU_GO'
         ), '')
       )),
       normalized_category
     )
    group by region.id
  ),
  raw_metrics as (
    select
      region.id,
      region.name,
      region.geometry,
      demand.search_count,
      demand.route_count,
      demand.commuter_count,
      demand.transaction_count,
      demand.campaign_count,
      supply.merchant_count,
      (demand.search_count + demand.route_count + demand.commuter_count + demand.transaction_count) as sample_size,
      (
        (demand.search_count * 1.0) +
        (demand.route_count * 2.0) +
        (demand.commuter_count * 1.5) +
        (demand.transaction_count * 2.0)
      )::numeric as weighted_demand,
      ((demand.search_count > 0)::integer +
       (demand.route_count > 0)::integer +
       (demand.commuter_count > 0)::integer +
       (demand.transaction_count > 0)::integer) as source_diversity,
      greatest(
        demand.latest_platform_at,
        demand.latest_commuter_at,
        demand.latest_transaction_at,
        demand.latest_campaign_at
      ) as latest_signal_at
    from reference_regions region
    inner join demand_counts demand on demand.region_id = region.id
    inner join supply_counts supply on supply.region_id = region.id
  ),
  reference_maxima as (
    select max(weighted_demand) as max_demand, max(merchant_count) as max_supply
    from raw_metrics
  ),
  scored as (
    select
      raw.*,
      case when maxima.max_demand > 0
        then round((100 * ln(1 + raw.weighted_demand) / ln(1 + maxima.max_demand))::numeric, 0)::integer
        else 0 end as demand_score,
      case when maxima.max_supply > 0
        then round((100 * ln(1 + raw.merchant_count) / ln(1 + maxima.max_supply))::numeric, 0)::integer
        else 0 end as supply_score
    from raw_metrics raw
    cross join reference_maxima maxima
  ),
  selected_rows as (
    select * from scored
    where id = any(requested_regions)
    order by name
    limit p_limit
  ),
  response_rows as (
    select jsonb_build_object(
      'spatial_unit', jsonb_build_object(
        'id', row.id,
        'name', row.name,
        'type', 'ADMINISTRATIVE_CITY',
        'geometry', extensions.st_asgeojson(row.geometry)::jsonb
      ),
      'category', jsonb_build_object('slug', normalized_category),
      'raw_counts', jsonb_build_object(
        'search_events', row.search_count,
        'route_requests', row.route_count,
        'commuter_requests', row.commuter_count,
        'transaction_observations', row.transaction_count,
        'campaign_interactions', row.campaign_count,
        'canonical_merchants', row.merchant_count
      ),
      'weighted_demand', row.weighted_demand,
      'demand_score', row.demand_score,
      'supply_score', row.supply_score,
      'retail_gap', case when row.sample_size >= 3 then row.demand_score - row.supply_score else null end,
      'evidence', jsonb_build_object(
        'sample_size', row.sample_size,
        'source_diversity', row.source_diversity,
        'source_types', to_jsonb(array_remove(array[
          case when row.search_count > 0 then 'SEARCH' end,
          case when row.route_count > 0 then 'ROUTE_REQUEST' end,
          case when row.commuter_count > 0 then 'COMMUTER_REQUEST' end,
          case when row.transaction_count > 0 then 'TRANSACTION_OBSERVATION' end,
          case when row.campaign_count > 0 then 'CAMPAIGN_INTERACTION_REPORTED_ONLY' end
        ], null)),
        'latest_signal_at', row.latest_signal_at,
        'coverage_status', 'PILOT_OBSERVED_DATA',
        'confidence', case
          when row.sample_size < 3 then 'INSUFFICIENT_DATA'
          when row.sample_size < 10 or row.source_diversity < 2 then 'LIMITED_EVIDENCE'
          when row.sample_size >= 30 and row.source_diversity >= 3 then 'STRONGER_EVIDENCE'
          else 'MODERATE_EVIDENCE'
        end
      )
    ) as item
    from selected_rows row
  )
  select jsonb_build_object(
    'demand_model_version', 'GETRA_DEMAND_V1',
    'retail_gap_model_version', 'GETRA_RETAIL_GAP_V1',
    'spatial_unit_type', 'ADMINISTRATIVE_CITY',
    'category', jsonb_build_object(
      'slug', category.slug,
      'name', category.name,
      'id', category.id
    ),
    'window', jsonb_build_object('start_at', p_start_at, 'end_at', p_end_at),
    'weights', jsonb_build_object(
      'SEARCH', 1.0,
      'ROUTE_REQUEST', 2.0,
      'COMMUTER_REQUEST', 1.5,
      'TRANSACTION_OBSERVATION', 2.0,
      'CAMPAIGN_INTERACTION', 0.0
    ),
    'normalization', 'LOG_RELATIVE_TO_ALL_SUPPORTED_REGIONS_SAME_CATEGORY_WINDOW',
    'claim_scope', 'GETRA_OBSERVED_PLATFORM_DEMAND_SIGNAL',
    'rows', coalesce((select jsonb_agg(item) from response_rows), '[]'::jsonb),
    'limitations', jsonb_build_array(
      'Observed GETRA/platform signals are not total population demand.',
      'Represented supply is not a complete business census.',
      'Retail Gap is a relative evidence signal, not revenue, profit, or ROI.',
      'Campaign interactions are reported separately and have zero demand weight.'
    )
  )
  into result
  from public.categories category
  where category.slug = normalized_category;

  return result;
end;
$$;

revoke all on function public.analytics_category_slug_v1(text) from public, anon, authenticated;
revoke all on function public.analytics_category_matches_v1(text, text) from public, anon, authenticated;
revoke all on function public.get_analytics_merchant_context_v1(uuid) from public, anon, authenticated;
revoke all on function public.get_demand_intelligence_v1(
  text[], text, timestamptz, timestamptz,
  double precision, double precision, double precision, double precision, integer
) from public, anon, authenticated;

grant execute on function public.analytics_category_slug_v1(text) to service_role;
grant execute on function public.analytics_category_matches_v1(text, text) to service_role;
grant execute on function public.get_analytics_merchant_context_v1(uuid) to service_role;
grant execute on function public.get_demand_intelligence_v1(
  text[], text, timestamptz, timestamptz,
  double precision, double precision, double precision, double precision, integer
) to service_role;

commit;
