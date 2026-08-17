# GETRA

Backend foundation for the GETRA WebGIS project.

- API conventions: `docs/API_FOUNDATION.md`
- Supabase CLI workflow: `docs/SUPABASE_CLI.md`
- Safe remote migration workflow: `docs/SUPABASE_MIGRATION.txt`
- Persistent backend process: `docs/RUNNING_BACKEND.txt`
- Per-phase change log: `docs/changes/`
- Database and PostGIS architecture: `docs/database/database-architecture.md`
- External data integration architecture: `docs/EXTERNAL_DATA_INTEGRATION.txt`
- MAPID adapter foundation usage: `docs/MAPID_ADAPTER_USAGE.txt`
- Spatial engine foundation usage: `docs/SPATIAL_ENGINE_USAGE.txt`
- Spatial API contract: `docs/SPATIAL_API.txt`
- Docker/container workflow: `docs/DOCKER_USAGE.txt`
- Public API security model: `docs/PUBLIC_API_SECURITY.txt`
- Frontend integration contract: `docs/FRONTEND_INTEGRATION.txt`
- API endpoint classification: `docs/API_ENDPOINT_MATRIX.txt`

Run the application with `npm run dev`. Run code checks with `npm run typecheck`,
`npm run lint`, and `npm test`. Local database commands are documented in the
Supabase CLI guide.

For a persistent production-like local/server process, use
`npm run process:start`; status, logs, restart, and stop commands are documented
in `docs/RUNNING_BACKEND.txt`. This mode runs the production build with
`next start`; it does not replace the normal `npm run dev` workflow.

For the production standalone container, use `npm run docker:build` and
`npm run docker:start`. The default host mapping is port 3002 so PM2 on port
3000 and Next development on port 3001 can remain online. Runtime credentials
come from the ignored `.env.local`; they are never baked into the image.
