# GETRA Production Deployment Runbook

## Pre-deploy

1. Select an immutable revision. Use Node 22.13+ and current Docker Engine with
   Compose v2 on the VPS.
2. Confirm the hybrid topology in [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md):
   frontend on Vercel; backend and Valhalla in Docker on the VPS.
3. Validate environment variable names without printing values. Keep all server
   credentials out of `NEXT_PUBLIC_*`, Docker build arguments, and Git.
4. Prepare and validate `routing-data/jabodetabek.osm.pbf`.
5. Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, and
   `npm run docker:prod:config`.
6. Back up the database and confirm the latest restore rehearsal status.

## Database migration

1. Apply migrations from a controlled job, never from container startup.
2. Test the migration chain against fresh and upgrade-path staging databases.
3. Stop on a migration, seed, RLS, RPC, or generated-type mismatch.
4. Prefer forward-compatible expand/migrate/switch changes. Never use a linked
   production reset.

## Deploy backend and routing

1. Pull the immutable revision and keep the production `.env.local` on the VPS.
2. Run `npm run docker:prod:config`, then `npm run docker:prod:start`.
3. Run `npm run docker:prod:status`; both `getra-backend` and `valhalla` must be
   healthy before traffic is switched.
4. Through the HTTPS reverse proxy, verify `/api/health`, CORS, auth 401/403,
   request IDs, routing, and dependency failure responses.
5. Confirm ports 3002 and 8002 are not publicly reachable.

## Deploy frontend

1. Set the Vercel frontend `NEXT_PUBLIC_GETRA_API_URL` to the exact public HTTPS
   API origin.
2. Deploy the `frontend` workspace and verify the generated deployment.
3. Smoke USER, ADMIN, UMKM onboarding, nearby merchant/transit, controlled
   no-route, community, advertising, and fair-discovery flows.
4. Run one limited live Sub2API check and approved MAPID checks.
5. Monitor error rate, p95 latency, rate limits, database saturation, backend
   health, and Valhalla health through the observation window.

## Rollback / forward fix

1. Restore the previously verified frontend deployment when compatible.
2. On the VPS, deploy the previously verified application revision and rebuild
   only if it remains compatible with current migrations and routing data.
3. For incompatible database changes, stop affected traffic and ship a reviewed
   forward fix. Never reverse or restore production data without approval and a
   verified recovery point.
4. Record revision, image ID, migration versions, graph source date, timestamps,
   decision owner, and verification outcome.
