# Docker Compose Current State

## Dockerfile

File: `Dockerfile`

Current state:

- Node image: `node:22-bookworm-slim`
- Stages: `deps`, `builder`, `runner`
- Build command: `npm run build -w backend`
- Runtime artifact: Next.js standalone backend
- Runtime user: `node`
- Exposed container port: `3000`
- Healthcheck: GET `http://127.0.0.1:3000/api/health`

No secret build args were found in the Dockerfile.

## Base Compose

File: `docker-compose.yml`

Service: `getra-backend`

- Image: `getra-backend:local`
- Build context: `.`
- Dockerfile: `Dockerfile`
- Target: `runner`
- Host bind: `${GETRA_BIND_ADDRESS:-127.0.0.1}:${GETRA_DOCKER_PORT:-3002}:3000`
- Restart policy: `unless-stopped`
- Stop grace period: `30s`
- Healthcheck: GET `http://127.0.0.1:3000/api/health`

Security posture:

- Default backend host bind is loopback.
- Compose references environment variables by name instead of hardcoding values.

## Routing Compose

File: `docker-compose.routing.yml`

Services:

- `getra-backend`
- `valhalla`

Backend routing environment:

- `ROUTING_PROVIDER=valhalla`
- `ROUTING_BASE_URL=http://valhalla:8002`
- `ROUTING_TIMEOUT_MS=12000`
- `ROUTING_CACHE_TTL_MS=300000`

Valhalla service:

- Image: `ghcr.io/valhalla/valhalla-scripted:3.8.3`
- Digest pinned: yes
- Host bind: `${VALHALLA_BIND_ADDRESS:-127.0.0.1}:${VALHALLA_PORT:-8002}:8002`
- Volume: `./routing-data:/custom_files`
- Restart policy: `unless-stopped`
- Stop grace period: `60s`
- Healthcheck: `curl --fail --silent http://127.0.0.1:8002/status`
- Health start period: `30m`

Valhalla graph/runtime environment:

- `build_admins=True`
- `build_time_zones=True`
- `build_transit=False`
- `build_tar=True`
- `force_rebuild=${VALHALLA_FORCE_REBUILD:-False}`
- `server_threads=${VALHALLA_SERVER_THREADS:-2}`
- `serve_tiles=True`
- `tileset_name=jabodetabek_tiles`
- `use_tiles_ignore_pbf=True`

## Production Compose

File: `docker-compose.prod.yml`

Backend overrides:

- `NODE_ENV=production`
- `APP_ENV=production`
- `APP_BASE_URL` required
- `FRONTEND_ALLOWED_ORIGINS` required
- `no-new-privileges:true`
- Linux capabilities dropped with `cap_drop: ALL`

## Topology Match

Target topology comparison:

| Requirement | Repository state |
| --- | --- |
| Browser calls GETRA backend, not Valhalla | IMPLEMENTED by API architecture |
| Backend container uses private Compose DNS | IMPLEMENTED: `http://valhalla:8002` |
| Backend host port loopback by default | IMPLEMENTED |
| Valhalla host port loopback by default | IMPLEMENTED |
| Reverse proxy HTTPS | DOCUMENTED, deployment-time only |
| Valhalla public exposure blocked | CONFIGURED by default, external firewall not verified in Phase 0 |

## Compose Validation

Command executed:

- `npm run docker:prod:config`

Result:

- PASS

This validates Compose syntax/configuration only. It is not a live routing proof.
