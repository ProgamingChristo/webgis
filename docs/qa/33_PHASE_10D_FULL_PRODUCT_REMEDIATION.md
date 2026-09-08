# GETRA Phase 10D Full Product Remediation

Date: 2026-09-05, Asia/Jakarta.

## Decision

```text
PHASE_10D_STATUS=VERIFIED_WITH_EXTERNAL_BLOCKER
OWNER_STATE_RECONSTRUCTION=PASS
OWNER_WORKSPACE_CHANGED_BY_10D=NO
PRODUCT_READINESS=REMEDIATION_REQUIRED
PHASE_11_PHYSICAL_READINESS=READY
PHASE_11_PHYSICAL_TEST=NOT_EXECUTED
PHASE_12_READINESS=BLOCKED
APPROVED_PRODUCT_BASELINE=OWNER_REFERENCE_REQUIRED
ENVIRONMENT_TYPE=SHARED_STAGING
HOSTING_CLASS=OWNER_HOSTED_TAILSCALE_STAGING
COMPUTE_AVAILABILITY=OWNER_MACHINE_DEPENDENT
24_7_AVAILABILITY=NO
REMOTE_VPS=NO
VERCEL_ROUTING_READINESS=PARTIAL
```

The full product now contains the accepted Active Journey implementation and
passes targeted public HTTPS browser acceptance. F01, F03-F08, and F10 are closed
within the tested scope below. F02 remains blocked by an approved AI provider
credential; F09 requires an owner decision about historical QA data. These are
not reported as working AI or completed data cleanup.

The owner-approved sequencing rule permits the physical GPS/routing experiment
to resume despite the specific AI credential blocker. This is not whole-product,
competition, permanent-hosting, or production acceptance. No physical travel was
performed. The Phase 10C merchant/campaign and approved-requirement coverage gaps
are retained rather than silently converted into PASS.

Full-product QA: [GETRA login](https://getra-routing-api.tail0ed517.ts.net:8443/login).
Backend: [GETRA API](https://getra-routing-api.tail0ed517.ts.net).
The URLs and Tailscale node identity were not changed.

## Source Identity And Owner Integrity

| Item | Evidence |
| --- | --- |
| Protected owner workspace | `D:\Getra_Production`, `finalmerge`, DIRTY |
| Owner HEAD | `2cf252e8bfcedbff42a40de07d6227e34ca63499` |
| Dedicated independent clone | `D:\Getra_FullProduct_10D` |
| Dedicated branch | `full-product-remediation-release` |
| Pre-remediation snapshot SHA | `e49ba45edb67db6989adb4016015dad21eae8a2e` |
| Accepted journey source | `11a6f90b54815816b76097e7f527d69052cc8732` |
| Integration commit | `8472b6de3688de7a29f84492f85be6d2b56434a6` |
| Complete application/test candidate | `159c35f003ca4ab9177c5e3076354649386c2e2b` |
| Application source last changed | `cf7342f436bc586b2bf11d72610da13786b873a2` |
| Final release identity | The commit containing this report, resolved by `git rev-parse HEAD`; exact local/remote/runtime values are in the delivery report and `D:\Getra_Phase10D_QA\final-release-lock.json` |
| Accepted backend checkout retained | `/home/getra/getra`, `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe` |
| Full-product runtime checkout | `/home/getra/getra-full-product-10d`, exact committed candidate |

A Git commit cannot contain its own hash. The final documentation commit changes
no application behavior; the delivery lock records its actual SHA, not a guessed
or self-referential value. The dedicated remote branch is pushed without force;
final delivery requires its ref, local HEAD and deployed revision to match.

The reconstruction copied the exact tracked modifications, one tracked deletion,
and untracked product files into an independent clone. Content hashes, missing-file
state, HEAD, branch, porcelain status and Git-index hash were compared against the
Phase 10C snapshot: all 2,647 source entries matched. The snapshot commit contains
154 pre-existing owner file changes, explicitly distinguished from remediation.
It is not a merge into `finalmerge`. No owner checkout, reset, clean, stash, stage,
commit, rebase, dependency install or build was performed there. Normal ignored
artifacts written by an already-running owner dev server are outside this source
integrity assertion. The isolated journey release was not edited.

## Requirement Authority

The repository PRD remains a competition-MVP draft. No newly designated approved
baseline was found in the concept, competition requirements, integration baseline,
owner-change handoff or phase reports. `OWNER_REFERENCE_REQUIRED` is retained.
F01-F10 have independent observed/source evidence and did not require invented PRD
approval to remediate. No deferred feature was promoted into approved scope.

## Disposition Matrix

| Finding | Result | Actual remediation and retest |
| --- | --- | --- |
| F01 Active Journey | PASS | Hunk-level integration; normal General planner exposes Start/Focus/Stop, current GPS origin, backend routes/remaining metrics, maneuvers and arrival. Both public browser routing suites pass. |
| F02 AI | BLOCKED_BY_APPROVED_PROVIDER_CREDENTIAL | Selected `sub2api`; approved runtime/local sources have no usable credential. Normal UI question still returns 503 `AI_PROVIDER_CONFIGURATION` and truthful unavailable UX. No provider switch, key invention or successful placeholder answer. |
| F03 Business Space return | PASS | Existing shared header added to standalone workspace. Normal entry, direct protected entry, real property detail/two-property comparison, desktop/mobile and return to General pass. |
| F04 drawer keyboard | PASS | Native modal plus explicit Tab/Shift+Tab wrapping, initial close-button focus, Escape, trigger restoration and pointer navigation tested. Header design retained. |
| F05 experience activation | PASS | Profile -> Kelola pengalaman -> existing authorized onboarding endpoint -> profile. Existing selections retained, reload persistence verified; ordinary USER temporarily enables UMKM then restores original modes. No account-role or ownership change. |
| F06 auth deep link | PASS | Validated same-origin path preserved through login/onboarding. Anonymous Business Space returns to Business Space after normal login. Unit tests reject external, protocol-relative, encoded/backslash/control and auth-loop targets; missing and expired-equivalent unauthenticated paths covered. No real token-expiry duration claim. |
| F07 Mission status | PASS | History GET no longer eagerly constructs the unconfigured MAPID ingestion client. ADMIN read and normal refresh return 200. Controlled error removes ready/stale metrics; refresh recovers. No ingestion POST executed. |
| F08 admin moderation | PASS | ADMIN-only Fitur/mobile/context entry reaches contribution moderation; ordinary USER has no entry and receives server 403. ADMIN read 200; no review mutation. |
| F09 QA data | OWNER_DECISION_REQUIRED | `QA_DATA_POLICY_OWNER_DECISION_REQUIRED`. No record deletion or guessed name-based hiding. Proposed explicit provenance labels or separately approved demo dataset requires owner policy. |
| F10 Friends | PASS | Proven SQL ambiguity repaired atomically. Ordinary USER gets real empty list HTTP 200. Browser controlled error/retry recovers. Populated projection and error/empty behavior tested with explicitly unit-only fixtures, not invented live relationships. |

## Integration And Runtime Root Causes

Journey integration used the accepted release delta with three-way/per-hunk review.
The owner's dashboard experience wrapper, Business Space workspace, map user-camera
guard, Community, UMKM, search, analytics and stakeholder work were retained.
Controller/policy, request identity, cancellation, race guards, GPS thresholds,
mode identity and geometry authority remain the accepted implementation. No entire
diverged dashboard/map file was blindly replaced.

Mission history previously constructed `MapidMissionSyncService` while serving a
read. Its client loaded missing MAPID provider configuration before the history
repository ran. An authorized direct history-table read succeeded, proving the
status read itself did not need provider credentials. The ingestion runner is now
constructed only when an actual sync is requested; ADMIN enforcement remains.
Missing ingestion credentials are not represented as successful future ingestion.

Friends was reproduced as SQLSTATE `42702`: bare `status` in the function's CTE
conflicted with a `RETURNS TABLE` output variable. The focused migration qualifies
`scoped.status`, `scoped.direction`, `scoped.updated_at` and `scoped.id`. Existing
authentication, participant filtering, sort/paging, function owner, ACL, volatility
and security-definer configuration were preserved. Only this function was replaced,
inside an explicit transaction with bounded lock/statement timeouts, using existing
authorized Supabase CLI management access. No table rows or grants were changed.

Applied file: `backend/supabase/migrations/20260905140000_fix_friendship_list_column_ambiguity.sql`.
This exact standalone migration was applied, not a bulk migration push; it was not
silently registered as an entire pending migration batch. Before/after function
hashes and security-metadata equality are in the sanitized migration evidence.
No other pending owner migration, ownership approval or data ingestion was applied.

The full-product retest also exposed a preserved owner-code compatibility defect
in property detail: PostGIS returned `{type, crs, coordinates}` with `EPSG:4326`,
but the strict Point mapper rejected the metadata. The property adapter now accepts
only verified WGS84 CRS metadata and removes that metadata before strict validation.
Coordinates are unchanged; other CRS and invalid points remain rejected. Live
property detail and comparison now pass, without synthetic geometry or business
metrics. This bounded correction is included in F03's preservation retest.

## Quality Gates

| Gate | Result |
| --- | --- |
| Frontend typecheck / zero-warning lint | PASS / PASS |
| Backend typecheck / zero-warning lint | PASS / PASS |
| Full frontend suite | PASS: 43 files, 268 tests |
| Full backend suite | PASS: 143 files, 925 tests; existing 2 files / 3 tests skipped (145 files / 928 total) |
| Explicit routing suite | PASS: 4 files, 73 tests |
| Frontend production build | PASS, Windows and Linux standalone |
| Backend production build | PASS, Windows and Linux standalone |
| Dependency source | Repository lockfile, `npm ci`; no update or lockfile churn |

Fresh backend typecheck needed generated Next route types for existing `RouteContext`
users. Its command now runs documented `next typegen` before `tsc --noEmit`, so it
does not rely on a prior local build. Relevant installed Next 16.3.1 documentation
was read; no framework upgrade was performed.

The dependency audit reports 8 existing advisories (1 low, 4 moderate, 3 high),
including build/development transitive packages. This phase does not claim a clean
dependency-security audit or silently upgrade the lockfile. Separate dependency
review remains needed before broader release/production claims.

## Actual Browser Evidence

Normal-security Microsoft Edge/Playwright: desktop 1440x1000, mobile viewport
390x844. Viewport emulation and synthetic GPS are not physical-device evidence.
All positive routing geometry and metrics came from the actual authenticated
public GETRA backend, not response mocks.

| Suite | Accepted evidence |
| --- | --- |
| Phase 10 preview | 17 real route summaries; dynamic map/numeric A/B, three modes, repeatability, races, basemap reload, clearing/reset, desktop/mobile framing |
| Phase 10B journey | 10 real route summaries after explicitly simulated GPS; movement reroute, remaining metrics, modes, focus/manual camera, GPS loss, stop, pending race, unmount, controlled arrival |
| Phase 10D UI-only navigation | 9 grouped checks PASS: deep link, Business Space comparison/return, General/provider/USER denial, mobile keyboard, Friends, experience activation, UMKM entry, ADMIN moderation, Mission read/error/refresh |
| HTTPS/auth/security | Trusted TLS 1.3, secure context and geolocation policy; public health 200; anonymous routing/provider-health 401; authenticated semantic provider READY; exact CORS 204, unapproved origin 403 |

Representative nearby results remain walking 953 m / 673 s / 25 points,
motorcycle 1035 m / 150 s / 29 points, and car 8706 m / 1045 s / 385 points.
Journey P1 walking was 787 m / 556 s; P2 walking 730 m / 546 s; P2 motorcycle/car
730 m / 156 s. These are evidence, not constants in product logic. Maneuvers and
remaining metrics come from the backend. The arrival fixture is synthetic GPS
with a real short provider result, never physical-arrival evidence.

The normal-navigation walkthrough used visible product controls, not hidden route
knowledge, to reach product areas. Direct URL entry was used separately for the
explicit deep-link security test. This is an agent walkthrough, not an independent
novice usability study. Screenshots confirm loaded maps, route/position markers,
navigation and readable controls. Full-page stitching can displace fixed headers
in an image and is not used alone as overlap evidence.

Controlled failures are labeled: unavailable/malformed routing, Friends error,
Mission status error. They are not new live Valhalla outages. Initial failures
include two repaired product defects (Point CRS handling and native Tab boundary)
and harness locator/state/navigation-load issues; those failed runs are retained
separately, not counted as acceptance. The final Mission check uses the actual
refresh control, without triggering ingestion.

The ordinary USER fixture's original UMKM mode was false. It was temporarily
enabled through normal UI, observed after reload, then restored through the same
authorized UI. No merchant, friendship, payment, community post or admin review
record was created. The existing merchant-owner fixture still fails ordinary
password-grant authentication: HTTP 400 `invalid_credentials` in this phase.
`MERCHANT_OWNER_DYNAMIC_QA=BLOCKED_BY_AUTHORIZED_FIXTURE`. Owned campaigns,
payments and unexecuted broader mutations remain unaccepted.

## HTTPS Deployment And Rollback

```text
DEPLOYED_QA_SOURCE=FULL_PRODUCT_REMEDIATION_RELEASE
Phone browser -> HTTPS :8443 Funnel -> 127.0.0.1:3003 -> full-product frontend
Browser API -> HTTPS :443 Funnel -> 127.0.0.1:3002 -> full-product backend
Backend -> existing private getra_default network -> valhalla:8002 -> graph
```

The isolated Phase 11 frontend is no longer substituted for the full product.
Both new images are built from committed source, revision-labeled, non-root,
restart `unless-stopped`, capability-dropped, and bounded in memory/log size.
The frontend has no provider-network attachment. The accepted Node image digest
is pinned in [QA Dockerfile](phase10d/Dockerfile). Commands and rollback are in
[runtime notes](phase10d/README.md) and [Compose](phase10d/compose.yml).

Initial candidate health passed on loopback 3012/3013 before handover. One transfer
attempt failed and automatically restarted the old backend/frontend. The retry
succeeded. Subsequent source updates were built while services remained running,
then the two candidate containers were recreated with health waits. Previous
backend/frontend containers and images remain stopped and available for rollback.
The accepted backend and isolated frontend checkouts remain unchanged.

Valhalla kept the same container identity and zero restart count throughout. No
graph rebuild, PBF replacement, raw public port, Funnel reset, hostname change,
reboot, paid provisioning or Vercel deployment was introduced. Only the two
existing Funnel targets remain. The raw backend/frontend/Valhalla listeners are
127.0.0.1:3002 / 3003 / 8002; Docker TCP 2375/2376 has no listener.

Runtime remains Valhalla with 12000 ms timeout and 300000 ms cache TTL. Routing
application paths were compared with the accepted backend source and are unchanged.
Shipping frontend scan found no direct Valhalla/private-VM call or hardcoded
acceptance coordinates. No fabricated fallback was introduced. Existing Phase 7
failure evidence is retained through routing-source/config equivalence.

Runtime configuration is outside checkout under `/home/getra/phase10d-qa`, mode
600. Approved backend values were transferred securely; only allowlisted public
frontend configuration was provided through the build secret mount. Local env
files are ignored, not committed. No AI secret was invented. Exact QA CORS origin
is retained, not a wildcard; a later Vercel origin remains untested.

Final observed resource class: 5.2 GiB RAM, approximately 4.0 GiB available;
4.0 GiB swap, 17 MiB used; 54 GiB root, approximately 30 GiB free. New image/build
storage explains the disk increase; no restart loop or severe pressure observed.
Latest exact readings belong to the delivery runtime evidence.

## Evidence And Files

Sanitized evidence outside protected source: `D:\Getra_Phase10D_QA` contains owner
reconstruction/integrity, SQL diagnosis/migration, build/quality results, runtime
health/security, AI blocker, owner-fixture check and final release lock. Bounded
backend/frontend/Valhalla stdout and stderr logs were scanned without publishing
their raw contents. New added lines and QA artifacts are checked against actual
approved credential values and token/private-key patterns. This is scoped handling
evidence, not a certification of historical repository credentials.

Committed opt-in browser runners write ignored sanitized results/screenshots to
`outputs/phase10`, `outputs/phase10b`, and `outputs/phase10d` in the release clone.
They reuse approved existing ordinary account fixtures and do not export browser
storage state. No Playwright dependency was added to the product lockfile.

Application/test changes after the snapshot are listed below; the snapshot's
legitimate broad owner changes are separate history, not mislabeled remediation:

```text
.gitignore
backend/app/api/admin/mission/sync/route.ts
backend/package.json
backend/src/features/business-space-intelligence/business-space.repository.ts
backend/supabase/migrations/20260905140000_fix_friendship_list_column_ambiguity.sql
backend/tests/integration/admin-mission-read-without-provider.test.ts
backend/tests/unit/business-space/business-space-repository.test.ts
backend/tests/unit/community/friendship-list-migration.test.ts
backend/tests/unit/community/friendship-list-read.test.ts
docs/qa/phase10d/Dockerfile
docs/qa/phase10d/README.md
docs/qa/phase10d/compose.yml
frontend/app/admin/mission-data/page.tsx
frontend/app/business-space/page.tsx
frontend/app/globals.css
frontend/app/login/page.tsx
frontend/app/onboarding/page.tsx
frontend/app/settings/profile/page.tsx
frontend/components/getra-dashboard.tsx
frontend/components/getra-map.tsx
frontend/src/components/getra-ui/getra-global-header.tsx
frontend/src/components/getra-ui/getra-unified-app-shell.tsx
frontend/src/components/providers/AuthProvider.tsx
frontend/src/features/routing/components/journey-controls.tsx
frontend/src/features/routing/journey-controller.ts
frontend/src/features/routing/journey-policy.ts
frontend/src/features/routing/routing-controls.module.css
frontend/src/hooks/use-active-journey.ts
frontend/src/hooks/use-routing.ts
frontend/src/lib/auth-return-path.ts
frontend/tests/auth-return-path.test.ts
frontend/tests/product/phase10d-browser-acceptance.mjs
frontend/tests/routing/browser-user-fixture.mjs
frontend/tests/routing/journey-controller.test.ts
frontend/tests/routing/phase10-browser-acceptance.mjs
frontend/tests/routing/phase10b-browser-acceptance.mjs
```

## Phase 11 Resume Boundary

Previous Phase 11 automated PASS remains valid historical evidence for its own
isolated SHA. This phase adds full-product machine regression, not a restart of
backend infrastructure acceptance. The next owner action is to resume the existing
real-phone/physical-walking checklist at the unchanged QA login URL. Observe only
while safely stopped; no vehicle operation is needed.

Physical GPS movement, rerouting and arrival remain NOT_EXECUTED here. Do not
promote automated synthetic GPS into physical acceptance. AI credential resolution
and the remaining product-policy/fixture/requirement decisions still gate broader
product readiness. Phase 12 remains BLOCKED. Stop after Phase 10D.
