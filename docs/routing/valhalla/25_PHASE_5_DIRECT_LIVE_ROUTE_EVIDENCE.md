# GETRA Phase 5 Direct Live Route Evidence

Date: 2026-09-04
Environment type: `LOCAL_ROUTING_INTEGRATION`
Runtime: Windows 11 -> VMware Workstation -> Ubuntu Server 26.04.1 LTS

## Status

`PHASE_5_STATUS=VERIFIED`

All five mandatory direct Valhalla route cases returned real provider routes
with HTTP 200, positive distance, positive duration, at least one leg, and a
non-empty encoded shape. The nearby pedestrian request was repeated and passed
both times. No GETRA `/api/routing` endpoint was called in this phase.

## Source And Graph Identity

- Approved GETRA SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime checkout SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime source worktree before and after tests: CLEAN
- Jabodetabek PBF SHA-256:
  `93e07cc2e5574d1f8c4a6208ab5e4b83e83e0aea4811def94225078e99e35c19`
- Graph archive SHA-256:
  `d63d5d5ce1774ffceffa9c756f7b87909cbed3e5d4e2e8887f9628b975062c6f`
- Graph archive mtime remained `2026-09-04 09:27:34.873641006 +0000`
- Graph rebuilt during Phase 5: NO

## Service Baseline

- Valhalla container before tests: healthy
- Host `http://127.0.0.1:8002/status` before tests: HTTP 200, valid JSON
- Backend container: healthy, but not used for route requests
- Valhalla host binding: `127.0.0.1:8002`

## Direct Route Evidence

| Case | Costing | Origin `lat,lon` | Destination `lat,lon` | Distance (km) | Duration (s) | Legs | Encoded shape | HTTP | Status |
| --- | --- | --- | --- | ---: | ---: | ---: | --- | ---: | --- |
| Nearby pedestrian, run 1 | `pedestrian` | `-6.214120,106.682990` | `-6.218000,106.687000` | 0.953 | 673.124 | 1 | PRESENT | 200 | PASS |
| Nearby pedestrian, run 2 | `pedestrian` | `-6.214120,106.682990` | `-6.218000,106.687000` | 0.953 | 673.124 | 1 | PRESENT | 200 | PASS |
| Nearby motorcycle | `motorcycle` | `-6.214120,106.682990` | `-6.218000,106.687000` | 1.035 | 149.947 | 1 | PRESENT | 200 | PASS |
| Nearby auto | `auto` | `-6.214120,106.682990` | `-6.218000,106.687000` | 8.706 | 1044.961 | 1 | PRESENT | 200 | PASS |
| Cross-region motorcycle | `motorcycle` | `-6.241400,106.628100` | `-6.175400,106.827200` | 37.514 | 4642.405 | 1 | PRESENT | 200 | PASS |
| Cross-region auto | `auto` | `-6.241400,106.628100` | `-6.175400,106.827200` | 29.377 | 2485.777 | 1 | PRESENT | 200 | PASS |

Each case was sent independently to the real Valhalla `/route` endpoint using
explicit `lat` and `lon` fields, the listed costing, and kilometer units. The
test rejected HTTP failures, provider errors, zero or missing summaries, empty
legs, and absent shapes. Full encoded shapes were intentionally not recorded.

## Pedestrian Repeatability

- Request payload identity: same coordinates, costing, and units
- Run 1 valid: YES
- Run 2 valid: YES
- Both returned positive summary values and non-empty encoded shapes
- `PEDESTRIAN_REPEATABILITY=PASS`

## Errors And Fallbacks

- Valhalla error responses: NONE
- Error codes 170, 171, or 442: NONE
- Timeout: NONE
- Synthetic geometry: NONE
- Haversine or straight-line fallback: NONE
- Reuse of one costing response for another mode: NONE

The first local verification harness invocation stopped before sending any
request because the non-interactive SSH shell did not include the user-level
Node path. The PATH was corrected and the complete test set was then executed.
This was a harness environment issue, not a Valhalla route failure.

## Post-Test Health And Resources

- Valhalla container after tests: healthy
- Host `/status` after tests: HTTP 200, valid JSON
- Backend container after tests: healthy
- RAM: 5.2 GiB total, approximately 4.2 GiB available
- Swap: 4.0 GiB total, approximately 28 KiB used
- Root filesystem: 54 GiB total, approximately 34 GiB free
- Valhalla memory at final sample: approximately 101 MiB
- PBF checksum unchanged: YES
- Graph archive checksum unchanged: YES
- Graph archive mtime unchanged: YES
- Secret exposure: NONE

## Acceptance Checklist

| Requirement | Result |
| --- | --- |
| Valhalla healthy before tests | PASS |
| Nearby pedestrian route | PASS |
| Nearby pedestrian repeatability | PASS |
| Nearby motorcycle route | PASS |
| Nearby auto route | PASS |
| Cross-region motorcycle route | PASS |
| Cross-region auto route | PASS |
| Positive distance and duration for every route | PASS |
| Non-empty encoded shape for every route | PASS |
| No fabricated fallback | PASS |
| No graph rebuild | PASS |
| Valhalla healthy after tests | PASS |
| No secret exposure | PASS |

## Boundary

Phase 5 verifies direct routing-engine behavior only. Authenticated GETRA
provider health and normalized `/api/routing` response verification remain for
Phase 6.

`PHASE_6_READINESS=READY`
