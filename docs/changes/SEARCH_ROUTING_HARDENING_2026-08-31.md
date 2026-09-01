# GETRA merchant search and routing hardening report

Date: 2026-08-31

## Result and production gate

The code-level search correction, routing contracts, diagnostics, UI overflow
fixes, regression tests, lint, typecheck, and both Next.js production builds are
complete and passing.

Live routing is **not yet verified** on this workstation. Docker is not installed,
`routing-data/jabodetabek.osm.pbf` is absent, Valhalla on `127.0.0.1:8002` is
unreachable, and the GETRA backend is not running. The database migration in this
change is also not applied to a live Supabase project from this workstation.
Those are deployment gates, not conditions hidden by fabricated data.

## A. Root causes

### Search outside the viewport

`frontend/components/getra-dashboard.tsx` previously passed the viewport-loaded
`merchants` collection to `findRouteSearchResults`. That collection originates
from the canonical BBOX marker request, so the destination search could only find
merchants already loaded for the visible map.

The server RPC reinforced the coupling: the previous
`search_canonical_merchants_v1` accepted candidates only when a region or complete
BBOX was supplied. A normal canonical keyword query without either scope could
not return a row.

### Walking, motorcycle, and car unavailable

The three UI modes all use the same Valhalla service through distinct costing
profiles. On this workstation the configured runtime dependencies are absent:

- `ROUTING_BASE_URL` is not explicitly set in `backend/.env.local`, so local
  non-container development falls back to `http://127.0.0.1:8002`.
- Nothing is listening on `127.0.0.1:8002`.
- Docker is not available and the Jabodetabek PBF has not been prepared.

Consequently all three independent requests fail at the provider-connectivity
layer. This is not a MapLibre, coordinate-order, or mode-profile failure.

### AI provider message

AI is a separate configuration issue. `AI_PROVIDER=sub2api`, while
`SUB2API_API_KEY` is empty. An Anthropic credential in the environment does not
activate this implementation because the current provider selection is Sub2API.
No AI fallback or fake answer was introduced.

## B. Files changed for this correction

| Path | Purpose |
| --- | --- |
| `frontend/components/getra-dashboard.tsx` | Separate destination discovery from marker data, retain the selected canonical merchant, focus the map after selection, and improve destination/mode layout. |
| `frontend/app/globals.css` | Remove destructive route text truncation, allow wrapping, and make route actions/cards responsive. |
| `frontend/src/features/routing/hooks/use-destination-merchant-search.ts` | Debounced global canonical search with cancellation and stale-response protection. |
| `frontend/src/services/mapid-layer.service.ts` | Add canonical `GLOBAL` search with no BBOX. |
| `frontend/src/hooks/use-routing.ts` | Preserve partial mode results and map stable backend reason codes to concise Indonesian messages. |
| `frontend/src/services/routing.service.ts` | Type the normalized routing failure contract. |
| `backend/src/features/global-search/*` | Add and validate an explicit keyword-only `GLOBAL` scope. |
| `backend/src/features/commuter/commuter.types.ts` | Carry the new scope through resolved intent types. |
| `backend/src/features/merchant-reconciliation/canonical-merchant-read.service.ts` | Allow the RPC call to omit BBOX coordinates. |
| `backend/supabase/migrations/20260831110000_global_canonical_merchant_search.sql` | Forward-only RPC replacement permitting keyword discovery without region/BBOX; adds bounded result limits, service-role grants, and a partial trigram name index. |
| `backend/src/features/routing/*` | Validate provider configuration, map GETRA modes to Valhalla costing, decode geometry, classify provider failures, cache results, and check provider health. |
| `backend/src/lib/http/timeout-fetch.ts` | Distinguish deadline expiry from caller cancellation with `HttpTimeoutError`. |
| `backend/app/api/routing/route.ts` | Normalize thrown provider failures and emit safe request-ID/reason-code logs. |
| `backend/app/api/internal/routing/provider-health/route.ts` | Add authenticated, non-sensitive provider readiness diagnostics. |
| `backend/src/lib/api-security/endpoint-policy.ts` | Register the protected diagnostics endpoint. |
| `backend/tests/**` and `frontend/tests/**` | Cover global search scope, no-BBOX RPC calls, endpoint security, migration safety, mode mapping, coordinate order, timeout, no-route, malformed response, health, and frontend service requests. |
| `docs/ROUTING_NAVIGATION.md` | Document the private health and logging workflow. |

## C. Search architecture after the fix

Normal destination search now calls authenticated
`GET /api/merchants/canonical?q=...&scope=GLOBAL`. The backend queries the
canonical published merchant dataset through the service-role-only RPC without a
BBOX. Marker loading remains BBOX-based for performance.

Selecting a result stores its canonical ID and coordinates, adds only that
selected merchant to the map collection, focuses the camera on it, selects its
detail, and supplies the exact canonical coordinate to routing. Map movement
happens after selection. Existing viewport discovery remains a separate pipeline.

## D. Routing architecture after the fix

The browser calls authenticated `POST /api/routing`; only the backend contacts
Valhalla. Compose config uses `http://valhalla:8002`, while host diagnostics use
loopback. Mode mapping is:

- walking -> `pedestrian`
- motorcycle -> `motorcycle`
- car -> `auto`

Valhalla requests use `{ lat: latitude, lon: longitude }`. Decoded GeoJSON uses
`[longitude, latitude]`. The response is normalized to route status, reason code,
distance, duration, LineString, maneuvers, warnings, and road flags. MapLibre
updates one existing GeoJSON source and its layers; switching mode changes source
data rather than rebuilding the map.

## E. Executed verification

| Check | Result |
| --- | --- |
| `npm run typecheck -w frontend` | PASS |
| `npm run typecheck -w backend` | PASS |
| Targeted ESLint for changed frontend files | PASS |
| Targeted ESLint for changed backend files | PASS |
| Frontend full suite: 27 files / 94 tests | PASS |
| Backend full suite: 133 passed, 2 skipped / 846 passed, 3 skipped | PASS |
| Search/routing focused suite: 9 files / 53 tests | PASS |
| Frontend production build | PASS |
| Backend production build | PASS |
| `npm run routing:validate` | FAIL as designed: Jabodetabek PBF missing |
| Direct `http://127.0.0.1:8002/status` | FAIL: unreachable |
| Search against migrated live database | NOT VERIFIED: migration not applied here |
| Walking live Valhalla request | NOT VERIFIED: infrastructure unavailable |
| Motorcycle live Valhalla request | NOT VERIFIED: infrastructure unavailable |
| Car live Valhalla request | NOT VERIFIED: infrastructure unavailable |
| Cross-region live request | NOT VERIFIED: infrastructure unavailable |
| Browser E2E and live mode switching | NOT VERIFIED: backend/provider/database stack unavailable |

## F. Manual production-like verification

1. Install Docker and `osmium-tool` on the target VPS/workstation.
2. Run `npm run routing:prepare` and confirm the clipped PBF metadata.
3. Apply pending Supabase migrations through the project's controlled deployment
   workflow.
4. Start backend and Valhalla with `npm run docker:prod:start`.
5. Confirm Valhalla `/status?verbose=true` reports loaded Jabodetabek tiles.
6. Sign in and call `GET /api/internal/routing/provider-health`; expect `READY`.
7. Zoom into Pradita/Gading Serpong while the donut marker is outside the view.
8. Search `donut`; confirm the canonical result appears without zooming out.
9. Select it; confirm map focus, marker/detail selection, and exact destination.
10. Choose a valid origin and calculate walking, motorcycle, and car routes.
11. Confirm each available mode has its own ETA/distance and changes the LineString.
12. Repeat with a Tangerang/Tangsel origin and Jakarta destination.

## G. Remaining limitations

- A real PBF graph build and all live Valhalla acceptance tests are still required.
- The forward migration needs controlled application and live query-plan/data QA.
- Authenticated browser E2E cannot be claimed until the live database/backend and
  routing stack are available.
- Sub2API AI remains unavailable until its server-side credential is supplied or
  the configured provider is deliberately changed.
