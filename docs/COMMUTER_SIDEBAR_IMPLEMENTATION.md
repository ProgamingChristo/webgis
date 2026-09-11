# GETRA Final General/Commuter Experience — Implementation Report

## 1. Current finalmerge HEAD

Implementation was based on `finalmerge` commit `b5c3be78bebd1e90728f59bce21f44143a131498` (`update ui 9/10`). The work remains uncommitted for review.

## 2. Root causes

The dashboard queried canonical merchants without meaningful user context, mixed technical datasets and consumer discovery, kept parallel result/route controls, treated AI as an explanation surface instead of a typed search input, and had no database radius RPC for canonical merchants.

## 3. Default map changes

General GETRA now starts in `IDLE`: no canonical merchant request, merchant row, merchant marker, recommendation, advertisement, Property Go point, activity point, or transaction point is activated. Viewport movement alone does not start a search. Reset clears results locally without issuing an all-merchant request.

## 4. Stakeholder/layer changes

Authorization remains `USER | ADMIN`. Investor still mounts `BusinessSpaceWorkspace`; Property Go is no longer offered from General/Commuter controls. General and UMKM explanatory banners are suppressed only in this map-first workspace. Optional accessibility, fair-discovery, analytics, datasets, and campaign management remain under contextual or progressive controls.

## 5. Sidebar changes

The left sidebar is the primary result surface: GETRA identity, Cari/Rute tabs, global search, one location control, radius, quick filters, scope, dynamic result header, compact rows, and a collapsed route summary. Desktop, tablet overlay, and mobile bottom-sheet layouts use scoped GETRA design tokens.

## 6. OpenAI/Tanya GETRA architecture

`AiPanel → /api/ai/ask → OpenAI Responses API → strict structured action → canonical search`. The key and model are backend-only environment values. OpenAI returns criteria, not merchants, distance, routes, scores, or success claims. The frontend reports result count only after the canonical request finishes. Chat history persists across minimize/reopen, supports follow-ups, and never duplicates merchant cards.

## 7. Expert System architecture

The backend applies validated hard filters first, resolves the spatial reference, retrieves canonical evidence, and then runs a versioned deterministic scorer. Each result carries component scores, coverage, reasons, and ruleset version for explanation.

## 8. Food normalization

`resolveFoodEntity` normalizes Indonesian text generically and has a small versioned alias vocabulary (`baso → bakso`, `nasgor → nasi goreng`, `mi goreng → mie goreng`, `gultik → gulai tikungan`). Unknown food remains searchable normalized text. Matching uses canonical name/category, approved metadata, and Menu Go evidence.

## 9. Ranking method

Ruleset `commuter-v1` uses food 40%, budget 25%, spatial 25%, opening 10%. Unknown evidence is excluded from the available-weight denominator, then a coverage factor tempers confidence. Explicit budget, published status, geometry, food relevance, and radius remain hard constraints. Taste is reported as unknown when no real review evidence exists.

## 10. Sponsored promotion logic

Campaign serving runs only after an active merchant context. A sponsored placement appears in a separate `Promosi` lane only when its merchant ID is also present in the canonical result after keyword, budget, opening, and spatial filters. Organic recommendation scores and order are unchanged. Idle maps contain no advertisements.

## 11. Map/result synchronization

Sidebar rows, map markers, popup, and detail drawer share canonical merchant IDs and `selectedId`. Stale requests are aborted. Route context retains only the destination merchant plus route geometry, preventing unrelated marker clutter.

## 12. Selected merchant state

A row or marker selects one canonical merchant, focuses it, opens the same popup, and scrolls the matching row into view. Clearing selection restores the active result set without refetching all merchants.

## 13. Quick popup changes

The MapLibre popup uses DOM `textContent`, a real safe HTTPS photo or neutral fallback, name/category, known status, price/hours, honest straight-line reference evidence, and `Lihat detail` / `Rute ke sini`. Network walking time is shown only when routing marks it `ROUTABLE`.

## 14. Full place detail changes

The consumer drawer now shows the merchant hero image, name/category, status, coherent address, price, hours, phone when known, media gallery, and one route action. Internal `DATA GETRA`, coordinate, source, district metric, textual menu, and duplicate destination blocks are absent from this consumer view.

## 15. Foto & Menu implementation

The gallery uses canonical place and Menu Go image URLs plus approved owner storefront media. Only valid HTTPS URLs are rendered; failed or absent media gets a neutral fallback. No synthetic images or textual menu are created.

## 16. Address enrichment/formatting

Canonical address is preferred. If absent, the UI joins available village, district, and city fields once. Missing address stays `Alamat belum tersedia`.

## 17. Routing before/after

Before: duplicate destination inputs, manual `Hitung Rute`, duplicate CTA, and `Tujuan UMKM berikutnya`. After: `Rute ke sini` closes detail/chat, retains the chosen destination, requests GPS if needed, switches to Rute, and the existing routing hook calculates automatically. One Jalan kaki/Motor/Mobil selector remains; manual coordinates are under advanced disclosure; JourneyController still owns throttled live navigation and rerouting.

## 18. Files changed

- UI/map: `frontend/components/getra-dashboard.tsx`, `getra-map.tsx`, `ai/ai-panel.tsx`, global-search sidebar/control/row/popup/presentation/detail files and scoped CSS.
- Frontend contracts: AI/map services, hooks, stakeholder contexts, fair-discovery integration, shared merchant/search types.
- Backend: OpenAI provider, AI schema/service/action extraction, global-search schema/service/reference/normalization/ranking, canonical merchant mapper/read service, commuter opening metadata, safe errors.
- Database: `backend/supabase/migrations/20260911150000_contextual_merchant_nearby.sql`.
- Tests/evidence: AI, global-search, migration, business-space boundary, browser harness, screenshots, and JSON under `docs/verification/commuter-sidebar`.

## 19. Database migrations/RPCs

The new migration adds a partial GiST geography index and service-role-only `search_canonical_merchants_nearby_v1`. The RPC uses `ST_DWithin` for radius eligibility, `ST_Distance` for spatial evidence/order, canonical publication/source requirements, parameterized evidence matching, stable pagination, and a 250–3000 m radius bound.

## 20. Tests added

Tests cover structured AI extraction and one-call behavior, context follow-up, food aliases, missing-aware scoring, deterministic tie order, radius constraints, reference resolution, PostGIS migration security, consumer detail truthfulness, sponsored labels, idle behavior, selection, popup/detail/route, empty/error/retry, and responsive layouts.

## 21. Exact test commands

```powershell
npm run lint -w frontend
npm run lint -w backend
npm run typecheck
npm run test -w frontend
npm run test -w backend
npm run build -w frontend
npm run build -w backend
npm run db:lint
node scripts/verify-commuter-sidebar.mjs
git diff --check
```

## 22. Exact results

- Frontend lint: PASS, zero warnings.
- Backend lint: PASS, zero warnings.
- Root typecheck: PASS.
- Frontend tests: PASS, 52 files / 324 tests.
- Backend tests: PASS, 151 files passed + 2 skipped / 960 tests passed + 3 skipped.
- Frontend and backend production builds: PASS.
- Browser fixture: PASS; idle rows 0, no reset query, popup photo, clean detail, route handoff, AI recommendation/follow-up, fair discovery, and 1440/1280/820/390 px without horizontal overflow.
- `git diff --check`: PASS.

## 23. Pre-existing failures

No source lint, type, test, or build failure remains. Two source-contract tests expected controls that the approved final brief explicitly removed; their assertions were updated to the new stakeholder and automatic-routing contracts.

## 24. Remaining blockers

`npm run db:lint` cannot connect to local Supabase at `127.0.0.1:54322` because the local database is not running. The migration has static security/SQL tests but is not applied or live-tested. Browser evidence uses explicit fixtures; real authenticated merchant inventory and Valhalla route availability depend on the local/runtime services. The prior minimal OpenAI connectivity check succeeded; no additional paid call was made in this continuation.

## 25. Requirement matrix

| Requirement | Status | Evidence |
| --- | --- | --- |
| Clean idle map/no premature query | PASS | Browser `idleRows: 0`; reset sends no request |
| Contextual area/search/nearby | PASS | Canonical query + PostGIS RPC contract |
| Server-side OpenAI structured intent | PASS | AI action schema/service/tests |
| Deterministic expert ranking | PASS | `commuter-v1` scorer/tests |
| Sponsored relevance without score boost | PASS | Canonical-ID intersection and separate lane |
| Sidebar/map/popup/detail identity | PASS | Shared ID and browser flow |
| Consumer place detail/media | PASS | Component/test/browser `detailClean` |
| One-tap route and journey reuse | PASS | Automatic routing hook and browser route request |
| USER/ADMIN and stakeholder separation | PASS | Existing auth contract; Investor workspace boundary |
| Migration deployed to local database | BLOCKED | Supabase local port 54322 unavailable |

## 26. Final status

Implementation is complete and reviewable in the worktree. UI, frontend/backend behavior, deterministic recommendation, ad separation, popup/detail, routing handoff, tests, builds, and fixture browser verification pass. Database migration deployment remains explicitly unverified until local Supabase is started.
