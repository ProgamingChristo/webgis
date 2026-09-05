# Routing Provider Current State

## Provider Abstraction

Files:

- `backend/src/features/routing/routing.types.ts`
- `backend/src/features/routing/index.ts`
- `backend/src/features/routing/cached-routing.provider.ts`
- `backend/src/features/routing/valhalla-routing.provider.ts`

Current flow:

`POST /api/routing` -> `getRoutingProvider()` -> `CachedRoutingProvider` -> `ValhallaRoutingProvider`

The provider implementation is server-only.

## Configuration

Routing configuration is read from environment variables:

- `ROUTING_PROVIDER`
- `ROUTING_BASE_URL`
- `ROUTING_TIMEOUT_MS`
- `ROUTING_CACHE_TTL_MS`

Defaults:

- provider: `valhalla`
- base URL: `http://127.0.0.1:8002`
- timeout: `12000`
- cache TTL: `300000`

Compose production overrides the backend base URL to:

- `http://valhalla:8002`

The `127.0.0.1:8002` default is suitable for host development, not for backend
container-to-Valhalla communication. The Compose overlay correctly supplies the
container URL.

## Mode Mapping

Implementation location:

- `backend/src/features/routing/valhalla-routing.provider.ts`

Current mapping:

| GETRA mode | Valhalla costing | Status |
| --- | --- | --- |
| `walking` | `pedestrian` | IMPLEMENTED |
| `motorcycle` | `motorcycle` | IMPLEMENTED |
| `car` | `auto` | IMPLEMENTED |

## Coordinate Order

Provider request sends Valhalla locations as:

- `{ lat: latitude, lon: longitude }`

Provider response decodes polyline6 to GeoJSON coordinates as:

- `[longitude, latitude]`

GeoJSON coordinate order is CORRECT in the active provider.

## Route Status Values

Current status values:

- `ROUTABLE`
- `UNROUTABLE`
- `OUTSIDE_GRAPH`
- `SERVICE_UNAVAILABLE`

Current reason codes:

- `COORDINATES_OUTSIDE_GRAPH`
- `NO_ROUTE_FOUND`
- `ROUTING_PROVIDER_INVALID_RESPONSE`
- `ROUTING_PROVIDER_UNCONFIGURED`
- `ROUTING_PROVIDER_UNREACHABLE`
- `ROUTING_REQUEST_ABORTED`
- `ROUTING_TIMEOUT`
- `ROUTING_UPSTREAM_ERROR`

Valhalla code handling:

- `171` -> `OUTSIDE_GRAPH`
- `170`, `442`, `443`, `444` -> `UNROUTABLE`
- malformed provider response -> `SERVICE_UNAVAILABLE`

## Timeout

Implementation:

- `backend/src/lib/http/timeout-fetch.ts`

Provider calls use `AbortController` and classify deadline expiry as
`HttpTimeoutError`, which maps to `ROUTING_TIMEOUT`.

Provider-health uses the smaller of configured timeout and 5 seconds.

## Cache

Implementation:

- `backend/src/features/routing/cached-routing.provider.ts`

Cache properties:

- default TTL: `300000` ms
- maximum entries: `250`
- caches only `ROUTABLE` results
- returns structured clones

Cache key includes:

- mode
- origin latitude
- origin longitude
- destination latitude
- destination longitude

Mode isolation: PASS by code inspection and tests.

## Fake Route Fallback Audit

Active routing provider/API behavior:

- no straight-line fallback found;
- no haversine route geometry fallback found;
- no synthetic successful LineString found;
- provider failure returns null geometry and non-ROUTABLE status;
- API failure response includes `NO_FABRICATED_ROUTE`.

Some historical documentation and landing/demo copy reference illustrative routes
or older pgRouting/haversine context. Those are stale/docs-only findings, not the
active `POST /api/routing` implementation.
