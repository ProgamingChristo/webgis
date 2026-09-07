# GETRA Phase 2 OSM/PBF Provenance

Date: 2026-09-04
Environment type: `LOCAL_ROUTING_INTEGRATION`
Runtime: Windows 11 -> VMware Workstation -> Ubuntu Server 26.04.1 LTS

## Status

`PHASE_2_STATUS=VERIFIED`

The official Geofabrik Java dataset was downloaded, recognized by osmium,
fingerprinted, clipped using the approved Jabodetabek bbox, and accepted by the
GETRA routing-data validator. No Valhalla graph or routing container was started.

## Source Identity

- GETRA approved SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime checkout SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Worktree before data preparation: CLEAN
- Worktree after data preparation: CLEAN
- Runtime project path: `/home/getra/getra`
- SSH alias: `getra-routing-local`
- Linux user/host: `getra@getra-router`
- osmium: `/usr/bin/osmium`, version 1.19.0

## Storage Gate

Before download:

- Root filesystem total: 54 GiB
- Root filesystem used: 9.7 GiB
- Root filesystem free: approximately 42 GiB
- Repository with installed dependencies/build output: 2.2 GiB
- Docker images, containers, volumes, and build cache: empty
- Routing data directory: writable by `getra`, mode `775`, not world-writable

Result: `PHASE_2_STORAGE_GATE=PASS`

## Official OSM Source

- URL: `https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf`
- HTTP Last-Modified: `Thu, 03 Sep 2026 23:02:11 GMT`
- HTTP Content-Length: `896338328`
- HTTP ETag: `"356d0998-65a9c2458bc59"`
- Download started: `2026-09-04T07:48:15Z`
- Download completed: `2026-09-04T07:52:50Z` (filesystem timestamp evidence)
- Download method: curl with redirect handling and three retries
- Partial-download safety: data was written to `.part` and promoted only after
  curl returned success

## Java PBF Evidence

- Path: `/home/getra/getra/routing-data/java-latest.osm.pbf`
- Size: 896,338,328 bytes (approximately 855 MiB)
- SHA-256: `8a58a9c7d2d6d1c2cb3c24f68cc61b4b72e28f46639916d9363073caee1e410a`
- Format recognized by osmium: PBF
- Fileinfo: PASS
- Source data timestamp: `2026-09-03T20:21:51Z`
- Source bounds: `(104.139393,-9.541155,116.581418,-3.951935)`
- Owner/group: `getra:getra`
- Mode: `664`

The downloaded byte count exactly matched the source `Content-Length` before
the format and checksum checks were performed.

## Jabodetabek Extraction

Approved bbox, unchanged:

```text
106.30,-6.90,107.25,-5.85
```

Command semantics:

```text
osmium extract --bbox 106.30,-6.90,107.25,-5.85 \
  routing-data/java-latest.osm.pbf \
  --output routing-data/jabodetabek.osm.pbf \
  --overwrite
```

- Clip started: `2026-09-04T08:27:49Z`
- Clip completed: `2026-09-04T08:28:40Z`
- Exit code: 0
- Target did not exist before this Phase 2 run

## Jabodetabek PBF Evidence

- Path: `/home/getra/getra/routing-data/jabodetabek.osm.pbf`
- Size: 178,486,276 bytes (approximately 171 MiB)
- SHA-256: `93e07cc2e5574d1f8c4a6208ab5e4b83e83e0aea4811def94225078e99e35c19`
- Format recognized by osmium: PBF
- Basic fileinfo: PASS
- Extended fileinfo: PASS
- Objects ordered by type and ID: YES
- Nodes: 26,475,669
- Ways: 5,941,210
- Relations: 15,913
- Latest object timestamp: `2026-09-03T20:02:40Z`
- Owner/group: `getra:getra`
- Mode: `664`

Extended fileinfo reports data bounds wider than the requested envelope because
`osmium extract` retains referenced objects needed to keep selected OSM ways and
relations structurally usable. The extraction command used the exact approved
bbox and did not shrink required Jabodetabek coverage.

## GETRA Validation

Command:

```text
npm run routing:validate
```

Result:

```text
Routing source ready: /home/getra/getra/routing-data/jabodetabek.osm.pbf
(178,486,276 bytes)
```

`ROUTING_VALIDATION=PASS`

The validator was not modified or bypassed.

## Git Safety

- `routing-data/java-latest.osm.pbf`: ignored by `routing-data/.gitignore`
- `routing-data/jabodetabek.osm.pbf`: ignored by `routing-data/.gitignore`
- Git status after data preparation: CLEAN
- Remaining `.part` files: 0
- PBF committed: NO
- Secrets exposed: NONE

## Post-Phase Resources

- Routing data total: approximately 1.1 GiB
- Root filesystem total: 54 GiB
- Root filesystem used: 11 GiB
- Root filesystem free: approximately 41 GiB
- Exact free bytes recorded: 43,357,855,744
- RAM: 5.2 GiB total, approximately 4.5 GiB available after validation
- Swap: 4.0 GiB, effectively unused
- Running containers: 0

`PHASE_3_STORAGE_PRECHECK=READY`

Approximately 41 GiB remains free after retaining both required PBF files. This
provides material headroom for the Valhalla image, graph tiles, and build
artifacts, but disk usage must be monitored during graph construction.

`PHASE_3_MEMORY_PRECHECK=RISK`

The existing 5.2 GiB RAM plus 4 GiB swap may support the clipped dataset, but
Phase 3 must monitor memory pressure, swap use, and process exit status. No graph
success may be claimed if the build is killed or incomplete.

## Phase 2 Acceptance

| Requirement | Status |
| --- | --- |
| Approved SHA exact and worktree initially clean | PASS |
| osmium available | PASS |
| Storage gate | PASS |
| Routing data directory writable and private enough | PASS |
| Official source metadata recorded | PASS |
| Java PBF download and fileinfo | PASS |
| Java PBF size and SHA-256 | PASS |
| Exact extraction bbox | PASS |
| Jabodetabek PBF creation and fileinfo | PASS |
| Jabodetabek PBF size and SHA-256 | PASS |
| GETRA routing validator | PASS |
| Git safety | PASS |
| Post-phase disk and memory assessment | PASS |
| Secret exposure | NONE |

## Phase 3 Gate

`PHASE_3_READINESS=READY_WITH_MEMORY_RISK`

The data pipeline is accepted for Phase 3. Memory remains a monitored risk, not
a Phase 2 failure.

## Stop Condition

Phase 2 stops here. No production Compose startup, Valhalla graph build,
Valhalla route request, live routing acceptance, frontend modification, public
DNS/TLS configuration, or database migration was performed.
