# GETRA Phase 10E Community, Multi-Route, And UMKM-Aware Navigation

Date: 2026-09-05, Asia/Jakarta.

## Decision

```text
PHASE_10E_STATUS=VERIFIED_WITH_EXTERNAL_BLOCKER
PRE_PHASE10E_OWNER_PHYSICAL_OBSERVATION=PASS_REPORTED
POST_PHASE10E_PHYSICAL_RECHECK=REQUIRED
PHASE_11_FINAL_STATUS=AWAITING_POST_CHANGE_PHYSICAL_RECHECK
PHASE_12_READINESS=BLOCKED
AI_STATUS=BLOCKED_BY_APPROVED_PROVIDER_CREDENTIAL
F09_QA_DATA=OWNER_DECISION_REQUIRED
ENVIRONMENT_TYPE=SHARED_STAGING
HOSTING_CLASS=OWNER_HOSTED_TAILSCALE_STAGING
COMPUTE_AVAILABILITY=OWNER_MACHINE_DEPENDENT
24_7_AVAILABILITY=NO
REMOTE_VPS=NO
```

Phase 10E adds auditable single-post Community deletion, genuine provider route
candidates, a responsive route-selection experience, and bounded PostGIS UMKM
corridor analysis to the full GETRA product. All successful route geometry,
distance, duration, and maneuvers remain provider-derived. The implementation
does not synthesize alternatives, merchant detours, traffic, distance, or ETA.

The owner reported that the pre-10E physical Active Journey check worked. Exact
GPS traces, metrics, and arrival evidence were not supplied and are not inferred.
Because navigation source changed, final Phase 11 remains pending a focused real
phone recheck against the locked Phase 10E runtime.

Public frontend: <https://getra-routing-api.tail0ed517.ts.net:8443>

Public backend: <https://getra-routing-api.tail0ed517.ts.net>

## Source Lock And Protection

| Item | Result |
| --- | --- |
| Phase 10D base SHA | `aca8ef4659ba8dbab3c13dd2e5e8c25dafe12b55` |
| Dedicated workspace | `D:\Getra_FullProduct_10E` |
| Branch | `full-product-navigation-community-release` |
| Application implementation commit | `685147b4a0fa16eeb8a5b855388cbcea0e6451cf` |
| QA runner commits | `da70dbd964cacb7fb2917f47061801896026dd38`, then the final pre-report runner commit |
| Final release SHA | Resolved after the commit containing this report; recorded in `D:\Getra_Phase10E_QA\final-release-lock.json` |
| Owner workspace | `D:\Getra_Production`, unchanged by Phase 10E |
| Owner branch / HEAD | `finalmerge` / `2cf252e8bfcedbff42a40de07d6227e34ca63499` |

A commit cannot contain its own hash. The external final lock records local,
remote, Ubuntu checkout, and both deployed image revision labels after this
report is committed. No reset, clean, stash, checkout, stage, commit, merge, or
rebase was performed in the protected owner workspace.

## Community Deletion Contract

Deletion is an individual, confirmed soft-delete. There is no delete-all,
truncate, cascade wipe, or mass-delete action.

| Actor | Server result | UI |
| --- | --- | --- |
| Anonymous | HTTP 401 | No authenticated action |
| Different USER | HTTP 403 | Ownership predicate does not expose the action |
| Owner | HTTP 200, `OWNER` audit class | Menu, confirmation, cancel, delete |
| ADMIN | HTTP 200, `ADMIN` audit class | Same moderation action on any post |

`delete_community_post_v1` obtains `auth.uid()`, locks one matching post, checks
owner or the existing `community_is_admin()` contract, marks it `REMOVED`, and
stores `deleted_at`, `deleted_by`, and actor class. A separate RLS-protected audit
row retains server-side provenance. Existing feed and detail RPCs already exclude
`REMOVED`; ordinary users do not receive deleted content.

Browser acceptance used timestamped disposable posts only. Owner cancel kept the
post, owner delete removed it and direct detail returned 404, a different valid
USER session received 403 for a forged DELETE, and ADMIN deleted a disposable
post from the first USER through the visible confirmation UI. Every Phase 10E
disposable post was verified `REMOVED`. The second USER is valid but not onboarded,
so its cross-user card visibility is not claimed as a normal-product UI check;
server denial, source ownership visibility, owner UI, ADMIN UI, and focused tests
provide the scoped authorization evidence without mutating that profile.

## Provider Alternatives

The deployed Valhalla 3.8.3 capability was checked against its live response and
the official Valhalla OpenAPI/configuration sources. `alternates` is supported,
but candidate availability varies by route and mode. A nearby request legitimately
returned only a primary route. The cross-region car request returned a primary
plus one distinct provider alternative.

References:

- <https://github.com/valhalla/valhalla/blob/master/docs/docs/api/openapi.yaml>
- <https://github.com/valhalla/valhalla/blob/master/scripts/valhalla_build_config>

`VALHALLA_ALTERNATIVE_ROUTE_SUPPORT=SUPPORTED` with route-dependent availability.
GETRA requests at most two alternates and normalizes at most three candidates.
Each candidate retains request-scoped ID, rank, primary/category state, mode,
provider distance, duration, LineString, maneuvers, and road flags. A malformed
alternative is discarded while a valid primary remains usable. A malformed
primary remains a truthful provider failure with no geometry.

The existing single-route response remains intact. Additive fields are
`route_candidates`, `route_preference`, `selected_route_id`,
`umkm_preference_available`, and `umkm_enrichment_status`. Legacy clients do not
send new default fields unless they explicitly request them.

## UMKM GIS Method

```text
Valhalla genuine candidates
  -> candidate LineString geography
  -> PostGIS ST_DWithin, 150 meter corridor
  -> canonical published merchant counts
  -> bounded ranking
  -> selected genuine candidate
```

The service-role-only corridor RPC accepts at most three valid route candidates.
It counts distinct published merchants with canonical MAPID Premium or MENU_GO
source links, verified merchants, and distinct categories. It returns summaries,
not merchant rows. The existing `idx_merchants_location_geography_gist` was found
before migration; no duplicate index was added, and the observed query plan used
that index.

Central policy in `ROUTE_UMKM_POLICY`:

```text
CORRIDOR_METERS=150
MAXIMUM_DURATION_RATIO=1.35
MAXIMUM_DISTANCE_RATIO=1.35
MAXIMUM_CANDIDATES=3
```

FASTEST always uses the lowest provider duration. UMKM preference may select a
richer non-fastest candidate only when it remains within both bounds and has a
higher nearby count. Otherwise fastest remains selected and the UI says that no
UMKM-area alternative is available. A GIS failure retains valid routing and says
that route UMKM data is unavailable.

The accepted public cross-region car result had two genuine candidates and
PostGIS nearby counts `[16, 14]`. The slower route was not richer, so the truthful
`TRUTHFUL_NOT_AVAILABLE` branch passed. No waypoint was injected and no fake UMKM
route was created.

## Navigation Experience

Preview exposes a compact mode/duration/distance overview, expandable responsive
route sheet, selected semantics, fastest/alternative categories, provider metric
deltas, optional UMKM counts, and Start Journey. On the map, the selected route is
emphasized and other candidates are secondary lines; cards and lines can select a
candidate. Style reload rebinds line interaction without another API request.

During Active Journey, manual A/B controls are hidden. The map and navigation
sheet prioritize the trusted next maneuver, maneuver distance when supplied,
backend remaining duration/distance, destination, focus, refresh, and stop. A
fresh route always starts from accepted browser GPS. Existing movement/time gates,
latest-response-wins, abort, mode identity, camera override/focus, stop, and
arrival rules remain centralized and tested.

No real-time traffic claim was added. Relative duration and distance deltas are
arithmetic on provider metrics only.

## Performance Observation

Shared staging observation, not an SLA:

| Item | Result |
| --- | ---: |
| Private Valhalla cross-region request | HTTP 200, 831 ms |
| Provider response size | 37,769 bytes |
| Provider alternatives | 1 alternate plus primary |
| PostGIS corridor planning / execution | 0.083 / 314.108 ms |
| Public normalized response size | 59,613 bytes |
| Browser flow to accepted cross-region result | approximately 8,380 ms |

Provider, candidate count, corridor radius, and returned metadata are bounded.
The browser flow measurement includes UI/request sequencing and is not presented
as provider-only latency.

## Quality And Browser Gates

| Gate | Result |
| --- | --- |
| Frontend typecheck / zero-warning lint | PASS / PASS |
| Backend typecheck / zero-warning lint | PASS / PASS |
| Frontend tests | PASS, 44 files / 273 tests |
| Backend tests | PASS, 147 files / 938 tests; existing 2 files / 3 tests skipped |
| Focused 10E backend tests | PASS, 5 files / 20 tests |
| Frontend production build | PASS, Windows and Linux |
| Backend production build | PASS, Windows and Linux |
| Phase 10 public preview regression | PASS, 17 real route summaries |
| Phase 10B public journey regression | PASS, 10 real route summaries; synthetic GPS, physical travel false |
| Phase 10E public browser acceptance | PASS, Community + multi-route + responsive sheet |

The first journey rerun immediately after the 17-request preview suite reached the
route rate window and timed out before checks. After the window cleared, the
unchanged suite passed all checks. Failed/intermediate disposable runs were kept
as evidence and their posts were removed through the owner deletion contract.

The public HTTPS checks cover normal login, exact-origin CORS inherited from the
Phase 10D deployment, Community owner/admin deletion, different-user 403,
three-mode preview, dynamic A/B, two genuine cross-region car candidates, route
sheet selection, truthful unavailable UMKM option, Start Journey visibility,
Active Journey, mobile viewport, race safety, and provider-derived geometry and
metrics. Controlled errors are not represented as live outages.

## Deployment And Security

The Phase 10E full-product frontend/backend replace Phase 10D at the same loopback
targets and existing Funnel URLs. Valhalla remained the same private container
with no restart. No Funnel reset, raw public port, Docker API, private provider
URL, secret, auth token, or service-role value was exposed.

The exact scoped migration was applied through the previously approved Supabase
management mechanism with transaction timeouts. No unrelated pending migration
was pushed and no row was deleted by migration. Function ACLs expose delete only
to authenticated/service role and corridor analysis only to service role.

Shipping frontend scans contain no direct Valhalla/private VM call and no Phase 9
acceptance coordinate product constants. Cache keys isolate A/B, mode, alternative
configuration, and route preference. Provider/GIS failures do not produce a
straight line, fake route, fake distance, or fake duration.

## Remaining Boundaries

`AI_STATUS=BLOCKED_BY_APPROVED_PROVIDER_CREDENTIAL`; no key or provider was
invented. `F09_QA_DATA=OWNER_DECISION_REQUIRED`; no historical content was deleted
or hidden by guessed naming. Permanent hosting and Vercel remain outside this
owner-hosted staging phase.

The next action is the focused Phase 11 real-phone smoke test: public HTTPS login,
walking preview, route sheet/selection, Start Journey, real GPS marker, safe walk
beyond the routing threshold, observed reroute and backend remaining metrics,
Focus Location, and Stop Journey. Phase 12 must not start before that acceptance
and the existing product blockers are resolved or formally re-scoped.
