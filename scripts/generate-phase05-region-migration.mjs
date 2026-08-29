import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const sourcePath = path.resolve("data/jakarta-admin-boundaries.ts");
const outputPath = path.resolve(
  "backend/supabase/migrations/20260828090000_phase05_global_search_regions.sql",
);
const source = await readFile(sourcePath, "utf8");
const start = source.indexOf("{");
const end = source.indexOf(" satisfies GeoJSON.FeatureCollection");
if (start < 0 || end < 0) throw new Error("Trusted boundary collection not found");

const collection = JSON.parse(source.slice(start, end));
const aliases = {
  "jakarta-barat": ["jakbar"],
  "jakarta-pusat": ["jakpus"],
  "jakarta-selatan": ["jaksel"],
  "jakarta-timur": ["jaktim"],
  "jakarta-utara": ["jakut"],
  "kepulauan-seribu": ["pulau seribu"],
};

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const rows = collection.features.map((feature) => {
  const id = feature.properties.id;
  const name = feature.properties.name;
  const aliasSql = [name.toLowerCase(), ...(aliases[id] ?? [])]
    .map(quote)
    .join(", ");
  return `(
    ${quote(id)},
    ${quote(name)},
    array[${aliasSql}]::text[],
    extensions.st_multi(extensions.st_setsrid(
      extensions.st_geomfromgeojson(${quote(JSON.stringify(feature.geometry))}),
      4326
    )),
    'mahendrayudha/indonesia-geojson; GADM v4.0'
  )`;
}).join(",\n");

const migration = `begin;

set local search_path = public, extensions, gis;

create table if not exists public.administrative_regions (
  id text primary key,
  name text not null unique,
  aliases text[] not null default '{}'::text[],
  region_type text not null default 'CITY',
  geometry extensions.geometry(MultiPolygon, 4326) not null,
  geometry_source text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint administrative_regions_id_format check (id ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint administrative_regions_type_valid check (region_type in ('CITY'))
);

create index if not exists idx_administrative_regions_geometry_gist
  on public.administrative_regions using gist (geometry);

insert into public.administrative_regions (
  id, name, aliases, geometry, geometry_source
) values
${rows}
on conflict (id) do update set
  name = excluded.name,
  aliases = excluded.aliases,
  geometry = excluded.geometry,
  geometry_source = excluded.geometry_source,
  updated_at = now();

alter table public.administrative_regions enable row level security;
revoke all on table public.administrative_regions from anon, authenticated;
grant all on table public.administrative_regions to service_role;

create or replace function public.list_administrative_regions_v1()
returns table (
  id text,
  name text,
  aliases text[],
  west double precision,
  south double precision,
  east double precision,
  north double precision,
  geometry_source text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    region.id,
    region.name,
    region.aliases,
    extensions.st_xmin(extensions.box2d(region.geometry)),
    extensions.st_ymin(extensions.box2d(region.geometry)),
    extensions.st_xmax(extensions.box2d(region.geometry)),
    extensions.st_ymax(extensions.box2d(region.geometry)),
    region.geometry_source
  from public.administrative_regions region
  order by region.name;
$$;

revoke all on function public.list_administrative_regions_v1()
  from public, anon, authenticated;
grant execute on function public.list_administrative_regions_v1()
  to service_role;

create or replace function public.search_canonical_merchants_v1(
  p_west double precision default null,
  p_south double precision default null,
  p_east double precision default null,
  p_north double precision default null,
  p_region_ids text[] default null,
  p_keyword text default null,
  p_category text default null,
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  merchant_id uuid,
  total_count bigint,
  relevance_score integer,
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
      nullif(lower(regexp_replace(btrim(coalesce(p_keyword, '')), '\\s+', ' ', 'g')), '') as keyword,
      nullif(lower(regexp_replace(btrim(coalesce(p_category, '')), '\\s+', ' ', 'g')), '') as category,
      coalesce(p_region_ids, '{}'::text[]) as requested_regions
  ),
  candidates as (
    select distinct
      merchant.id,
      merchant.name,
      case
        when input.keyword is null then 0
        when lower(merchant.name) = input.keyword then 400
        when starts_with(lower(merchant.name), input.keyword) then 300
        when strpos(lower(merchant.name), input.keyword) > 0 then 200
        when strpos(lower(coalesce(merchant.metadata->>'category', '')), input.keyword) > 0 then 140
        when strpos(lower(coalesce(menu_observation.search_text, '')), input.keyword) > 0 then 120
        when strpos(lower(coalesce(merchant.address, '')), input.keyword) > 0 then 80
        else 0
      end as relevance_score
    from public.merchants merchant
    inner join public.merchant_source_links source_link
      on source_link.merchant_id = merchant.id
     and source_link.source_table in (
       'mapid_premium_merchants',
       'mapid_mission_observations:MENU_GO'
     )
    cross join input
    left join lateral (
      select string_agg(
        concat_ws(' ',
          observation.normalized_properties->>'nama_tempat',
          observation.normalized_properties->>'jenis_tempat',
          observation.normalized_properties->>'menu_utama'
        ),
        ' '
      ) as search_text
      from public.merchant_source_links menu_link
      inner join public.mapid_mission_observations observation
        on observation.source_type = 'MENU_GO'
       and observation.source_record_id = menu_link.source_record_id
      where menu_link.merchant_id = merchant.id
        and menu_link.source_table = 'mapid_mission_observations:MENU_GO'
    ) menu_observation on true
    where merchant.publish_status = 'PUBLISHED'::public.publish_status
      and (
        (
          cardinality(input.requested_regions) > 0
          and exists (
            select 1
            from public.administrative_regions requested_region
            where requested_region.id = any(input.requested_regions)
              and extensions.st_intersects(merchant.location, requested_region.geometry)
          )
        )
        or (
          cardinality(input.requested_regions) = 0
          and p_west is not null and p_south is not null
          and p_east is not null and p_north is not null
          and extensions.st_intersects(
            merchant.location,
            extensions.st_makeenvelope(p_west, p_south, p_east, p_north, 4326)
          )
        )
      )
      and (
        input.keyword is null
        or lower(merchant.name) = input.keyword
        or starts_with(lower(merchant.name), input.keyword)
        or strpos(lower(merchant.name), input.keyword) > 0
        or strpos(lower(coalesce(merchant.description, '')), input.keyword) > 0
        or strpos(lower(coalesce(merchant.address, '')), input.keyword) > 0
        or strpos(lower(coalesce(merchant.metadata->>'category', '')), input.keyword) > 0
        or strpos(lower(coalesce(merchant.metadata->>'brand', '')), input.keyword) > 0
        or strpos(lower(coalesce(menu_observation.search_text, '')), input.keyword) > 0
      )
      and (
        input.category is null
        or lower(coalesce(merchant.metadata->>'brand', '')) = input.category
        or lower(coalesce(merchant.metadata->>'category', '')) = input.category
      )
  ),
  ranked as (
    select
      candidate.id,
      candidate.name,
      candidate.relevance_score,
      coalesce(region_match.ids, '{}'::text[]) as region_ids,
      coalesce(region_match.names, '{}'::text[]) as region_names
    from candidates candidate
    inner join public.merchants merchant on merchant.id = candidate.id
    left join lateral (
      select
        array_agg(region.id order by region.name) as ids,
        array_agg(region.name order by region.name) as names
      from public.administrative_regions region
      where extensions.st_intersects(merchant.location, region.geometry)
    ) region_match on true
  )
  select
    ranked.id,
    count(*) over () as total_count,
    ranked.relevance_score,
    ranked.region_ids,
    ranked.region_names
  from ranked
  order by ranked.relevance_score desc, lower(ranked.name), ranked.id
  limit greatest(1, least(coalesce(p_limit, 50), 100))
  offset greatest(0, coalesce(p_offset, 0));
$$;

revoke all on function public.search_canonical_merchants_v1(
  double precision, double precision, double precision, double precision,
  text[], text, text, integer, integer
) from public, anon, authenticated;
grant execute on function public.search_canonical_merchants_v1(
  double precision, double precision, double precision, double precision,
  text[], text, text, integer, integer
) to service_role;

commit;
`;

await writeFile(outputPath, migration, "utf8");
console.log(`Generated ${path.relative(process.cwd(), outputPath)} with ${collection.features.length} regions.`);
