# GETRA Phase 4 Docker Network Integration

Date: 2026-09-04
Environment type: `LOCAL_ROUTING_INTEGRATION`
Runtime: Windows 11 -> VMware Workstation -> Ubuntu Server 26.04.1 LTS

## Status

`PHASE_4_STATUS=VERIFIED`

The approved GETRA backend and Valhalla services are healthy on the production
Compose stack. The backend resolves the `valhalla` service through Compose DNS
and receives HTTP 200 from `http://valhalla:8002/status`. No Valhalla `/route`
request was made in this phase.

## Source And Runtime Identity

- Approved SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime checkout SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime source worktree: CLEAN
- Project directory: `/home/getra/getra`
- Compose config validation: PASS
- Routing PBF validation during Compose precheck: PASS

The existing authorized local `.env.local` was transferred to the Linux runtime
without printing its contents. On Linux it is owned by `getra:getra`, has mode
`0600`, is ignored by Git, and does not appear in the clean worktree.

## Container State

| Service | Container | State | Host binding |
| --- | --- | --- | --- |
| `getra-backend` | `getra-getra-backend-1` | healthy | `127.0.0.1:3002 -> 3000/tcp` |
| `valhalla` | `getra-valhalla-1` | healthy | `127.0.0.1:8002 -> 8002/tcp` |

Valhalla image:

- `ghcr.io/valhalla/valhalla-scripted:3.8.3`
- Digest: `sha256:24ef7955899dececb94e26c6dfb89d64fabfae875f980432694b0261eb6c251b`

Host health evidence:

- `http://127.0.0.1:8002/status`: HTTP 200, valid JSON
- `http://127.0.0.1:3002/api/health`: HTTP 200, valid JSON with status `ok`

## Private Docker Network

- Common Compose network: `getra_default`
- Backend attached: YES
- Valhalla attached: YES
- Backend DNS lookup for `valhalla`: PASS
- Backend request to `http://valhalla:8002/status`: HTTP 200

The DNS result was accepted by service name. No dependency on a static container
IP, VMware host IP, `host.docker.internal`, or host networking was introduced.

## Effective Routing Contract

The following non-secret values were read from inside the running backend
container:

- `ROUTING_PROVIDER=valhalla`
- `ROUTING_BASE_URL=http://valhalla:8002`
- `ROUTING_TIMEOUT_MS=12000`
- `ROUTING_CACHE_TTL_MS=300000`

Source inspection found a fallback default of `http://127.0.0.1:8002` in
`backend/src/features/routing/index.ts` for executions where
`ROUTING_BASE_URL` is absent. It is not active in the tested Compose runtime,
which explicitly sets the required service URL. Maintaining the explicit
Compose environment value is therefore an operational guard. No active
container-side localhost routing configuration was found.

The other loopback references in the routing Compose file are intentional host
port publication and an in-container Valhalla self-healthcheck; neither is the
backend provider destination.

## Restart And Graph Persistence

Both Compose services were restarted without setting
`VALHALLA_FORCE_REBUILD=True`.

- Restart window: `2026-09-04T09:44:44Z` to `2026-09-04T09:45:20Z`
- Valhalla after restart: healthy
- Backend after restart: healthy
- Backend DNS after restart: PASS
- Backend-to-Valhalla HTTP after restart: 200
- Graph archive SHA-256 unchanged: YES
- Graph archive mtime unchanged: YES

Graph evidence after restart:

- Tile files: 129
- Tile directory size: 248,965,136 bytes
- Tile archive size: 249,200,640 bytes
- Tile archive SHA-256:
  `d63d5d5ce1774ffceffa9c756f7b87909cbed3e5d4e2e8887f9628b975062c6f`

This proves the restart reused persistent graph artifacts and did not trigger an
unexpected graph rebuild.

## Resource And Security Evidence

After startup and restart:

- RAM: 5.2 GiB total, approximately 4.2 GiB available
- Swap: 4.0 GiB total, approximately 28 KiB used
- Root filesystem: 54 GiB total, approximately 34 GiB free
- Valhalla memory at final sample: approximately 58 MiB
- Backend memory at final sample: approximately 54 MiB

Socket inspection showed only:

- `127.0.0.1:3002`
- `127.0.0.1:8002`

No `0.0.0.0` listener exists for either service. Docker daemon exposure was not
changed. No secret value, authorization header, password, PBF, graph artifact,
or `.env.local` file was committed or printed.

## Operational Notes

- The first backend image build used the standard Docker builder because the
  optional Buildx/Bake component is not installed. The image build completed.
- `npm ci` reported eight dependency audit findings from the locked dependency
  set. No dependency was changed during this infrastructure phase.
- The approved SHA's Docker context is large because nested generated content is
  not fully excluded. This increased build time and disk use but did not affect
  runtime correctness.

## Acceptance Checklist

| Requirement | Result |
| --- | --- |
| Approved SHA unchanged | PASS |
| Valhalla healthy | PASS |
| GETRA backend healthy | PASS |
| Host to Valhalla status | PASS |
| Host to backend health | PASS |
| Common private Compose network | PASS |
| Backend DNS for `valhalla` | PASS |
| Backend to `valhalla:8002/status` HTTP 200 | PASS |
| Routing provider and internal URL | PASS |
| Timeout and cache TTL | PASS |
| Active container-side localhost provider URL | NONE |
| Graph persistence across restart | PASS |
| Backend and Valhalla loopback binds | PASS |
| Secret exposure | NONE |

## Boundary

Phase 4 verifies Docker DNS and internal HTTP connectivity only. It does not
claim pedestrian, motorcycle, auto, cross-region, provider-health, or normalized
GETRA routing acceptance. Those require later phases.

`PHASE_5_READINESS=READY`
