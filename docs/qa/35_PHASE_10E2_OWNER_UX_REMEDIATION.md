# GETRA Phase 10E.2 Owner UX Remediation

Date: 2026-09-06, Asia/Jakarta. Mode: **LOCAL DEVELOPMENT AND QA ONLY**.

## Decision

```text
PHASE_10E2_MACHINE_QA=PASS
LOCAL_UI_READY_FOR_OWNER=YES
OWNER_UX_ACCEPTANCE=PENDING
DEVELOPMENT_MODE=LOCAL_ONLY
PUBLIC_DEPLOYMENT=NOT_EXECUTED
PUBLIC_RUNTIME_FINAL_STATE=UNCHANGED
TAILSCALE_FUNNEL_CHANGE=NO
PUBLIC_CORS_CHANGE=NO
VERCEL_DEPLOYMENT=NO
PRODUCTION_DEPLOYMENT=NO
PHASE_10E_FINAL_STATUS=AWAITING_OWNER_ACCEPTANCE
PHASE_11=DO_NOT_START
```

Local owner review: <http://localhost:3014>.

The local candidate now provides discoverable single-post Community deletion,
a map-first route sheet, genuine selectable route candidates, truthful UMKM
corridor information, and a distinct active-navigation experience. Machine QA
passes, but owner UX acceptance is deliberately not claimed.

## Source Lock And Protection

| Item | Result |
| --- | --- |
| Base | `5574dbb553eacd27f78a589c56049840e11cbbcd` |
| Dedicated workspace | `D:\Getra_Phase10E2` |
| Branch | `phase10e2-owner-ux-remediation` |
| Application commit | `c85b490ca5e14745e277423f3fd1f3f5a1327160` |
| Final release SHA | Resolved after this report commit and recorded in `D:\Getra_Phase10E2_QA\final-release-lock.json` |
| Protected owner workspace | `D:\Getra_Production`, not modified by Phase 10E.2 |

The accepted Phase 10E source was used as the exact base. The later accepted
auth-return-path and visible logout fixes were retained before the UX work. No
checkout, reset, clean, stash, stage, commit, merge, or build was performed in
the protected owner workspace.

## Community Control

The existing server-authorized, auditable soft-delete contract is exposed through
a contextual three-dot action on feed cards and post detail. The author's action
says `Hapus postingan`; ADMIN receives the same action for any author, with
moderation wording when deleting another user's post. Confirmation offers `Batal`
and `Hapus`. Escape, click-away, and focus restoration are supported.

| Actor / behavior | Result |
| --- | --- |
| Anonymous | HTTP 401 |
| Owner USER | Delete succeeds; post disappears; detail becomes not found |
| Different USER | HTTP 403; action not exposed by ownership predicate |
| ADMIN | Delete of another author's disposable post succeeds |
| Mass deletion | Not implemented |

No owner record was bulk-deleted. Browser acceptance created only timestamped
disposable posts and removed them through the normal product action. Existing
comments, moderation provenance, and deleted-content filtering retain the Phase
10E server contract.

## Route Planning UX

Planning keeps the map visible and places a responsive route sheet over it. The
collapsed state presents the selected mode, duration, distance, route count,
`Lihat rute`, and `Mulai Perjalanan`. The expanded state presents touchable cards
for fastest, genuine alternatives, and a UMKM-area choice when the GIS ranking
supports one. Detailed maneuvers remain expandable secondary information.

Selected route cards and route lines select the exact normalized provider
candidate. Selection updates geometry, duration, distance, maneuvers, and UMKM
metadata together. Selected lines are prominent and alternatives remain visible.
Relative time and distance are display arithmetic over provider metrics only;
there are no traffic claims.

The local acceptance pair produced these real candidates:

| Mode | Candidate count | Observed categories / nearby UMKM |
| --- | ---: | --- |
| Walking | 3 | FASTEST 8, UMKM_AREA 11, ALTERNATIVE 4 |
| Motorcycle | 3 | ALTERNATIVE 16, FASTEST 34, ALTERNATIVE 14 |
| Car | 2 | FASTEST 16, ALTERNATIVE 14 |

Candidate availability remains provider-dependent. In the separate car scenario,
the slower alternative had fewer nearby merchants (`16` versus `14`), so the UI
truthfully reported that no better UMKM-area alternative existed. It did not
invent one.

## GIS And Routing Authority

Every successful candidate geometry, distance, duration, and maneuver came from
the real GETRA backend and private Valhalla provider. The unchanged centralized
`ROUTE_UMKM_POLICY.corridorMeters` is `150`; PostGIS analyzes canonical published
merchants near each genuine provider LineString. No merchant waypoint, offset
polyline, straight line, synthetic candidate, or frontend provider call exists.

```text
DIRECT_VALHALLA_FRONTEND_CALL=NONE
FAKE_ROUTE_FALLBACK=NONE
FAKE_UMKM_ROUTE=NONE
UMKM_CORRIDOR=150m
REMAINING_DISTANCE_SOURCE=BACKEND
REMAINING_DURATION_SOURCE=BACKEND
```

## Active Navigation UX

Starting a journey now transitions away from planning controls. The map becomes
dominant, and an over-map maneuver card emphasizes the trusted next instruction
and maneuver distance. A bottom navigation panel presents backend remaining time
and distance, destination, GPS state, walking/motorcycle/car modes, focus,
explicit refresh, stop, and an expandable full maneuver list.

The accepted controller behavior is unchanged: a fresh route begins at current
accepted browser GPS, movement and interval thresholds gate rerouting, stale or
inaccurate fixes are rejected, latest request wins, aborted responses cannot
commit, camera override is respected, focus is explicit, stop cleans up the
watcher, and arrival remains guarded. MapLibre geometry is not used to infer
maneuvers or remaining metrics.

## Local QA Architecture

```text
Owner browser -> http://localhost:3014
  -> local reverse proxy
     -> local committed frontend on 127.0.0.1:3016
     -> SSH tunnel 127.0.0.1:3015
        -> existing historical backend on Ubuntu 127.0.0.1:3002
        -> private Valhalla on the existing Docker network
```

This same-origin local gateway allowed real authenticated provider routing without
a public CORS change. No browser security bypass, route mock, service-role browser
session, or credential output was used. The local frontend and proxy remain
available for owner review while the machine is running.

## Quality Gates

| Gate | Result |
| --- | --- |
| Frontend typecheck / zero-warning lint | PASS / PASS |
| Full frontend tests | PASS, 44 files / 275 tests |
| Full backend tests | PASS, 147 files / 938 tests; 2 files / 3 tests skipped |
| Focused frontend routing + Community | PASS, 6 files / 85 tests |
| Focused backend routing + Community | PASS, 8 files / 37 tests |
| Frontend production build | PASS |
| Backend production build | PASS; backend application source unchanged |
| Phase 10 preview regression | PASS, real backend, dynamic A/B and three modes |
| Phase 10B journey regression | PASS, synthetic GPS explicitly recorded; physical travel false |
| Phase 10E Community/multi-route regression | PASS |
| Phase 10E.2 map-first planning/active UX | PASS on 1440x1000 and 390x844 |

The QA verifies owner/ADMIN deletion and confirmation, different-user denial,
route summary collapse/expand, card and line selection, multiple map lines, real
UMKM enrichment, Start transition, next maneuver, remaining metrics, mode changes,
camera override/focus, stop, route races, GPS recovery, and controlled arrival.
Screenshots are under ignored `outputs/phase10e` and `outputs/phase10e2`.

## Public Staging Protection

The owner supplied the local-only override while an earlier public deployment
command was already in progress. Its candidate containers briefly acquired ports
3002/3003 before the override was processed. They were immediately stopped and
the historical public frontend/backend were restored. No Funnel, hostname, CORS,
Valhalla, database, or public secret configuration changed.

Final verification shows the candidate containers stopped, historical frontend
and backend healthy on loopback 3003/3002, the same Valhalla container healthy
with restart count zero, and Funnel mappings unchanged at 443 -> 3002 and
8443 -> 3003. Phase 10E.2 was not left deployed publicly. This operational event
is retained here rather than being hidden by the final-state assertion.

## Owner Review Boundary

The owner should inspect the localhost UI for Community delete, confirmation,
route sheet, fastest and alternative selection, the genuine UMKM-area candidate,
Start transition, next maneuver, remaining metrics, focus, and stop. This is
visual product acceptance, not another physical GPS journey.

`OWNER_UX_ACCEPTANCE=PENDING`. Do not start Phase 11, deploy this candidate, or
declare Phase 10E closed until the owner reviews the local UI.
