# GETRA Routing Track Index

Updated: 2026-09-05
Scope: Routing evidence through Phase 9 final shared-staging acceptance.

## Current Acceptance

[Phase 9 final acceptance](29_PHASE_9_FINAL_ROUTING_SYSTEM_ACCEPTANCE.md) is the
current consolidated record: `PHASE_9_STATUS=VERIFIED`, `PHASE_10_READINESS=READY`.
The environment is `SHARED_STAGING`, hosting class
`OWNER_HOSTED_TAILSCALE_STAGING`. Compute remains owner-machine dependent;
this is not a remote VPS, production acceptance, or 24/7 hosting.

- [Phase 1B.2 runtime bootstrap and closure](21_PHASE_1B2_LOCAL_RUNTIME_BOOTSTRAP.md)
- [Phase 2 PBF provenance](22_PHASE_2_OSM_PBF_PROVENANCE.md)
- [Phase 3 graph build](23_PHASE_3_VALHALLA_GRAPH_BUILD.md)
- [Phase 4 Docker networking](24_PHASE_4_DOCKER_NETWORK_INTEGRATION.md)
- [Phase 5 direct routing](25_PHASE_5_DIRECT_LIVE_ROUTE_EVIDENCE.md)
- [Phase 6 backend integration](26_PHASE_6_GETRA_BACKEND_ROUTING_INTEGRATION.md)
- [Phase 7 failure, timeout, and cache](27_PHASE_7_ROUTING_HARDENING.md)
- [Phase 8 owner-hosted staging](28_PHASE_8_SHARED_STAGING_ACCEPTANCE.md)
- [Phase 8A Funnel and same-URL recovery](28A_PHASE_8A_TAILSCALE_FUNNEL_SHARED_ACCESS.md)

## Original Baseline Documents

- `01_PHASE_0_BASELINE_AUDIT.md` - repository identity, current local state, and Phase 0 status.
- `02_ROUTING_ARCHITECTURE_CURRENT_STATE.md` - active routing API, auth, request/response contracts, and health behavior.
- `03_DOCKER_COMPOSE_CURRENT_STATE.md` - Dockerfile and Compose topology, ports, service names, volumes, and security posture.
- `04_ROUTING_PROVIDER_CURRENT_STATE.md` - Valhalla provider, mode mapping, timeout, cache, error handling, and fake-route audit.
- `05_ROUTING_TEST_COVERAGE.md` - focused routing, Docker, and safe local test evidence.
- `06_PHASE_0_GAP_ANALYSIS.md` - conflicts, stale documentation, and remaining gaps before deployment verification.
- `07_PHASE_1_READINESS.md` - readiness decision and next work boundaries.
- `13_PHASE_1B_DEPLOYMENT_UNBLOCKING.md` - deployment source gate, VPS bootstrap blockers, and Phase 1B closure status.
- `14_PHASE_1B1_ROUTING_DEPLOYMENT_SOURCE_LOCK.md` - clean audited-SHA verification and deployment source recommendation.

## Historical Phase 0 Boundary (2026-09-02)

This audit did not download OSM data, build Valhalla graph tiles, deploy to VPS,
apply database migrations, configure reverse proxy, or modify runtime code.

Existing routing artifacts and running containers were observed as current local
state only.
