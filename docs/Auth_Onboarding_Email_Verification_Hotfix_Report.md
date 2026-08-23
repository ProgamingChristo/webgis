# Auth Onboarding Email Verification Hotfix Report

Generated: 2026-08-23

## A. Email Verification

BEFORE:
REQUIRED on the linked Supabase project.

Evidence:
`POST /api/auth/register` returned `409 AUTH_EMAIL_CONFIRMATION_REQUIRED` because Supabase signup returned no session.

AFTER:
DISABLED TEMPORARILY.

Configuration action:
`supabase config push --project-ref sesakxnjaphrxqxllqjm --yes`

Remote Auth diff showed:
`email.enable_confirmations = true` -> `false`

Follow-up correction:
The first config push also applied local differences for site URL, MFA TOTP, OTP frequency, and OTP length. A second config push restored those remote settings while keeping `email.enable_confirmations = false`.

VERIFIED NEW SIGNUP:
PASS

Evidence:
New signup returned a Supabase session with access and refresh token present. Tokens were not logged.

Final post-correction signup check:
`getra.hotfix.final.17874261188543808@gmail.com` returned session, `account_role = USER`, `onboarding_complete = false`.

## B. Authorization

ACCOUNT ROLES:
USER | ADMIN

PUBLIC SIGNUP:
USER

LEGACY COMMUTER ROLE:
ABSENT from auth/signup flow.

COMMUNITY ROLE:
ABSENT from auth/signup flow.

UMKM_OWNER ROLE:
ABSENT from auth/signup flow.

ADMIN public signup:
ABSENT. Public register schema remains strict and does not accept account_role.

## C. Onboarding

GENERAL / KOMUTER:
DEFAULT / ALWAYS AVAILABLE

STORED AS STAKEHOLDER MODE:
NO

OPTIONAL MODES:
UMKM
INVESTOR
GOVERNMENT

Frontend now displays Komuter / General as the baseline experience and submits only selected optional modes.

## D. E2E

REGISTER -> ONBOARDING:
PASS by API/session evidence.

GENERAL ONLY:
PASS

SINGLE MODE:
PASS

MULTI MODE:
PASS

ALL MODES:
PASS

LOGIN AFTER REGISTRATION:
PASS

Browser Playwright runner:
BLOCKED without adding a project dependency. `npx` temporary package was not resolvable from repo test files on this Windows environment. API E2E and database verification were completed against the running localhost backend.

Verified new test accounts:
- `getra.hotfix.general.17874258931316723@gmail.com`
- `getra.hotfix.umkm.17874258931316723@gmail.com`
- `getra.hotfix.investor.17874258931316723@gmail.com`
- `getra.hotfix.government.17874258931316723@gmail.com`
- `getra.hotfix.multi.17874258931316723@gmail.com`
- `getra.hotfix.all.17874258931316723@gmail.com`

## E. Database

account_role:
PASS

onboarding_complete:
PASS

user_stakeholder_modes:
PASS

COMMUTER row created:
NO

GENERAL row created:
NO

Observed database states:
- New account before onboarding: `account_role = USER`, `onboarding_complete = false`, `modes = []`
- General-only after onboarding: `account_role = USER`, `onboarding_complete = true`, `modes = []`
- UMKM after onboarding: `modes = ["UMKM"]`
- Investor after onboarding: `modes = ["INVESTOR"]`
- Government after onboarding: `modes = ["GOVERNMENT"]`
- Multi after onboarding: `modes = ["INVESTOR", "UMKM"]`
- All after onboarding: `modes = ["GOVERNMENT", "INVESTOR", "UMKM"]`

## F. Quality

Frontend typecheck:
FAIL

Reason:
Pre-existing Phase 11 routing files reference missing modules:
- `frontend/src/types/spatial`
- `frontend/src/lib/api-client`

Frontend lint:
PASS

Frontend tests:
NOT APPLICABLE

Reason:
`getra-frontend` has no `test` script.

Frontend build:
FAIL

Reason:
Same missing Phase 11 routing dependency: `@/src/lib/api-client`.

Backend typecheck:
FAIL

Reason:
Pre-existing Phase 11 routing/transport route type errors in:
- `backend/app/api/routing/route.ts`
- `backend/app/api/transport/nearest/route.ts`

Backend lint:
FAIL

Reason:
Pre-existing lint/build blockers:
- `backend/src/types/database.types.ts` is invalid UTF-8 / appears binary
- `backend/scripts/preload-server-only.cjs` uses `require()`
- existing unused imports in MapID/routing files

Backend tests:
FAIL overall

Auth targeted tests:
PASS

Reason for overall failure:
`tests/unit/security/endpoint-policy.test.ts` detects new Phase 11 routes absent from endpoint policy matrix:
- `POST /api/routing`
- `POST /api/transport/nearest`

Backend build:
FAIL

Reason:
`backend/src/types/database.types.ts` has invalid UTF-8 and fails Turbopack parsing.

## G. Phase 11

PHASE 11:
PAUSED

AUTH/ONBOARDING HOTFIX:
PASS

Notes:
Core auth/onboarding behavior is fixed and verified. Repository-wide quality gates remain failing due to existing Phase 11 routing files and the pre-existing UTF-16/binary generated database types file. No Grounded AI Integration work was started.
