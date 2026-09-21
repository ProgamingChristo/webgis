# GETRA — Geo-Enabled Transit & Retail Analytics

Welcome to GETRA. This project operates on the **GETRA Integration Baseline (v1.0)**, establishing a highly robust, secure, and geospatially-aware web application architecture.

## URL produksi dan panduan fitur terbaru

- Frontend: [https://getra-routing-api.tail0ed517.ts.net:8443](https://getra-routing-api.tail0ed517.ts.net:8443)
- Login: [https://getra-routing-api.tail0ed517.ts.net:8443/login](https://getra-routing-api.tail0ed517.ts.net:8443/login)
- Backend health: [https://getra-routing-api.tail0ed517.ts.net/api/health](https://getra-routing-api.tail0ed517.ts.net/api/health)
- [Panduan penggunaan basemap dan 20 fitur Global Data Center, dengan screenshot](docs/international-guide/README.md)
- [Dokumentasi PDF](docs/international-guide/GETRA_BASEMAP_GLOBAL_DATA_CENTER.pdf)
- [Laporan teknis A–I dan batasan integrasi](docs/INTERNATIONAL_DATA_REPORT.md)

URL di atas tetap menjadi referensi produksi. Alamat localhost di bawah hanya untuk pengembangan lokal.

Audit hardening terbaru: [hasil QA dan batasan rilis](docs/production-hardening/QA_REPORT.md),
[status machine-readable](docs/production-hardening/release-status.json), dan
[PDF panduan, screenshot, serta bukti pengujian](docs/production-hardening/GETRA_PRODUCTION_HARDENING.pdf).
Kandidat hardening dipisahkan dari deployment publik; lihat status tersebut sebelum menganggap fitur siap digunakan.

## System Overview

GETRA seamlessly bridges Public Transit, Pedestrian Networking, and Retail/UMKM analytics through a unified interface.
The platform uses **Next.js** for both the frontend (App Router) and the backend API (API Routes), powered by a strict **Supabase/PostgreSQL** foundation using **PostGIS** and **pgRouting** for spatial calculations.
An AI Interpretation layer provides conversational assistance strictly grounded in verified database facts.

## Architecture & Paths
- **Primary Default Branch**: `Getra_Deploy` (Single Source of Truth) — See [Branch Governance Guide](docs/GETRA_BRANCH_GOVERNANCE.md)
- **Frontend**: `frontend/` - Contains the Next.js React application, MapLibre UI, and client data hooks. Runs on `http://localhost:3000`.
- **Backend**: `backend/` - Contains the secure Next.js API layer acting as a traditional server. Houses all API routes, spatial services, RLS interactions, AI orchestration, and automated tests. Runs on `http://localhost:8080`.
- **Database**: PostgreSQL (via Supabase). The schema and migrations are located in `backend/supabase/`.

## Quick Start (Local Development)

### 1. Prerequisites
Ensure you have Node.js, `npm`, and Docker installed. You must configure your `.env.local` files in both `frontend/` and `backend/` using the structure defined in the [Environment Reference](docs/GETRA_Environment_Reference.md).

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
# The backend is now reachable at http://localhost:8080
```
Verify the backend is healthy: `curl http://localhost:8080/api/health`

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
# The frontend is now available at http://localhost:3000
```

## Documentation
The comprehensive system documentation, architecture diagrams, testing runbooks, API references, and deployment handovers are located in the `docs/` folder.
👉 **[View the Documentation Index](docs/README.md)**

## Testing & Quality Gates
GETRA employs a strict test suite powered by Vitest, testing route hardening, payload validation, Spatial API correctness, and database availability.
```bash
cd backend
npm run test
```

## Security Warning
- **Never expose the `SUPABASE_SERVICE_ROLE_KEY` to the client.**
- All spatial logic must remain in PostGIS/pgRouting. The AI engine is exclusively for *interpretation*, not calculation.
- See the [Security Reference](docs/GETRA_Final_System_Documentation.pdf) for full RLS boundaries and authentication flows.
