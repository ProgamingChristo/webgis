# Supabase CLI Usage for GETRA

This document outlines local Supabase CLI usage. The mandatory migration-first
workflow, remote drift handling, dry-run requirement, and troubleshooting are
maintained in `docs/SUPABASE_MIGRATION.txt`.

## Prerequisites
- Install Supabase CLI: `npm i -g supabase` or via brew/choco.
- Check installation:
  ```bash
  supabase --version
  ```

## Authentication
To connect the CLI to the remote project:
```bash
supabase login
```
Then link to the specific project (using the project reference):
```bash
supabase link --project-ref sesakxnjaphrxqxllqjm
```

## Creating Migrations
To create a new empty migration file:
```bash
supabase migration new create_profiles_and_roles
```
This generates a timestamped `.sql` file in `supabase/migrations/`. 

> **Important**: Never change database schema via the Supabase Dashboard UI. Always write migrations in the repository so they are version-controlled.

## Local Development & Testing

When developing locally or running automated tests, you can reset your local database and apply all migrations and `seed.sql`:
```bash
supabase db reset
```
> [!CAUTION]  
> `supabase db reset` will **DESTROY ALL DATA** in your local database and re-run all migrations from scratch, followed by `supabase/seed.sql`. **Do NOT use this command against the production database.**

Run the Phase 4 pgTAP database suite after reset:
```bash
supabase test db
```

Project-local npm wrappers are also available:
```bash
npm run db:start
npm run db:reset
npm run db:test
npm run db:lint
npm run db:migrations
```

## Deploying to a Linked Remote

Inspect history and preview before applying pending migrations:
```bash
supabase migration list
supabase db push --dry-run
supabase db push
supabase migration list
```

Do not include `supabase/seed.sql` in a production push. Never run
`supabase db reset --linked` without explicit approval; it is destructive.
