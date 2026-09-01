# UMKM and navigation production-readiness report

Date: 2026-08-31

## Delivered

- Reworked the UMKM workspace hierarchy, onboarding state, feature grouping, locked-state copy, submission cards, photo preview, and UMKM-only admin review surface.
- Separated merchant identity, submission type, status, explanation, metadata, and action in submission cards.
- Added a user-owned claim detail route so `Lihat Detail` is a real contextual action for merchant claims.
- Added server-side Valhalla routing for walking, motorcycle, and car, with normalized geometry, ETA, maneuvers, failure states, caching, authentication, request validation, and rate limiting.
- Added parallel mode comparison and deterministic recommendation logic in the frontend while preserving MapLibre as the route renderer.
- Added Jabodetabek graph preparation, ignored runtime data storage, pinned Valhalla image, graph preflight validation, provider healthcheck, and dependency-aware Compose startup.
- Removed stale root Next.js build artifacts from the root TypeScript project so the root gate validates source instead of obsolete generated routes.

## Verified gates

- `npm run typecheck`: PASS.
- `npm run lint`: PASS with zero warnings.
- Frontend tests: 85 passed.
- Backend tests: 807 passed, 3 skipped by the suite.
- Frontend production build: PASS, including `/umkm/claims/[id]`.
- Backend production build: PASS, including `/api/routing`.
- Compose YAML parse: PASS.
- Routing preparation PowerShell parse: PASS.
- `git diff --check`: PASS; Git only reports repository line-ending notices.
- Local frontend `/umkm`: HTTP 200.
- Local backend `/api/health`: HTTP 200 with the configured development database.

## Responsive UI hardening

- Removed duplicate UMKM and Advertising page headings inside the shared app shell.
- Increased wrapped heading line-height and added overflow containment to the shared shell without redesigning unrelated modules.
- Delayed the merchant/submission split until wide desktop so submission cards are not forced into a narrow laptop column.
- Hardened merchant, submission, claim, admin review, campaign, targeting, analytics, payment, map-coordinate, and upload layouts for long names and metadata.
- Kept status badges and compact actions on one line while allowing their parent rows to stack or wrap on narrow screens.
- Made campaign actions and tabs responsive grids on mobile, and made payment dialogs scroll within short viewports.
- Replaced broken encoded symbols in UMKM targeting and eligibility surfaces with existing Lucide icons.
- Added a regression test using an intentionally long merchant name, address, and category. The frontend suite now reports 86 passing tests.

## Deployment blockers not hidden as PASS

1. A live Jabodetabek graph was not built in this workstation. Docker, Podman, `nerdctl`, and `osmium` are unavailable; WSL distribution enumeration is access-denied. `npm run routing:validate` therefore correctly fails because `routing-data/jabodetabek.osm.pbf` is absent.
2. Desktop, laptop, and mobile visual QA is not verified because no in-app or extension browser is connected to the available browser runtime. Source-level responsive rules, non-wrapping status badges, and production compilation are verified, but screenshots and interactions are not.

The codebase is build-ready and fails closed when routing data is absent. Deployment must not be declared production-ready until both blockers above are closed on an environment with the required runtime.

## Required release procedure

1. Install Docker and `osmium-tool` on the deployment preparation host.
2. Run `npm run routing:prepare` and review the reported `osmium fileinfo` output.
3. Run `npm run routing:start`; it validates the PBF and waits for Valhalla `/status` before starting the backend.
4. Check `http://127.0.0.1:8002/status?verbose=true` for actual Jabodetabek tile coverage.
5. Run authenticated routes in central Jakarta and near each graph boundary for all three modes; never replace `OUTSIDE_GRAPH` with a straight line.
6. Connect a browser and verify `/umkm`, `/umkm/merchants/new`, `/umkm/claims/[id]`, `/umkm/submissions/[id]`, `/umkm/advertising`, and `/admin/umkm` at wide desktop, laptop, and mobile widths.
7. Repeat typecheck, lint, tests, and both production builds against the final deployment environment.
