begin;

set local search_path = public, extensions;

create table if not exists public.pedestrian_graph_components (
  environment text not null,
  routing_id bigint not null references public.pedestrian_nodes(routing_id) on delete cascade,
  component_id bigint not null,
  component_size integer not null check (component_size > 0),
  refreshed_at timestamptz not null default now(),
  primary key (environment, routing_id)
);

create index if not exists idx_pedestrian_graph_components_rank
  on public.pedestrian_graph_components (environment, component_size desc, component_id);

create index if not exists idx_pedestrian_edges_environment_source
  on public.pedestrian_edges (environment, source) where walkable;

create index if not exists idx_pedestrian_edges_environment_target
  on public.pedestrian_edges (environment, target) where walkable;

alter table public.pedestrian_graph_components enable row level security;
revoke all on public.pedestrian_graph_components from public, anon, authenticated;

create or replace function public.refresh_pedestrian_graph_components_v1(
  p_environment text default 'PRODUCTION'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_sql text;
  v_node_count bigint;
  v_component_count bigint;
begin
  if p_environment !~ '^[A-Z][A-Z0-9_]{0,19}$' then
    raise exception 'invalid environment';
  end if;

  v_sql := format(
    'select routing_id as id, source, target, length_meters::float8 as cost, length_meters::float8 as reverse_cost from public.pedestrian_edges where environment = %L and walkable and length_meters > 0',
    p_environment
  );

  delete from public.pedestrian_graph_components where environment = p_environment;

  insert into public.pedestrian_graph_components (
    environment, routing_id, component_id, component_size, refreshed_at
  )
  select p_environment, node, component,
    count(*) over (partition by component)::integer,
    now()
  from pgr_connectedComponents(v_sql);

  select count(*), count(distinct component_id)
  into v_node_count, v_component_count
  from public.pedestrian_graph_components
  where environment = p_environment;

  return jsonb_build_object(
    'environment', p_environment,
    'component_node_count', v_node_count,
    'connected_components', v_component_count
  );
end;
$$;

create or replace function public.get_pedestrian_graph_health_v1(
  p_environment text default 'PRODUCTION'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  v_result jsonb;
begin
  if p_environment !~ '^[A-Z][A-Z0-9_]{0,19}$' then
    raise exception 'invalid environment';
  end if;

  with node_stats as (
    select count(*) as node_count
    from public.pedestrian_nodes where environment = p_environment
  ), edge_stats as (
    select count(*) as edge_count,
      count(*) filter (where walkable) as walkable_edge_count,
      count(*) filter (where length_meters <= 0 or cost < 0 or reverse_cost = 0) as invalid_cost_count
    from public.pedestrian_edges where environment = p_environment
  ), component_stats as (
    select count(*) as component_node_count,
      count(distinct component_id) as connected_components,
      max(component_size) as largest_component_size,
      max(refreshed_at) as components_refreshed_at
    from public.pedestrian_graph_components where environment = p_environment
  ), orphan_stats as (
    select count(*) as orphan_edge_count
    from public.pedestrian_edges e
    left join public.pedestrian_nodes s on s.routing_id = e.source
    left join public.pedestrian_nodes t on t.routing_id = e.target
    where e.environment = p_environment and (s.routing_id is null or t.routing_id is null)
  )
  select jsonb_build_object(
    'environment', p_environment,
    'node_count', n.node_count,
    'edge_count', e.edge_count,
    'walkable_edge_count', e.walkable_edge_count,
    'invalid_cost_count', e.invalid_cost_count,
    'orphan_edge_count', o.orphan_edge_count,
    'isolated_node_count', n.node_count - c.component_node_count,
    'connected_components', c.connected_components,
    'largest_component_size', c.largest_component_size,
    'components_refreshed_at', c.components_refreshed_at,
    'cost_model', 'EDGE_LENGTH_METERS',
    'walking_speed_mps', 1.4
  ) into v_result
  from node_stats n cross join edge_stats e cross join component_stats c cross join orphan_stats o;

  return v_result;
end;
$$;

create or replace function public.calculate_walking_route_v2(
  p_origin_longitude double precision,
  p_origin_latitude double precision,
  p_destination_longitude double precision,
  p_destination_latitude double precision,
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
  v_destination extensions.geometry;
  v_origin_node record;
  v_destination_access record;
  v_destination_node record;
  v_route record;
  v_sql text;
begin
  if p_origin_longitude not between -180 and 180
    or p_destination_longitude not between -180 and 180
    or p_origin_latitude not between -90 and 90
    or p_destination_latitude not between -90 and 90
    or p_max_snap_meters <= 0 or p_max_snap_meters > 200
    or p_environment !~ '^[A-Z][A-Z0-9_]{0,19}$' then
    raise exception 'invalid routing parameters';
  end if;

  v_origin := extensions.st_setsrid(extensions.st_makepoint(p_origin_longitude, p_origin_latitude), 4326);
  v_destination := extensions.st_setsrid(extensions.st_makepoint(p_destination_longitude, p_destination_latitude), 4326);

  select n.routing_id, n.geometry, c.component_id, c.component_size,
    extensions.st_distance(v_origin::extensions.geography, n.geometry::extensions.geography) as snap_distance
  into v_origin_node
  from public.pedestrian_nodes n
  join public.pedestrian_graph_components c
    on c.environment = n.environment and c.routing_id = n.routing_id
  where n.environment = p_environment
    and extensions.st_dwithin(v_origin::extensions.geography, n.geometry::extensions.geography, p_max_snap_meters)
  order by c.component_size desc, v_origin <-> n.geometry
  limit 1;

  if v_origin_node.routing_id is null then
    return jsonb_build_object('status', 'NO_NETWORK_ACCESS', 'point', 'ORIGIN');
  end if;

  select n.routing_id
  into v_destination_access
  from public.pedestrian_nodes n
  where n.environment = p_environment
    and extensions.st_dwithin(v_destination::extensions.geography, n.geometry::extensions.geography, p_max_snap_meters)
  order by v_destination <-> n.geometry limit 1;

  if v_destination_access.routing_id is null then
    return jsonb_build_object('status', 'NO_NETWORK_ACCESS', 'point', 'DESTINATION');
  end if;

  select n.routing_id, n.geometry,
    extensions.st_distance(v_destination::extensions.geography, n.geometry::extensions.geography) as snap_distance
  into v_destination_node
  from public.pedestrian_nodes n
  join public.pedestrian_graph_components c
    on c.environment = n.environment and c.routing_id = n.routing_id
  where n.environment = p_environment
    and c.component_id = v_origin_node.component_id
    and extensions.st_dwithin(v_destination::extensions.geography, n.geometry::extensions.geography, p_max_snap_meters)
  order by v_destination <-> n.geometry limit 1;

  if v_destination_node.routing_id is null then
    return jsonb_build_object('status', 'UNROUTABLE', 'reason', 'DISCONNECTED_NETWORK');
  end if;

  if v_origin_node.routing_id = v_destination_node.routing_id then
    return jsonb_build_object(
      'status', 'ROUTABLE',
      'origin_node_id', v_origin_node.routing_id,
      'destination_node_id', v_destination_node.routing_id,
      'network_distance_meters', 0,
      'access_distance_meters', v_origin_node.snap_distance + v_destination_node.snap_distance,
      'distance_meters', v_origin_node.snap_distance + v_destination_node.snap_distance,
      'duration_seconds', ceil((v_origin_node.snap_distance + v_destination_node.snap_distance) / 1.4),
      'geometry', extensions.st_asgeojson(extensions.st_makeline(array[v_origin, v_origin_node.geometry, v_destination]))::jsonb,
      'walking_speed_mps', 1.4
    );
  end if;

  v_sql := format(
    'select routing_id as id, source, target, length_meters::float8 as cost, case when reverse_cost < 0 then -1::float8 else length_meters::float8 end as reverse_cost from public.pedestrian_edges where environment = %L and walkable and length_meters > 0',
    p_environment
  );

  with route as materialized (
    select * from pgr_dijkstra(v_sql, v_origin_node.routing_id, v_destination_node.routing_id, directed := true)
  ), segments as (
    select r.path_seq,
      case when e.source = r.node then e.geometry else extensions.st_reverse(e.geometry) end as geometry,
      e.id, e.length_meters
    from route r
    join public.pedestrian_edges e on e.routing_id = r.edge
    where r.edge <> -1
  )
  select coalesce(sum(length_meters), 0)::double precision as network_distance,
    array_agg(id order by path_seq) as edge_ids,
    extensions.st_makeline(geometry order by path_seq) as geometry
  into v_route from segments;

  if v_route.geometry is null then
    return jsonb_build_object('status', 'UNROUTABLE', 'reason', 'NO_PATH');
  end if;

  return jsonb_build_object(
    'status', 'ROUTABLE',
    'origin_node_id', v_origin_node.routing_id,
    'destination_node_id', v_destination_node.routing_id,
    'edge_ids', v_route.edge_ids,
    'network_distance_meters', v_route.network_distance,
    'access_distance_meters', v_origin_node.snap_distance + v_destination_node.snap_distance,
    'distance_meters', v_route.network_distance + v_origin_node.snap_distance + v_destination_node.snap_distance,
    'duration_seconds', ceil((v_route.network_distance + v_origin_node.snap_distance + v_destination_node.snap_distance) / 1.4),
    'geometry', extensions.st_asgeojson(
      extensions.st_makeline(array[v_origin, v_origin_node.geometry, v_route.geometry, v_destination_node.geometry, v_destination])
    )::jsonb,
    'walking_speed_mps', 1.4
  );
end;
$$;

select public.refresh_pedestrian_graph_components_v1('PRODUCTION');

revoke all on function public.refresh_pedestrian_graph_components_v1(text) from public, anon, authenticated;
grant execute on function public.refresh_pedestrian_graph_components_v1(text) to service_role;

revoke all on function public.get_pedestrian_graph_health_v1(text) from public, anon;
revoke all on function public.calculate_walking_route_v2(double precision, double precision, double precision, double precision, double precision, text) from public, anon;
grant execute on function public.get_pedestrian_graph_health_v1(text) to authenticated, service_role;
grant execute on function public.calculate_walking_route_v2(double precision, double precision, double precision, double precision, double precision, text) to authenticated, service_role;

commit;
