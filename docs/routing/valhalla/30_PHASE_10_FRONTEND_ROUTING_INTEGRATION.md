# GETRA Phase 10 Frontend Routing Integration

Date: 2026-09-05 (Asia/Jakarta)
Final browser acceptance: `2026-09-05T06:47:30.118Z` to `2026-09-05T06:48:14.118Z`

## Decision

```text
PHASE_10_STATUS=VERIFIED
PHASE_11_READINESS=READY
VERCEL_ROUTING_READINESS=PARTIAL
CORS_DEPLOYED=NOT_TESTED
ENVIRONMENT_TYPE=SHARED_STAGING
HOSTING_CLASS=OWNER_HOSTED_TAILSCALE_STAGING
COMPUTE_AVAILABILITY=OWNER_MACHINE_DEPENDENT
24_7_AVAILABILITY=NO
REMOTE_VPS=NO
```

The actual GETRA frontend successfully requested and rendered real authenticated
walking, motorcycle, and car routes through the existing public HTTPS backend.
Acceptance includes the regression pair, three different map-selected pairs,
independent A/B changes, mobile map selection, mode isolation, request races,
failure UX, reset, and basemap reload. No successful route was fabricated.

This accepts the local frontend implementation against shared staging, not a
deployed Vercel frontend, permanent hosting, or final competition readiness.
Phase 11 was not started.

Preview: [GETRA frontend](http://localhost:3001/app)

Public backend: [GETRA staging API](https://getra-routing-api.tail0ed517.ts.net)

## Workspace And Source Protection

| Field | Actual value |
| --- | --- |
| Frontend repository | `D:\Getra_Production` |
| Branch | `finalmerge` |
| Base SHA | `2cf252e8bfcedbff42a40de07d6227e34ca63499` |
| Final Git HEAD | `2cf252e8bfcedbff42a40de07d6227e34ca63499` |
| Worktree before / after | DIRTY / DIRTY |
| Phase 10 source state | Implemented, uncommitted; HEAD alone does not contain these changes |
| Backend source changed by Phase 10 | NO |
| Runtime backend SHA | `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe` |
| Runtime tracked worktree | CLEAN |
| Runtime checkout | `/home/getra/getra` on `getra-routing-local` |

The pre-existing owner changes in backend, frontend, stakeholder/business-space,
UMKM, and other files were preserved. The owner's dashboard wrapper and map
camera-control change were retained. No reset, clean, stash, dependency update,
unrelated merge, or commit was performed. Frontend implementation stayed in the
Windows development repository; none was copied into the Ubuntu source checkout.

The existing dev server on port 3000 was left running. The routing preview uses
port 3001 and `GETRA_FRONTEND_DIST_DIR=.next/phase10`, avoiding shared Next output
with that server. Production-build verification used `.next/phase10-build`.
Next added the corresponding generated-types includes to `frontend/tsconfig.json`.

## Architecture Audited Before Editing

- `MAP_ROOT_COMPONENT=frontend/components/getra-map.tsx`: MapLibre instance,
  click handling, DOM markers, GeoJSON sources/layers, basemap reload, camera.
- `ROUTING_UI_PARENT=frontend/components/getra-dashboard.tsx`: existing commuter
  route planner, search, map selection, route summary, and error UI.
- `STATE_OWNER=GeneralGetraDashboard + useRouting`: independent A/B coordinates
  in the dashboard; selected mode and current request/result in the hook.
- Existing Next 16.3.1, React, MapLibre, lucide, Zod, Supabase session utilities,
  API envelope client, public API configuration, and Vitest conventions reused.
- Local Next documentation for client components, environment variables, and
  `distDir` was read before implementation. No framework or dependency upgrade.

```text
User-selected A + B + GETRA mode
  -> existing Supabase user session
  -> authenticated API client
  -> HTTPS GETRA /api/routing
  -> unchanged backend provider abstraction
  -> private Valhalla + accepted OSM graph
  -> normalized GETRA LineString and metrics
  -> current-request guard
  -> MapLibre route source, A/B markers, and summary
```

## Files Changed In This Phase

| File | Routing-specific change |
| --- | --- |
| `frontend/components/getra-dashboard.tsx` | Independent arbitrary destination, existing/manual/GPS origin integration, map pick states, mode controls, current summary, reset and typed failure/login UX |
| `frontend/components/getra-map.tsx` | A/B markers without duplicate manual-start marker, current geometry, route framing around basemap controls, style/idle synchronization |
| `frontend/src/hooks/use-routing.ts` | One selected-mode request, input invalidation, cancellation, sequence/identity guards, safe normalized states |
| `frontend/src/services/routing.service.ts` | Input/result validation, authenticated request, typed error normalization, bounded browser transport |
| `frontend/src/lib/auth-client.ts` | Typed missing-session error; existing session retrieval retained |
| `frontend/src/lib/api-client.ts` | Typed HTTP errors and malformed-envelope handling; existing API transport retained |
| `frontend/src/features/routing/route-geometry.ts` | Finite, bounded longitude/latitude LineString validation |
| `frontend/src/features/routing/route-layer.ts` | Existing route source/layer behavior extracted for focused testing |
| `frontend/src/features/routing/components/coordinate-entry.tsx` | Accessible optional coordinate input for independent A/B |
| `frontend/src/features/routing/routing-controls.module.css` | Scoped planner, mode, coordinate, focus and selection styles |
| `frontend/next.config.ts` | Optional isolated Next output directory; default remains `.next` |
| `frontend/tsconfig.json` | Next-generated type includes for isolated preview/build |
| `frontend/tests/routing/routing-client.test.ts` | Auth, dynamic coordinates, modes, errors, deadline, cancellation, geometry and envelope tests |
| `frontend/tests/routing/route-layer.test.ts` | Replacement, clearing during tile loading, style reload, idempotency |
| `frontend/tests/routing/phase10-browser-acceptance.mjs` | Opt-in real browser acceptance plus clearly separated controlled failures |
| `frontend/tests/global-search/commuter-safety.test.ts` | Existing static checks updated to the new guarded request and extracted map helper |
| `docs/routing/valhalla/phase10-local-cors.override.yml` | Non-secret local-origin Compose configuration |
| `frontend/.env.local` (ignored) | Canonical client-safe public API URL; no secret changes |

Other dirty files are not Phase 10 routing changes.

## API, Authentication, And CORS

The existing central configuration remains `getGetraApiBaseUrl()` in
`frontend/src/lib/api-base-url.ts`. The canonical build-time variable is:

```dotenv
NEXT_PUBLIC_GETRA_API_URL=https://getra-routing-api.tail0ed517.ts.net
```

This value was added to the ignored frontend local environment file. It takes
precedence over the existing deprecated `NEXT_PUBLIC_API_URL` alias. Components
do not embed this hostname or private provider addresses. Existing approved
public Supabase configuration remains required; no server secret belongs in
`NEXT_PUBLIC_*` variables.

Requests reuse the ordinary Supabase user session and existing Authorization
transport. The browser acceptance logged in through the normal GETRA login UI
using the already-authorized ordinary USER fixture from the approved smoke-test
source. It did not run account-provisioning scripts, bypass auth, install fake
identity, or use service-role browser access. Credentials/session remained in
the temporary browser/process, not in screenshots, console summaries, or docs.

The actual request uses `{origin:{latitude,longitude}, destination:{latitude,
longitude}, mode}`. A valid merchant UUID is optional analytics metadata. A
map-selected destination is a coordinate, not a fabricated merchant ID. The
frontend does not send provider costing options, implement snapping, or invent
avoid-road behavior. Backend walking/pedestrian, motorcycle/motorcycle, and
car/auto mappings remain unchanged.

The existing backend `FRONTEND_ALLOWED_ORIGINS` configuration initially allowed
localhost:3000 but rejected the isolated localhost:3001 preview. The narrow
Compose override now explicitly allows both local origins. It was copied to
the ignored runtime location `routing-data/phase10-local-cors.override.yml`.
Only the backend container was recreated, with its existing image and no build.
Valhalla was not restarted or rebuilt.

| CORS / auth observation | Result |
| --- | --- |
| Origin `http://localhost:3000` preflight | HTTP 204; exact origin allowed |
| Origin `http://localhost:3001` preflight | HTTP 204; exact origin allowed |
| Authorization/content-type request headers | Allowed by existing contract |
| Unapproved example origin | HTTP 403; no permissive wildcard |
| Real frontend browser requests from 3001 | Authenticated HTTP 200; normal browser security enabled |
| Anonymous public routing request | HTTP 401 UNAUTHORIZED |
| Deployed frontend origin | Unknown / NOT_TESTED; no Vercel project metadata found in either local project location |

To retain the local-origin configuration when recreating the backend, include
the override after the repository's existing three Compose files:

```bash
docker compose --env-file .env.local \
  -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.prod.yml \
  -f routing-data/phase10-local-cors.override.yml \
  up -d --no-deps --no-build --wait --wait-timeout 120 getra-backend
```

The standard production start command without this override does not establish
the localhost:3001 allowlist on a subsequent recreation. Keep the override in
the invocation, or carry the approved origins into the deployment's established
environment management. No sudoers, firewall, authentication middleware, or
application source was changed for CORS.

## Dynamic State And Request Safety

- A and B are independent coordinates. Explicit map selection states are
  `NONE`, `ROUTE_START`, and `ROUTE_DESTINATION`. The existing search/GPS paths
  remain available, alongside map selection and optional numeric entry.
- Only the currently selected mode is requested. Switching walking, motorcycle,
  or car retains A/B, invalidates old results, and issues a new backend request.
- The request identity includes full current coordinates, mode, merchant context,
  and retry attempt. A sequence guard plus AbortController prevents superseded
  responses from committing. Input identity hides stale geometry synchronously,
  before the next effect runs, including when returning to a previous selection.
- The browser transport has a 20000 ms deadline and forwards caller aborts.
  This allows overhead around the unchanged 12000 ms backend provider deadline.
  Timers and listeners are cleaned up; existing session retrieval is bounded.
- Only verified ROUTABLE payloads expose geometry and metrics. Positive finite
  distance/duration, matching mode, and a LineString with more than one finite
  bounded `[longitude, latitude]` pair are required. Malformed data is rejected.
- Backend failure payloads cannot carry success geometry/metrics. Invalid
  geometry, HTTP errors, timeout, and network failure clear the current result.
- Reset clears route, error, pending request, and selected endpoints in the
  tested manual-selection flow. Normal map panning does not change A/B.

| Condition | Visible routing state / behavior |
| --- | --- |
| Pending current request | LOADING, readable status, old route removed |
| ROUTABLE | Backend geometry and formatted backend metrics |
| UNROUTABLE | NOT_ROUTABLE; truthful no-path message |
| OUTSIDE_GRAPH | NOT_ROUTABLE; coverage message |
| Provider/network unavailable | SERVICE_UNAVAILABLE; temporary-service message |
| Provider/browser timeout | SERVICE_UNAVAILABLE; timeout/retry message |
| HTTP 401 or no session | ERROR; session message and existing login link |
| HTTP 400 / invalid input | ERROR; validation message |
| Invalid envelope/geometry | Safe failure, never partial/fabricated LineString |

## Map Rendering And Metrics

The existing `walking-route` source and its casing/line layers are reused for
all three GETRA modes. The legacy source name is not a costing selection.
New responses replace source data; failures/reset set an empty feature
collection. Existing data can be cleared while map tiles are still loading.
Style reload recreates the source/layers from the current result without
duplicate layers or another route API call.

Distinct A/ASAL and B/TUJUAN markers carry selected coordinates. Marker props
are memoized; mode changes do not change their coordinate identity. Route
camera fit occurs for new geometry, with padding accounting for existing
basemap controls, including mobile. Basemap changes and ordinary panning do
not repeatedly trigger routing or steal control through route refitting.

Distance formatting converts backend meters for display; duration formatting
converts backend seconds into displayed whole minutes. It does not calculate
travel time. Maneuver instructions and toll flags, when present, come from the
backend. The existing non-routing proximity-distance helper in the dashboard
continues to support dataset selection only; it does not construct routes or
populate route metrics.

Shipping frontend source was scanned for the private Valhalla address, port
8002, VM address, and Phase 9 acceptance coordinates. No matching production
routing constants or direct provider calls were found. Acceptance coordinates
exist only in test fixtures/evidence, not product routing logic.

## Real Frontend Evidence

All positive rows below came from the normal logged-in frontend against the
PUBLIC HTTPS `/api/routing` endpoint. Each returned HTTP 200, ROUTABLE, positive
metrics, and a real backend LineString. The runner compared MapLibre source
point count to the actual response and checked displayed distance/duration.
No mocked success is counted as real acceptance.

Regression A: `-6.214120,106.682990`
Regression B: `-6.218000,106.687000`

| Case | Mode | Distance (m) | Duration (s) | Points | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Regression | walking | 953 | 673 | 25 | PASS |
| Regression | motorcycle | 1035 | 150 | 29 | PASS |
| Regression | car | 8706 | 1045 | 385 | PASS |
| Regression walking repeat after car/motorcycle | walking | 953 | 673 | 25 | PASS |
| Dynamic pair 1 | walking | 387 | 303 | 10 | PASS |
| Dynamic pair 2 | motorcycle | 707 | 130 | 21 | PASS |
| Dynamic pair 3 | car | 658 | 164 | 24 | PASS |
| Mobile mode switch on dynamic pair 3 | walking | 658 | 495 | 24 | PASS |
| Mobile origin reselect, destination held | walking | 717 | 506 | 21 | PASS |
| Mobile destination reselect, origin held | walking | 387 | 303 | 10 | PASS |

Actual map-click request coordinates, in latitude/longitude order:

| Pair | Origin | Destination |
| --- | --- | --- |
| Dynamic walking | -6.215095250394697,106.68419572522765 | -6.216795250412233,106.68609572523064 |
| Dynamic motorcycle | -6.215495250400451,106.68449572523195 | -6.217195250415074,106.6862957252273 |
| Dynamic car | -6.215695250400245,106.68469572523037 | -6.217495250417571,106.68649572523242 |
| Final mobile walking | -6.215095833681758,106.68419463558314 | -6.216795833695301,106.68609463558312 |

The runner positioned the test camera, activated the actual origin/destination
buttons, and clicked the actual MapLibre canvas. It recorded the resulting
request coordinates; it did not replace application endpoint state with a
fixture. Numeric entry was separately exercised for the regression pair.

With B held fixed, desktop origin reselects independently produced 787 m/556 s,
335 m/112 s, and 700 m/174 s, respectively. Subsequent destination reselects
produced the three final dynamic rows above. Both origin and destination changes
therefore exercised new authenticated requests and visible route replacement.

## Browser UX And Controlled Failures

Browser: headless Microsoft Edge through Playwright, normal security enabled.
Desktop: 1440x1000. Mobile viewport: 390x844. This is viewport emulation, not a
new physical-phone acceptance claim.

| Check | Result / evidence |
| --- | --- |
| Mode isolation | walking -> car -> motorcycle -> walking; A/B retained; original walking result restored by its own request |
| Request race | Real walking response delayed in test transport; car selected last; final mode/geometry remains car |
| Pending request | LOADING visible; previous route source empty |
| Controlled UNROUTABLE | Correct message, no route source or summary |
| Controlled provider unavailable | SERVICE_UNAVAILABLE, no fake route |
| Controlled timeout response | Timeout UX, no geometry/metrics |
| Controlled malformed geometry | Rejected, no partial geometry |
| Controlled validation / HTTP 401 | Correct error states; 401 shows login link |
| Recovery after controlled responses | Interception removed; real car request succeeds again |
| Basemap reload | Existing Light basemap selected; route retained; one source/two layers; no new route request |
| Panning | Endpoint/request identity unchanged |
| Desktop/mobile camera fit | Route coordinates inside actual map bounds |
| Mobile A/B selection | Both actual map-pick controls and reroutes pass |
| Mobile mode control | Real walking request succeeds |
| Mobile sizing | No horizontal document overflow; mode controls and summary readable |
| Markers | Two distinct A/B markers before reset; none after manual-flow reset |
| Reset | IDLE, no route/summary/error, no unintended request |

Failure cases use bounded Playwright response interception or unit tests; they
are not claimed as new live Valhalla outages. The slow-success race uses a
delayed REAL provider response, not invented route values. Phase 7's unchanged
backend failure contract remains the server-side evidence.

Generated local evidence is ignored and contains sanitized summaries only:

- `outputs/phase10/evidence.json`: final run PASS, request coordinates/metrics,
  and individual acceptance checks; no full geometry or session.
- `outputs/phase10/desktop.png`: actual route/markers and desktop controls.
- `outputs/phase10/mobile-map.png`: real route on mobile map.
- `outputs/phase10/mobile-controls.png`: mobile routing controls and metrics.

The browser runner is opt-in because it needs the live staging machine, approved
test account, running frontend, and an available Playwright installation. It
does not add Playwright as a new project dependency or execute in the unit suite.
It discovers the existing approved test fixture through the TypeScript parser;
credential values are not copied into the runner.

One intermediate Windows check returned DNS ENOTFOUND for the unchanged staging
hostname. The Ubuntu services/Funnel remained healthy; a public resolver had
valid records. The local DNS cache was cleared without changing DNS servers,
host mappings, URL, or browser security. Subsequent ordinary Windows HTTPS and
the full browser acceptance succeeded. This transient network event is not
counted as a successful run or hidden as a frontend routing result.

## Source Quality Gates

| Command | Result |
| --- | --- |
| `npm run typecheck -w frontend` | PASS |
| `npm run lint -w frontend` | PASS, zero-warning gate |
| `npm run test -w frontend` | PASS, 41 files / 210 tests |
| `npm run build -w frontend` | PASS, Next 16.3.1, production compile/typecheck/page generation |
| `node frontend/tests/routing/phase10-browser-acceptance.mjs` | PASS with cached Playwright selected via `GETRA_PLAYWRIGHT_MODULE` |
| Focused changed-file `git diff --check` | PASS |
| Backend quality rerun | NOT REQUIRED; backend application source unchanged |

The full frontend suite includes API authentication, each mode, changed A/B,
no session, 401/400/503, malformed envelopes including null, network failures,
failure route states, caller abort, 20000 ms deadline, invalid/missing geometry,
wrong mode, zero/negative metrics, replacement, idle clearing and style reload.
The opt-in browser script separately exercises the real hook/rendering lifecycle.

## Runtime And Secret Safety

Final runtime checkpoint at `2026-09-05T06:45:54Z`, with public health and real
browser routing rechecked afterward:

| Item | Observation |
| --- | --- |
| Backend / Valhalla | Both healthy; host health/status succeed |
| Backend image | `sha256:16b7d3e6343c6819d075e77490fac07368e3a37f691895030379b857ea4dff57`, unchanged |
| Backend routing timeout / cache TTL | 12000 / 300000 ms, unchanged |
| Backend host bind | 127.0.0.1:3002 |
| Valhalla host bind | 127.0.0.1:8002 |
| Docker TCP listeners on 2375/2376 | None |
| Funnel | Same stable HTTPS hostname; only backend target; tailscaled active |
| PBF SHA-256 | `93e07cc2e5574d1f8c4a6208ab5e4b83e83e0aea4811def94225078e99e35c19`, matches Phase 9 |
| Graph archive SHA-256 | `d63d5d5ce1774ffceffa9c756f7b87909cbed3e5d4e2e8887f9628b975062c6f`, unchanged |
| Graph archive mtime | 2026-09-04 09:27:34.873641006 UTC, unchanged |
| RAM total / available | 5.2 GiB / 4.2 GiB |
| Swap total / used | 4.0 GiB / 17 MiB |
| Root filesystem total / free | 54 GiB / 34 GiB |

No severe runtime resource pressure was observed. No graph rebuild, data change,
database migration, paid provisioning, Tailscale identity change, or public raw
port exposure occurred. The Ubuntu source remains clean at its approved SHA.

No access token, refresh token, password, private key, service-role key, or env
contents were emitted or added to shipping frontend code/evidence in this phase.
Routing errors expose localized safe messages, not raw provider infrastructure.
This is a scoped changed-code/handling audit, not an assertion that every
historical repository credential or unrelated feature was audited.

## Deployment Handoff

`VERCEL_ROUTING_READINESS=PARTIAL`: no actual approved deployed frontend origin
or local Vercel project binding was available for verification. Before a later
frontend deployment, set the canonical public API variable at build time,
preserve approved public Supabase configuration, and allow the exact approved
frontend origin through the backend's existing CORS configuration. Then repeat
browser authentication/routing on that deployed origin. Do not use wildcard
CORS, `no-cors`, direct Valhalla, or a browser security bypass.

The current stable hostname is not an uptime promise. Windows, VMware, Ubuntu,
Docker, network, and routing services must remain online. Offline compute means
SERVICE_UNAVAILABLE with no fallback route. Permanent remote hosting remains
deferred until approved budget is available.

## Final Acceptance Report

```text
FRONTEND_REPO=D:\Getra_Production
FRONTEND_BRANCH=finalmerge
FRONTEND_BASE_SHA=2cf252e8bfcedbff42a40de07d6227e34ca63499
FRONTEND_FINAL_SHA=2cf252e8bfcedbff42a40de07d6227e34ca63499 + uncommitted Phase 10 changes
WORKTREE_BEFORE=DIRTY
WORKTREE_AFTER=DIRTY
PUBLIC_ROUTING_API=https://getra-routing-api.tail0ed517.ts.net
PUBLIC_API_HEALTH=PASS
AUTH_INTEGRATION=PASS
CORS_LOCAL=PASS
CORS_DEPLOYED=NOT_TESTED
API_CLIENT=PASS
DIRECT_VALHALLA_FRONTEND_CALL=NONE
DYNAMIC_ORIGIN=PASS
DYNAMIC_DESTINATION=PASS
ARBITRARY_USER_COORDINATES=PASS
ACCEPTANCE_COORDINATES_HARDCODED=NO
ORIGIN_MARKER=PASS
DESTINATION_MARKER=PASS
WALKING_CONTROL=PASS
MOTORCYCLE_CONTROL=PASS
CAR_CONTROL=PASS
SAME_A_B_ACROSS_MODE=PASS
ORIGIN_CHANGE_RECALC=PASS
DESTINATION_CHANGE_RECALC=PASS
MODE_CHANGE_RECALC=PASS
REQUEST_RACE_PROTECTION=PASS
MAPLIBRE_LINESTRING=PASS
GEOJSON_ORDER=PASS
CAMERA_FIT=PASS
DISTANCE_DISPLAY=PASS
DURATION_DISPLAY=PASS
LOADING_UX=PASS
AUTH_ERROR_UX=PASS
NOT_ROUTABLE_UX=PASS
SERVICE_UNAVAILABLE_UX=PASS
FAKE_ROUTE_FALLBACK=NONE
REGRESSION_WALKING=PASS
REGRESSION_WALKING_DISTANCE=953 meters
REGRESSION_WALKING_DURATION=673 seconds
REGRESSION_MOTORCYCLE=PASS
REGRESSION_MOTORCYCLE_DISTANCE=1035 meters
REGRESSION_MOTORCYCLE_DURATION=150 seconds
REGRESSION_CAR=PASS
REGRESSION_CAR_DISTANCE=8706 meters
REGRESSION_CAR_DURATION=1045 seconds
DYNAMIC_WALKING=PASS
DYNAMIC_WALKING_A=-6.215095250394697,106.68419572522765
DYNAMIC_WALKING_B=-6.216795250412233,106.68609572523064
DYNAMIC_WALKING_DISTANCE=387 meters
DYNAMIC_MOTORCYCLE=PASS
DYNAMIC_MOTORCYCLE_A=-6.215495250400451,106.68449572523195
DYNAMIC_MOTORCYCLE_B=-6.217195250415074,106.6862957252273
DYNAMIC_MOTORCYCLE_DISTANCE=707 meters
DYNAMIC_CAR=PASS
DYNAMIC_CAR_A=-6.215695250400245,106.68469572523037
DYNAMIC_CAR_B=-6.217495250417571,106.68649572523242
DYNAMIC_CAR_DISTANCE=658 meters
LIVE_MODE_ISOLATION=PASS
MOBILE_UX=PASS
DESKTOP_UX=PASS
RESET=PASS
TYPECHECK=PASS
LINT=PASS
FRONTEND_TESTS=PASS (41 files, 210 tests)
PRODUCTION_BUILD=PASS
BACKEND_SOURCE_CHANGED=NO
BACKEND_FINAL_SHA=b3fded2cc23885b890fb7fbb30f99cdd7e6befbe
VERCEL_ROUTING_READINESS=PARTIAL
SECRET_EXPOSURE=NONE
PHASE_11_READINESS=READY
PHASE_10_STATUS=VERIFIED
```

## Stop Condition

Phase 10 ends here. No Phase 11 work, Vercel deployment, service-area/isochrone
implementation, unrelated analytics/AI feature change, production hosting claim,
database migration, or paid infrastructure provisioning was performed.
