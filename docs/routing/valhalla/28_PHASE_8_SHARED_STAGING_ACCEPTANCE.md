# GETRA Phase 8 Shared Staging Acceptance

Date: 2026-09-05 (Asia/Jakarta)
Public acceptance UTC: `2026-09-05T03:31:42Z` to `2026-09-05T03:31:56Z`
Post-acceptance runtime audit UTC: `2026-09-05T03:33:21Z`

## Status And Approved Contract

```text
PHASE_8_STATUS=VERIFIED
PHASE_9_READINESS=READY
ENVIRONMENT_TYPE=SHARED_STAGING
HOSTING_CLASS=OWNER_HOSTED_TAILSCALE_STAGING
COMPUTE_AVAILABILITY=OWNER_MACHINE_DEPENDENT
PUBLIC_HTTPS=YES
24_7_AVAILABILITY=NO
REMOTE_VPS=NO
PERMANENT_REMOTE_HOSTING=DEFERRED_UNTIL_BUDGET_AVAILABLE
```

The owner formally approved this temporary shared staging contract. The original
remote-VPS deployment path was blocked because no funded, authorized shared
server was available. Its historical evidence remains in
[the VPS-path report](28_PHASE_8_SHARED_STAGING_HTTPS_SECURITY.md).

This document is the current Phase 8 acceptance record. The approved owner-hosted
architecture satisfies this staging contract without a remote VPS. It does not
establish production readiness, permanent competition infrastructure, or 24/7
hosting.

## Architecture And Public Identity

```text
External browser + GETRA session
  -> HTTPS getra-routing-api.tail0ed517.ts.net:443
  -> Tailscale Funnel
  -> 127.0.0.1:3002
  -> getra-backend:3000
  -> private Docker Compose network getra_default
  -> valhalla:8002
  -> existing accepted OSM graph
```

- Public API: `https://getra-routing-api.tail0ed517.ts.net`
- Public health: `https://getra-routing-api.tail0ed517.ts.net/api/health`
- Device hostname: `getra-routing-api`
- FQDN: `getra-routing-api.tail0ed517.ts.net`
- `URL_STABILITY=STABLE`, conditional on preserving node identity, tailnet, and
  hostname
- Funnel target: `http://127.0.0.1:3002`
- Tailscale: `1.102.3`, connected, backend state `Running`, online, no reported
  health warnings
- `tailscaled`: active and enabled at boot
- Funnel: background configuration persisted from Phase 8A
- Backend-only Funnel configuration: PASS

The physical compute remains the owner's Windows host, VMware Ubuntu VM, and
Docker runtime. No new server, paid resource, DNS name, or public URL was created.

## Source And Runtime Equivalence

- SSH alias: `getra-routing-local`
- Verified user/hostname: `getra` / `getra-router`
- Project directory: `/home/getra/getra`
- Approved and observed SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime `git status --porcelain`: empty before and after acceptance
- `SOURCE_CHANGED=NO`
- Existing backend image ID:
  `sha256:16b7d3e6343c6819d075e77490fac07368e3a37f691895030379b857ea4dff57`
- Backend source bind mounts: NONE
- Backend container source/compiled-code filesystem changes detected: NONE
- Backend and Valhalla: healthy before and after acceptance
- `npm run docker:prod:status`: PASS
- Host backend health: HTTP 200, database connected
- Host Valhalla `/status`: HTTP 200, version `3.8.3`
- Both containers attached to `getra_default`

No application build, source deployment, dependency change, graph build,
container restart, or database migration was performed in this acceptance run.
The locked source and existing running containers from the verified local track
were retained.

## Public Authentication And Health

All acceptance requests below originated from the Windows execution environment
and used the public HTTPS hostname, whose DNS returned public Funnel relay
addresses. They did not use Ubuntu MagicDNS, a tailnet IP, or localhost as the
request destination. TLS certificate verification was explicitly enabled and no
credentials were sent to redirected destinations.

Authentication used the existing ordinary `USER` fixture defined in the approved
`backend/scripts/api-smoke-test.ts`. Its data was read with the TypeScript parser;
the provisioning and smoke-test scripts were not executed. The existing account
logged in through public `POST /api/auth/login`; returned profile role was `USER`.
Credentials and the temporary access token remained in process memory. The
process exited after acceptance; tokens were not written to files or reports.

| Check | Result | Evidence |
| --- | --- | --- |
| Public health before and after | PASS | HTTP 200, `success=true`, `database=connected`, `service=getra-api`, `status=ok` |
| External mobile access | PASS, owner-provided | Owner confirmed successful cellular access on 2026-09-05 in Phase 8A |
| Anonymous provider-health GET | PASS | HTTP 401, `UNAUTHORIZED` |
| Anonymous routing POST | PASS | HTTP 401, `UNAUTHORIZED` |
| Existing test-user login | PASS | HTTP 200, profile role `USER` |
| Authenticated provider-health before and after | READY | HTTP 200, `provider=valhalla`, `status=READY`, `configured=true`, `reachable=true`, `reason_code=null` |
| Provider/internal details in public responses | NONE | No internal URL, private container address, Docker network name, host filesystem path, or credential marker found |

No second mobile-device test was fabricated. The cellular result is explicitly
owner-provided evidence, separate from automated public HTTPS requests.

## Public Routing Evidence

Every route below was requested through public `POST /api/routing` using the
authenticated ordinary user. Each returned HTTP 200, `success=true`,
`route_status=ROUTABLE`, `engine=valhalla`, `route_source=valhalla`,
`source=OPENSTREETMAP`, and empty limitation flags.

| Case | GETRA mode | Provider costing | Origin (lat,lon) | Destination (lat,lon) | Distance (m) | Duration (s) | Geometry | Points | Result |
| --- | --- | --- | --- | --- | ---: | ---: | --- | ---: | --- |
| Nearby | walking | pedestrian | -6.214120,106.682990 | -6.218000,106.687000 | 953 | 673 | LineString | 25 | PASS |
| Nearby | motorcycle | motorcycle | -6.214120,106.682990 | -6.218000,106.687000 | 1035 | 150 | LineString | 29 | PASS |
| Nearby | car | auto | -6.214120,106.682990 | -6.218000,106.687000 | 8706 | 1045 | LineString | 385 | PASS |
| Nearby repeat | walking | pedestrian | -6.214120,106.682990 | -6.218000,106.687000 | 953 | 673 | LineString | 25 | PASS |
| Cross-region | motorcycle | motorcycle | -6.241400,106.628100 | -6.175400,106.827200 | 34901 | 4949 | LineString | 1614 | PASS |
| Cross-region | car | auto | -6.241400,106.628100 | -6.175400,106.827200 | 29377 | 2486 | LineString | 597 | PASS |

Distances and durations are actual API observations, not substituted reference
values. The cross-region motorcycle result matches the costing-options
explanation established in [Phase 7](27_PHASE_7_ROUTING_HARDENING.md). The longer
nearby car route was preserved as computed by Valhalla.

## Geometry, Repeatability, And Cache

- Every result had a GeoJSON `LineString` with more than one point.
- Every coordinate pair contained two finite numbers in `[longitude, latitude]`
  order and within the inspected Jakarta-area ranges (longitude 105-108,
  latitude -8 to -5).
- Every distance and duration was finite and positive.
- Response mode matched the requested GETRA mode in every case.
- Source inspection confirmed mappings: walking -> pedestrian,
  motorcycle -> motorcycle, car -> auto.
- Actual public sequence: walking -> car -> motorcycle -> walking.
- Walking repeated with identical mode, distance, duration, point count, and
  SHA-256 of the coordinate array.
- Walking geometry SHA-256, first and repeated request:
  `a5e5200f63cf74e1f82623b3a9221aa41de0b9d904a56472fdf633261acdb953`
- `PUBLIC_GEOJSON=PASS`
- `PUBLIC_REPEATABILITY=PASS`
- `PUBLIC_MODE_ISOLATION=PASS`

No full geometry or encoded provider shape was placed in this document. Cache
hit/miss instrumentation was not added, and no claim is made about an individual
request's cache-hit status.

## Timeout And No-Fabrication Contract

Only the routing variables were read from the active backend container:

| Setting | Active value | Result |
| --- | --- | --- |
| `ROUTING_PROVIDER` | `valhalla` | PASS |
| `ROUTING_BASE_URL` | `http://valhalla:8002` | PASS |
| `ROUTING_TIMEOUT_MS` | `12000` | PASS |
| `ROUTING_CACHE_TTL_MS` | `300000` | PASS |

The approved cache implementation keys by mode and both coordinate pairs, with
five-decimal precision. It caches only ROUTABLE results, expires entries using
the configured TTL, and clones cached values. Source inspection and live public
mode isolation confirm `CACHE_MODE_ISOLATION=PRESERVED`.

Source inspection of the approved provider and API confirms provider failure
returns null geometry, distance, and duration with explicit failure status and
`NO_FABRICATED_ROUTE`. Mode mapping, provider unit conversion, polyline decoding,
and timeout handling remain unchanged.

The controlled timeout, provider-unavailable, malformed-response, and recovery
proofs from [Phase 7](27_PHASE_7_ROUTING_HARDENING.md) apply to this unchanged
source/runtime contract. Destructive failure injection was not repeated here.
`NO_FABRICATED_ROUTE=PASS` records source/config equivalence plus the prior
failure evidence, not a newly performed public outage test.

## Security Boundaries

- Backend published binding: `127.0.0.1:3002 -> 3000/tcp`
- Valhalla published binding: `127.0.0.1:8002 -> 8002/tcp`
- Wildcard listeners on 3002 or 8002: NONE
- Host listeners on Docker TCP ports 2375 or 2376: NONE
- Funnel HTTPS port: 443
- Funnel handlers: exactly one, `/` -> `http://127.0.0.1:3002`
- Funnel targets for Valhalla, SSH, Docker API, database ports, files, or
  directories: NONE
- `VALHALLA_PUBLIC_EXPOSURE=NONE`
- `DOCKER_API_PUBLIC_EXPOSURE=NONE`
- `INTERNAL_PROVIDER_INFO_EXPOSED=NONE`
- `SECRET_EXPOSURE=NONE`

A bounded scan of 16 backend log lines covering this acceptance window found
no Bearer-token value, access/refresh/service-role token value, password value,
or internal provider URL. Logs and response payloads were inspected in memory;
only sanitized summaries were emitted.

## Resource And Final Health

| Resource | Before public route tests | After public route tests |
| --- | --- | --- |
| CPU | 4 logical CPUs | 4 logical CPUs |
| RAM total | 5.2 GiB | 5.2 GiB |
| RAM available | approximately 4.2 GiB | approximately 4.2 GiB |
| Swap total | 4.0 GiB | 4.0 GiB |
| Swap used | approximately 44 KiB | approximately 44 KiB |
| Root filesystem | 54 GiB total, 34 GiB free | 54 GiB total, 34 GiB free |

Post-test Docker snapshot:

- Backend: healthy, approximately 80.31 MiB memory, 0.00% CPU
- Valhalla: healthy, approximately 146 MiB memory, 0.39% CPU
- Tailscale: connected; Funnel ready
- Public health: PASS
- Authenticated public provider-health: READY
- `RESOURCE_READINESS=READY` for this staging workload; no severe resource
  regression observed during the short acceptance window

These observations are not load-test or graph-rebuild capacity evidence.

## Client Requirements And Availability

```text
TEAM_CLIENT_REQUIREMENT=BROWSER_ONLY
24_7_AVAILABILITY=NO
COMPUTE_AVAILABILITY=OWNER_MACHINE_DEPENDENT
REMOTE_VPS=NO
PERMANENT_REMOTE_HOSTING=DEFERRED_UNTIL_BUDGET_AVAILABLE
```

Team clients require a browser, internet access, and a GETRA account/session.
They do not need Docker, Linux, VMware, a Tailscale client, Valhalla, PBF files,
or Node.js. Node.js was used only by this automated acceptance runner.
Frontend integration remains a later phase and was not changed here.

The stable URL does not guarantee that compute is always online. Laptop sleep,
VM shutdown, internet interruption, or service failure can make the API
temporarily unreachable. The Funnel recovery incident and successful same-URL
recovery are documented in [Phase 8A](28A_PHASE_8A_TAILSCALE_FUNNEL_SHARED_ACCESS.md).

Permanent funded remote hosting remains deferred. No production, 24/7, or
permanent competition-hosting acceptance is claimed.

## Acceptance Checklist

| Requirement | Result |
| --- | --- |
| Exact approved SHA and clean runtime source | PASS |
| Backend and Valhalla healthy | PASS |
| Both raw service ports loopback-only | PASS |
| Tailscale connected, background Funnel ready | PASS |
| Stable trusted public HTTPS URL | PASS |
| Public health and owner-confirmed mobile access | PASS |
| Anonymous provider-health and routing rejected | PASS |
| Authenticated public provider-health READY | PASS |
| Public nearby walking, motorcycle, car | PASS |
| Public cross-region motorcycle and car | PASS |
| GeoJSON type, finite coordinates, lon/lat order | PASS |
| Timeout and cache settings preserved | PASS |
| Public repeatability and mode isolation | PASS |
| No-fabrication source/Phase 7 equivalence | PASS |
| No public Valhalla or Docker API | PASS |
| No internal provider details or secrets exposed | PASS |
| Browser-only team client requirements | PASS |
| Owner-hosted availability limitation documented | PASS |

## Stop Condition

Phase 8 is VERIFIED under the approved owner-hosted Tailscale staging contract.
Phase 9 readiness is READY under that same contract. No frontend work, Phase 10
work, paid provisioning, source commit, or database migration was performed.
