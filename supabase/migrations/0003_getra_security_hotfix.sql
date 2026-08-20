-- GETRA Step 2 / Migration 0003
-- SECURITY HOTFIX FOR EXISTING LIVE TABLES
--
-- This migration is intentionally small.
-- It removes broad object privileges from browser roles BEFORE real data exists.
--
-- It does not change schemas or data.

begin;

-- Existing GETRA tables audited on 2026-08-18.
revoke all privileges on table
  public.profiles,
  public.spatial_sources,
  public.study_areas,
  public.transport_corridors,
  public.transport_nodes,
  public.umkm_profiles
from anon, authenticated;

-- Profiles: authenticated users can read rows allowed by RLS.
grant select on table public.profiles to authenticated;

-- Only harmless self-service columns are browser-updatable.
grant update (display_name, avatar_url)
on table public.profiles
to authenticated;

-- Existing spatial foundation stays read-only for authenticated clients
-- until the next migration introduces explicit public gates.
grant select on table
  public.spatial_sources,
  public.study_areas,
  public.transport_corridors,
  public.transport_nodes
to authenticated;

-- Existing owner UMKM table remains private to authenticated owners via RLS.
grant select on table public.umkm_profiles to authenticated;

-- Required user-controlled fields for creating an owner business profile.
grant insert (
  owner_id,
  business_name,
  category,
  description,
  address,
  geometry
)
on table public.umkm_profiles
to authenticated;

grant update (
  business_name,
  category,
  description,
  address,
  geometry
)
on table public.umkm_profiles
to authenticated;

-- Explicitly remove dangerous/irrelevant whole-table privileges.
-- These REVOKEs are redundant after REVOKE ALL, but intentionally document the boundary.
revoke truncate, trigger, references
on table
  public.profiles,
  public.spatial_sources,
  public.study_areas,
  public.transport_corridors,
  public.transport_nodes,
  public.umkm_profiles
from anon, authenticated;

commit;
