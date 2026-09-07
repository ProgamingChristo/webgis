# GETRA Valhalla Routing - Initial Audit

Date: 2026-09-02 Asia/Jakarta

## Repository State

- Branch: `finalmerge`
- Commit SHA: `2cf252e8bfcedbff42a40de07d6227e34ca63499`
- Worktree: dirty before routing work.
- Pre-existing dirty files: `backend/src/modules/ai/ai.schema.ts`, `backend/src/modules/ai/ai.service.ts`, `backend/tests/unit/ai/ai.service.test.ts`, `frontend/components/getra-map.tsx`.

## Docker Files Found

- `Dockerfile`
- `docker-compose.yml`
- `docker-compose.routing.yml`
- `docker-compose.prod.yml`
- `.dockerignore`

## Routing Scripts Found

- `scripts/validate-routing-data.mjs`
- `scripts/prepare-jabodetabek-routing.ps1`

## Routing Provider Status

- Provider implementation: `backend/src/features/routing/valhalla-routing.provider.ts`
- GETRA mode mapping:
  - `walking` -> Valhalla `pedestrian`
  - `motorcycle` -> Valhalla `motorcycle`
  - `car` -> Valhalla `auto`
- Provider decodes Valhalla encoded shape into GeoJSON `LineString`.
- Provider rejects missing/zero distance, missing/zero duration, and missing/invalid shape.
- No straight-line fallback was found in the Valhalla provider.

## Routing API Status

- `POST /api/routing`: authenticated GETRA endpoint.
- `GET /api/internal/routing/provider-health`: authenticated safe diagnostics endpoint.
- Browser-facing routing response remains normalized and does not expose Valhalla base URL.

## Database Migration Audit

- `backend/supabase/migrations/20260831110000_global_canonical_merchant_search.sql`: exists.
- Remote DB migration was not applied during this routing infrastructure work.

## Initial Missing Infrastructure

- `routing-data/jabodetabek.osm.pbf` was missing at initial validation.
- Host `osmium` command was not available on PATH.
- Root `.env.local` had parse issues from NUL bytes and incomplete routing/deployment variables.

