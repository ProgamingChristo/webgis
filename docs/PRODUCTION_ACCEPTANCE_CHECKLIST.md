# GETRA Production Acceptance Checklist

This checklist is a release gate. Repository tests do not replace staging or operational verification.

## Credentials and configuration

- [ ] Provision production Supabase URL, publishable key, and server-only service-role key.
- [ ] Configure backend-only `AI_PROVIDER=sub2api`, `SUB2API_API_KEY`, `SUB2API_MODEL`, `SUB2API_BASE_URL`, and the validated timeout.
- [ ] Configure MAPID credentials only in the server runtime.
- [ ] Replace the malformed local `.env.local` file with a UTF-8 deployment environment file.
- [ ] Confirm production origins, domain, TLS, `APP_BASE_URL`, `FRONTEND_ALLOWED_ORIGINS`, and trusted-proxy policy.
- [ ] Run a secret-history scan and rotate any credential identified by that scan.

## Database and data

- [ ] Start Docker/Supabase locally and pass `supabase db reset`, database tests, and database lint.
- [ ] Apply the complete migration chain to a disposable staging database.
- [ ] Run the RLS actor matrix using anonymous, two USER accounts, ADMIN, and service role.
- [ ] Verify spatial RPC results, GiST-index plans, seed repeatability, and generated database types.
- [ ] Verify production backup is configured and complete a restore rehearsal to an isolated database.
- [ ] Confirm MAPID freshness, validation, privacy, and field-evidence retention decisions.

## Application and external services

- [ ] Replace the in-memory limiter with an approved shared store before multi-instance deployment, or deploy exactly one instance and formally accept that limitation.
- [ ] Run live Claude smoke tests: grounded general, spatial, multi-turn, failure, and injection cases.
- [ ] Verify pedestrian-network coverage and controlled no-route behavior with staging data.
- [ ] Build and start the Docker image; verify liveness, API readiness, frontend-to-backend reachability, and graceful termination.
- [ ] Configure uptime, error-rate, latency, database, and dependency alerts.
- [ ] Execute rollback and forward-fix drills, then record release acceptance owners.

## Final acceptance

- [ ] `npm ci`, typecheck, lint, tests, and build pass from a clean checkout.
- [ ] No open Critical or High code-security finding.
- [ ] All BLOCKED items in `docs/SECURITY_REVIEW.md` are verified or explicitly accepted by accountable owners.
- [ ] Product, Security, Data, and Operations sign off on the same staged artifact.
