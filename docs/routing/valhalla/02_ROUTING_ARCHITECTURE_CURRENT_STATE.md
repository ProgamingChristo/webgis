# Routing Architecture Current State

## Active API

The active frontend-facing route endpoint is:

- `POST /api/routing`
- File: `backend/app/api/routing/route.ts`
- Runtime: Node.js
- Max duration: 15 seconds

The endpoint:

- requires authenticated user via `requireAuthenticatedUser`;
- applies spatial rate limit with key `<userId>:spatial:routing`;
- reads a bounded JSON body with limit `10_240` bytes;
- validates input with Zod through `parseRoutingRequest`;
- calls the routing provider abstraction through `getRoutingProvider().route`;
- returns a normalized GETRA API response envelope.

## Request Contract

Request schema source:

- `backend/src/modules/spatial/spatial.schema.ts`

Accepted fields:

- `origin`: coordinate object
- `destination`: coordinate object
- `mode`: `walking`, `motorcycle`, or `car`
- `destination_merchant_id`: optional UUID
- `constraints.avoid`: optional string array

The request schema is strict. Unsupported modes and unknown fields are rejected.

Coordinate schema uses:

- `latitude`
- `longitude`

## Response Contract

Routing result type source:

- `backend/src/features/routing/routing.types.ts`

Frontend-facing response includes:

- `mode`
- `route_status`
- `reason_code`
- `distance_meters`
- `duration_seconds`
- `geometry`
- `maneuvers`
- `engine`
- `source`
- `warnings`
- `has_toll`
- `has_highway`
- `has_ferry`
- `analysis_method`
- `limitation_flags`
- `route_source`

Successful geometry is GeoJSON `LineString`.

## Auth And Policy

Endpoint policy source:

- `backend/src/lib/api-security/endpoint-policy.ts`

Policy state:

- `POST /api/routing`: AUTHENTICATED, spatial rate limit
- `GET /api/internal/routing/provider-health`: AUTHENTICATED, spatial rate limit

Provider-health does not require ADMIN. It requires a normal authenticated user.

## Provider Health

Provider health endpoint:

- `GET /api/internal/routing/provider-health`
- File: `backend/app/api/internal/routing/provider-health/route.ts`

It returns:

- provider name
- READY or UNAVAILABLE status
- configured boolean
- reachable boolean
- stable reason code

It intentionally does not expose `ROUTING_BASE_URL`.

## General Health

Application health:

- `GET /api/health`
- File: `backend/app/api/health/route.ts`
- Service: `backend/src/services/health.service.ts`

Current `/api/health` checks Supabase/database connectivity and general GETRA API
readiness. Valhalla readiness is exposed separately through provider-health and
the Valhalla container healthcheck.
