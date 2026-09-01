# GETRA Hybrid Deployment

## Production topology

GETRA uses one Vercel project for the frontend and one Docker Compose stack on a
Linux VPS for the backend and Valhalla:

```text
Browser -> Vercel frontend -> HTTPS API reverse proxy on VPS
                            -> getra-backend container
                            -> valhalla container (private service network)
```

Valhalla is not deployed to Vercel and no Google Maps routing key is required.
The backend and Valhalla host ports bind to `127.0.0.1` by default. Only the
reverse proxy should be reachable from the public internet.

## Vercel frontend project

Import the repository once and configure:

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework | Next.js |
| Build command | `npm run build` |
| Node.js | compatible with root engine `>=22.13.0` |

Do not set an Output Directory override. Configure only browser-safe variables:

- `NEXT_PUBLIC_GETRA_API_URL`: exact HTTPS origin of the VPS API.
- Public Supabase values already used by the frontend.
- Public MAPID style values already used by the frontend.
- `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` only when the browser checkout requires it.

Never place `SUB2API_API_KEY`, `MIDTRANS_SERVER_KEY`, a Supabase service-role or
secret key, or any other server credential in Vercel frontend variables.
`NEXT_PUBLIC_API_URL` is deprecated and should not be added to new deployments.
Public values are embedded during `next build`; redeploy after changing them.

## Docker backend on the VPS

Create an ignored root `.env.local` on the VPS. At minimum it must provide the
Supabase public application values required by the backend plus:

```dotenv
APP_ENV=production
APP_BASE_URL=https://<api-domain>
FRONTEND_ALLOWED_ORIGINS=https://<frontend-domain>
TRUST_PROXY=true
GETRA_BIND_ADDRESS=127.0.0.1
GETRA_DOCKER_PORT=3002
VALHALLA_BIND_ADDRESS=127.0.0.1
AI_PROVIDER=sub2api
SUB2API_API_KEY=<server-only>
MIDTRANS_IS_PRODUCTION=true
```

Replace angle-bracket values; do not copy them literally. Add only the secrets
needed by enabled features. `FRONTEND_ALLOWED_ORIGINS` is an exact comma-separated
allowlist and must never be `*`. Set `TRUST_PROXY=true` only when the reverse
proxy overwrites forwarding headers and direct public access to port 3002 is
blocked.

Prepare `routing-data/jabodetabek.osm.pbf`, then run:

```bash
npm run docker:prod:config
npm run docker:prod:start
npm run docker:prod:status
```

The first Valhalla graph build can take many minutes. `docker:prod:start` waits
up to 40 minutes for healthy services. Inspect logs without printing environment
values:

```bash
npm run docker:prod:logs
```

Terminate TLS at Nginx, Caddy, or another trusted host reverse proxy and forward
the API origin to `http://127.0.0.1:3002`. Keep host firewall access to ports
3002 and 8002 closed. See [`ROUTING_NAVIGATION.md`](./ROUTING_NAVIGATION.md) and
[`DOCKER_USAGE.txt`](./DOCKER_USAGE.txt).

## Release order and smoke tests

1. Build and start the Docker stack; wait until both services are healthy.
2. Verify the public API `/api/health` through HTTPS.
3. Deploy the Vercel frontend with `NEXT_PUBLIC_GETRA_API_URL` set to that API.
4. Verify exact-origin CORS, authentication, one route request, and one limited
   authenticated AI request without logging credentials.
5. Verify routing failure behavior by stopping Valhalla briefly in staging; the
   API must return a controlled unavailable response, not fabricate a route.

Vercel dashboard linkage, VPS provisioning, DNS/TLS, real graph construction,
and hosted smoke tests remain deployment-time checks; repository configuration
alone cannot verify them.
