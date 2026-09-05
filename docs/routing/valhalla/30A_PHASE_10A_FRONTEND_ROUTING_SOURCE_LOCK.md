# GETRA Phase 10A Frontend Routing Source Lock

Date: 2026-09-05 (Asia/Jakarta)

## Release Identity

- Source workspace: `D:\Getra_Production`
- Source branch: `finalmerge`, unchanged
- Base SHA: `2cf252e8bfcedbff42a40de07d6227e34ca63499`
- Release worktree: `D:\Getra_RoutingFrontend_Release`
- Release branch: `routing-frontend-release`
- Routing implementation commit: `d32f62f8e89fa134c761a3b4c8fdabe7a31184df`
- Commit message: `feat(frontend): integrate dynamic GETRA routing`
- Backend runtime SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`, unchanged

The implementation commit contains the isolated Phase 10 payload. This report
is a subsequent documentation-only commit. The final release SHA is the branch
tip including this report, not a replacement application implementation.
Resolve the exact checked-out release with `git rev-parse HEAD`. The final
branch-tip SHA, remote-ref equality and publication outcome are recorded in the
post-commit delivery and owner-workspace copy of this report. A commit cannot
embed its own literal SHA without changing that SHA.

## Owner Work Protection

The owner workspace was dirty before Phase 10A. Its index was empty. A snapshot
of 153 modified/untracked source and evidence paths was taken before creating
the release worktree; all existing file hashes and recorded missing-file states
matched after source extraction and validation.

No reset, clean, stash, amend, force push, unrelated merge, owner-source edit,
or dependency upgrade was performed. `finalmerge` was not checked out elsewhere,
rewritten, or advanced. Only the new source-lock report is added to that workspace.

The worktree was created from the exact requested base, then an explicit
17-file Phase 10 allowlist was applied. Mixed-file owner hunks were removed only
from the new release worktree. The source commit was checked against that
allowlist; this documentation adds the eighteenth changed file.

## Dependency Classification

| Pre-existing dirty change | Classification | Candidate treatment / evidence |
| --- | --- | --- |
| Dashboard investor/Business Space wrapper and import | UNRELATED | Excluded; original exported GetraDashboard remains; general routing browser acceptance passes |
| StakeholderProvider experienceReady, persistence and related shell changes | UNRELATED | Kept at committed base; no routing dependency on these APIs after wrapper exclusion |
| Map markUserCameraControl early return for USER | UNRELATED to required routing behavior | Excluded; base camera-control implementation retained; real route fit, panning, modes and mobile acceptance pass |
| Business Space CSS, services, components and tests | UNRELATED | Excluded; base versions unchanged |
| UMKM, advertising, analytics, merchant and backend changes | UNRELATED | Excluded; base versions unchanged |
| Owner .gitignore / .dockerignore additions | UNRELATED | Excluded; committed ignore rules already protect env, dependencies and generated outputs |
| Phase 10 tsconfig custom-output type includes / formatting | Local generated metadata, not a routing dependency | Excluded; default committed tsconfig passes typecheck/build |
| Existing auth, API base config, spatial types, MapLibre, styles and dependencies | REQUIRED_FOR_ROUTING, already committed in base | Reused without importing dirty owner changes |

`REQUIRED_PRE_EXISTING_UNCOMMITTED_DEPENDENCIES=NONE`

The existing dependency versions are installed with `npm ci --no-audit --no-fund`
in the separate worktree: 547 packages. No node_modules junction or dependency
reuse from the owner worktree was needed. package.json, package-lock.json,
tsconfig and unrelated baseline source remain unchanged.

## Committed Files

Implementation commit, 17 files:

- `frontend/components/getra-dashboard.tsx`
- `frontend/components/getra-map.tsx`
- `frontend/src/hooks/use-routing.ts`
- `frontend/src/services/routing.service.ts`
- `frontend/src/lib/auth-client.ts`
- `frontend/src/lib/api-client.ts`
- `frontend/src/features/routing/route-geometry.ts`
- `frontend/src/features/routing/route-layer.ts`
- `frontend/src/features/routing/components/coordinate-entry.tsx`
- `frontend/src/features/routing/routing-controls.module.css`
- `frontend/next.config.ts`
- `frontend/tests/routing/routing-client.test.ts`
- `frontend/tests/routing/route-layer.test.ts`
- `frontend/tests/routing/phase10-browser-acceptance.mjs`
- `frontend/tests/global-search/commuter-safety.test.ts`
- `docs/routing/valhalla/phase10-local-cors.override.yml`
- `docs/routing/valhalla/30_PHASE_10_FRONTEND_ROUTING_INTEGRATION.md`

Documentation-only follow-up:

- `docs/routing/valhalla/30A_PHASE_10A_FRONTEND_ROUTING_SOURCE_LOCK.md`

The prior Phase 10 report is historical evidence for the mixed development
workspace. Its GeneralGetraDashboard wrapper, generated tsconfig includes and
210-test count are not silently claimed as part of this isolated release.
This report records the actual release composition and test reconciliation.

The browser harness has one source-lock adjustment: its approved ordinary-user
fixture is read from `HEAD:backend/scripts/api-smoke-test.ts`, rather than requiring
the separate historical backend commit object. That fixture is identical in
the requested base and approved backend SHA. This removes an unnecessary Git
object dependency for a fresh single-branch clone; it does not embed credentials
or change routing behavior.

## Configuration And Secret Boundaries

Canonical client configuration remains `getGetraApiBaseUrl()` and:

```dotenv
NEXT_PUBLIC_GETRA_API_URL=https://getra-routing-api.tail0ed517.ts.net
```

The hostname is not embedded in React components. Existing approved public
Supabase and basemap configuration is supplied through the ignored local env
file for browser/build acceptance. That file is not staged or committed.

No access token, refresh token, password, private key, service-role key or env
contents were added to the release changes or evidence. The staged allowlist,
env ignore checks, and added-line secret-pattern scan passed. Unit-test session
strings are explicit fake test fixtures, not deployed credentials. This is a
scoped release-diff audit, not an audit of all inherited repository history.

Shipping routing logic was searched for acceptance coordinates, private-provider
URLs, port 8002 and the VM address: no match. The repository-wide expanded scan
also found the pre-existing Jakarta map center (106.8272,-6.1754) in Community,
Community Contributions and Business Space baseline code. Those are non-routing
map defaults, not routing A/B constants or Phase 10 additions, and were left
unchanged. Acceptance route fixtures/metrics remain in tests and documentation;
user-selected coordinates remain the source of routing requests.

```text
HARDCODED_ACCEPTANCE_COORDINATES=NONE
DIRECT_VALHALLA_FRONTEND_CALL=NONE
UNRELATED_FILES_COMMITTED=NONE
SECRET_EXPOSURE=NONE
```

The committed CORS override remains local-only: localhost:3000 and localhost:3001,
no wildcard and no invented deployed origin. Phase 10A did not alter the backend
environment, containers, graph, PBF, Funnel hostname or CORS configuration.

## Quality Gates

Executed in the independent release worktree against its installed lockfile:

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `npm run typecheck -w frontend` | PASS |
| Lint | `npm run lint -w frontend` | PASS |
| Full frontend suite | `npm run test -w frontend` | PASS, 32 files / 137 tests |
| Routing-focused suite | `npm exec -w frontend -- vitest run --config vitest.config.mts tests/routing tests/global-search/commuter-safety.test.ts` | PASS, 4 files / 39 tests |
| Production build | `npm run build -w frontend` | PASS, Next 16.3.1 compile/typecheck/page generation |
| Staged diff whitespace | `git diff --cached --check` | PASS |
| Real browser regression | `node frontend/tests/routing/phase10-browser-acceptance.mjs` | PASS |

The focused tests cover current coordinates and three modes, existing user
session transport, no session, HTTP failures, malformed envelopes, deadline,
cancellation, geometry validation, source replacement, clearing and style reload.
Request race and reset also execute through the real React/MapLibre browser
harness, not just static assertions.

Prebuild recopies MapLibre 6.3.0 worker assets. On Windows these briefly appeared
dirty because of index/EOL metadata. Both normalized Git blob IDs were compared
to HEAD and matched exactly before index refresh. No worker asset content or
vendor update is part of the release.

## Test Count Reconciliation

The unchanged owner workspace was rerun separately: 41 files / 210 tests PASS.
The candidate uses the exact same test-discovery script, but intentionally does
not contain the uncommitted owner feature tests. No existing test file was
deleted from the base or hidden with a discovery exclusion.

| Excluded dirty owner test file/change | Owner-only test count |
| --- | ---: |
| business-space/business-space-service.test.ts | 3 |
| business-space/property-analysis-state.test.ts | 6 |
| business-space/property-presentation.test.tsx | 7 |
| business-space/property-viewport.test.ts | 12 |
| umkm-intelligence/merchant-insight-panels.test.tsx | 5 |
| umkm-workspace/merchant-campaigns.test.ts | 4 |
| umkm-workspace/merchant-submission-flow.test.tsx | 14 |
| umkm-workspace/promotion-readiness.test.tsx | 8 |
| umkm-workspace/workspace-state.test.tsx | 13 |
| Additional Business Space contract assertion/test in existing file | 1 |
| Total difference | 73 |

Thus 210 - 73 = 137 tests, and 41 - 9 = 32 files. All Phase 10 routing test files
and their assertions remain. Other owner edits with unchanged test counts are
also excluded; the committed baseline tests remain intact.

Machine-readable comparison artifacts are ignored local output:
`outputs/phase10a/owner-tests.json` in the owner workspace and
`outputs/phase10a/release-tests.json` in the candidate.

## Live Browser Regression

Final standalone-build browser run:
`2026-09-05T07:10:01.558Z` to `2026-09-05T07:10:45.564Z`.

The existing ordinary USER mechanism and actual login page were used. Requests
went from localhost:3001 to the unchanged public HTTPS GETRA backend with normal
browser authentication/CORS. Successful routes used real provider output.

| Case | Mode | Distance (m) | Duration (s) | Points | Result |
| --- | --- | ---: | ---: | ---: | --- |
| regression-walking | walking | 953 | 673 | 25 | PASS |
| regression-car | car | 8706 | 1045 | 385 | PASS |
| regression-motorcycle | motorcycle | 1035 | 150 | 29 | PASS |
| dynamic-pair-1 | walking | 387 | 303 | 10 | PASS |
| dynamic-pair-2 | motorcycle | 707 | 130 | 21 | PASS |
| dynamic-pair-3 | car | 658 | 164 | 24 | PASS |

All Phase 10 behavior checks pass: independent map-selected A/B, reroutes for
each endpoint and mode, A/B preservation, late-response protection, valid
GeoJSON order, backend-derived display metrics, loading/auth/no-route/unavailable
UX, reset, basemap reload, no duplicate layers, and desktop/mobile interaction.

Controlled failure responses remain explicitly test-only interception. The
race test delays a real walking response; it does not fabricate a successful
route. The live backend/Valhalla was not stopped or changed.

Desktop viewport: 1440x1000. Mobile viewport: 390x844, including actual map
selection and a real mode request. This is browser viewport emulation, not a
claim of an additional physical-phone test. Final checks show one route source,
two layers, two endpoint markers, valid coordinate order and route-in-bounds;
reset then clears markers/geometry/summary/error and returns IDLE.

Evidence and screenshots are in ignored `outputs/phase10/` of the release
worktree. Credentials and full response geometry are not persisted.

## Reproduction And Preview

1. Fetch and check out the published routing-frontend-release SHA recorded in
   the final delivery, not arbitrary finalmerge HEAD.
2. Run `npm ci` from the repository root.
3. Supply approved client-safe frontend environment configuration locally.
   Do not commit .env.local or invent authentication material.
4. Run the quality commands above.
5. Build and use the generated standalone server for a production-mode preview.

The existing `npm run start` command was observed to warn about standalone
output. Acceptance was rerun successfully with the supported generated server
after copying public/static build assets. Windows example from repo root:

```powershell
Copy-Item -LiteralPath frontend/public -Destination frontend/.next/standalone/frontend/public -Recurse
Copy-Item -LiteralPath frontend/.next/static -Destination frontend/.next/standalone/frontend/.next/static -Recurse
$env:PORT='3001'
$env:HOSTNAME='127.0.0.1'
node frontend/.next/standalone/frontend/server.js
```

Copy the assets into a freshly generated standalone output. These are ignored
build artifacts, not source changes. Browser acceptance additionally requires
Playwright (or an existing installation selected through GETRA_PLAYWRIGHT_MODULE),
the ordinary test account and live staging. No browser security bypass is used.

The agent-owned Phase 10 preview on 3001 was replaced by the release preview.
The owner's existing server on 3000 was not stopped. No owner source or local
environment file was edited to switch previews.

## Publication And Remaining Limits

The remote branch did not exist at initial inspection. Authorized remote read
access was available. Publication is performed after the documentation commit
using a normal non-force push of routing-frontend-release only, followed by
`git ls-remote --heads origin refs/heads/routing-frontend-release` and exact SHA
comparison. Final publication evidence is recorded in the post-commit delivery.

`VERCEL_ROUTING_READINESS=PARTIAL`: no Vercel deployment or deployed-origin CORS
test is claimed. The local-origin override is not a production CORS policy.

The backend remains OWNER_HOSTED_TAILSCALE_STAGING, owner-machine dependent,
not a remote VPS and not 24/7 hosting. No paid infrastructure, database migration
or new routing feature was introduced. Phase 11 is not started.
