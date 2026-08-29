-- GETRA Step 2 / Migration 0003
-- SECURITY HOTFIX FOR EXISTING LIVE TABLES
--
-- This migration is intentionally small.
-- It removes broad object privileges from browser roles BEFORE real data exists.
--
-- IMPORTANT:
-- This repository also supports fresh database bootstrap where the audited tables may
-- not exist yet when this migration is replayed from zero. Therefore every REVOKE /
-- GRANT in this hotfix is guarded by catalog checks so a clean reset stays reproducible.

begin;

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NOT NULL THEN
    EXECUTE 'revoke all privileges on table public.profiles from anon, authenticated';
    EXECUTE 'grant select on table public.profiles to authenticated';
    EXECUTE 'grant update (display_name, avatar_url) on table public.profiles to authenticated';
    EXECUTE 'revoke truncate, trigger, references on table public.profiles from anon, authenticated';
  END IF;

  IF to_regclass('public.spatial_sources') IS NOT NULL THEN
    EXECUTE 'revoke all privileges on table public.spatial_sources from anon, authenticated';
    EXECUTE 'grant select on table public.spatial_sources to authenticated';
    EXECUTE 'revoke truncate, trigger, references on table public.spatial_sources from anon, authenticated';
  END IF;

  IF to_regclass('public.study_areas') IS NOT NULL THEN
    EXECUTE 'revoke all privileges on table public.study_areas from anon, authenticated';
    EXECUTE 'grant select on table public.study_areas to authenticated';
    EXECUTE 'revoke truncate, trigger, references on table public.study_areas from anon, authenticated';
  END IF;

  IF to_regclass('public.transport_corridors') IS NOT NULL THEN
    EXECUTE 'revoke all privileges on table public.transport_corridors from anon, authenticated';
    EXECUTE 'grant select on table public.transport_corridors to authenticated';
    EXECUTE 'revoke truncate, trigger, references on table public.transport_corridors from anon, authenticated';
  END IF;

  IF to_regclass('public.transport_nodes') IS NOT NULL THEN
    EXECUTE 'revoke all privileges on table public.transport_nodes from anon, authenticated';
    EXECUTE 'grant select on table public.transport_nodes to authenticated';
    EXECUTE 'revoke truncate, trigger, references on table public.transport_nodes from anon, authenticated';
  END IF;

  IF to_regclass('public.umkm_profiles') IS NOT NULL THEN
    EXECUTE 'revoke all privileges on table public.umkm_profiles from anon, authenticated';
    EXECUTE 'grant select on table public.umkm_profiles to authenticated';
    EXECUTE 'grant insert (owner_id, business_name, category, description, address, geometry) on table public.umkm_profiles to authenticated';
    EXECUTE 'grant update (business_name, category, description, address, geometry) on table public.umkm_profiles to authenticated';
    EXECUTE 'revoke truncate, trigger, references on table public.umkm_profiles from anon, authenticated';
  END IF;
END
$$;

commit;
