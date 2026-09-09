# Finalmerge branch audit and integration

Audit started 8 September 2026; final validation completed 9 September 2026 (Asia/Jakarta).

All 8 local branch refs and 20 remote branch refs observed in `ProgamingChristo/webgis` are ancestors of the validated integration candidate. The target is `finalmerge`. Source branches are retained, with no history rewriting or branch deletion.

## Source identity

- Original local `finalmerge`: `dfd2f3aab15f2c275e2f78076fdffb211d7d2ff8`.
- Original `origin/finalmerge`: `cfc58884940a2c44489c64eb05447859190f7bdd`.
- Validated code candidate: `115f405d3a6ddc20bfd2ce717253579267d1a542`. This report is a subsequent documentation-only commit.
- Integration worktree: `D:\Getra_Finalmerge_Integration_20260908`, created detached from the original local `finalmerge`.
- `git fetch --all --prune` and a final remote recheck found no source branch tip changes during the audit.
- Every source SHA below passed `git merge-base --is-ancestor <source> <candidate>`: 28/28.

Five merge heads cover the missing ancestry:

| Source head | Integration merge | Resolution |
| --- | --- | --- |
| `phase12a24a-multi-route-polish` / `2d94383` | `77c7ef5` | Latest product fixes, candidate routing, map hierarchy and GPS lifecycle; preserve local merchant archive and compatible legacy routing contracts. |
| `phase12a23-real-sleep-wake-recovery` / `5b52be0` | `2fea54c` | Existing recovery scripts, reports and browser harness changes; scripts were not executed or installed. |
| `full-product-navigation-community-release` / `900a89c` | `1e3823f` | Both unique commits are patch-equivalent to changes already in the latest product lineage; retain ancestry without reverting later code. |
| `routing-staging-release` / `b3fded2` | `99397ee` | Explicit Promise-based route context types in four advertising handlers. |
| `integration/phase8-codex` / `430328d` | `17dfaa4` | Port canonical data and transport markers into the current authenticated frontend. |

The duplicate navigation commits are `c92a8a0` / `d6e58ec` (auth return paths) and `900a89c` / `0df11ec` (logout). `git cherry` verified their patch equivalence.

## Audited branch inventory

Each row is included in the candidate's ancestry. SHAs identify the source snapshots, rather than claiming those branches run in a browser.

| Local branch | Source SHA |
| --- | --- |
| `develop` | `0fb06bb45b41d2025211aadf4b3334c0a759cbef` |
| `finalmerge` | `dfd2f3aab15f2c275e2f78076fdffb211d7d2ff8` |
| `integration/phase8-codex` | `430328db845c01e0c73c1a565e1dbb12856e624a` |
| `integration/phase9-gemini` | `fe888033e8cb4251f3638023495e8a09ffa54112` |
| `main` | `8be5f1b114ccaceb427ac11101a7223a0f4ddd04` |
| `routing-active-journey-release` | `11a6f90b54815816b76097e7f527d69052cc8732` |
| `routing-frontend-release` | `0b02909d2015ff4aebee7013feb5b1c7e5c81202` |
| `routing-staging-release` | `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe` |

| Remote branch under `origin/` | Source SHA |
| --- | --- |
| `finalmerge` | `cfc58884940a2c44489c64eb05447859190f7bdd` |
| `frontend-ui` | `8be5f1b114ccaceb427ac11101a7223a0f4ddd04` |
| `full-product-navigation-community-release` | `900a89cca2b46605ee080f5563e3381e90a4637b` |
| `full-product-remediation-release` | `aca8ef4659ba8dbab3c13dd2e5e8c25dafe12b55` |
| `integration/phase8-codex` | `430328db845c01e0c73c1a565e1dbb12856e624a` |
| `integration/phase9-gemini` | `fe888033e8cb4251f3638023495e8a09ffa54112` |
| `main` | `8be5f1b114ccaceb427ac11101a7223a0f4ddd04` |
| `phase10e2-owner-ux-remediation` | `5dc60c1ae1c94aeeaac51191931851cf628b20cd` |
| `phase10e3-owner-ux-gap-fix` | `e87e8ee5dd42ecdac1e6587b12e8c8e9f3a673c3` |
| `phase12a-final-product-closure` | `80424a3c112bb851771617c46a8cd51a26b2861c` |
| `phase12a2-2-sleep-wake-routing-resilience` | `3fa5280c826c230230dd322ca4c3b72bf6b477e2` |
| `phase12a2-routing-availability-remediation` | `da141d4d3241cc6b9facc1ea5610c457411f8996` |
| `phase12a21-maps-routing-ux` | `72e1ef514e365180ddbec45235f33692b7f24aa3` |
| `phase12a23-real-sleep-wake-recovery` | `5b52be0779bb72d9178213f6f87c21c5d62302ed` |
| `phase12a24-routing-gps-polish` | `6b7b1e09d338dcbad22cda4971384936cf7ae384` |
| `phase12a24a-multi-route-polish` | `2d943831e2d9fe59faa59fad335d8ef515c84b32` |
| `routing-active-journey-release` | `11a6f90b54815816b76097e7f527d69052cc8732` |
| `routing-frontend-release` | `0b02909d2015ff4aebee7013feb5b1c7e5c81202` |
| `routing-staging-release` | `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe` |
| `versi-1` | `2a7d8415f401eedcc560839a84b14b5e6234c871` |

## Conflict and compatibility decisions

- Retain merchant archive endpoint, owner-scoped RPC migration, published-merchant filtering, UI and tests from local `finalmerge`.
- Use the latest provider candidate/GPS/map implementation. Keep compatible `routes` fields and legacy components, provider street names, warnings and optional `useRouting()` input. Both route representations derive from the same validated provider geometry; malformed alternatives are discarded.
- Match routing cache identity to the preserved provider default: omitted alternatives and explicit `true` share an entry, while explicit `false` stays separate. Route-specific warnings follow selection; frontend-wide UMKM availability warnings remain visible.
- Preserve the newer PostGIS WGS84 geometry normalization and its rejection of unsupported CRS metadata.
- Adapt Phase 8's legacy API adapter to `getGetraApiUrl` and `authenticatedFetch`. Requests wait for the current user, cancel on identity changes and hide stale data. The adapter accepts the actual v1 `{data}` / `{items}` envelopes. Transport markers have separate cleanup and coordinate validation. UI counts describe loaded rows; nodes/corridors remain bounded to their first 100 entries.
- The incoming frontend `/api/[...path]` proxy formerly defaulted to localhost port 3002, spoofed a fixed Origin and returned wildcard preflights. It now requires a valid explicit `GETRA_BACKEND_INTERNAL_URL`; missing configuration returns 503 without network access. It preserves browser Origin and authorization, delegates preflight policy to the backend, confines API paths, strips hop-by-hop/stale compression headers, and disables fetch caching. The server-only variable is documented in `.env.example`.
- Historical Phase 8 reports retain their original failed runtime findings with an explicit historical note. This audit does not turn old runtime failures into a new runtime acceptance claim.

## Validation

Validation used Node `v25.2.1`, the committed npm lockfile and Next.js `16.3.1`. Relevant installed Next build, TypeScript, client-component and route-handler guides were read. `npm ci --no-audit --no-fund` completed without lockfile changes. MapLibre worker preparation produced no Git content changes.

| Check | Result | Local evidence under `outputs/finalmerge-audit-20260908/` |
| --- | --- | --- |
| Frontend test suite | PASS: 50 files, 313 tests | `frontend-tests-final.log` |
| Backend test suite | PASS: 148 files, 948 tests; 2 files / 3 tests skipped | `backend-tests-final.log` |
| Full frontend and backend lint | PASS, zero warnings | `lint-final.log` |
| Frontend, backend and root TypeScript | PASS | `typecheck.log` |
| Full frontend and backend production build | PASS | `build-final.log` |
| Windows recovery script parsing | PASS: all 3 PowerShell files; no execution | Parser check during audit |
| Diff whitespace / conflict markers | PASS | `git diff --check`; resolved index |
| Source ancestry | PASS: 28/28 source refs | `branch-containment.json`, `source-refs.txt` |
| Existing user work | PASS: all 5 files have unchanged SHA-256 hashes | `initial-workfile-hashes.json` |

The skipped suites require external Supabase credentials or explicit MAPID runtime verification. No database migration or data mutation was executed. These checks do not validate the public deployment, physical GPS, actual Valhalla availability, or owner sleep/wake recovery.

## Runtime boundary and preserved workspace

This is repository integration authorized by the owner. Phase 12A.3 and Phase 12B remain on hold. No source deployment, service restart, Docker prune, graph rebuild, Funnel reset, or recovery-task installation was performed.

During the 8 September read-only process inspection, ports 3000/8080 were associated with processes under `D:\Getra_Final_12A22` (checkout HEAD `3fa5280`); port 3001 used a standalone frontend under `D:\Getra_Phase12A24` (checkout HEAD `0ec38d1`); port 3050 used a standalone frontend under `D:\Getra_Final_12A2`. Checkout HEAD alone does not prove the revision of a running build. Docker Desktop's Linux-engine pipe was unavailable. The failing browser's exact serving build therefore remains unverified by this Git audit.

The existing recovery report attributes historical failures to battery restrictions on the scheduled task and stale VMware networking, and records owner sleep/wake acceptance as pending. Those historical findings do not establish the current incident's root cause.

Existing owner files retained without including them in the merge:

- `docs/react-devtools-suspense.md` (modified tracked file).
- `scripts/open-getra-dev-browser.ps1` (untracked).
- `tmp/browser-routing-success.png` (untracked).
- `tmp/test-browser-routing.mjs` (untracked).
- `tmp/test-routing-auth.mjs` (untracked).

Other present registered source worktrees were clean. The absent `D:\Getra_SourceLock_2cf252e` registration was left intact; its branch commit was still available and integrated.
