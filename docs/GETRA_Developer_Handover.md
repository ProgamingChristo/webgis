# GETRA Developer Handover

Welcome to the GETRA system. This guide will quickly orient you to the architecture and conventions established in Integration Phases 1–13.

## Where do I start?
1. Read the `README.md` at the root of the project.
2. Read the `GETRA_Final_System_Documentation.pdf` to understand the overarching system logic.
3. Review `docs/GETRA_Integration_Baseline.md` to understand where prior integration left off.

## How do I run GETRA?
Refer to the `README.md` Quick Start. Generally:
- **Backend**: `cd backend && npm install && npm run dev` (Runs on `localhost:8080`)
- **Frontend**: `cd frontend && npm install && npm run dev` (Runs on `localhost:3000`)

## Repository Navigation
- **Frontend**: `frontend/` (Next.js App router, UI components, API Client, MapLibre maps).
- **Backend**: `backend/` (Next.js API route architecture mimicking a standard backend API).
- **API Client**: `frontend/src/lib/api-client.ts` centralizes all fetch requests to the backend.
- **Migrations**: Found in the Supabase directory linked to the project (typically `backend/supabase/migrations`).
- **Auth**: Frontend handles `auth-client.ts` sessions, mapping to `/api/auth` endpoints in the backend.
- **GIS**: Processed heavily via PostGIS in the database, with logic organized in `backend/src/modules/spatial/`.
- **AI**: Located in `backend/src/modules/ai/`.
- **Tests**: Found under `backend/tests/`. Run with `npm run test` from the backend directory.

## What must I never change casually?
- **GIS Computes / AI Interprets rule**: AI is only an interpretation layer. Never rely on the LLM to hallucinate geometries or routing math.
- **RLS & Security Policies**: The database isolates data strictly by user boundaries. Never blindly expose raw data or use the `SUPABASE_SERVICE_ROLE_KEY` on the client.
- **Staging / Raw pipelines**: The MAPID integration normalizes data before presenting it. Do not let the frontend query raw tables directly.
- **Stakeholder Modes vs Authentication Roles**: `account_role` represents true system authority (`USER` vs `ADMIN`). Stakeholder modes (UMKM, INVESTOR, etc.) are purely UI context features. Do not infer database ownership from a stakeholder mode.
