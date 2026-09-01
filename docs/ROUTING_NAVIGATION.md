# GETRA navigation routing

## Responsibility split

Valhalla handles route planning, ETA, geometry, and maneuvers for pedestrian,
motorcycle, and automobile modes. PostGIS and pgRouting remain authoritative for
GETRA-specific spatial analysis: nearby queries, pedestrian service areas,
accessibility evidence, barriers, survey scoring, and transit-area analysis.

The browser calls the authenticated GETRA `POST /api/routing` endpoint. It never
calls Valhalla directly and never receives the provider base URL.

## Coverage

The runtime graph is built from `routing-data/jabodetabek.osm.pbf`. The default
clip is `106.30,-6.90,107.25,-5.85`, covering DKI Jakarta, Tangerang, Tangerang
Selatan, Depok, Bekasi, Bogor, and the connecting road network. Merchant coverage
is independent from routing coverage.

Review and expand the bounding box before serving origins outside this area. A
route reported as `OUTSIDE_GRAPH` must not be replaced with a straight line.

## Prepare or update the graph on Windows

Prerequisites: PowerShell, Docker, and `osmium-tool` on `PATH`.

```powershell
npm run routing:prepare
```

This downloads the current Geofabrik Java extract, clips Jabodetabek, writes
`routing-data/jabodetabek.osm.pbf`, and removes the larger Java source by default.
To refresh an existing graph, prepare the PBF again and run:

```powershell
$env:VALHALLA_FORCE_REBUILD = "True"
npm run routing:start
Remove-Item Env:VALHALLA_FORCE_REBUILD
```

Do not set `VALHALLA_FORCE_REBUILD=True` for routine restarts.

## Prepare or update the graph on a Linux VPS

Install `curl` and `osmium-tool`, ensure the VPS has enough free disk for the
Java extract plus generated graph, then run from the repository root:

```bash
mkdir -p routing-data
curl --fail --location --retry 3 \
  --output routing-data/java-latest.osm.pbf \
  https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf
osmium extract --bbox 106.30,-6.90,107.25,-5.85 \
  routing-data/java-latest.osm.pbf \
  --output routing-data/jabodetabek.osm.pbf \
  --overwrite
osmium fileinfo routing-data/jabodetabek.osm.pbf
npm run routing:validate
```

After validation, the larger Java extract may be removed. Keep the Jabodetabek
PBF and Valhalla-generated files on persistent VPS storage. Record the source
date used for each production graph.

## Start locally

The complete container stack (backend plus Valhalla) uses the existing ignored
`.env.local` for GETRA configuration:

```powershell
npm run routing:start
```

Startup validates that the clipped PBF exists and is not empty, then waits until
Valhalla's `/status` healthcheck succeeds before starting the backend. The command
fails if the graph does not become healthy within 40 minutes; inspect the
container logs instead of serving routing from an unready graph.

Valhalla binds to host loopback `127.0.0.1:8002` by default for diagnostics,
while the backend reaches it on the Compose network at `http://valhalla:8002`.
It must never be exposed directly to the internet. Initial graph creation can
take several minutes. During that period, routing responses return a clear
service unavailable state and the UI remains usable.

For normal two-process development, start Valhalla alone and keep the backend on
port 8080:

```powershell
docker compose -f docker-compose.yml -f docker-compose.routing.yml up -d valhalla
```

Set these server-only values in `backend/.env.local`:

```text
ROUTING_PROVIDER=valhalla
ROUTING_BASE_URL=http://127.0.0.1:8002
ROUTING_TIMEOUT_MS=12000
ROUTING_CACHE_TTL_MS=300000
```

Then use the existing `npm run dev`. Never prefix `ROUTING_BASE_URL` with
`NEXT_PUBLIC_`.

## Verification

Check provider status and one route after graph creation:

```powershell
Invoke-RestMethod http://127.0.0.1:8002/status
```

For a stronger graph check, request verbose status and confirm the response
contains tile coverage for Jabodetabek:

```powershell
Invoke-RestMethod 'http://127.0.0.1:8002/status?verbose=true'
```

Application routing requires a normal authenticated GETRA session. Unit and
integration tests mock Valhalla; CI does not depend on a live routing service.

After signing in, backend/provider connectivity can be checked without exposing
the internal provider URL:

```text
GET /api/internal/routing/provider-health
```

The endpoint returns only `READY` or `UNAVAILABLE`, whether configuration was
explicit, whether the provider was reachable, and a stable reason code. Use the
server log entry `[ROUTING] Provider request failed` with its request ID and
reason code for deeper diagnosis; coordinates, credentials, and internal URLs
are intentionally excluded.

## Production

Production always composes `docker-compose.yml`, `docker-compose.routing.yml`,
and `docker-compose.prod.yml` through the `docker:prod:*` scripts. Backend and
Valhalla host bindings remain on loopback; a trusted host reverse proxy exposes
only the backend API over HTTPS. See [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md).
