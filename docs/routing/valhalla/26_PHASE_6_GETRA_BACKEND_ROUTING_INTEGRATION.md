# GETRA Phase 6 Backend Routing Integration

Date: 2026-09-04
Environment type: `LOCAL_ROUTING_INTEGRATION`
Runtime: Windows 11 -> VMware Workstation -> Ubuntu Server -> Docker Compose

## Status

`PHASE_6_STATUS=VERIFIED`

The authenticated GETRA backend consumed real Valhalla responses and returned
the normalized routing contract for walking, motorcycle, and car modes. Nearby
and mandatory cross-region cases passed with positive distance and duration,
valid GeoJSON LineStrings, and correct client-facing mode names.

## Source And Service Baseline

- Approved SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime checkout SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime source worktree before and after tests: CLEAN
- Backend before tests: healthy, HTTP 200 from `/api/health`
- Valhalla before tests: healthy, HTTP 200 from `/status`
- `ROUTING_PROVIDER=valhalla`
- `ROUTING_BASE_URL=http://valhalla:8002`
- `ROUTING_TIMEOUT_MS=12000`
- `ROUTING_CACHE_TTL_MS=300000`
- PBF SHA-256 remained
  `93e07cc2e5574d1f8c4a6208ab5e4b83e83e0aea4811def94225078e99e35c19`
- Graph archive SHA-256 remained
  `d63d5d5ce1774ffceffa9c756f7b87909cbed3e5d4e2e8887f9628b975062c6f`

## Authentication And Provider Health

An existing repository test-user mechanism was used. The credential was kept
inside one temporary process and was not printed or written to this document.
The access token existed only in process memory and was discarded when the
process exited.

| Check | Evidence | Result |
| --- | --- | --- |
| Test-user login | HTTP 200 and temporary access token returned | PASS |
| Anonymous `POST /api/routing` | HTTP 401, `UNAUTHORIZED` | PASS |
| Authenticated provider health | HTTP 200 | PASS |
| Provider | `valhalla` | PASS |
| Provider status | `READY` | PASS |
| Configured | `true` | PASS |
| Reachable | `true` | PASS |
| Reason code | `null` | PASS |
| Provider URL or Docker IP exposed | NO | PASS |

Provider-health used the standard GETRA envelope with top-level `success`,
`data`, and `request_id` properties. No provider URL or network detail appeared
in the response.

## Normalized Route Evidence

| GETRA mode | Provider costing | Origin `lat,lon` | Destination `lat,lon` | Route status | Distance (m) | Duration (s) | Geometry | Points | Result |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
| `walking` | `pedestrian` | `-6.214120,106.682990` | `-6.218000,106.687000` | `ROUTABLE` | 953 | 673 | `LineString` | 25 | PASS |
| `motorcycle` | `motorcycle` | `-6.214120,106.682990` | `-6.218000,106.687000` | `ROUTABLE` | 1,035 | 150 | `LineString` | 29 | PASS |
| `car` | `auto` | `-6.214120,106.682990` | `-6.218000,106.687000` | `ROUTABLE` | 8,706 | 1,045 | `LineString` | 385 | PASS |
| `walking` repeat | `pedestrian` | `-6.214120,106.682990` | `-6.218000,106.687000` | `ROUTABLE` | 953 | 673 | `LineString` | 25 | PASS |
| `motorcycle` | `motorcycle` | `-6.241400,106.628100` | `-6.175400,106.827200` | `ROUTABLE` | 34,901 | 4,949 | `LineString` | 1,614 | PASS |
| `car` | `auto` | `-6.241400,106.628100` | `-6.175400,106.827200` | `ROUTABLE` | 29,377 | 2,486 | `LineString` | 597 | PASS |

Every successful route used the GETRA success envelope and returned
`limitation_flags: []` with `route_source: valhalla`. Full coordinate arrays
were intentionally not recorded.

## Normalization Verification

- Distance conversion from provider kilometers to `distance_meters`: PASS
- Provider time to `duration_seconds`: PASS
- Provider shape decoding to GeoJSON `LineString`: PASS
- Coordinate values finite for every point: PASS
- GeoJSON coordinate order `[longitude, latitude]`: PASS
- Several leading points per result were checked against Jakarta ranges:
  longitude 105-108 and latitude -8 to -5
- Client mode echo (`walking`, `motorcycle`, `car`): PASS
- Walking to pedestrian mapping: PASS
- Motorcycle to motorcycle mapping: PASS
- Car to auto mapping: PASS

Nearby results match Phase 5 provider evidence after the backend's documented
integer rounding. The longer nearby car route was preserved and was not altered
to resemble motorcycle output.

## Cross-Region Motorcycle Explanation

Phase 5's basic direct motorcycle payload returned 37.514 km and 4642.405
seconds. GETRA intentionally applies motorcycle costing options for ferry,
highway, toll, and trail use. A direct diagnostic request using the exact GETRA
provider options returned 34.901 km and 4949.114 seconds with a non-empty shape.
The backend returned 34,901 meters and 4,949 seconds, exactly matching that
provider result after normalization and rounding.

This difference is therefore provider costing behavior, not a mapping, cache,
or unit-conversion defect.

## Validation And Cache Checks

| Check | HTTP / evidence | Result |
| --- | --- | --- |
| Invalid mode `bicycle` | HTTP 400, `VALIDATION_ERROR` | PASS |
| Invalid latitude `-91` | HTTP 400, `SPATIAL_INVALID_COORDINATE` | PASS |
| Walking repeatability | Both 953 m, 673 s, 25 points | PASS |
| Sequence walking -> car -> walking | Final result remained walking | PASS |
| Preliminary cross-mode cache isolation | Walking was not replaced by car | PASS |

The request parser runs before the provider call for invalid mode and coordinate
inputs. Existing focused integration coverage also asserts that the provider is
not called for these validation failures.

## No-Fabrication Evidence

- Every accepted route came through the configured Valhalla provider.
- All accepted results had positive provider-derived distance and duration.
- Every result had a decoded multi-point LineString.
- Successful routes had no `NO_FABRICATED_ROUTE` limitation flag.
- The API implementation emits `NO_FABRICATED_ROUTE` for non-routable or
  provider-failure states rather than generating fallback geometry.
- No source or provider behavior was modified during Phase 6.

## Post-Test State

- Backend container: healthy
- Backend `/api/health`: HTTP 200
- Valhalla container: healthy
- Valhalla `/status`: HTTP 200
- RAM: 5.2 GiB total, approximately 4.2 GiB available
- Swap: 4.0 GiB total, approximately 28 KiB used
- Root filesystem: 54 GiB total, approximately 34 GiB free
- Runtime source worktree: CLEAN
- PBF and graph checksums unchanged: YES
- Runtime secret exposure: NONE

## Acceptance Checklist

| Requirement | Result |
| --- | --- |
| Backend and Valhalla healthy | PASS |
| Authenticated provider-health READY | PASS |
| Provider URL private | PASS |
| Anonymous routing rejected | PASS |
| Nearby walking, motorcycle, and car | PASS |
| Correct provider mode mapping | PASS |
| Distance and duration units | PASS |
| GeoJSON type and coordinate order | PASS |
| Cross-region motorcycle and car | PASS |
| Invalid mode and coordinates rejected | PASS |
| Walking repeatability | PASS |
| Preliminary cache mode isolation | PASS |
| No fabricated route | PASS |
| No runtime secret exposure | PASS |
| Post-test health | PASS |

## Boundary

Phase 6 verifies the local authenticated backend routing boundary. No frontend,
Vercel, cloud VPS, public HTTPS, destructive provider-failure simulation, cache
implementation, or database migration was changed or tested.

`PHASE_7_READINESS=READY`
