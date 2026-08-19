# GETRA Supabase Setup

## Required Connection

Use the PostgreSQL Direct connection URI from Supabase `Connect`:

```env
DATABASE_URL=postgresql://postgres.PROJECT_REF:DATABASE_PASSWORD@HOST:5432/postgres?sslmode=require
```

Do not use the Supabase publishable or secret API key as the database password. API keys access Supabase services; schema migration requires a PostgreSQL connection.

## Migration Order

Run these files in order:

```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f "supabase/migrations/0001_getra_core.sql"
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" "$env:DATABASE_URL" -v ON_ERROR_STOP=1 -f "supabase/migrations/0002_competition_data.sql"
```

Alternative through the Supabase SQL Editor:

- Open the project SQL Editor.
- Run the complete contents of `0001_getra_core.sql`.
- Confirm the query succeeds before continuing.
- Run the complete contents of `0002_competition_data.sql`.
- Open Security Advisor and review every finding.

## Post-Migration Verification

- Confirm PostGIS and pgRouting are enabled.
- Confirm all GETRA tables have RLS enabled.
- Confirm `anon` cannot read raw Community Activity, Menu Go, Struk Go, Properti Go, evidence, moderation, ingestion, or AI trace tables.
- Confirm `anon` can only read publishable and verified canonical merchants.
- Confirm authenticated contributors can only insert and read their own survey observations.
- Confirm users can update `display_name` but cannot update `role` or `trust_score`.
- Confirm restricted source records cannot be marked publishable.
- Confirm no competition data is loaded before its terms and access scope are registered in `data_sources`.

## Secret Handling

- Publishable key is allowed in browser code and remains protected by RLS.
- Secret key is backend-only and bypasses RLS.
- Rotate every key that was sent through chat before staging or production.
- Store production secrets in the hosting provider secret manager, not in committed files.
