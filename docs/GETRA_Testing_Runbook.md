# GETRA Testing Runbook

GETRA employs a strict testing gateway policy.

## Permanent Quality Gate Order
Before opening PRs or merging code, adhere to this sequence:
1. CODE
2. TYPECHECK
3. LINT
4. TEST
5. BUILD
6. MIGRATION CHECK
7. REMOTE VERIFY
8. SECURITY
9. DOCS

## Commands

### Backend Verification (Port 8080)
From the `backend/` directory:
- **Typecheck**: `npx tsc --noEmit`
- **Lint**: `npm run lint`
- **Unit & Integration Tests**: `npm run test` (Uses Vitest)
- **Build**: `npm run build`
- **E2E Data & Spatial Integrity Script**: `node scripts/e2e-data-test.cjs` (Requires `GETRA_E2E_ACCESS_TOKEN` exported in the shell)

### Frontend Verification (Port 3000)
From the `frontend/` directory:
- **Typecheck**: `npx tsc --noEmit`
- **Lint**: `npm run lint`
- **Build**: `npm run build`

## Interpreting Status Language
- **PASS**: The test suite executed completely without regressions.
- **FAIL**: Regressions or explicit errors were detected.
- **BLOCKED**: Tests cannot run due to environmental, dependency, or upstream infrastructure issues (e.g. database offline).
- **NOT TESTED**: A component exists but lacks automated assertions.
- **NOT APPLICABLE**: The feature is structurally irrelevant to the testing domain.
