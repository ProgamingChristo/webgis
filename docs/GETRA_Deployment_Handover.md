# GETRA Deployment Handover

GETRA production uses a Vercel frontend plus a Dockerized backend and private
Valhalla service on a VPS. It does not require Google Maps routing billing.

- Frontend: Vercel project rooted at `frontend`.
- Backend: `getra-backend` image built from the root `Dockerfile`.
- Routing: pinned Valhalla container with graph data mounted from `routing-data`.
- Database: remote Supabase; no PostgreSQL container is created.
- Canonical instructions: [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md) and
  [`DEPLOYMENT_RUNBOOK.md`](./DEPLOYMENT_RUNBOOK.md).

Production deployment is not performed automatically. VPS provisioning, DNS,
TLS, Vercel linkage, graph build, and hosted smoke tests require the real target
infrastructure and remain unverified until executed there.

## Security handoff

- Keep Sub2API, Midtrans server, and Supabase privileged keys only in the ignored
  VPS environment file.
- Keep backend and Valhalla host bindings on `127.0.0.1`; publish only HTTPS via
  a trusted reverse proxy.
- Use exact production origins for `APP_BASE_URL` and
  `FRONTEND_ALLOWED_ORIGINS`.
- Email confirmation is currently disabled. Before public launch, decide the
  intended policy, configure Supabase SMTP/templates if enabling it, and rerun
  signup, login, callback, and onboarding E2E checks.

## Data and rollback handoff

- Preview migrations with the approved Supabase workflow. Never run
  `supabase db reset --linked`.
- Roll application revisions back only when compatible with the deployed schema.
- Record the OSM extract date used to create the Valhalla graph.
- Database restore is a last-resort incident action. Restore rehearsal remains
  `NOT VERIFIED` unless deployment evidence says otherwise.
