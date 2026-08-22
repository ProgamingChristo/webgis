begin;

set local search_path = public, extensions, gis;

create table public.transport_route_stops (
  id uuid primary key default gen_random_uuid(),
  corridor_id uuid not null references public.transport_corridors(id) on delete cascade,
  node_id uuid not null references public.transport_nodes(id) on delete cascade,
  stop_sequence integer not null check (stop_sequence >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transport_route_stops_unique_seq unique (corridor_id, stop_sequence),
  constraint transport_route_stops_unique_node unique (corridor_id, node_id)
);

create index idx_transport_route_stops_corridor on public.transport_route_stops (corridor_id);
create index idx_transport_route_stops_node on public.transport_route_stops (node_id);

create trigger set_transport_route_stops_updated_at
  before update on public.transport_route_stops
  for each row execute function public.handle_updated_at();

alter table public.transport_route_stops enable row level security;

revoke all on table public.transport_route_stops from anon;

grant select, insert, update, delete on table public.transport_route_stops to authenticated;
grant all on table public.transport_route_stops to service_role;

create policy "Authenticated users can read transport route stops"
  on public.transport_route_stops for select to authenticated
  using (true);
create policy "Admins can manage transport route stops"
  on public.transport_route_stops for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

commit;
