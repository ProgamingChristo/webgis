begin;

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
  v_components bigint := 0;
begin
  if p_environment !~ '^[A-Z][A-Z0-9_]{0,19}$' then
    raise exception 'invalid environment';
  end if;

  if exists (
    select 1 from public.pedestrian_edges
    where environment = p_environment and walkable
  ) then
    execute format(
      'select count(distinct component) from pgr_connectedComponents(%L)',
      format(
        'select routing_id as id, source, target, length_meters::float8 as cost, length_meters::float8 as reverse_cost from public.pedestrian_edges where environment = %L and walkable and length_meters > 0',
        p_environment
      )
    ) into v_components;
  end if;

  select jsonb_build_object(
    'environment', p_environment,
    'node_count', (select count(*) from public.pedestrian_nodes where environment = p_environment),
    'edge_count', (select count(*) from public.pedestrian_edges where environment = p_environment),
    'walkable_edge_count', (select count(*) from public.pedestrian_edges where environment = p_environment and walkable),
    'invalid_cost_count', (
      select count(*) from public.pedestrian_edges
      where environment = p_environment
        and (length_meters <= 0 or cost < 0 or reverse_cost = 0)
    ),
    'orphan_edge_count', (
      select count(*)
      from public.pedestrian_edges e
      left join public.pedestrian_nodes s on s.routing_id = e.source
      left join public.pedestrian_nodes t on t.routing_id = e.target
      where e.environment = p_environment and (s.id is null or t.id is null)
    ),
    'isolated_node_count', (
      select count(*)
      from public.pedestrian_nodes n
      where n.environment = p_environment
        and not exists (
          select 1 from public.pedestrian_edges e
          where e.environment = p_environment
            and e.walkable
            and (e.source = n.routing_id or e.target = n.routing_id)
        )
    ),
    'connected_components', v_components,
    'cost_model', 'EDGE_LENGTH_METERS',
    'walking_speed_mps', 1.4
  ) into v_result;

  return v_result;
end;
$$;

commit;
