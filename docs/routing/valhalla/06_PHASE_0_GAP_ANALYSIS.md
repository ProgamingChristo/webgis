# Phase 0 Gap Analysis

## Implemented

- Docker production scripts exist.
- Dockerfile exists and builds backend standalone runtime.
- Compose includes `getra-backend`.
- Compose routing overlay includes `valhalla`.
- Compose production overlay exists.
- Backend-to-Valhalla internal URL is configured as `http://valhalla:8002` in routing Compose.
- Host binds default to loopback for backend and Valhalla.
- Valhalla image is pinned by version and digest.
- Routing source validator exists.
- Jabodetabek PBF preparation script exists.
- Routing provider abstraction exists.
- Valhalla provider exists.
- Mode mapping exists.
- Response normalization exists.
- Timeout handling exists.
- Cache exists and isolates mode in the cache key.
- Provider-health endpoint exists and requires authentication.
- Active routing API requires authentication.
- Active routing API does not fabricate successful geometry on provider failure.

## Partial Or Unverified

- `routing:validate` checks file existence and minimum size only; it does not verify bbox content, OSM metadata date, checksum, generated tile coverage, or live route success.
- `prepare-jabodetabek-routing.ps1` records OSM fileinfo to console but does not persist SHA-256 or source date automatically.
- Reverse proxy, DNS, TLS, and firewall posture are documented but not verifiable from this repository alone.
- Current local containers are healthy, but Phase 0 did not run live route acceptance.
- There is no dedicated live-provider automated test that proves distance, duration, and encoded geometry from real Valhalla.

## Stale Or Conflicting Documentation

- `docs/GETRA_API_Reference.md` still describes `POST /api/routing` as using `pgr_dijkstra`.
- `docs/final/GETRA_BACKEND_COMPLETE_DOCUMENTATION.md` and generated final docs mention routing as not implemented or `ROUTING_GRAPH_NOT_AVAILABLE`.
- `docs/changes/SEARCH_ROUTING_HARDENING_2026-08-31.md` is historically accurate for its date but stale against current local state because PBF and Valhalla artifacts now exist.

Current source code is newer and uses Valhalla for the active `POST /api/routing`
path.

## Security Gaps

No hardcoded routing secret was found in Dockerfile or Compose. Compose references
server secret variable names, but values are not embedded.

Potential non-routing issue:

- Some browser verification scripts contain fallback test passwords. This is not
  part of the Valhalla routing provider path, but should be reviewed separately
  before production-grade public repository hygiene.

No `NEXT_PUBLIC_ROUTING_*` or `NEXT_PUBLIC_VALHALLA_*` exposure was found.

## Database Dependency

Migration exists:

- `backend/supabase/migrations/20260831110000_global_canonical_merchant_search.sql`

Assessment:

- It supports canonical merchant/global search behavior.
- It is not required for the core Valhalla routing provider to compute routes
  from explicit origin/destination coordinates.

Routing blocked by this migration: NO for core routing infrastructure, UNKNOWN
for any UX flow that depends on remote canonical destination search.

## Phase 1 Work Items

- Record current OSM source date and SHA-256 for PBF.
- Verify actual Valhalla status and live routes in deployment scope.
- Verify backend container can reach Valhalla through Compose DNS.
- Verify GETRA normalized `POST /api/routing` with authenticated token.
- Verify firewall and reverse proxy externally.
- Update stale API/final docs after implementation phase, not during Phase 0.
