# GETRA Security Review

Last repository review: 2026-08-27. No secret values are recorded here.

| Severity | Status | Component | Risk | Fix / required action | Verification |
|---|---|---|---|---|---|
| Critical | Fixed | Database migration | Invalid dynamic-SQL quoting could stop migration replay. | Corrected guarded GRANT statements. | Static regression test passes; fresh reset remains blocked by unavailable Docker daemon. |
| High | Fixed | Profile authorization | Legacy recursive admin policies used `profiles.role` instead of canonical `account_role`. | Replaced policies through forward reconciliation using `private.is_admin()`. | Targeted migration test passes; live RLS matrix remains blocked. |
| High | Fixed | AI API | Provider/internal error messages could be returned and raw errors logged. | Route now delegates to the standard sanitized error contract and request-ID logger. | Typecheck, security suite, and build pass. |
| High | Fixed | AI provider selection | Explicit Claude configuration silently failed over to a different paid provider. | Explicit provider selection now permits only that provider; invalid values fail clearly. | Automated provider behavior still requires a dedicated failure-matrix suite. |
| Medium | Fixed | AI/GIS input | AI coordinates accepted out-of-range numeric values. | Added finite latitude/longitude bounds. | Schema/typecheck pass. |
| Medium | Fixed | Transport/routing input | Negative/huge pagination and unbounded routing environment values reached services. | Added strict Zod bounds and payload shape validation. | Typecheck and build pass. |
| Medium | Fixed | MAPID API | Sync response used camelCase fields contrary to its declared snake_case contract; raw JSON relied on an unsafe cast. | Added runtime JSON validation and explicit response mapping. | Backend build passes. |
| Medium | Open | Rate limiting | Default limiter is process-local and ineffective across replicas. | Select and implement a shared production adapter, or formally constrain deployment to one instance. | Requires infrastructure/business decision and load test. |
| Medium | Blocked | RLS/database | Full migration replay, pgTAP suite, RLS actor matrix, and query plans could not run. | Start Docker Desktop/Supabase and execute the acceptance checklist. | Docker Linux daemon was unavailable during review. |
| Medium | Open | Generated DB types | Generated types still contain legacy stakeholder enum values and require regeneration from the reconciled schema. | Regenerate only after a successful fresh reset; review resulting diff. | Blocked on local database. |
| Low | Open | Local deployment config | `.env.local` contains a UTF-16/NUL encoded segment that Docker Compose rejects. | Recreate it as UTF-8 without BOM; do not copy values into source control. | Compose succeeds with synthetic environment values. |
| Operational | Blocked | External providers | Live Claude, MAPID, monitoring, backup, restore, and deployed health were not verified. | Complete the production acceptance checklist. | External credentials/infrastructure required. |

Current repository conclusion: no open Critical code finding; multi-instance rate limiting and unverified database/RLS gates prevent a production-ready verdict.
