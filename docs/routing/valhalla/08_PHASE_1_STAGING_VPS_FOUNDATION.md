# GETRA Phase 1 Staging VPS Foundation

Date: 2026-09-02
Scope: Shared routing staging VPS foundation.

## Phase 1 Result

Status: PARTIAL / BLOCKED

Reason:

- Repository source identity was checked.
- Application deployment gate did not pass because the worktree is dirty.
- No staging VPS hostname/SSH access was available in this session, so VPS
  runtime inventory, firewall, DNS, reverse proxy, TLS, and resource checks could
  not be verified.

## Release Identity Gate

Phase 0 audited commit:

- `2cf252e8bfcedbff42a40de07d6227e34ca63499`

Current repository check:

- Branch: `finalmerge`
- Current HEAD: `2cf252e8bfcedbff42a40de07d6227e34ca63499`
- Worktree: DIRTY

Deployment source decision:

- `DEPLOYMENT_SOURCE_TYPE=BLOCKED`
- `GETRA_DEPLOYMENT_SHA=NOT_APPROVED`
- `SOURCE_REVIEWED=NO`

Application deployment is stopped until either:

- the reviewed changes are committed and the new SHA is approved; or
- the owner provides an explicitly reviewed deployment package/snapshot.

## Repository Infrastructure State

Required Compose files exist locally:

- `docker-compose.yml`
- `docker-compose.routing.yml`
- `docker-compose.prod.yml`

Required Dockerfile exists locally:

- `Dockerfile`

Required routing scripts exist locally:

- `scripts/validate-routing-data.mjs`
- `scripts/prepare-jabodetabek-routing.ps1`

## Phase 1 Actions Not Performed

The following were intentionally not performed:

- no Java PBF download;
- no Jabodetabek clipping;
- no Valhalla graph build;
- no live pedestrian route;
- no cross-region route;
- no remote DB migration;
- no frontend modification;
- no VPS deployment.

## Blockers

- Reviewed deployment source identity is not established.
- Staging VPS access details are not available.
- Staging API DNS is not provided/verified.
- Reverse proxy and TLS cannot be inspected without VPS access.
- Firewall/public port exposure cannot be verified without VPS access.
