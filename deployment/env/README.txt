GETRA CONTAINER ENVIRONMENT
===========================

PURPOSE
-------
Docker builds one production standalone image. Configuration is supplied when the
container starts; environment files are never copied into the image or committed.

REQUIRED RUNTIME VARIABLES
--------------------------
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

The publishable Supabase values are application configuration, not database or
service-role credentials. Server-only credentials must never use NEXT_PUBLIC_.

DEPLOYMENT VARIABLES
--------------------
APP_ENV
APP_BASE_URL
FRONTEND_ALLOWED_ORIGINS
TRUST_PROXY
GETRA_DOCKER_PORT

GETRA_DOCKER_PORT is consumed by Docker Compose and defaults to host port 3002.
The container listens only on port 3000. Production-like mode requires explicit
APP_BASE_URL and FRONTEND_ALLOWED_ORIGINS values. APP_ENV staging/production
requires APP_BASE_URL to be an HTTPS origin without path/query/fragment.

FRONTEND_ALLOWED_ORIGINS is a comma-separated exact allowlist. Do not use `*`,
`null`, guessed production domains, paths, query strings, or credentials in an
origin. Blank means only same-origin browser traffic and requests without Origin.

TRUST_PROXY defaults to false. Set true only when a trusted reverse proxy/ingress
overwrites forwarded headers, blocks direct container access, and supplies a
validated client IP. It is not automatically safe merely because Docker is used.

API SECURITY VARIABLES
----------------------
API_MAX_JSON_BODY_BYTES
SUPABASE_REQUEST_TIMEOUT_MS
RATE_LIMIT_WINDOW_MS
RATE_LIMIT_AUTH_MAX_REQUESTS
RATE_LIMIT_API_MAX_REQUESTS
RATE_LIMIT_MUTATION_MAX_REQUESTS
RATE_LIMIT_SPATIAL_MAX_REQUESTS

Blank values use validated defaults:

  API_MAX_JSON_BODY_BYTES=65536
  SUPABASE_REQUEST_TIMEOUT_MS=10000
  RATE_LIMIT_WINDOW_MS=60000
  RATE_LIMIT_AUTH_MAX_REQUESTS=5
  RATE_LIMIT_API_MAX_REQUESTS=60
  RATE_LIMIT_MUTATION_MAX_REQUESTS=20
  RATE_LIMIT_SPATIAL_MAX_REQUESTS=30

Route-level limits can be stricter than the global body limit. The current
in-memory limiter is real for one process but is not shared across replicas.

OPTIONAL SERVER-ONLY VARIABLES
------------------------------
SUPABASE_SERVICE_ROLE_KEY
MAPID_BASE_URL
MAPID_API_KEY
MAPID_TIMEOUT_MS
SPATIAL_MAX_RADIUS_METERS
SPATIAL_MAX_BBOX_LATITUDE_DEGREES
SPATIAL_MAX_BBOX_LONGITUDE_DEGREES
DEFAULT_WALKING_SPEED_MPS

Do not supply a service-role key or MAPID key until the corresponding server-only
use case is approved. Never put either value in source, Compose YAML, Docker build
arguments, image labels, test fixtures, or logs.

LOCAL PRODUCTION CONTAINER
--------------------------
Use the existing ignored .env.local only as the Compose interpolation source:

  docker compose --env-file .env.local config --quiet
  docker compose --env-file .env.local up -d --build

The default host URL is http://127.0.0.1:3002. This avoids the existing PM2 and
Next development ports. The container itself runs the standalone production
server, never next dev.

The base Compose defaults to APP_ENV=development so local HTTP can be used while
still running a production standalone artifact. This is not a production network
security claim.

PRODUCTION-LIKE OVERRIDE
------------------------
Create an ignored environment file with explicit production-like values, then run:

  docker compose --env-file <ignored-env-file> -f docker-compose.yml -f docker-compose.prod.yml config --quiet
  docker compose --env-file <ignored-env-file> -f docker-compose.yml -f docker-compose.prod.yml up -d --build

Do not print the expanded Compose configuration in shared logs because expanded
runtime environment values may be visible. Use config --quiet for validation.

Production HTTPS is terminated by the selected platform/reverse proxy. The
repository does not contain a self-signed certificate, guessed public domain, or
mandatory Nginx configuration. Container HTTP must remain on a controlled network.

BUILD-TIME NOTE
---------------
No secrets or environment values are accepted as Docker build arguments. This
repository currently deploys a backend-only image and reads its configuration on
the server at startup. If browser code later consumes NEXT_PUBLIC_ variables,
Next.js inlines those public values during build; that frontend configuration must
then be handled explicitly without moving server-only secrets into the build.

FRONTEND CONFIGURATION
----------------------
NEXT_PUBLIC_GETRA_API_URL belongs to the frontend build/runtime contract and is
not required by this backend container. Local Docker default is
http://localhost:3002. Staging and production values are not yet defined; do not
invent them.

HEALTH AND FAILURE BEHAVIOR
---------------------------
The container healthcheck calls GET /api/health. This is readiness, including a
real Supabase connectivity probe, not a PID-only liveness check. Invalid required
configuration fails startup validation. Supabase unavailability makes readiness
fail without exposing connection details or secrets.

See:

  docs/DOCKER_USAGE.txt
  docs/PUBLIC_API_SECURITY.txt
  docs/FRONTEND_INTEGRATION.txt
  docs/API_ENDPOINT_MATRIX.txt
