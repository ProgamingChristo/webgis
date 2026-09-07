# GETRA Phase 1B.2 Local Routing Runtime Bootstrap

Date: 2026-09-04
Environment type: `LOCAL_ROUTING_INTEGRATION`
Scope: Prepare the Windows 11 -> VMware -> Ubuntu routing runtime for Phase 2.

## Closure Update (2026-09-05)

`PHASE_1B2_STATUS=VERIFIED`

The original bootstrap session below stopped with a missing osmium package.
[Phase 2](22_PHASE_2_OSM_PBF_PROVENANCE.md) subsequently verified osmium 1.19.0
and completed the real data pipeline. Application environment availability was
resolved in [Phase 4](24_PHASE_4_DOCKER_NETWORK_INTEGRATION.md).
[Phase 9](29_PHASE_9_FINAL_ROUTING_SYSTEM_ACCEPTANCE.md) freshly reconfirmed
osmium, the exact approved clean checkout, ignored/untracked `.env.local`,
successful Compose validation, and passing source quality gates.

No package installation or bootstrap repair is required now. The remaining
sections preserve the initial 2026-09-04 snapshot, including its then-missing
tools, environment, and not-yet-created data. Those historical blockers and
unblock commands are not current instructions. Current staging classification
and resource figures are in Phase 9.

## Historical Initial Status

`HISTORICAL_PHASE_1B2_STATUS=PARTIAL`

The local Linux runtime, approved source checkout, Node toolchain, Docker access,
dependencies, source quality gates, and routing data directory are verified.

Phase 2 is not ready because `osmium-tool` is missing. The Ubuntu package is
available, but the SSH session does not have non-interactive sudo authorization.
No password or other secret was requested or printed.

The application environment is also partial because no approved `.env.local`
secret source was available. This does not affect the completed source quality
checks, but it will be required before the backend container can be accepted.

## Runtime Identity

- SSH alias: `getra-routing-local`
- SSH: PASS using key authentication
- User: `getra`
- Hostname: `getra-router`
- OS: Ubuntu 26.04.1 LTS
- Architecture: `x86_64`
- Kernel: Linux 7.0.0-31-generic
- Bootstrap evidence time: `2026-09-04T05:29:23Z`
- Network classification: VMware NAT, not public staging

## Resource Baseline

- CPU: 4 logical CPUs
- RAM: 5.2 GiB total, approximately 4.6 GiB available at initial audit
- Swap: 4.0 GiB total, unused at initial audit
- Root filesystem: 54 GiB
- Root filesystem free: approximately 44 GiB
- Approved checkout including installed dependencies/build output: 2.2 GiB
- User-level Node installation: 204 MiB
- Docker images, containers, volumes, and build cache: empty at audit time

`PHASE_2_STORAGE_READINESS=READY`

The current Java PBF metadata reports approximately 896 MB. With approximately
44 GB free, Phase 2 has adequate room for the Java source PBF, clipped
Jabodetabek PBF, and reasonable operating-system headroom. Disk usage must be
rechecked before Phase 3 graph construction.

`PHASE_3_MEMORY_PRECHECK=RISK`

The VM has 5.2 GiB RAM and 4 GiB swap. This is plausible for a clipped
Jabodetabek graph, but memory and swap must be monitored during Phase 3. A graph
build must not be reported successful if it is killed or partially generated.

## Toolchain

| Tool | Result | Version / Evidence |
| --- | --- | --- |
| Git | READY | 2.53.0 |
| curl | READY | 8.18.0 |
| Node.js | READY | v22.23.2 |
| npm | READY | 10.9.8 |
| Docker Engine | READY | 29.1.3 |
| Docker Compose | READY | 2.40.3 |
| Docker service | READY | active |
| Docker user access | PASS | `docker ps` works without sudo |
| osmium-tool | MISSING | Ubuntu candidate package 1.19.0-1build1 |

Repository Node requirement: `>=22.13.0`.

Node v22.23.2 was installed under the `getra` account from the official Node.js
v22 distribution. Its published SHA-256 checksum was verified before extraction.
It is available in login shells without changing repository dependencies.

## Approved Source

- Remote branch: `routing-staging-release`
- Approved SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Project directory: `/home/getra/getra`
- Local checkout SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Checkout mode: detached exact commit
- Worktree: CLEAN
- Dependency install: PASS (`npm ci`, 557 packages)

No `finalmerge` changes or unrelated feature work were merged into this runtime.

## Linux Source Quality Gates

| Gate | Result | Evidence |
| --- | --- | --- |
| Backend typecheck | PASS | `npm run typecheck -w backend` |
| Backend lint | PASS | `npm run lint -w backend` |
| Focused routing tests | PASS | 4 files, 24 tests |
| Backend production build | PASS | Next.js 16.3.1 production build |

The focused tests include provider mapping, provider health, API behavior,
timeout handling, cache behavior, Docker config, and no-fabricated-route cases.
They are not live Valhalla route evidence.

## Routing Data Safety

- Directory: `/home/getra/getra/routing-data`
- Owner/group: `getra:getra`
- Mode: `775`
- Writable by deployment user: YES
- World writable: NO
- `java-latest.osm.pbf`: absent
- `jabodetabek.osm.pbf`: absent
- PBF paths ignored by repository `routing-data/.gitignore`: PASS
- `.env.local` ignored by repository `.gitignore`: PASS
- Secret exposure: NONE

No PBF, Valhalla graph, or live route was created during this phase.

## Routing Architecture

Verified from the approved source:

- Backend host bind default: `127.0.0.1:3002`
- Valhalla host bind default: `127.0.0.1:8002`
- Internal provider: `valhalla`
- Internal provider URL: `http://valhalla:8002`
- Routing timeout: `12000` ms
- Routing cache TTL: `300000` ms
- Valhalla server threads default: `2`
- Valhalla force rebuild default: `False`
- No Compose reference to `http://localhost:8002`

## Environment And Compose

- `.env.local` present: NO
- `.env.local` tracked: NO
- Environment contract: PARTIAL / BLOCKED_BY_SECRET
- `npm run docker:prod:config`: BLOCKED_BY_PHASE_2_PBF

The Compose precheck reached the routing validator and stopped because
`routing-data/jabodetabek.osm.pbf` intentionally does not exist yet. This is not
a source or Compose defect. No fake PBF or secret values were created.

## Acceptance Checklist

| Requirement | Status |
| --- | --- |
| SSH alias and key authentication | PASS |
| Ubuntu, user, hostname, and architecture | PASS |
| Docker Engine and Compose v2 | PASS |
| Docker service and non-sudo user access | PASS |
| Git and curl | PASS |
| Node.js/npm compatible | PASS |
| osmium-tool | FAIL / MISSING |
| CPU, RAM, swap, and disk baseline | PASS |
| Stable project directory | PASS |
| Remote approved source available | PASS |
| Exact approved SHA checked out | PASS |
| Worktree clean | PASS |
| Dependency install | PASS |
| Source quality gates | PASS |
| Routing data directory and Git safety | PASS |
| Internal Valhalla URL and loopback binds | PASS |
| Secret exposure | NONE |
| Phase 2 storage readiness | READY |

## Exact Unblock Action

From an interactive terminal on the Ubuntu VM, an authorized administrator must
run:

```bash
sudo apt-get update
sudo apt-get install -y osmium-tool
osmium --version
```

Do not send the sudo password through chat. After this package is installed,
Phase 1B.2 can be closed by rechecking `osmium --version`; Phase 2 may then begin.

## Stop Condition

Phase 1B.2 stops here. No Java PBF download, OSM clipping, Valhalla graph build,
container startup, live route acceptance, frontend change, or database migration
was performed.
