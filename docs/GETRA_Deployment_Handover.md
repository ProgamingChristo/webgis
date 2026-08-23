# GETRA Deployment Handover

This document outlines the final pre-deployment considerations and mechanisms for GETRA Phase 13.
> **IMPORTANT: Phase 13 does not automatically deploy to production.** This is a handover artifact.

## Production Status

- **Deployment Method**: PM2 / Docker (Refer to `ecosystem.config.cjs` and `Dockerfile` in root/backend)
- **Status**: PARTIALLY VERIFIED. The application structure natively supports containerized and process-managed deployments, but the final cloud deployment topology is dependent on user provisioning.

## Frontend (Next.js) Build
```bash
cd frontend
npm install
npm run build
npm start # Production mode
```
- Ensure `NEXT_PUBLIC_API_URL` points to the *production* backend URL, not `http://localhost:8080`.

## Backend Build
```bash
cd backend
npm install
npm run build
npm start # Starts the built output
```
- Ensure `FRONTEND_ALLOWED_ORIGINS` includes the *production* frontend origin.

## Email Confirmation Warning
> **PRE-PRODUCTION AUTH DECISION**
> Current status: Email confirmation is **temporarily disabled**.
> Before public production launch:
> 1. Decide whether to enforce email confirmation.
> 2. Configure the SMTP email templates/provider in Supabase.
> 3. Re-run signup/login/onboarding E2E testing to verify the redirect flow.

## Secrets & Configurations
- **Production Secrets**: Use platform-specific secret management (e.g. Vercel secrets, Docker secrets).
- **NEVER** expose the `SUPABASE_SERVICE_ROLE_KEY` or `AI_API_KEY` in the frontend bundle or client-side environments.

## Database Migrations
- Perform `supabase db push --dry-run` to preview changes on the production linked instance.
- **Do not** use `supabase db reset --linked`. Always roll forward safely.

## Rollback & Backups
- Application code can be rolled back via git tagging/Docker image tagging.
- Database rollbacks involving dropped columns or tables are destructive. Rely on Supabase automated point-in-time recovery capabilities if configured. Restoring a production database should be a last resort requiring strict review. (RESTORE PROCEDURE: NOT TESTED).
