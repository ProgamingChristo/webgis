# GETRA Database Reference

This document represents the actual database architecture of the GETRA backend as of Integration Phase 13.
The primary data store is PostgreSQL via Supabase, heavily relying on PostGIS and pgRouting extensions for spatial logic.

## Extensions

- `postgis`: Enables geospatial types (geometry, geography) and functions.
- `pgrouting`: Enables graph network topology generation and shortest-path routing (`pgr_dijkstra`).
- `uuid-ossp`: For UUID generation.

## Key Tables

### Authentication & Profiles
- `auth.users` (Supabase core) - Manages user authentication credentials.
- `profiles` - Extended user metadata linked 1:1 with `auth.users`. Contains `account_role` (`USER` or `ADMIN`).
- `profile_stakeholder_modes` - Maps a user to their active `stakeholder_mode` (e.g., UMKM, INVESTOR, GOVERNMENT). A user can have 0-3 modes active. 0 modes means the user is a default "General / Komuter".

### Geography & Study Areas
- `study_areas` - Defines the bounding boxes and master polygons for city zones where GETRA is active.

### Transport & Routing
- `transport_corridors` - LineString geometries for public transit routes (e.g., BRT lines).
- `transport_nodes` - Point geometries representing stops and stations.
- `pedestrian_network_ways` - LineString geometries of walk paths.
- `pedestrian_network_vertices` - Nodes forming the routing graph for `pgRouting`.

### Business & Points of Interest
- `umkm` - Represents retail businesses and POIs. Tied to canonical metadata and coordinates.
- `community_activities` - Events and social markers.
- `survey_responses` - Demand aggregation data collected from forms.

### Ingestion & Provenance
- `mapid_ingestion_jobs` - Tracks the status of external ETL jobs pulling from MAPID.
- `mapid_raw_records` - Staging table for data before deduplication and normalization.
- Canonical entity tables (`umkm`, etc.) include provenance metadata: `source_provider`, `external_id`, `ingested_at`.

## Row Level Security (RLS) Philosophy

The database strictly uses RLS for isolation.
- **Normal USER**: Can `SELECT` published spatial data, but only `UPDATE` their own `profile`.
- **Stakeholder Modes**: Provide UX filters on the frontend, NOT database access escalation.
- **ADMIN**: Service-role token or specific internal flags bypass RLS for administrative ingestion/deduplication functions.

## Migrations Workflow
1. Use `supabase db diff --use-migra` to generate new SQL.
2. Review the migration locally.
3. Test using `supabase db push --dry-run` or local linked testing.
4. Push to remote.
5. Auto-generate TypeScript definitions using `supabase gen types typescript --local > backend/src/types/database.types.ts`.

> **WARNING**: Never use `supabase db reset --linked` against production. Always rely on forward-migrations.
