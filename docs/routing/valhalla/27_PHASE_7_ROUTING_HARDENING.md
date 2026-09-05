# GETRA Phase 7 Routing Failure, Timeout, And Cache Hardening

Date: 2026-09-04
Environment type: `LOCAL_ROUTING_INTEGRATION`
Runtime: Windows 11 -> VMware Workstation -> Ubuntu Server -> Docker Compose

## Status

`PHASE_7_STATUS=VERIFIED`

GETRA preserved provider-derived results across modes, bounded slow provider
requests, failed safely while Valhalla was unavailable, recovered after service
restoration, and never fabricated geometry, distance, duration, or a routable
state. No application source change was required.

## Source And Runtime Identity

- Base approved SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Final routing SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime source worktree before and after tests: CLEAN
- Source changed: NO
- Backend and Valhalla before tests: healthy
- Backend `/api/health` and Valhalla `/status`: HTTP 200
- PBF SHA-256 unchanged:
  `93e07cc2e5574d1f8c4a6208ab5e4b83e83e0aea4811def94225078e99e35c19`
- Graph archive SHA-256 unchanged:
  `d63d5d5ce1774ffceffa9c756f7b87909cbed3e5d4e2e8887f9628b975062c6f`

## Phase 6 Discrepancy Audit

Cross-region motorcycle coordinates:

- Origin: `-6.241400,106.628100`
- Destination: `-6.175400,106.827200`

| Request | Distance | Duration | Shape / points |
| --- | ---: | ---: | ---: |
| Direct Valhalla basic motorcycle | 37.514 km | 4642.405 s | 5,075 encoded characters |
| GETRA motorcycle | 34,901 m | 4,949 s | 1,614 GeoJSON points |
| Direct Valhalla with GETRA options | 34.901 km | 4949.114 s | 5,966 encoded characters |

The comparison was repeated after restarting only `getra-backend`, which cleared
the process-local cache. Results remained the same. GETRA adds deterministic
motorcycle costing options:

- `use_ferry=0.2`
- `use_highways=0.25`
- `use_tolls=0.1`
- `use_trails=0`

It also sends break-type locations, Indonesian instructions, and kilometer
units. The exact provider payload with these options matches the GETRA result
after kilometer-to-meter conversion and integer rounding.

`DISCREPANCY_CLASS=LEGITIMATE_REQUEST_DIFFERENCE`

The discrepancy is not stale cache, provider variation, mode confusion, or a
backend normalization defect.

## Cache Audit

- Runtime TTL: `300000` ms
- Maximum entries: 250
- Cache implementation: process-local `Map`
- Cache writes: only `ROUTABLE` results
- Cache read/write cloning: `structuredClone`
- Expired entries are removed before provider execution
- Cache key fields, in order: mode, origin latitude, origin longitude,
  destination latitude, destination longitude
- Coordinate key precision: five decimal places

Clarification from the Phase 9 source audit (2026-09-05): the request schema
accepts optional `constraints.avoid`, but the active handler forwards only
origin, destination, and mode to the provider. Avoid constraints therefore are
not implemented routing controls and must not be presented as supported to
frontend clients. `destination_merchant_id` affects analytics, not the route.
Provider costing options are deterministic from mode, which is part of the key.
The current key covers the inputs actually forwarded to routing, at its
documented five-decimal coordinate precision. Any future request-affecting
options need corresponding provider and cache-key review.

Live sequence at the same nearby coordinates:

| Sequence | Mode | Distance (m) | Duration (s) | Points | Result |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | walking | 953 | 673 | 25 | PASS |
| 2 | car | 8,706 | 1,045 | 385 | PASS |
| 3 | motorcycle | 1,035 | 150 | 29 | PASS |
| 4 | walking | 953 | 673 | 25 | PASS |
| 5 | car | 8,706 | 1,045 | 385 | PASS |

- Live mode isolation: PASS
- Walking repeatability: PASS
- Car repeatability: PASS
- Cross-mode contamination: NONE
- Explicit cache hit/miss label: not exposed by safe runtime observability

## Timeout Hardening

- Runtime timeout configuration: `12000` ms
- Implementation: `AbortController` with deadline timer
- Upstream request abort is forwarded
- Deadline abort becomes typed `HttpTimeoutError`
- Timer and abort listener are cleaned in `finally`

A controlled provider that never resolved was invoked with the real 12,000 ms
configuration:

- Observed elapsed time: 12,005 ms
- Error: `HttpTimeoutError`
- Bounded: YES

The integration handler test normalized the typed timeout to:

- HTTP 200 GETRA envelope
- `route_status=SERVICE_UNAVAILABLE`
- `reason_code=ROUTING_TIMEOUT`
- `geometry=null`
- no fabricated distance or duration
- `NO_FABRICATED_ROUTE` present

`TIMEOUT_TEST=PASS`

## Provider Unavailable Test

A fresh nearby coordinate pair was first confirmed routable directly by
Valhalla: 0.998 km, 704.891 seconds, encoded shape present. Only the Compose
`valhalla` service was then stopped. No volume, PBF, graph, Docker daemon, or
backend service was stopped.

Provider-health transition:

| Stage | Status | Configured | Reachable | Reason |
| --- | --- | --- | --- | --- |
| Before | `READY` | true | true | null |
| During | `UNAVAILABLE` | true | false | `ROUTING_PROVIDER_UNREACHABLE` |
| After restore | `READY` | true | true | null |

Fresh GETRA request during outage:

- HTTP: 200
- Route status: `SERVICE_UNAVAILABLE`
- Reason: `ROUTING_PROVIDER_UNREACHABLE`
- Geometry: null
- Distance: null
- Duration: null
- `NO_FABRICATED_ROUTE`: present
- Internal infrastructure in response: NONE

Valhalla was restored using the existing Compose container without enabling a
rebuild. The graph archive checksum and mtime remained unchanged.

Post-recovery GETRA walking result:

- Status: `ROUTABLE`
- Distance: 998 m
- Duration: 705 s
- Geometry: `LineString`
- Point count: 28

## Provider Error And Corruption Handling

Focused routing harness result: 3 files, 19 tests PASS.

Verified cases include:

- Valhalla 442 -> `UNROUTABLE`, `NO_ROUTE_FOUND`, null geometry
- Valhalla 171 -> `OUTSIDE_GRAPH`, `COORDINATES_OUTSIDE_GRAPH`, null geometry
- Codes 170, 442, 443, and 444 share the no-route classification in source
- malformed/non-JSON provider response -> `SERVICE_UNAVAILABLE`,
  `ROUTING_PROVIDER_INVALID_RESPONSE`, null geometry
- unsupported or unsafe provider configuration rejected
- unreachable provider health returns a stable unavailable result
- invalid mode and coordinates are rejected before provider invocation

Malformed polyline verification:

- Decoder rejected malformed input with `VALHALLA_INVALID_SHAPE`: PASS
- API-level controlled provider decode failure returned
  `SERVICE_UNAVAILABLE` and `ROUTING_PROVIDER_INVALID_RESPONSE`
- Geometry, distance, and duration were all null
- `NO_FABRICATED_ROUTE` was present
- Server did not crash

No stable live non-routable coordinate was invented. Non-routable handling was
verified through the existing deterministic provider and API test harness.

## Validation Regression

- Invalid mode `bicycle`: HTTP 400, `VALIDATION_ERROR`
- Invalid latitude `-91`: HTTP 400, `SPATIAL_INVALID_COORDINATE`
- Provider invocation for invalid input: prevented by parser order and verified
  by integration test
- Routing endpoint authentication and rate-limit checks remain intact

## Logging And Response Safety

The latest 300 backend log lines were scanned without copying them into this
document.

- Routing/API request events present: YES
- Authorization/Bearer token pattern: NONE
- Refresh token pattern: NONE
- Password/service-role pattern: NONE
- Internal Valhalla URL or Docker IP: NONE
- Server filesystem path or stack trace: NONE
- Outage response internal infrastructure exposure: NONE

Source search in the routing provider and API found no Haversine, straight-line,
synthetic LineString, or fallback LineString implementation.

## Final State

- Backend container: healthy
- Backend health endpoint: HTTP 200
- Valhalla container: healthy
- Valhalla status endpoint: HTTP 200
- Final provider health: `READY`
- RAM: 5.2 GiB total, approximately 4.2 GiB available
- Swap: 4.0 GiB total, approximately 28 KiB used
- Root filesystem: 54 GiB total, approximately 34 GiB free
- Runtime secret exposure: NONE
- Graph rebuild during tests: NO
- Graph persistence: PASS

## Quality Gates

- Focused routing tests: PASS, 3 files / 19 tests
- Typecheck: NOT REQUIRED, no source change
- Lint: NOT REQUIRED, no source change
- Production build: NOT REQUIRED, no source change

`PHASE_8_READINESS=READY`
