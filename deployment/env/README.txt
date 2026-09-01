GETRA HYBRID DEPLOYMENT ENVIRONMENT
===================================

Frontend Vercel
---------------
Configure browser-safe values in the Vercel frontend project rooted at
`frontend`. `NEXT_PUBLIC_GETRA_API_URL` must be the exact public HTTPS origin of
the Docker backend reverse proxy. Public values are embedded during build.

Docker VPS
----------
Create an ignored root `.env.local` on the VPS. Docker Compose reads it only at
container startup; it is never copied into the image.

Required application values:

  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  APP_ENV=production
  APP_BASE_URL
  FRONTEND_ALLOWED_ORIGINS

Recommended host bindings:

  GETRA_BIND_ADDRESS=127.0.0.1
  GETRA_DOCKER_PORT=3002
  VALHALLA_BIND_ADDRESS=127.0.0.1
  VALHALLA_PORT=8002

Docker routing overrides the backend provider URL to `http://valhalla:8002`.
Do not publish that URL to browser code and do not expose Valhalla publicly.

Add server-only integration credentials only for enabled features. In particular,
Sub2API, Midtrans server, MAPID server, and Supabase privileged keys must never
use `NEXT_PUBLIC_`, enter build arguments, or be copied to Vercel frontend env.

When the AI assistant is enabled, configure only on the Docker backend:

  AI_PROVIDER=sub2api
  SUB2API_API_KEY
  SUB2API_BASE_URL=https://api.mwapi.dev/v1
  SUB2API_MODEL=claude-sonnet-4-6
  RATE_LIMIT_AI_MAX_REQUESTS=15
  RATE_LIMIT_AI_WINDOW_MS=600000

Run `npm run docker:prod:config` for safe structural validation. Do not paste
expanded `docker compose config` output into tickets or shared logs because it
can contain resolved runtime credentials.
