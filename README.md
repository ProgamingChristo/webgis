# GETRA

Backend foundation for the GETRA WebGIS project.

- API conventions: `docs/API_FOUNDATION.md`
- Supabase CLI workflow: `docs/SUPABASE_CLI.md`
- Safe remote migration workflow: `docs/SUPABASE_MIGRATION.txt`
- Persistent backend process: `docs/RUNNING_BACKEND.txt`
- Per-phase change log: `docs/changes/`
- Database and PostGIS architecture: `docs/database/database-architecture.md`

Run the application with `npm run dev`. Run code checks with `npm run typecheck`,
`npm run lint`, and `npm test`. Local database commands are documented in the
Supabase CLI guide.

For a persistent production-like local/server process, use
`npm run process:start`; status, logs, restart, and stop commands are documented
in `docs/RUNNING_BACKEND.txt`. This mode runs the production build with
`next start`; it does not replace the normal `npm run dev` workflow.
