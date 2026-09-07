# GETRA Phase 1B.1 Routing Deployment Source Lock

Date: 2026-09-02
Scope: Establish clean, reproducible routing deployment source.

## Supersession Notice (2026-09-05)

The failures below belong to audited SHA
`2cf252e8bfcedbff42a40de07d6227e34ca63499`, not the subsequent approved routing
release `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`. That release contains the
four-line route-context typing correction. Its clean Linux checkout,
typecheck, lint, focused tests, and production build were freshly verified in
[Phase 9](29_PHASE_9_FINAL_ROUTING_SYSTEM_ACCEPTANCE.md).
The original audit results are retained unchanged as historical evidence.

## Historical Status

`HISTORICAL_PHASE_1B1_STATUS=BLOCKED`

Reason:

- Clean worktree at audited SHA was created and verified.
- Routing runtime files exist at audited SHA.
- Focused routing tests pass at audited SHA.
- Backend typecheck fails at audited SHA due unrelated `RouteContext` type errors.
- `routing-data/jabodetabek.osm.pbf` and `.env.local` are absent in the clean
  verification worktree, so `routing:validate` and `docker:prod:config` were not
  run there.

No commit, deployment, PBF download, graph build, DB migration, or frontend
change was performed.

## Audited SHA

- `2cf252e8bfcedbff42a40de07d6227e34ca63499`

## Clean Verification Worktree

Path:

- `D:\Getra_SourceLock_2cf252e`

Verification:

- `git status --porcelain`: empty
- `git rev-parse HEAD`: `2cf252e8bfcedbff42a40de07d6227e34ca63499`

Result:

- `CLEAN_VERIFICATION_WORKTREE=PASS`

## Routing Runtime At Audited SHA

Required files verified present:

- `docker-compose.yml`
- `docker-compose.routing.yml`
- `docker-compose.prod.yml`
- `Dockerfile`
- `scripts/validate-routing-data.mjs`
- `scripts/prepare-jabodetabek-routing.ps1`
- `backend/src/features/routing/index.ts`
- `backend/src/features/routing/valhalla-routing.provider.ts`
- `backend/app/api/routing/route.ts`
- `backend/app/api/internal/routing/provider-health/route.ts`

Implementation verified by source inspection:

- Compose routing overlay sets `ROUTING_BASE_URL=http://valhalla:8002`.
- Routing config supports `ROUTING_TIMEOUT_MS=12000`.
- Routing config supports `ROUTING_CACHE_TTL_MS=300000`.
- GETRA `walking` maps to Valhalla `pedestrian`.
- GETRA `motorcycle` maps to Valhalla `motorcycle`.
- GETRA `car` maps to Valhalla `auto`.
- Valhalla polyline decoding emits GeoJSON `[longitude, latitude]`.
- API exposes `NO_FABRICATED_ROUTE` for non-routable/provider-failure states.
- Provider-health endpoint exists.

Result:

- `ROUTING_RUNTIME_AT_AUDITED_SHA=COMPLETE`

## Safe Checks At Audited SHA

| Check | Result | Evidence |
| --- | --- | --- |
| `npm ci` | PASS | 547 packages installed |
| backend typecheck | FAIL | `RouteContext` not found in four UMKM advertising routes |
| backend lint | PASS | `eslint . --max-warnings=0` |
| focused routing tests | PASS | 4 files / 24 tests |
| `npm run routing:validate` | BLOCKED | clean worktree has no `routing-data/jabodetabek.osm.pbf` |
| `npm run docker:prod:config` | BLOCKED | depends on routing-data validation and `.env.local`; both absent in clean worktree |

Typecheck failure files:

- `backend/app/api/umkm/advertising/campaigns/[id]/lifecycle/route.ts`
- `backend/app/api/umkm/advertising/campaigns/[id]/pause/route.ts`
- `backend/app/api/umkm/advertising/campaigns/[id]/resume/route.ts`
- `backend/app/api/umkm/advertising/campaigns/[id]/schedule/route.ts`

Failure:

- `Cannot find name 'RouteContext'`

This is not a routing provider defect, but it blocks clean source quality for an
approved deployment candidate if backend typecheck is required.

## Dirty Docker-Related Change Review

### `.dockerignore`

Current dirty additions:

- `**/.next`
- `**/node_modules`
- `.sites-runtime`
- `**/.sites-runtime`
- `lint_output.txt`
- `**/lint_output.txt`
- `routing-source-cache`
- `tmp`
- `**/tmp`
- `.tmp-*`

Classification:

- `DIRTY_DOCKERIGNORE_CHANGE=HYGIENE`

Rationale:

- Helpful for smaller/cleaner Docker build contexts if local generated artifacts
  exist.
- Not required for runtime correctness when deploying from a clean Git checkout.
- Audited SHA already ignores `.env.*`, `routing-data`, `docs`, `supabase`,
  `tests`, root `.next`, and root `node_modules`.

### `.gitignore`

Current dirty addition:

- `routing-source-cache/`

Classification:

- `DIRTY_GITIGNORE_CHANGE=HYGIENE`

Rationale:

- Prevents local large OSM source cache from becoming untracked noise.
- Not required for runtime correctness on VPS.

## Other Dirty Feature Changes

Other dirty files are not required for routing deployment source lock:

- AI chat behavior
- stakeholder/profile UI
- map/camera behavior
- Business Space workspace wiring/test
- routing documentation

Result:

- `OTHER_DIRTY_FEATURE_CHANGES_REQUIRED_FOR_ROUTING=NO`

## Deployment Candidate Decision

Audited SHA contains complete routing runtime, but clean backend typecheck fails.

Recommendation:

- `RECOMMENDED_DEPLOYMENT_SOURCE=MINIMAL_NEW_COMMIT`

Required minimal commit scope should include only:

1. a focused fix for the `RouteContext` typecheck failure, if backend typecheck is
   required as a deployment gate;
2. optionally `.dockerignore` and `.gitignore` hygiene changes if owner approves
   them as deployment hygiene;
3. routing deployment documentation if owner wants docs captured in the SHA.

Do not include mixed feature work unless owner explicitly approves it as part of
the release package.

## Candidate SHA

- `CANDIDATE_SHA=NOT_CREATED`

Owner approval is required before committing a minimal deployment source.

## Stop Condition

Phase 1B.1 stops here. No dirty work was discarded, no commit was created, and
no VPS deployment was performed.
