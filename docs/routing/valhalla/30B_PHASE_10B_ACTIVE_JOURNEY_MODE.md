# GETRA Phase 10B Active Journey Mode

Date: 2026-09-05 (Asia/Jakarta)

## Scope And Source

- Locked base: `0b02909d2015ff4aebee7013feb5b1c7e5c81202`
- New branch: `routing-active-journey-release`
- New worktree: `D:\Getra_ActiveJourney_Release`
- Owner workspace: `D:\Getra_Production`, not edited, staged, reset, cleaned or stashed.
- Prior frontend release branch/worktree: preserved at its locked SHA.
- Backend runtime SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`, unchanged and clean.
- Backend API: `https://getra-routing-api.tail0ed517.ts.net`
- Preview: `http://localhost:3003/app`

Before committing, all 154 snapshotted owner modified/untracked/missing-file
states still matched their original hashes. Owner HEAD remained
`2cf252e8bfcedbff42a40de07d6227e34ca63499`; the prior release remained clean at
`0b02909d2015ff4aebee7013feb5b1c7e5c81202`. No report was copied into the owner's
workspace in this phase. All fourteen changed paths are scoped below.

This phase extends route preview into a browser-GPS journey. It does not start
Phase 11, deploy Vercel, change the backend routing implementation, rebuild the
graph, introduce voice guidance, or claim physical travel/native navigation.

The actual release SHA is the commit containing this report: resolve it with
`git rev-parse HEAD`. The final delivery records the literal local/remote SHA
after the commit and non-force push, avoiding a self-referential commit hash.

## Test Count Audit Before Implementation

The previous machine-readable Vitest results were read and compared by relative
frontend path, including the landing tests outside frontend/tests. Discovery
scripts/configuration were unchanged. The clean base was rerun before editing:
32 files / 137 tests PASS. All four routing-focused files / 39 tests remain.

| Excluded owner-only test change | Tests |
| --- | ---: |
| business-space/business-space-service.test.ts | 3 |
| business-space/property-analysis-state.test.ts | 6 |
| business-space/property-presentation.test.tsx | 7 |
| business-space/property-viewport.test.ts | 12 |
| umkm-intelligence/merchant-insight-panels.test.tsx | 5 |
| umkm-workspace/merchant-campaigns.test.ts | 4 |
| umkm-workspace/merchant-submission-flow.test.tsx | 14 |
| umkm-workspace/promotion-readiness.test.tsx | 8 |
| umkm-workspace/workspace-state.test.tsx | 13 |
| Additional Business Space contract test in existing file | 1 |
| Total | 73 |

Thus 41 - 9 = 32 files and 210 - 73 = 137 tests. No routing test was lost.
The nine files belong to uncommitted unrelated owner features, not this release.

```text
PHASE10_ORIGINAL_TEST_FILES=41
PHASE10_ORIGINAL_TESTS=210
PHASE10A_RELEASE_TEST_FILES=32
PHASE10A_RELEASE_TESTS=137
TEST_COUNT_DIFFERENCE_ROOT_CAUSE=EXCLUDED_UNRELATED_UNCOMMITTED_OWNER_FEATURE_TESTS
TEST_DISCOVERY_REGRESSION=NO
```

## Implementation

| File | Responsibility |
| --- | --- |
| frontend/src/features/routing/journey-controller.ts | Testable state machine; one GPS watch, request cancellation, coalescing, arrival and cleanup |
| frontend/src/features/routing/journey-policy.ts | Central thresholds; existing MapLibre LngLat proximity calculation for triggers only |
| frontend/src/hooks/use-active-journey.ts | React external-store subscription, current destination/mode identity, existing Supabase session lifecycle |
| frontend/src/features/routing/components/journey-controls.tsx | Start, state, recenter, refresh and stop controls |
| frontend/src/features/routing/routing-controls.module.css | Scoped 44px journey controls and planner layout |
| frontend/src/hooks/use-routing.ts | Optional controlled mode/enable inputs; existing preview cancellation preserved |
| frontend/components/getra-dashboard.tsx | Preview/journey ownership, selected mode, auth prerequisites, metrics and existing location integration |
| frontend/components/getra-map.tsx | Existing user marker and route source; follow suspension and responsive camera padding |
| frontend/tests/routing/journey-controller.test.ts | 38 controlled journey state/lifecycle/regression tests |
| frontend/tests/routing/browser-user-fixture.mjs | Shared existing approved ordinary-USER fixture loader; no embedded credentials |
| frontend/tests/routing/phase10-browser-acceptance.mjs | Existing acceptance behavior retained; shared fixture loader |
| frontend/tests/routing/phase10b-browser-acceptance.mjs | Simulated device GPS with real authenticated public routes |
| docs/routing/valhalla/phase10b-local-cors.override.yml | Local preview origin only; existing 3000/3001 retained plus 3003 |
| This report | Implementation and source-lock evidence |

No package, lockfile, backend, unrelated feature, frontend local environment,
generated worker asset, PBF or graph changes are committed. npm ci installed the
existing lockfile independently. Next's installed client-component documentation
was read before implementation; framework/library versions were not upgraded.

```text
Accepted preview A -> B
  -> explicit Mulai Perjalanan
  -> existing authenticated session check
  -> navigator.geolocation.watchPosition
  -> fresh current P -> B + walking/motorcycle/car
  -> existing authenticated routingService -> public GETRA /api/routing
  -> unchanged backend/provider/Valhalla graph
  -> validated normalized response + latest-request guard
  -> existing MapLibre walking-route source and backend metrics
```

The existing one-shot location button and user-location marker are reused. While
journey is open, the old one-shot button focuses the journey instead of requesting
a second location stream. Live GPS is not copied into dataset search/AI state.
Preview A is hidden during journey; the existing GPS marker is distinct from B.

## State And UX Contract

| State | Behavior |
| --- | --- |
| PREVIEW | Existing independent A/B planner; start requires routable preview, destination, selected mode and user context |
| REQUESTING_LOCATION | Auth rechecked, high-accuracy watch started; preview route/metrics removed |
| STARTING | First GPS-origin backend request; no reuse of manual preview A |
| ACTIVE | Current accepted route, actual GPS marker, backend distance/duration and update time |
| REROUTING | Obsolete geometry/metrics cleared; pending/coalesced request uses latest usable GPS |
| ERROR | Localized location/auth/provider error; no fabricated or stale success geometry/metrics |
| ARRIVED | Fresh GPS and accepted short backend route meet all arrival gates; watch/timer/request cleaned up |
| STOPPED | Watch/request/timer/position/follow state cleared; original planner A/B retained for fresh preview |

The endpoint editor is hidden during journey. Users can stop to edit preview A/B.
If an existing destination-selection action elsewhere updates B, the controller
uses current GPS for an immediate reroute and the hook hides the old destination
route synchronously. Mode switches remain available during journey and retain
GPS/B. No raw pedestrian/auto costing is sent by the frontend.

Manual drag, zoom, rotate, pitch, wheel or touch suspends following. Fokuskan
Lokasi explicitly restores it, including a fresh camera intent if already in
follow mode. Camera padding leaves the current position clear of the mobile
basemap selector. Reroutes do not repeatedly fit the full route or fight panning.
The existing route source/two layers are reused; style reload does not request
another route or create duplicate layers.

## GPS And Rerouting Policy

All thresholds are centralized in JOURNEY_POLICY:

| Policy | Value |
| --- | --- |
| Watch | One watchPosition, enableHighAccuracy=true, maximumAge=0, timeout=12000 ms |
| Usable fix | Finite bounded coordinate, finite nonnegative accuracy <=50 m, timestamp age <=20000 ms |
| Out-of-order fix | Ignored; future/invalid/stale fix does not create a route |
| Movement reroute | >=25 m walking / 50 m motorcycle / 75 m car AND >=15000 ms since previous request |
| Mode/destination change | Immediate request from latest usable fix; old request aborted/superseded |
| Manual refresh | At least 1000 ms between attempts |
| GPS-loss recovery | Coalesced under the same 15000 ms bound after the first route |
| Silent GPS loss | 1-second lifecycle timer invalidates route once latest fix is older than 20000 ms |
| Provider retry | Explicit retry or eligible new movement, not an unconditional network loop |

Repeated identical GPS events update position metadata, not routing. Substantial
movement clears stale metrics immediately, even before the interval permits the
next request. There is at most one selected pending transport and no FIFO of old
GPS routes. AbortController plus generation/session identities reject late
responses even if a transport ignores abort. Only the latest request may commit.

Backend metrics are shown as the latest route update, never decremented locally.
No speed-derived ETA, distance subtraction, network reconstruction, synthetic
LineString or marker animation along the route is implemented. Proximity uses
MapLibre's existing LngLat.distanceTo only for movement and arrival decisions.

```text
REMAINING_DISTANCE_SOURCE=BACKEND
REMAINING_DURATION_SOURCE=BACKEND
FAKE_ROUTE_FALLBACK=NONE
```

## Arrival, Failure And Cleanup

Arrival requires all of: ROUTABLE with positive distance/duration and valid
LineString, backend remaining distance <=50 m, current GPS accuracy <=20 m,
GPS-to-B proximity <=25 m, drift from that route's GPS origin <=10 m, and fresh
current/origin fixes <=20 seconds old. No elapsed ETA or proximity-only arrival.
The last accepted backend metrics are retained as returned, not changed to zero.

Permission denial is terminal and never falls back to A. Unavailable/timeout/
inaccurate GPS clears current route/metrics and waits for a valid fix (unless
the browser API is absent or fails to start). A last known marker may remain for
context during GPS loss; it does not advance without another real fix.

Provider timeout, no-route, malformed response and network failure expose safe
errors with no geometry/metrics. Auth loss clears exact location, watch, timer
and pending request; session retrieval and API calls retain existing bounds.
The initial auth-loading transition is not mistaken for losing an active session.

Stop, reset, arrival, sign-out/session failure and component disposal clear the
watch and timer and invalidate pending callbacks. After stop there is no automatic
GPS reroute. Preview is a separate newly requested route, not active navigation.

## Maneuvers And Limits

`TURN_BY_TURN_DATA=AVAILABLE`: the existing provider normalizer exposes trusted
instruction text, per-maneuver distance/time and type. Actual public responses
contained 4-5 maneuvers (arrival: 2). The existing expandable instruction list is
retained. No road-name fields, turn-progress inference or new guidance engine is
invented from geometry.

```text
VOICE_NAVIGATION=NOT_IMPLEMENTED
BACKGROUND_NAVIGATION=BROWSER_PLATFORM_LIMITED
PHYSICAL_MOVEMENT_ACCEPTANCE=PHASE_11_NOT_EXECUTED
```

Browser geolocation needs a secure context and permission; clearWatch unregisters
the watch ([MDN watchPosition](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition)).
The browser/OS may suspend location delivery with backgrounding, screen lock or
process termination. This is not native background navigation.

## Real Browser Evidence

Final journey run: `2026-09-05T08:09:13.359Z` to `2026-09-05T08:10:35.356Z`.
Final preview regression: `2026-09-05T08:06:50.919Z` to `2026-09-05T08:07:29.202Z`.

Headless Microsoft Edge via existing Playwright, normal browser security. Only
device geolocation was simulated for journey positives; all accepted routes use
the real public HTTPS backend and ordinary test USER through the normal login UI.
No successful API response was fabricated or replaced. Race/cancellation tests
hold actual fetched provider responses and release them late.

P1: `-6.2151,106.6842`; P2: `-6.2161,106.6852`; B: `-6.218,106.687`.
Preview A: `-6.21412,106.68299`, intentionally different from current GPS P1.

| Case | Mode | Distance (m) | Duration (s) | Points | Result |
| --- | --- | ---: | ---: | ---: | --- |
| Initial GPS P1 -> B | walking | 787 | 556 | 22 | PASS |
| Movement P2 -> B | walking | 730 | 546 | 22 | PASS |
| Active mode change at P2 | motorcycle | 730 | 156 | 22 | PASS |
| Active mode change at P2 | car | 730 | 156 | 22 | PASS |
| GPS unavailable recovery | car | 730 | 156 | 22 | PASS |
| GPS timeout recovery | car | 730 | 156 | 22 | PASS |
| P2 wins over delayed real P1 | walking | 730 | 546 | 22 | PASS |
| Arrival fixture -6.21795,106.68695 -> B | walking | 4 | 3 | 2 | PASS |

The two-point arrival shape is actual provider output, not a frontend shortcut.
Every row requires HTTP 200, ROUTABLE, valid positive metrics, correct mode/B,
valid [lon,lat] LineString, and MapLibre source point count matching the response.
Display distance/minutes are checked against that response, not test constants.

Additional checks cover twenty identical GPS events without extra requests,
follow/manual override, GPS-denied inactive/no-marker/no-request state, stop with
no subsequent movement request, preview restoration, and SPA-unmount watch
cleanup. A separate live test held a real pending refresh response, stopped the
journey, then released it: STOPPED and preview remained authoritative, the watch
was cleared, and further GPS movement caused no request. Unit tests also prove
stop while transport ignores abort,
logout/session loss, malformed/failed provider handling and stationary freshness.

Desktop 1440x1000 and mobile 390x844: actual route/GPS/B rendering, readable
controls, no horizontal overflow, one route source/two layers, and GPS clear of
basemap controls. Screenshots are inspected; image pixel variation confirms
nonblank map evidence. This is viewport/device-input simulation, not physical
travel or a new physical-mobile test claim.

The full Phase 10 browser regression also passes: independent arbitrary A/B,
three modes, reroute on either endpoint, preview request race, failure/login UX,
mobile selection, reset, panning and basemap reload. Its negative-response fixtures
remain clearly separated controlled tests; no mocked success counts as live proof.

Ignored evidence is under `outputs/phase10b/` (sanitized evidence.json, desktop
and mobile screenshots) and `outputs/phase10/` in this worktree. It does not store
tokens or full route geometry. Intermediate failing runs were corrected and rerun:
initial auth-loading handling, a test-only basemap selector, and mobile camera
padding. Those failures are not counted as acceptance passes.

## Quality Gates

| Command | Result |
| --- | --- |
| npm run typecheck -w frontend | PASS |
| npm run lint -w frontend | PASS, zero warnings |
| npm run test -w frontend | PASS: 33 files / 175 tests |
| npm exec -w frontend -- vitest run --config vitest.config.mts tests/routing tests/global-search/commuter-safety.test.ts | PASS: 5 files / 77 tests |
| Journey controller suite | PASS: 1 file / 38 tests |
| npm run build -w frontend | PASS: Next 16.3.1 production build |
| phase10-browser-acceptance.mjs | PASS |
| phase10b-browser-acceptance.mjs | PASS |

Count reconciliation: 137 retained baseline tests + 38 journey tests = 175.
39 retained focused tests + 38 journey tests = 77. No discovery exclusion changed.

## Runtime, Privacy And Reproduction

Existing servers on 3000/3001 were not stopped. Candidate preview uses 3003 and
the generated standalone server after copying public/static build assets. Supply
the approved client-safe env configuration locally; frontend/.env.local remains
ignored and uncommitted. Canonical API config remains NEXT_PUBLIC_GETRA_API_URL
through getGetraApiBaseUrl; no React component contains the public hostname.

For normal-security browser acceptance the existing CORS environment contract
was extended with localhost:3003 only, retaining 3000/3001. The new override was
copied to ignored routing-data/phase10b-local-cors.override.yml. Only backend was
recreated, with the existing image, --no-build and --no-deps. Valhalla was not
restarted, rebuilt or changed. To retain this development origin on recreation:

```bash
docker compose --env-file .env.local \
  -f docker-compose.yml -f docker-compose.routing.yml -f docker-compose.prod.yml \
  -f routing-data/phase10b-local-cors.override.yml \
  up -d --no-deps --no-build --wait --wait-timeout 120 getra-backend
```

This is not wildcard/production CORS. Deployed frontend origin remains untested.
Backend/Valhalla are healthy; anonymous public routing still returns 401. Funnel
retains the same hostname and only 127.0.0.1:3002 target. Backend source is clean
at the approved SHA. Observed VM memory: 5.2 GiB total, 4.1 GiB available; swap
17 MiB of 4 GiB; root free 34 GiB. No resource regression or graph work observed.

No exact GPS history is persisted, no continuous coordinate logging is added,
and journey updates are not sent to AI or unrelated analytics. No access token,
refresh token, password, private key or server key is committed or emitted by
this phase. The existing test-user fixture is parsed in process, not copied into
the runner; browser/process credentials are never written into evidence.

Shipping-code searches found no direct Valhalla/8002/private-VM routing call and
no P1/P2/arrival fixture constants in product behavior. Phase 10A's inherited
non-routing Jakarta map defaults remain unchanged. This is a scoped change audit,
not an assertion that all unrelated repository history was audited for secrets.

## Acceptance And Handoff

```text
OWNER_WORKTREE_PRESERVED=YES
BACKEND_SOURCE_CHANGED=NO
UNRELATED_FILES_COMMITTED=NONE
DIRECT_VALHALLA_FRONTEND_CALL=NONE
HARDCODED_JOURNEY_COORDINATES=NONE
NO_FABRICATED_ROUTE=PASS
REMAINING_DISTANCE_SOURCE=BACKEND
REMAINING_DURATION_SOURCE=BACKEND
GEOLOCATION_WATCH_CLEANUP=PASS
SECRET_EXPOSURE=NONE
VERCEL_ROUTING_READINESS=PARTIAL
PHASE_11_READINESS=READY
PHASE_10B_STATUS=VERIFIED
```

Public compute remains owner-hosted Tailscale staging, not 24/7 or a remote VPS.
Windows, VMware, Ubuntu, Docker and network must remain online. Physical journey
and real-device acceptance belong to Phase 11. No Phase 11 execution, Vercel
deployment, paid provisioning, database migration or voice work was performed.
