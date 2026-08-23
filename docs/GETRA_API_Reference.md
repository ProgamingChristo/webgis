# GETRA API Reference

This document represents the actual API inventory of the GETRA backend as of Integration Phase 13.
The backend operates on `http://localhost:8080` (development default). 
All authenticated endpoints require a `Authorization: Bearer <token>` header.

## Authentication & Profiles

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/auth/register` | No | Registers a new user with `account_role = USER`. Public ADMIN signup is blocked. |
| `POST` | `/api/auth/login` | No | Authenticates a user and returns a Supabase JWT and refresh token. |
| `POST` | `/api/auth/logout` | Yes | Invalidates the active session. |
| `GET`  | `/api/auth/me` | Yes | Returns the verified user session context. |
| `POST` | `/api/onboarding` | Yes | Submits initial stakeholder modes (General, UMKM, Investor, Government). |
| `GET`  | `/api/profile` | Yes | Retrieves current user profile and stakeholder modes. |
| `PUT`  | `/api/profile` | Yes | Updates profile display name or modes. |

## Spatial & GIS Routing

These endpoints implement the "GIS Computes" core principle using PostGIS and pgRouting.

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/routing` | Yes | Calculates shortest path between origin and destination using `pgr_dijkstra` on the pedestrian network. Returns distance, duration, and GeoJSON `LineString`. |
| `POST` | `/api/transport/nearest` | Yes | Finds nearest transit nodes within a specified radius (`radius_meters`) from an `origin`. |
| `GET`  | `/api/spatial/bbox` | Yes | Queries entities (UMKM, Transport, Community) within a bounding box (`north`, `south`, `east`, `west`). |
| `GET`  | `/api/spatial/nearby` | Yes | Queries entities within a radial distance from a point (`lat`, `lng`, `radius`). |
| `POST` | `/api/spatial/distance` | Yes | Calculates direct (haversine/PostGIS) distance between two coordinate pairs. |

## Core Data (v1)

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `GET`  | `/api/v1/study-areas` | Yes | Lists available study areas (city zones) supporting GETRA coverage. |
| `GET`  | `/api/v1/study-areas/[id]` | Yes | Retrieves details and geometry boundary for a specific study area. |
| `GET`  | `/api/v1/transport/corridors` | Yes | Retrieves public transit corridors. |
| `GET`  | `/api/v1/transport/nodes` | Yes | Retrieves public transit stations/stops. |

## Internal & Legacy Integrations

These endpoints represent internal staging or direct domain lookups. 

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `GET`  | `/api/internal/poi/nearby` | Yes | Legacy/internal proxy for finding nearby Points of Interest. |
| `GET`  | `/api/internal/umkm/nearby` | Yes | Legacy/internal proxy for finding nearby UMKM specifically. |
| `POST` | `/api/internal/routing/walking` | Yes | Dedicated walking routing abstraction. |
| `POST` | `/api/system/foundation` | Yes | System bootstrap (internal/admin). |

## Grounded AI

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/ai/ask` | Yes | Processes natural language questions. Detects intent, fetches grounded facts from spatial/v1 endpoints, and returns an AI interpretation. (Requires AI provider credential). |

## Administration

These endpoints require the user to have `account_role = ADMIN`.

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `POST` | `/api/admin/ingestion/jobs` | Yes (ADMIN) | Queues or checks the status of external data ingestion (e.g., MAPID). |
| `POST` | `/api/admin/ingestion/run` | Yes (ADMIN) | Executes the raw-to-canonical ingestion pipeline for a specific job. |

## Health

| Method | Path | Auth Required | Description |
|--------|------|---------------|-------------|
| `GET`  | `/api/health` | No | System health check. Returns 200 if connected to database, 503 if unavailable. |

---

> **Note on Data Provenance & Structure:** All GeoJSON outputs use `[longitude, latitude]` coordinate order natively. Responses wrap data in a standard `{ "success": true, "data": { ... } }` object envelope. Error responses return `{ "success": false, "error": { "code": "...", "message": "..." } }`.
