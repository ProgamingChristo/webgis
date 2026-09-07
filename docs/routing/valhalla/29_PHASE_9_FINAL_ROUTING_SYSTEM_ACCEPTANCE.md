# GETRA Phase 9 Final Routing System Acceptance

Date: 2026-09-05 (Asia/Jakarta)
Public authenticated acceptance: `2026-09-05T04:30:48.959Z` to `2026-09-05T04:31:09.611Z`
Final runtime/resource checkpoint: `2026-09-05T04:35:45Z`

## Decision And Scope

```text
PHASE_9_STATUS=VERIFIED
PHASE_10_READINESS=READY
FRONTEND_ROUTING_API_READINESS=READY
ENVIRONMENT_TYPE=SHARED_STAGING
HOSTING_CLASS=OWNER_HOSTED_TAILSCALE_STAGING
PUBLIC_HTTPS=YES
TEAM_CLIENT_REQUIREMENT=BROWSER_ONLY
24_7_AVAILABILITY=NO
COMPUTE_AVAILABILITY=OWNER_MACHINE_DEPENDENT
REMOTE_VPS=NO
PRODUCTION=NO
PERMANENT_REMOTE_HOSTING=DEFERRED_UNTIL_BUDGET_AVAILABLE
SOURCE_CHANGED=NO
DOCUMENTATION_CHAIN=COMPLETE
```

The routing subsystem is accepted for frontend integration in shared staging.
This is not production readiness or permanent hosting acceptance. Phase 10 was
not started. No frontend, backend implementation, dependencies, PBF, graph,
database schema, public URL, or paid infrastructure was changed.

Public API: [GETRA staging API](https://getra-routing-api.tail0ed517.ts.net)

Health: [GETRA public health](https://getra-routing-api.tail0ed517.ts.net/api/health)

## Source Lock And Runtime

- Approved and final SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- SSH alias: `getra-routing-local`
- User / Linux hostname: `getra` / `getra-router`
- Approved checkout: `/home/getra/getra`
- `git status --porcelain`: empty before acceptance and after the build
- `TRACKED_WORKTREE=CLEAN`
- Existing backend image ID:
  `sha256:16b7d3e6343c6819d075e77490fac07368e3a37f691895030379b857ea4dff57`
- Backend source bind mounts: none
- Container filesystem diff entries under inspected backend/code/dependency
  paths: zero
- Runtime image retained from Phases 4-8; no image rebuild or replacement
- `.env.local`: present, ignored, not tracked; contents not emitted
- PBF and graph archive paths: ignored

The approved release is the four-line route-context typing correction on the
earlier source-lock audit. No unrelated latest-branch work was deployed. The
Windows development worktree is separate and contains owner changes; those
changes were not used as deployment source or modified during this acceptance.
Only routing evidence documentation was edited locally.

## Documentation Chain And Reconciliation

| Phase | Evidence | Audit conclusion |
| --- | --- | --- |
| 0 | [Baseline audit](01_PHASE_0_BASELINE_AUDIT.md) | Historical source/runtime inventory exists |
| 1B / 1B.1 | [Deployment blockers](13_PHASE_1B_DEPLOYMENT_UNBLOCKING.md), [source lock](14_PHASE_1B1_ROUTING_DEPLOYMENT_SOURCE_LOCK.md) | Original blocked sessions are explicitly historical; approved release and current gates supersede them |
| 1B.2 | [Runtime bootstrap](21_PHASE_1B2_LOCAL_RUNTIME_BOOTSTRAP.md) | Closure added: osmium subsequently verified; original partial snapshot retained |
| 2 | [OSM/PBF provenance](22_PHASE_2_OSM_PBF_PROVENANCE.md) | Accepted checksum matches fresh Phase 9 measurement |
| 3 | [Graph build](23_PHASE_3_VALHALLA_GRAPH_BUILD.md) | Actual build and artifacts recorded; graph remains unchanged |
| 4 | [Docker integration](24_PHASE_4_DOCKER_NETWORK_INTEGRATION.md) | Application environment and healthy full stack resolved the earlier isolated-Valhalla limitation |
| 5 | [Direct live routes](25_PHASE_5_DIRECT_LIVE_ROUTE_EVIDENCE.md) | All five real provider cases recorded |
| 6 | [Backend integration](26_PHASE_6_GETRA_BACKEND_ROUTING_INTEGRATION.md) | All five normalized cases recorded; motorcycle discrepancy explained in Phase 7 |
| 7 | [Hardening](27_PHASE_7_ROUTING_HARDENING.md) | Controlled timeout, live outage/recovery, malformed-provider and cache evidence retained |
| 8 | [Shared staging acceptance](28_PHASE_8_SHARED_STAGING_ACCEPTANCE.md) | Current owner-approved Tailscale staging contract; no funded VPS claim |
| 8A | [Funnel bootstrap and recovery](28A_PHASE_8A_TAILSCALE_FUNNEL_SHARED_ACCESS.md) | Background ingress, mobile acceptance, and same-URL recovery documented |

The Phase 0 artifact sizes describe an earlier local dataset, not the accepted
Phase 2 input. This report uses the Phase 2 checksum and later graph checksum;
there is no substitution or checksum mismatch in the current acceptance.

The original [Phase 8 VPS path](28_PHASE_8_SHARED_STAGING_HTTPS_SECURITY.md)
remains historically blocked. Owner-approved owner-hosted staging superseded
that deployment requirement, not the requirement to report uptime limitations.

The Phase 7 cache prose was corrected to distinguish schema-accepted optional
constraints from inputs actually forwarded to the provider. No application
behavior was changed by this documentation correction.

## Data And Graph Provenance

Official source recorded by Phase 2:
`https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf`

| Item | Evidence |
| --- | --- |
| Java source size | 896338328 bytes, Phase 2 provenance |
| Java source SHA-256 | `8a58a9c7d2d6d1c2cb3c24f68cc61b4b72e28f46639916d9363073caee1e410a` |
| Source Last-Modified | `Thu, 03 Sep 2026 23:02:11 GMT`, Phase 2 metadata |
| Source data timestamp | `2026-09-03T20:21:51Z` |
| Download interval | `2026-09-04T07:48:15Z` to `2026-09-04T07:52:50Z` |
| Accepted clip bbox | `106.30,-6.90,107.25,-5.85` |
| Jabodetabek PBF | `routing-data/jabodetabek.osm.pbf`, 178486276 bytes |
| Fresh Jabodetabek SHA-256 | `93e07cc2e5574d1f8c4a6208ab5e4b83e83e0aea4811def94225078e99e35c19` |
| PBF checksum comparison | MATCH with Phase 2 |
| osmium | 1.19.0, libosmium 2.23.0 |
| `osmium fileinfo` | PASS, recognized PBF; generator osmium/1.19.0; sorted by type/id |
| `npm run routing:validate` | PASS, fresh Phase 9 execution |
| Tile directory | `routing-data/jabodetabek_tiles/`, 129 `.gph` files, 248965136 bytes |
| Graph archive | `routing-data/jabodetabek_tiles.tar`, 249200640 bytes (approximately 237.66 MiB) |
| Fresh graph SHA-256 | `d63d5d5ce1774ffceffa9c756f7b87909cbed3e5d4e2e8887f9628b975062c6f` |
| Graph archive mtime | `2026-09-04 09:27:34.873641006 +0000`, unchanged |
| Routing-data total | 1455365666 bytes (`du -sb`) |

The PBF header does not contain a bounding box. Coverage provenance is the
recorded exact Phase 2 extraction command plus its matching output checksum;
it is not inferred from an absent header field. Current cross-region live
acceptance additionally proves the required tested connections.

Graph persistence is supported by the Phase 4/7 restart evidence, the current
persistent bind mount `/home/getra/getra/routing-data -> /custom_files`, unchanged
archive checksum/mtime, and fresh successful routes. Phase 9 performed no
graph rebuild, PBF download, clipping, provider shutdown, or service restart.
Active `force_rebuild=False`, `server_threads=2`; no tile download URL is set.

```text
PBF_VALID=YES
PBF_CHECKSUM_MATCH=YES
GRAPH_PRESENT=YES
GRAPH_PERSISTENCE=PASS
FORCE_REBUILD=FALSE
```

## Services, Network, And Ingress

```text
Browser + GETRA session
  -> trusted HTTPS getra-routing-api.tail0ed517.ts.net:443
  -> Tailscale Funnel
  -> 127.0.0.1:3002
  -> getra-backend:3000
  -> private Compose service discovery on getra_default
  -> http://valhalla:8002
  -> accepted persistent OSM graph
```

| Check | Fresh result |
| --- | --- |
| `npm run docker:prod:config` | PASS, validator and quiet Compose validation |
| `npm run docker:prod:status` | PASS |
| Backend container | HEALTHY before and after; final uptime approximately 18 hours |
| Valhalla container | HEALTHY before and after; final uptime approximately 18 hours |
| Host backend health | HTTP 200; database connected, service getra-api, status ok |
| Host Valhalla status | HTTP 200; version 3.8.3; tileset timestamp 1788514054 |
| Common network | `getra_default`, both attached |
| DNS from backend | `valhalla` resolves |
| HTTP from backend | `http://valhalla:8002/status` returns 200 |
| Provider / internal URL | `valhalla` / `http://valhalla:8002`, CORRECT |
| Active timeout | 12000 ms |
| Active cache TTL | 300000 ms |
| Backend raw port | `127.0.0.1:3002 -> 3000/tcp`, loopback-only |
| Valhalla raw port | `127.0.0.1:8002 -> 8002/tcp`, loopback-only |
| Docker TCP listeners | None on 2375 or 2376 |
| Tailscale | 1.102.3, connected, Running, online; no reported health warnings |
| tailscaled | Active, enabled at boot |
| Funnel | READY; persistent background configuration; HTTPS 443 |
| Funnel handlers | Exactly one: `/` -> `http://127.0.0.1:3002` |

Valhalla image:
`ghcr.io/valhalla/valhalla-scripted:3.8.3@sha256:24ef7955899dececb94e26c6dfb89d64fabfae875f980432694b0261eb6c251b`

Funnel has no target for Valhalla, SSH, Docker API, database ports, files, or
directories. Browser clients never need the private provider URL. No wildcard
listener on 3002 or 8002 was present. These are host-binding and Funnel-config
observations, not a claim that an unrelated global infrastructure scan ran.

## Public Authentication And Privacy

Fresh public acceptance originated from Windows through public Funnel DNS
addresses, using the unchanged hostname and validated TLS certificates. It did
not target localhost, Ubuntu MagicDNS, or a private tailnet address. Redirects
were not followed for authenticated requests.

The existing ordinary USER fixture was read from the approved smoke-test
source using the TypeScript parser. No account provisioning or full smoke-test
script was executed. Public login returned the ordinary USER role. Credentials
and access token stayed in process memory and were discarded on process exit.
No credential value or Authorization header was emitted or written to evidence.

| Public check | Result |
| --- | --- |
| `/api/health` before/after requests | PASS, HTTP 200; `success=true`, database connected, getra-api, ok |
| Final independent Windows curl | PASS, HTTP 200, TLS verification result 0 |
| Anonymous provider-health GET | PASS, HTTP 401 `UNAUTHORIZED` |
| Anonymous routing POST | PASS, HTTP 401 `UNAUTHORIZED` |
| Authenticated provider-health before/after | READY, provider valhalla, configured true, reachable true, reason null |
| Provider metadata leakage | NONE in inspected public health/routing/error responses |
| External mobile access | PASS, owner-provided Phase 8A acceptance, not a new Phase 9 device test |

Public responses were checked for internal provider URLs, Docker/private
addresses and network identifiers, server paths, stack traces, and credential
markers. No such exposure was found. Authentication remains enforced through
Funnel; no middleware or protected-route bypass was introduced.

## Final Public Routing Evidence

All rows below are fresh authenticated PUBLIC `POST /api/routing` observations.
Every row returned HTTP 200, `success=true`, `route_status=ROUTABLE`,
`engine=valhalla`, `route_source=valhalla`, `source=OPENSTREETMAP`, null reason,
and empty limitation flags. Acceptance checked positive finite distance/time
and valid geometry, not hardcoded prior distance values.

| Case | GETRA mode | Provider costing | Origin (lat,lon) | Destination (lat,lon) | Distance (m) | Duration (s) | Geometry | Points | Result |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
| Nearby | walking | pedestrian | -6.214120,106.682990 | -6.218000,106.687000 | 953 | 673 | LineString | 25 | PASS |
| Nearby | car | auto | -6.214120,106.682990 | -6.218000,106.687000 | 8706 | 1045 | LineString | 385 | PASS |
| Nearby | motorcycle | motorcycle | -6.214120,106.682990 | -6.218000,106.687000 | 1035 | 150 | LineString | 29 | PASS |
| Nearby repeat | walking | pedestrian | -6.214120,106.682990 | -6.218000,106.687000 | 953 | 673 | LineString | 25 | PASS |
| Cross-region | motorcycle | motorcycle | -6.241400,106.628100 | -6.175400,106.827200 | 34901 | 4949 | LineString | 1614 | PASS |
| Cross-region | car | auto | -6.241400,106.628100 | -6.175400,106.827200 | 29377 | 2486 | LineString | 597 | PASS |

Every geometry has more than one point; all coordinate pairs were checked for
two finite numbers in `[longitude, latitude]` order and inspected Jakarta-area
ranges (longitude 105-108, latitude -8 to -5). No huge geometry is reproduced.
Mode echoes match their individual requests.

Public sequence: walking -> car -> motorcycle -> walking. First and repeated
walking outputs match in mode, metrics, point count, and coordinate-array hash:
`a5e5200f63cf74e1f82623b3a9221aa41de0b9d904a56472fdf633261acdb953`.
No cache hit/miss claim is made because that label is not exposed by the API.

`PUBLIC_REPEATABILITY=PASS`, `MODE_ISOLATION_FINAL=PASS`, `GEOJSON_FINAL=PASS`.

## Mapping And Normalization Audit

Approved source confirms walking -> pedestrian, motorcycle -> motorcycle,
car -> auto. Provider shape uses polyline precision 6 and is decoded to GeoJSON
longitude/latitude pairs. Distance uses `Math.round(length_km * 1000)`;
duration uses `Math.round(time_seconds)`. Fresh outputs agree with the accepted
provider evidence under those unit/rounding rules.

Deterministic costing options remain in the backend:

| Mode | Options |
| --- | --- |
| walking | use_ferry 0.2, walkway_factor 0.9, sidewalk_factor 0.9 |
| motorcycle | use_ferry 0.2, use_highways 0.25, use_tolls 0.1, use_trails 0 |
| car | use_ferry 0.2, use_highways 0.65, use_tolls 0.5 |

The Phase 5 basic motorcycle cross-region request differed from GETRA's
deterministic options. Phase 7 repeated the exact GETRA provider payload and
obtained 34.901 km / 4949.114 seconds, matching 34901 m / 4949 seconds after
normalization. This is `LEGITIMATE_REQUEST_DIFFERENCE`, not numeric rounding
of the earlier basic 37.514 km route. The longer nearby car route is likewise
preserved, not replaced with motorcycle values.

`DISTANCE_NORMALIZATION=PASS`, `DURATION_NORMALIZATION=PASS`.

## Cache And Input Contract

- Active cache TTL: 300000 ms; process-local Map, maximum 250 entries.
- Key: mode, origin latitude/longitude, destination latitude/longitude.
- Coordinates are keyed at five decimal places, so sub-precision requests can
  intentionally share an entry; exact unrounded coordinate identity is not
  claimed.
- Only ROUTABLE results are cached; expired entries are removed before provider
  execution; read/write values use structured cloning.
- Deterministic provider options are derived from keyed mode.
- The schema accepts `constraints.avoid`, but the current handler does not
  forward it. Avoid constraints are not accepted frontend functionality in this
  phase. `destination_merchant_id` is an analytics input, not a routing option.
- Any future route-affecting options need provider and cache-key review before
  use. Current acceptance covers origin, destination, and the three modes.

`CACHE_KEY_FINAL=PASS` for the active routing inputs and documented precision.

Fresh public authenticated invalid mode `bicycle` returned HTTP 400
`VALIDATION_ERROR`; latitude `-91` returned HTTP 400
`SPATIAL_INVALID_COORDINATE`. Existing integration tests verify invalid inputs
are rejected before provider invocation. The endpoint retains authentication,
rate-limit checks, and a 10240-byte bounded request body.

## Timeout And Failure Safety

Fresh source/config audit retained the 12000 ms AbortController deadline,
request-abort forwarding, typed HttpTimeoutError, and timer/listener cleanup in
finally. Phase 7's controlled full-deadline observation was 12005 ms.

Phase 7 evidence applies to the unchanged deployed source/configuration:

| Condition | Accepted behavior | Evidence basis |
| --- | --- | --- |
| Provider timeout | SERVICE_UNAVAILABLE, ROUTING_TIMEOUT, null geometry/distance/duration | Phase 7 controlled deadline and API harness; timeout tests rerun in Phase 9 |
| Provider unavailable | SERVICE_UNAVAILABLE, ROUTING_PROVIDER_UNREACHABLE, null geometry/distance/duration | Phase 7 live outage and recovery |
| Provider health transitions | READY -> UNAVAILABLE -> READY | Phase 7 live outage; fresh Phase 9 final READY |
| No path | UNROUTABLE / NO_ROUTE_FOUND | Provider/API tests; codes 170/442/443/444 mapped by source |
| Outside graph | OUTSIDE_GRAPH / COORDINATES_OUTSIDE_GRAPH | Code 171 provider/API tests |
| Malformed provider response | SERVICE_UNAVAILABLE / ROUTING_PROVIDER_INVALID_RESPONSE | Phase 7 corruption evidence and fresh focused tests |
| Invalid polyline | Rejected; normalized failure, no geometry or invented metrics | Phase 7 controlled decoder/API evidence |
| Recovery | Real walking route returns after restore; graph checksum unchanged | Phase 7 recovery plus current graph checksum and live routes |

Failures carry `NO_FABRICATED_ROUTE`; the active provider/API path contains no
Haversine route fallback, straight-line substitute, fabricated ETA, or synthetic
LineString. No live outage, random no-route probing, or graph mutation was
repeated in Phase 9. Harness evidence is not mislabeled as a fresh live outage.

```text
TIMEOUT_FINAL=PASS
PROVIDER_FAILURE_CONTRACT=PASS
MALFORMED_PROVIDER_SAFETY=PASS
FAKE_ROUTE_FALLBACK=NONE
NO_FABRICATED_ROUTE=PASS
```

## Logs And Security Findings

A bounded backend log scan for the public acceptance window inspected 18 lines
without printing the raw log. No Bearer value, access/refresh/service-role token
value, password value, internal provider URL, or server path was found. Public
error payloads were likewise checked in memory and only safe summaries emitted.

```text
LOG_SANITIZATION=PASS
ERROR_SANITIZATION=PASS
INFRA_LEAKAGE=NONE
VALHALLA_PUBLIC_EXPOSURE=NONE
DOCKER_API_PUBLIC_EXPOSURE=NONE
SECRET_EXPOSURE=NONE
```

These are bounded runtime/response and handling checks, not a claim of an
exhaustive historical repository or credential audit. No secret was added to
documentation or output by this phase.

## Fresh Source Quality Gates

Executed on the exact clean Ubuntu checkout, without dependency updates:

```bash
npm run test -w backend -- \
  tests/unit/routing/valhalla-routing.provider.test.ts \
  tests/unit/routing/routing-provider-health.test.ts \
  tests/integration/commuter-spatial-routes.test.ts \
  tests/unit/docker-config.test.ts \
  tests/unit/security/timeout-fetch.test.ts \
  tests/integration/security/auth-route-hardening.test.ts
npm run typecheck -w backend
npm run lint -w backend
npm run build -w backend
```

| Gate | Result | Fresh evidence |
| --- | --- | --- |
| Focused routing/security tests | PASS | 6 files, 35 tests, Vitest 4.1.11, 2.50 seconds |
| Backend typecheck | PASS | tsc --noEmit |
| Backend lint | PASS | eslint, zero-warning gate |
| Backend production build | PASS | Next.js 16.3.1; compiled, typechecked, generated 79 pages |

The build generated ignored checkout output only; it did not replace the running
backend image or edit application source. Full-suite, load, and frontend-browser
integration testing were not claimed.

## Final Resource And Service Health

| Resource | Final observation |
| --- | --- |
| CPU | 4 logical CPUs |
| RAM total / used / available | 5.2 GiB / 1.1 GiB / 4.1 GiB |
| Swap total / used | 4.0 GiB / 380 KiB |
| Root filesystem total / used / free | 54 GiB / 18 GiB / 34 GiB, 34% used |
| Backend memory / CPU | 78.34 MiB / 0.02% |
| Valhalla memory / CPU | 121.5 MiB / 0.29% |
| Backend / Valhalla | Both healthy, no restart during acceptance |
| Provider health | READY after authenticated public routing tests |
| Tailscale / Funnel | Connected / READY |
| Final host and public health | PASS |

`RESOURCE_STATE=HEALTHY` for the observed runtime workload. No severe memory,
swap, or disk pressure was observed. This does not change the limited-memory
graph-build caution or establish concurrent-user capacity, a sustained-load
budget, or a 24/7 service guarantee.

## Frontend Handoff Boundary

The accepted API is authenticated `POST /api/routing` at the public base URL,
with explicit `{latitude, longitude}` origin/destination and mode `walking`,
`motorcycle`, or `car`. The response envelope contains `success`, `data`, and a
request ID. Consumers must inspect `data.route_status`, not HTTP 200 alone.
ROUTABLE data contains `distance_meters`, `duration_seconds`, mode, and GeoJSON
LineString. Failure data may have null metrics/geometry and explicit reason
codes with `NO_FABRICATED_ROUTE`.

The frontend must not call Valhalla or synthesize a route on failure. Optional
avoid constraints are not part of this accepted functional scope. Frontend
origin/CORS and browser auth-transport integration must be verified against the
actual approved frontend origin during Phase 10; this phase does not claim a
completed cross-origin frontend integration or add any frontend configuration.

Clients require only browser, internet, and GETRA authentication/session, not
Docker, Linux, VMware, Tailscale client, Valhalla, OSM files, or Node.js. The
automated runner used Node.js as a test tool, not a client deployment dependency.
The owner-provided mobile-data acceptance establishes external reachability;
no new mobile-device test was invented.

## Hosting Limitation

The unchanged URL identifies the persistent Tailscale node and tailnet. It is
stable while that identity and hostname are preserved, not always reachable.
Laptop sleep/shutdown, VM/network loss, or service failure can interrupt access.
Phase 8A records an interruption and recovery on this same URL; it was not
resolved by changing hostnames.

The current accepted temporary hosting is not a remote VPS, Google Cloud
deployment, production service, or permanent competition infrastructure. Funded
permanent hosting is deferred. No reboot or new availability test was performed.

## Final Acceptance Matrix

| Category | Result | Basis |
| --- | --- | --- |
| DATA | PASS | Official OSM provenance retained |
| PBF | PASS | Valid, exact Phase 2 checksum, validator passes |
| GRAPH | PASS | Non-empty, persistent, unchanged checksum, used by live routes |
| VALHALLA | PASS | Healthy; host and internal status 200 |
| DOCKER NETWORK | PASS | Shared network, service DNS and HTTP verified |
| BACKEND | PASS | Healthy; exact release/image retained |
| AUTH | PASS | Anonymous 401; ordinary-user public acceptance |
| WALKING | PASS | 953 m, 673 s, 25 points |
| MOTORCYCLE | PASS | 1035 m, 150 s, 29 points |
| CAR | PASS | 8706 m, 1045 s, 385 points |
| CROSS-REGION | PASS | Motorcycle and car both ROUTABLE |
| GEOJSON | PASS | Valid LineStrings, finite longitude/latitude pairs |
| CACHE | PASS | Active-input key, 300000 ms TTL, public mode isolation |
| TIMEOUT | PASS | 12000 ms, unchanged bounded implementation and tested contract |
| FAILURE SAFETY | PASS | Phase 7 evidence plus source/config equivalence and fresh tests |
| NO FABRICATION | PASS | No synthetic routing path or failure metrics |
| PUBLIC HTTPS | PASS | Same trusted public hostname; health and authenticated routes |
| SECURITY | PASS | Loopback ports, backend-only Funnel, auth and sanitized responses |
| TEAM ACCESS | PASS | Browser-only client requirements; owner mobile acceptance |
| RESOURCE HEALTH | PASS | Healthy observed runtime, 34 GiB free, 4.1 GiB RAM available |
| 24/7 remote hosting | DEFERRED | Owner-machine dependent; permanent funded hosting unavailable |

All required routing-system categories pass under the approved staging contract.
No routing acceptance blocker remains. The documented optional-constraint and
frontend-origin boundaries are not claims of completed features or frontend
integration. Hosting remains explicitly limited as above.

## Stop Condition

Phase 9 ends here: `PHASE_9_STATUS=VERIFIED`, `PHASE_10_READINESS=READY`.
No Phase 10 work, frontend edits, new route features, public cloud provisioning,
dependency changes, database migrations, PBF/graph rebuild, or production
readiness claim was made.
