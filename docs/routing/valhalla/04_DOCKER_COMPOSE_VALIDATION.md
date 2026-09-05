# GETRA Valhalla Routing - Docker Compose Validation

Date: 2026-09-02 Asia/Jakarta

## Compose Files

- `docker-compose.yml`
- `docker-compose.routing.yml`
- `docker-compose.prod.yml`

## Validation

- `npm run docker:prod:config`: PASS
- `npm run routing:validate`: PASS

## Configuration Evidence

- Backend host binding: `127.0.0.1:3002->3000`
- Valhalla host binding: `127.0.0.1:8002->8002`
- Backend container routing env:
  - `ROUTING_PROVIDER=valhalla`
  - `ROUTING_BASE_URL=http://valhalla:8002`
  - `ROUTING_TIMEOUT_MS=12000`
  - `ROUTING_CACHE_TTL_MS=300000`

## Build Context Fix

Initial Docker build context exceeded gigabytes because nested build artifacts were not ignored. `.dockerignore` was updated to exclude:

- `**/.next`
- `**/node_modules`
- `.sites-runtime`
- `**/.sites-runtime`
- `lint_output.txt`
- `**/lint_output.txt`
- `tmp`
- `**/tmp`
- `.tmp-*`
- `routing-source-cache`

After this fix, backend Docker build context dropped to about `129 KB`.

