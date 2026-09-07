# GETRA Phase 3 Valhalla Graph Build

Date: 2026-09-04
Environment type: `LOCAL_ROUTING_INTEGRATION`
Runtime: Windows 11 -> VMware Workstation -> Ubuntu Server 26.04.1 LTS

## Status

`PHASE_3_STATUS=VERIFIED`

A real Valhalla graph was built from the verified Jabodetabek PBF. The graph
artifacts are non-empty, the pinned Valhalla 3.8.3 container is healthy, and the
host-only `/status` endpoint returns HTTP 200. No route acceptance was executed.

## Source And PBF Identity

- Approved GETRA SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime checkout SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime worktree before and after build: CLEAN
- PBF path: `/home/getra/getra/routing-data/jabodetabek.osm.pbf`
- PBF size: 178,486,276 bytes
- PBF SHA-256: `93e07cc2e5574d1f8c4a6208ab5e4b83e83e0aea4811def94225078e99e35c19`
- Phase 2 checksum match: YES
- `osmium fileinfo`: PASS
- `npm run routing:validate`: PASS

## Valhalla Image

- Image: `ghcr.io/valhalla/valhalla-scripted:3.8.3`
- Pinned digest: `sha256:24ef7955899dececb94e26c6dfb89d64fabfae875f980432694b0261eb6c251b`
- Runtime image ID matched the pinned digest
- Image pull: PASS

## Compose And Environment Boundary

- `npm run docker:prod:config`: BLOCKED_BY_APPLICATION_ENV
- Exact blocker: root `.env.local` is absent
- PBF validation inside the command: PASS before the environment-file check
- `npm run docker:prod:status`: BLOCKED_BY_APPLICATION_ENV
- No application secret was fabricated or printed
- Backend container: NOT REQUIRED / BLOCKED_BY_APPLICATION_ENV for Phase 3

The routing overlay cannot be used as a standalone Compose file because it
extends `getra-backend` without defining its image/build context. The full
Compose merge requires application environment values. Phase 3 therefore used
an isolated Valhalla container based on the exact approved service definition:
the same pinned image, environment options, routing-data bind mount, loopback
port, restart policy, stop timeout, and healthcheck.

This isolated path does not alter repository Compose files. The resulting graph
is persisted in the same `routing-data` directory consumed by the approved
Compose service.

## Input Isolation

The image entrypoint automatically selects every `*.pbf` in `/custom_files`.
Because Phase 2 retained both the Java source and Jabodetabek extract, exposing
the directory unchanged would have built from both datasets.

To preserve intended scope:

1. The Java source checksum was verified.
2. `java-latest.osm.pbf` was temporarily renamed during graph construction.
3. The container saw exactly one PBF: `jabodetabek.osm.pbf`.
4. After graph health verification, the Java source filename was restored.
5. Its SHA-256 remained
   `8a58a9c7d2d6d1c2cb3c24f68cc61b4b72e28f46639916d9363073caee1e410a`.

No PBF was deleted or modified.

## Resource Evidence

Before graph build:

- CPU: 4 logical CPUs
- RAM: 5.2 GiB total, approximately 4.6 GiB available
- Swap: 4.0 GiB total, 0 used
- Root free: approximately 41 GiB before image pull
- Routing data: approximately 1.1 GiB
- Docker data: empty

Build/runtime checkpoints:

- Build start: `2026-09-04T09:26:09Z`
- Service ready in logs: approximately `2026-09-04T09:27:35Z`
- Build duration: approximately 86 seconds
- Cgroup peak memory: 2,097,102,848 bytes (approximately 1.95 GiB)
- Cgroup peak swap: 0 bytes
- OOM killed: NO
- Disk exhaustion: NO
- Fatal resource log matches: 0

After graph build:

- RAM available: approximately 4.5 GiB
- Swap used: 0
- Root free: 41,883,095,040 bytes (approximately 39 GiB)
- Routing data total: approximately 1.6 GiB
- Docker image storage: approximately 843.5 MB
- Running containers: 1 Valhalla container

## Graph Artifacts

- Tile directory: `routing-data/jabodetabek_tiles/`
- Tile files: 129
- Tile directory size: 248,965,136 bytes
- Tile tar: `routing-data/jabodetabek_tiles.tar`
- Tile tar size: 249,200,640 bytes
- Supporting artifacts: `admins.sqlite`, `timezones.sqlite`,
  `default_speeds.json`, `valhalla.json`, and `file_hashes.txt`
- Combined graph/support artifact size: 629,505,739 bytes
- Graph artifacts: PRESENT and non-empty

## Container And Health

- Container: `getra-valhalla-phase3`
- Container state: running
- Docker health: healthy
- OOM killed: false
- Host bind: `127.0.0.1:8002`
- Public bind: NONE
- `http://127.0.0.1:8002/status`: HTTP 200
- Valhalla status version: 3.8.3
- Loaded tile count reported in logs: 129

## Warnings

The clipped PBF contains incomplete outer administrative boundary relations.
Valhalla logged degenerate/missing admin relation members and created an admin
database with zero inserted admin areas. This did not prevent graph creation,
tile loading, container health, or `/status` success. Administrative attribution
must not be assumed from this graph and should be observed during later route/API
verification.

Other non-blocking build warnings:

- one unknown OSM time-range runtime warning;
- possible duplicate graph elements at levels 0 and 1;
- no elevation storage directory, because elevation was not requested;
- no traffic tile archive, because traffic data is not part of this build.

These warnings were preserved and not rewritten as success evidence.

## Acceptance Checklist

| Requirement | Status |
| --- | --- |
| Approved SHA unchanged | PASS |
| PBF checksum matches Phase 2 | PASS |
| Routing validator | PASS |
| Docker Engine and Compose v2 ready | PASS |
| Full production Compose config | BLOCKED_BY_APPLICATION_ENV |
| Valid isolated Valhalla path documented | PASS |
| Routing-data permissions | PASS |
| Resource baseline and checkpoints | PASS |
| Graph build actually executed | PASS |
| No OOM or disk exhaustion | PASS |
| Graph artifacts present and non-empty | PASS |
| Valhalla container healthy | PASS |
| Host loopback `/status` | PASS, HTTP 200 |
| Post-build resources recorded | PASS |
| Secret exposure | NONE |

## Next Gate

`PHASE_4_RESOURCE_READINESS=READY`

`PHASE_4_READINESS=PARTIAL_BLOCKED_BY_APPLICATION_ENV`

The machine resources and Valhalla graph are ready. Phase 4 backend-to-Valhalla
Compose network verification still requires an approved server `.env.local` so
the `getra-backend` service can be configured and started without fabricated
application values.

## Stop Condition

Phase 3 stops here. No Valhalla `/route` request, pedestrian/motorcycle/auto
acceptance, cross-region routing, frontend modification, public staging setup,
or database migration was performed.
