# GETRA Deployment Runbook

## Pre-deploy

1. Select an immutable revision and use Node 22.13 or newer with `npm ci`.
2. Validate environment variable names without printing values. Keep server credentials out of `NEXT_PUBLIC_*` variables and image build arguments.
3. Run `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`, dependency audit, and client-artifact secret-name scan.
4. Run `docker compose config`, build the backend image, and scan it. The backend entry point is `backend/server.js` inside the standalone artifact.
5. Back up the database and confirm the most recent restore rehearsal result.

## Database migration

1. Apply migrations explicitly from a controlled deployment job; never from application startup.
2. Test the same chain against a fresh and an upgrade-path staging database.
3. Stop on any migration, seed, RLS, RPC, or generated-type mismatch.
4. Prefer forward-compatible expand/migrate/switch changes. Do not assume a destructive database rollback is safe.

## Deploy and smoke

1. Deploy backend and frontend artifacts with runtime secrets supplied by the platform.
2. Verify process liveness, database readiness, auth 401/403 semantics, request IDs, and CORS.
3. Smoke USER, ADMIN, onboarding, nearby merchant/transit, controlled no-route, community, advertising, and fair-discovery flows.
4. Run the limited live Claude and MAPID checks from the acceptance checklist.
5. Monitor error rate, p95 latency, rate-limit responses, database saturation, and dependency health through the observation window.

## Rollback / forward fix

1. Roll back the application artifact only when the previous version is compatible with the migrated schema.
2. For an incompatible database change, stop traffic to the affected feature and ship a reviewed forward fix.
3. Never restore or reverse production data without incident command approval and a verified recovery point.
4. Record revision, migration versions, timestamps, decision owner, and verification outcome.
