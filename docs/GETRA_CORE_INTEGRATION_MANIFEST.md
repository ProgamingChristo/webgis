# GETRA Core Experience Integration Manifest

## 1. Release Identification
- **Branch**: `core-prd-sprint`
- **Candidate Phase**: Phase 17 — Core Experience Integration Freeze
- **Target Lineage**:
  - Phase 13 (Shared Location + Smart Search + Walking Eligibility): `efdf24b`
  - Phase 14 (Pedestrian Routing + Network Service Area + One-Tap Route): `a1c8b38`
  - Phase 15 (Fair Discovery + Hidden Gem + Sponsored Disclosure): `8faa92b`
  - Phase 16A (Canonical UMKM Inventory + Provenance + Public Visibility): `18ce1ed`
  - Phase 16B (UMKM Submission + Claim + Owner Workspace + Pending States): `9fe27ca`
  - Phase 16C (Admin Verification + Verified Ownership + Publication + Management): `1ea65fc`
  - Phase 16D (Promotion Eligibility + Campaign Activation + Sponsored Integration): `e1a9bbd`
  - Phase 17 (Core Experience Integration Freeze): *Pending Freeze Commit*

## 2. Architectural Authorities & Single Sources of Truth

### A. Location Authority
- **Commuter Location Authority**: Frontend `CommuterLocationAuthority` and backend coordinate inputs enforce ONE shared origin across:
  - Nearby UMKM
  - Smart Search
  - Fair Discovery
  - Walking Eligibility calculation
  - Routing origin

### B. Proximity & Routing Truth
- **Spatial Proximity**: Calculated via PostGIS ellipsoidal/spheroidal distance (`ST_DistanceSphere` / `ST_Distance`).
- **Walking Network Accessibility**: Calculated via pgRouting pedestrian network topology (`calculate_walking_costs_v1`, `calculate_walking_route_v2`) with snap distance boundaries.
- **Route Geometry**: Generated via backend Valhalla routing provider for multi-modal routes (Pedestrian, Motorcycle, Car, Multi-route).
- **Service Area**: Network isochrone catchment polygons generated through road network topology.
- **Rule**: Pure straight-line (Euclidean) distance is NEVER labeled as pedestrian walking distance or walking duration.

### C. Canonical Merchant Inventory & Provenance
- **Canonical Identity**: Single `merchants` table records authoritative profile, coordinates, category, data quality score, and verification status.
- **Provenance Preservation**:
  - `MENU_GO` records maintain their origin provenance throughout ownership claim lifecycles.
  - `MAPID_PREMIUM` records maintain provenance and external IDs.
  - New owner submissions transition to canonical merchants upon Admin approval without replacing source history.
- **Unclaimed Inventory**: Validated merchants without owners remain publicly discoverable, routable, and searchable; random users are strictly forbidden from promoting or campaigning unclaimed merchants.

### D. Ownership & Security Boundaries
- **Auth Roles**: Strictly `USER` and `ADMIN` (no ad-hoc `MERCHANT` or `COMMUTER` roles).
- **Pending Boundaries**: Unapproved submissions are visible only in the submitter's workspace and private map preview; excluded from public search, nearby, and map tiles.
- **Multi-Claim Adjudication**: Separate pending reviews, manual Admin adjudication, no automatic first-claim winner, verified owner takeover blocked.
- **Data Privacy**: Public DTOs strictly sanitize ownership evidence documents, private contact numbers, ID cards, internal admin review notes, and transaction tokens.

### E. Advertising, Promotion & Sponsored Serving
- **Readiness Gate**: Only verified owners of published, valid canonical merchants can access advertising and campaign creation.
- **Sponsored Serving**: Ad-serving engine matches active campaigns and evaluates commuter hard constraints (category, query, radius, opening hours, max walking time).
- **No Pay-To-Bypass**: Hard constraints strictly filter out non-qualifying sponsored pins.
- **Failure Isolation**: Ad-serving lookup timeouts or failures gracefully fall back without interrupting organic discovery.

## 3. Verified Quality Baseline
- **Backend Tests**: 156 passed test suites, 1,059 passing tests, 0 failures.
- **Backend Lint**: 0 errors, 0 warnings.
- **Backend Typecheck**: 0 errors (`tsc --noEmit`).
- **Backend Production Build**: 79 API routes compiled and generated successfully.
- **Frontend Tests**: 56 passed test suites, 346 passing tests, 0 failures.
- **Frontend Lint**: 0 errors, 0 warnings.
- **Frontend Typecheck**: 0 errors (`tsc --noEmit`).
- **Frontend Production Build**: Static and dynamic routes compiled successfully in Next.js 16.3.1.

## 4. Phase 18 Final QC Backlog (Deferred by Policy)
1. Numeric budget filtering UI polish.
2. Hidden Gem heuristic review (`data_quality_score >= 80` vs lower discoverability opportunity intent).
3. Sponsored Indonesian copy consistency and card spacing.
4. Mobile responsive touch targets and micro-animations.
5. Final Figma UMKM UI/UX alignment.
