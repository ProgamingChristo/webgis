# GETRA Incident Runbook

## Common first response

1. Assign an incident commander, start a timestamped log, identify scope, and preserve evidence.
2. Contain the affected path with the smallest reversible change. Do not expose tokens, cookies, payloads, or provider responses in chat or tickets.
3. Track user impact, data integrity, current revision, request IDs, and dependency status.

## Credential leak

Disable or rotate the affected credential at its provider, inspect audit logs and Git history, invalidate sessions when applicable, redeploy runtime secrets, and verify no credential name/value remains in client artifacts or image layers. Notify privacy/legal owners if personal data access is possible.

## Database outage or corruption

Disable writes if integrity is uncertain, confirm Supabase/PostgreSQL status, preserve logs and WAL/backup evidence, fail readiness, and use the approved isolated restore procedure. Validate row counts, RLS, RPCs, and application smoke tests before reopening writes.

## Claude outage

Confirm auth and rate limiting remain operational. Keep deterministic GIS/search available and serve the controlled deterministic explanation where facts exist. Do not switch providers unless configuration and cost/security owners explicitly approve it.

## MAPID outage

Stop ingestion retries that amplify the outage, retain last-known data with honest source/freshness status, and prevent stale evidence from being labelled current. Resume with bounded pages and reconciliation after recovery.

## Bad deploy

Compare error rate and health to the prior revision. Roll back only if schema compatible; otherwise gate the affected feature and forward-fix. Re-run auth, RLS, spatial, community, advertising, and AI smoke checks.

## High API error rate or abuse

Break down by route, status, request ID, user/IP dimension, and dependency. Verify proxy trust before using forwarded IP data. Tighten existing limits only with impact monitoring; a process-local limiter does not protect a replicated deployment.

## Recovery closure

Confirm monitoring stability, reconcile delayed jobs/data, document customer impact and root cause, assign corrective actions with owners/dates, and test the prevention control rather than closing on documentation alone.
