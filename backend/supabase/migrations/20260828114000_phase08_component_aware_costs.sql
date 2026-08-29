begin;

set local search_path = public, extensions;

create or replace function public.calculate_walking_costs_v1(
  p_origin_longitude double precision,
  p_origin_latitude double precision,
  p_candidates jsonb,
  p_max_snap_meters double precision default 75,
  p_environment text default 'PRODUCTION'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_origin extensions.geometry;
  v_origin_node record;
  v_sql text;
  v_result jsonb;
begin
  if jsonb_typeof(p_candidates) <> 'array' or jsonb_array_length(p_candidates) > 30
    or p_origin_longitude not between -180 and 180 or p_origin_latitude not between -90 and 90
    or p_max_snap_meters <= 0 or p_max_snap_meters > 200
    or p_environment !~ '^[A-Z][A-Z0-9_]{0,19}$' then
    raise exception 'invalid walking cost parameters';
  end if;

  v_origin := extensions.st_setsrid(extensions.st_makepoint(p_origin_longitude, p_origin_latitude), 4326);
  select n.routing_id, n.geometry, c.component_id, c.component_size,
    extensions.st_distance(v_origin::extensions.geography, n.geometry::extensions.geography) as snap_distance
  into v_origin_node
  from public.pedestrian_nodes n
  join public.pedestrian_graph_components c
    on c.environment = n.environment and c.routing_id = n.routing_id
  where n.environment = p_environment
    and extensions.st_dwithin(v_origin::extensions.geography, n.geometry::extensions.geography, p_max_snap_meters)
  order by c.component_size desc, v_origin <-> n.geometry limit 1;

  if v_origin_node.routing_id is null then
    return jsonb_build_object('status', 'NO_NETWORK_ACCESS', 'point', 'ORIGIN', 'candidates', '[]'::jsonb);
  end if;

  v_sql := format(
    'select routing_id as id, source, target, length_meters::float8 as cost, case when reverse_cost < 0 then -1::float8 else length_meters::float8 end as reverse_cost from public.pedestrian_edges where environment = %L and walkable and length_meters > 0',
    p_environment
  );

  with input as (
    select candidate_id, longitude, latitude,
      extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326) as geometry
    from jsonb_to_recordset(p_candidates) as x(candidate_id text, longitude double precision, latitude double precision)
    where candidate_id is not null and longitude between -180 and 180 and latitude between -90 and 90
  ), snapped as (
    select i.*, same_component.routing_id, same_component.snap_distance,
      any_access.routing_id is not null as has_network_access
    from input i
    left join lateral (
      select pn.routing_id
      from public.pedestrian_nodes pn
      where pn.environment = p_environment
        and extensions.st_dwithin(i.geometry::extensions.geography, pn.geometry::extensions.geography, p_max_snap_meters)
      order by i.geometry <-> pn.geometry limit 1
    ) any_access on true
    left join lateral (
      select pn.routing_id,
        extensions.st_distance(i.geometry::extensions.geography, pn.geometry::extensions.geography) as snap_distance
      from public.pedestrian_nodes pn
      join public.pedestrian_graph_components pc
        on pc.environment = pn.environment and pc.routing_id = pn.routing_id
      where pn.environment = p_environment
        and pc.component_id = v_origin_node.component_id
        and extensions.st_dwithin(i.geometry::extensions.geography, pn.geometry::extensions.geography, p_max_snap_meters)
      order by i.geometry <-> pn.geometry limit 1
    ) same_component on true
  ), costs as (
    select * from pgr_dijkstraCost(
      v_sql,
      v_origin_node.routing_id,
      coalesce((select array_agg(distinct routing_id) from snapped where routing_id is not null), '{}'::bigint[]),
      directed := true
    )
  ), result_rows as (
    select s.candidate_id,
      case when not s.has_network_access then 'NO_NETWORK_ACCESS'
           when s.routing_id is null or c.agg_cost is null then 'UNROUTABLE'
           else 'ROUTABLE' end as status,
      c.agg_cost as network_distance_meters,
      case when c.agg_cost is null then null else v_origin_node.snap_distance + s.snap_distance end as access_distance_meters,
      case when c.agg_cost is null then null else c.agg_cost + v_origin_node.snap_distance + s.snap_distance end as distance_meters,
      case when c.agg_cost is null then null else ceil((c.agg_cost + v_origin_node.snap_distance + s.snap_distance) / 1.4) end as duration_seconds,
      s.routing_id as destination_node_id
    from snapped s
    left join costs c on c.end_vid = s.routing_id
  )
  select jsonb_build_object(
    'status', 'READY',
    'origin_node_id', v_origin_node.routing_id,
    'origin_snap_distance_meters', v_origin_node.snap_distance,
    'walking_speed_mps', 1.4,
    'candidates', coalesce(jsonb_agg(to_jsonb(result_rows) order by candidate_id), '[]'::jsonb)
  ) into v_result
  from result_rows;

  return coalesce(v_result, jsonb_build_object('status', 'READY', 'candidates', '[]'::jsonb));
end;
$$;

create or replace function public.calculate_walking_service_area_v1(
  p_origin_longitude double precision,
  p_origin_latitude double precision,
  p_max_minutes integer,
  p_max_snap_meters double precision default 75,
  p_environment text default 'PRODUCTION'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_origin extensions.geometry;
  v_origin_node record;
  v_sql text;
  v_result jsonb;
  v_max_distance double precision;
begin
  if p_max_minutes < 5 or p_max_minutes > 30
    or p_origin_longitude not between -180 and 180 or p_origin_latitude not between -90 and 90
    or p_max_snap_meters <= 0 or p_max_snap_meters > 200
    or p_environment !~ '^[A-Z][A-Z0-9_]{0,19}$' then
    raise exception 'invalid service area parameters';
  end if;

  v_max_distance := p_max_minutes * 60 * 1.4;
  v_origin := extensions.st_setsrid(extensions.st_makepoint(p_origin_longitude, p_origin_latitude), 4326);
  select n.routing_id, n.geometry, c.component_id, c.component_size,
    extensions.st_distance(v_origin::extensions.geography, n.geometry::extensions.geography) as snap_distance
  into v_origin_node
  from public.pedestrian_nodes n
  join public.pedestrian_graph_components c
    on c.environment = n.environment and c.routing_id = n.routing_id
  where n.environment = p_environment
    and extensions.st_dwithin(v_origin::extensions.geography, n.geometry::extensions.geography, p_max_snap_meters)
  order by c.component_size desc, v_origin <-> n.geometry limit 1;

  if v_origin_node.routing_id is null then
    return jsonb_build_object('status', 'NO_NETWORK_ACCESS', 'point', 'ORIGIN');
  end if;

  v_sql := format(
    'select routing_id as id, source, target, length_meters::float8 as cost, case when reverse_cost < 0 then -1::float8 else length_meters::float8 end as reverse_cost from public.pedestrian_edges where environment = %L and walkable and length_meters > 0',
    p_environment
  );

  with reached as materialized (
    select * from pgr_drivingDistance(v_sql, v_origin_node.routing_id, v_max_distance, directed := true)
  ), reachable_edges as (
    select distinct e.id, e.geometry
    from public.pedestrian_edges e
    join reached a on a.node = e.source
    join reached b on b.node = e.target
    where e.environment = p_environment and e.walkable
  )
  select jsonb_build_object(
    'status', 'READY',
    'service_area_type', 'REACHABLE_NETWORK_EDGES',
    'threshold_minutes', p_max_minutes,
    'network_cost_limit_meters', v_max_distance,
    'origin_node_id', v_origin_node.routing_id,
    'origin_snap_distance_meters', v_origin_node.snap_distance,
    'reachable_node_count', (select count(*) from reached),
    'reachable_edge_count', (select count(*) from reachable_edges),
    'geometry', case when count(*) = 0 then null else
      extensions.st_asgeojson(
        extensions.st_multi(extensions.st_collectionextract(extensions.st_collect(geometry), 2))
      )::jsonb end,
    'walking_speed_mps', 1.4,
    'limitation_flags', jsonb_build_array('NETWORK_EDGE_VISUALIZATION', 'NOT_A_PRECISION_POLYGON')
  ) into v_result
  from reachable_edges;

  return v_result;
end;
$$;

revoke all on function public.calculate_walking_costs_v1(double precision, double precision, jsonb, double precision, text) from public, anon;
revoke all on function public.calculate_walking_service_area_v1(double precision, double precision, integer, double precision, text) from public, anon;
grant execute on function public.calculate_walking_costs_v1(double precision, double precision, jsonb, double precision, text) to authenticated, service_role;
grant execute on function public.calculate_walking_service_area_v1(double precision, double precision, integer, double precision, text) to authenticated, service_role;

commit;
