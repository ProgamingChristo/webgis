# Phase 1 Readiness

## Decision

Phase 1 readiness: READY

Reason:

- Repository snapshot is traceable.
- Docker and Compose files are present and understood.
- Routing provider architecture is present and understood.
- Environment contract is explicit.
- Safe local config/test checks pass.
- No destructive database dependency is required for core Valhalla routing.

## Boundaries For Phase 1

Phase 1 may proceed to controlled infrastructure verification, but must not claim
final routing acceptance until real Valhalla routes return:

- geometry;
- distance greater than zero;
- duration greater than zero.

## Required Phase 1 Checks

- VPS prerequisites.
- PBF source date, size, and SHA-256 recording.
- Valhalla graph/tile readiness.
- Docker backend-to-Valhalla DNS test.
- Direct Valhalla nearby pedestrian, motorcycle, and auto route tests.
- Direct cross-region motorcycle and auto route tests.
- Authenticated GETRA `POST /api/routing` tests for walking, motorcycle, and car.
- HTTPS `/api/health` through reverse proxy.
- Public exposure audit for ports `3002` and `8002`.

## Non-Go Conditions

Do not proceed to acceptance if any of these occur:

- Valhalla only reports container health but real route requests fail.
- GETRA routing returns a successful route without provider geometry.
- Backend container uses `localhost:8002` instead of `valhalla:8002`.
- Browser or frontend environment exposes Valhalla internal URL as a routing API.
- Firewall exposes Valhalla publicly.
- Secrets appear in logs, docs, or frontend responses.

## Phase 0 Stop

Phase 0 stops here. No PBF download, graph build, deploy, reverse proxy setup, or
database migration was performed by this audit.
