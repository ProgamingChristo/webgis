import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const DOCS_DIR = path.join(process.cwd(), 'docs', 'final-source');
const FINAL_DIR = path.join(process.cwd(), 'docs', 'final');
const FINAL_MD_PATH = path.join(DOCS_DIR, 'GETRA_BACKEND_FULL_DOCUMENTATION.md');
const FINAL_TXT_PATH = path.join(DOCS_DIR, 'GETRA_BACKEND_FULL_DOCUMENTATION.txt');

// Ensure directories exist
if (!fs.existsSync(FINAL_DIR)) fs.mkdirSync(FINAL_DIR, { recursive: true });
if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });

function readFile(filename: string): string {
  const p = path.join(DOCS_DIR, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8') : `(Missing file: ${filename})`;
}

const apiMatrixContent = readFile('API_TEST_MATRIX_PHASE_15.txt');
const apiCatalogContent = readFile('API_CATALOG_VERIFIED.txt');

const dateStr = new Date().toISOString().split('T')[0];

const md = `
# GETRA
## Geo-Enabled Transit & Retail Analytics

**BACKEND SYSTEM DOCUMENTATION**
**API REFERENCE & TESTING MANUAL**

**Phase 16**

* Document Status: FINAL
* Version: 1.0.0
* Generated Date: ${dateStr}
* Backend Base URL: http://localhost:3000

---

## TABLE OF CONTENTS
1. [Executive Summary](#1-executive-summary)
2. [System Overview](#2-system-overview)
3. [Technology Stack](#3-technology-stack)
4. [Backend Architecture](#4-backend-architecture)
5. [Project Structure](#5-project-structure)
6. [Environment Configuration](#6-environment-configuration)
7. [Running Backend](#7-running-backend)
8. [Authentication](#8-authentication)
9. [User Profiles & Roles](#9-user-profiles--roles)
10. [RLS & Security](#10-rls--security)
11. [API Architecture](#11-api-architecture)
12. [Complete API Catalog](#12-complete-api-catalog)
13. [API Testing Manual](#13-api-testing-manual)
14. [Supabase & Database](#14-supabase--database)
15. [PostGIS](#15-postgis)
16. [pgRouting](#16-pgrouting)
17. [Data Ingestion](#17-data-ingestion)
18. [Study Area](#18-study-area)
19. [Transport](#19-transport)
20. [Pedestrian Network](#20-pedestrian-network)
21. [UMKM / POI](#21-umkm--poi)
22. [Survey / Demand](#22-survey--demand)
23. [Golden Dataset](#23-golden-dataset)
24. [Docker](#24-docker)
25. [Logging & Error Handling](#25-logging--error-handling)
26. [Testing](#26-testing)
27. [Migration Workflow](#27-migration-workflow)
28. [Data Dummy vs Production](#28-data-dummy-vs-production)
29. [Troubleshooting](#29-troubleshooting)
30. [Known Limitations](#30-known-limitations)
31. [Phase Summary](#31-phase-summary)
32. [Operational Checklist](#32-operational-checklist)

---

## 1. Executive Summary
The GETRA backend is a robust spatial analytics platform designed for local transit and economic accessibility (UMKM/POI). It features a robust PostgreSQL/PostGIS foundation powered by Supabase, Next.js API routes, and a complete authentication mechanism via Supabase Auth. The foundation for data ingestion, network routing (pgRouting), and spatial boundaries is fully implemented but currently operates on DUMMY test data.

## 2. System Overview
### Component Status Summary
| COMPONENT | STATUS | TEST STATUS | NOTES |
|-----------|--------|-------------|-------|
| Authentication | IMPLEMENTED | PASS | Rate limits identified upstream. |
| Profile | IMPLEMENTED | PASS | User profiles sync via auth triggers. |
| Roles | IMPLEMENTED | PASS | RBAC (ADMIN, COMMUTER, UMKM, COMMUNITY). |
| RLS | IMPLEMENTED | PASS | Row-level security restricts dummy data access. |
| API Foundation | IMPLEMENTED | PASS | Health, spatial, auth, ingestion APIs ready. |
| PostGIS | IMPLEMENTED | PASS | BBox and distance queries verified. |
| pgRouting | IMPLEMENTED | PASS | Node mapping present; production routes blocked. |
| Spatial Engine | IMPLEMENTED | PASS | Nearby search functionality intact. |
| Data Ingestion | FOUNDATION_ONLY | PASS | Admin protected ingestion pipeline setup. |
| Study Area | IMPLEMENTED | PASS | Public API restricted by RLS on dummy data. |
| Transport | IMPLEMENTED | PASS | Corridors & Nodes (RLS protected). |
| Pedestrian Network | IMPLEMENTED | PASS | Network tables exist (DUMMY). |
| UMKM | IMPLEMENTED | PASS | Internal nearby API works. |
| POI | IMPLEMENTED | PASS | Internal nearby API works. |
| Survey & Demand | FOUNDATION_ONLY | N/A | Tables created, API pending. |
| Golden Dataset | IMPLEMENTED | PASS | v1 Dummy established. |
| Docker | IMPLEMENTED | N/A | Docker setup is present for isolated run. |
| Security | IMPLEMENTED | PASS | Protected against direct service role leak. |

## 3. Technology Stack
* **Runtime**: Node.js (>=22.13.0)
* **Framework**: Next.js (16.3.1)
* **Language**: TypeScript (5.9.3)
* **Validation**: Zod
* **Database**: PostgreSQL (via Supabase)
* **Auth**: Supabase Auth
* **Spatial**: PostGIS
* **Routing**: pgRouting
* **Testing**: Vitest
* **Container**: Docker Compose

## 4. Backend Architecture
The application uses Next.js Route Handlers as the primary API mechanism:
Route Handler -> Schema Validation (Zod) -> Repository Layer -> Supabase Client -> PostgreSQL (PostGIS)

## 5. Project Structure
\`\`\`
app/api/        # Next.js Route Handlers
src/            # Business logic, repositories, lib functions
supabase/       # Database migrations, seed data, and schema definitions
scripts/        # Provisioning, CLI tasks, regression testing scripts
tests/          # Unit and integration tests (Vitest)
docs/           # Documentation and phase evidences
\`\`\`

## 6. Environment Configuration
| VARIABLE | REQUIRED | DESCRIPTION | SECRET? |
|----------|----------|-------------|---------|
| NEXT_PUBLIC_SUPABASE_URL | YES | Supabase instance URL | NO |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | YES | Supabase anon/publishable key | NO |
| SUPABASE_SERVICE_ROLE_KEY | NO | Admin key for backend tasks | YES |
| GETRA_TEST_USER_PASSWORD | NO | Password for dummy tests | NO |

## 7. Running Backend
### Development Mode
\`\`\`bash
npm run dev
\`\`\`
*Development Base URL*: \`http://localhost:3000\`
*Note*: This runs the Next.js dev server. It is not a 24/7 production server.

### Production Build
\`\`\`bash
npm run build
npm run start
\`\`\`
*To run 24/7, the backend requires a host server, VM, or cloud container platform.*

## 8. Authentication
Client -> POST /api/auth/login -> Supabase Auth -> JWT Session (Bearer Token/Cookie)

## 9. User Profiles & Roles
Roles implemented: \`COMMUTER\`, \`UMKM\`, \`COMMUNITY\`, \`ADMIN\`.
Profiles are automatically created on registration via a Postgres trigger.

| FEATURE / API | PUBLIC | COMMUTER | UMKM | COMMUNITY | ADMIN |
|---------------|--------|----------|------|-----------|-------|
| /api/health | YES | YES | YES | YES | YES |
| /api/auth/me | NO | YES | YES | YES | YES |
| /api/admin/* | NO | NO | NO | NO | YES |

## 10. RLS & Security
Row-Level Security (RLS) protects data isolation. Service roles bypass RLS.
*Service role is server-only. Never expose as NEXT_PUBLIC_ or in the client bundle.*
Currently, the public dummy data requires authenticated RLS access to read \`study_areas\` and \`transport\` tables.

## 11. API Architecture
Base URL is \`http://localhost:3000/api\`. All data exchanges use \`application/json\`.

## 12. Complete API Catalog
### API Index
\`\`\`text
${apiMatrixContent}
\`\`\`

### Detailed API Documentation
\`\`\`text
${apiCatalogContent}
\`\`\`

## 13. API Testing Manual
### COMPLETE LOCALHOST API TESTING MANUAL
**STEP 1: Health**
METHOD: GET
URL: \`http://localhost:3000/api/health\`
AUTH: None
EXPECTED: 200

**STEP 2: Login**
METHOD: POST
URL: \`http://localhost:3000/api/auth/login\`
HEADERS:
Content-Type: application/json

BODY:
\`\`\`json
{
  "email": "getra.admin.test@example.com",
  "password": "<TEST_PASSWORD>"
}
\`\`\`
EXPECTED: 200

**STEP 3: Check Session**
METHOD: GET
URL: \`http://localhost:3000/api/auth/me\`
AUTH: Required (Token/Cookie)
EXPECTED: 200

*Note: Registration should not be tested repeatedly to avoid Supabase upstream Rate Limits (429).*

## 14. Supabase & Database
Database relies on Supabase PostgreSQL. 
Migrations are stored in \`supabase/migrations\`.

## 15. PostGIS
* SRID: 4326
* Distance Unit: meters
* Operations: \`ST_DWithin\`, \`ST_Distance\`, \`ST_MakeEnvelope\`

## 16. pgRouting
* Extension enabled.
* *Routing is validated on DUMMY pedestrian graph. It is not yet production pedestrian-network routing.*

## 17. Data Ingestion
Phase 8 pipeline structure:
Source -> Parser -> Validator -> Normalizer -> Deduplicator -> Repository

## 18. Study Area
DATA ENVIRONMENT: DUMMY. 
API relies on authentication via RLS for protection.

## 19. Transport
DATA ENVIRONMENT: DUMMY. Nodes & corridors mapped.

## 20. Pedestrian Network
DATA ENVIRONMENT: DUMMY. Network topology established.

## 21. UMKM / POI
DATA ENVIRONMENT: DUMMY. Proximity internal queries verified.

## 22. Survey / Demand
DATA ENVIRONMENT: DUMMY. Data tables instantiated.

## 23. Golden Dataset
GETRA_DUMMY_GOLDEN_V1 initialized in database.

## 24. Docker
Docker available via:
\`\`\`bash
docker compose build
docker compose up -d
docker compose ps
docker compose logs -f
docker compose down
\`\`\`

## 25. Logging & Error Handling
Standard JSON error responses.

## 26. Testing
Phase 15 executed a regression test (\`run-regression.ts\`) resulting in a 20/20 PASS rate on all APIs. 
Frontend ↔ Backend integration: NOT YET PERFORMED.

## 27. Migration Workflow
# SUPABASE DATABASE MIGRATION WORKFLOW
\`\`\`bash
supabase migration list
supabase db push --dry-run
supabase db push
\`\`\`
*Warning: Destructive changes require approval.*

## 28. Data Dummy vs Production
Currently, all domain data functions on DUMMY environments. Production data ingest is blocked pending real data availability.

## 29. Troubleshooting
* **429 Supabase Auth**: Caused by repeatedly calling registration. Use pre-provisioned accounts.
* **500 RLS Permission**: Caused by accessing protected tables using Anon key without an active session.

## 30. Known Limitations
* MAPID production endpoint not verified
* production pedestrian network unavailable
* data currently DUMMY
* public registration affected by Supabase upstream rate-limit
* frontend not integrated yet

## 31. Phase Summary
* Phase 1-14: Foundation & Data Pipelines implemented.
* Phase 15: Full Regression verified (PASS).
* Phase 16: Documentation Generated.

## 32. Operational Checklist
* [x] Backend running on 3000
* [x] Environment configured
* [x] Dummy data seeded

---
**FRONTEND ↔ BACKEND INTEGRATION: NOT YET PERFORMED**
`;

fs.writeFileSync(FINAL_MD_PATH, md);
fs.writeFileSync(FINAL_TXT_PATH, md.replace(/\`\`\`[a-z]*\n/g, '').replace(/\`\`\`/g, ''));

console.log('Markdown and TXT generated successfully.');

// Attempt to generate PDF
try {
  // Use md-to-pdf to generate the PDF file
  execSync('npx -y md-to-pdf ' + FINAL_MD_PATH, { stdio: 'inherit' });
  console.log('PDF generated successfully.');
} catch (e) {
  console.error('Failed to generate PDF automatically:', e);
}
