# GETRA Unified Shell and UMKM Ownership Readiness

Date: 2026-09-01

## Outcome

The application now has one global navigation hierarchy for General, Community,
and UMKM. UMKM keeps a contextual workspace navigation instead of duplicating
global destinations in a permanent rail. Merchant claim and new registration
are distinct workflows, approved claims activate canonical ownership, and
advertising authorization reads that canonical ownership through one server-side
eligibility service.

The application code, unit/integration tests, lint, typecheck, and both production
builds pass. Deployment is not yet approved because the new migrations have not
been linted or exercised against a running local Supabase database, and viewport
QA could not run because the in-app browser runtime reported that no browser was
available.

## Architecture before and after

Before:

- General had a large independent top bar.
- Community and UMKM used a second shell that repeated global destinations in a
  sidebar.
- General/Community/UMKM and stakeholder analysis modes competed at the same
  visual level.
- An approved claim updated claim history but did not reliably assign
  `merchants.owner_id`.
- Promosi queried `merchants.owner_id`, so a claim could appear approved while
  the merchant remained unavailable for advertising.
- Payment refresh could force a campaign to `ACTIVE` without recomputing full
  campaign readiness.

After:

- `GetraGlobalHeader` owns the global General/Community/UMKM navigation.
- `GetraUnifiedAppShell` owns page framing and contextual UMKM/admin navigation.
- General stakeholder analysis modes remain subordinate controls inside General.
- `merchant_claims` is private workflow/evidence history.
- `merchants.owner_id` is the single active ownership authority.
- Claim and registration approval are atomic security-definer database functions.
- Advertising create/update/cancel, creative, targeting, lifecycle, checkout, and
  payment refresh reuse canonical eligibility/readiness checks server-side.

## Primary implementation

### Navigation and responsive shell

- Added `frontend/src/components/getra-ui/getra-global-header.tsx`.
- Added `frontend/src/components/getra-ui/getra-unified-app-shell.tsx`.
- Removed the duplicated `getra-app-shell.tsx` implementation.
- Updated General, UMKM, advertising, claim, submission, and UMKM admin routes to
  use the shared shell.
- Reworked the General desktop grid to use bounded `clamp()` columns and
  `minmax(0, 1fr)`, with existing progressive collapse at narrower widths.
- Added a mobile navigation drawer and prevented header controls from shrinking
  into overlapping text.
- Removed the external Google font build dependency and retained the existing
  system-font stack for reproducible offline builds.

### Merchant onboarding

- Preserved canonical merchant search before claim/registration.
- Claim now requires structured private contact, relationship, and ownership
  statement evidence instead of an instant pending claim.
- Registration now captures seven-day opening hours, business contact, price
  range, payment methods, public storefront/menu media, and local image previews.
- Public profile media is stored separately from private claim evidence.

### Ownership and review

- Added `20260901090000_merchant_claim_ownership_authority.sql`.
- Added `20260901091000_merchant_submission_profile_fields.sql`.
- Claim submission derives the claimant from `auth.uid()`.
- Admin approval derives the reviewer from `auth.uid()` and rejects self-review.
- Approval locks claim and merchant rows, checks current ownership, assigns the
  claimant as owner, records the admin only as reviewer, rejects competing pending
  claims, and writes audit events in one transaction.
- Registration approval creates a verified, published canonical merchant owned by
  the submitter in the same transaction as submission approval.
- Historical approved claims are backfilled only when exactly one claimant exists
  and no current owner is set; ambiguous records produce reconciliation audit
  events instead of guessed ownership.

### Advertising authorization

- `AdvertisingEligibilityService` requires UMKM mode, canonical active ownership,
  published and verified merchant state, and valid location.
- Pending or approved claim history is not treated as active authority.
- The Promosi merchant endpoint returns explicit eligible and ineligible states.
- Checkout now uses the canonical eligibility service.
- Payment refresh no longer forces `ACTIVE`; lifecycle state is derived from
  eligibility, creative, targeting, and schedule readiness.

## Security boundaries

- Account authorization remains `USER | ADMIN`; UMKM is a stakeholder mode.
- Claimants cannot supply their own authoritative claimant ID.
- Reviewers cannot approve/reject their own claim or registration.
- Direct authenticated insert/update/delete access on claim records is revoked;
  mutations go through constrained RPCs.
- Claim evidence remains claimant/admin-readable through RLS and is not copied to
  public merchant metadata.
- UI visibility is not used as the authorization boundary.

## Verification matrix

| Gate | Result | Evidence |
| --- | --- | --- |
| Root TypeScript | PASS | `npm run typecheck` |
| Frontend lint | PASS | `npm run lint -w frontend` |
| Backend lint | PASS | `npm run lint -w backend` |
| Frontend tests | PASS | 28 files, 98 tests |
| Backend tests | PASS | 134 passed files, 2 skipped; 851 passed tests, 3 skipped |
| Ownership/payment targeted tests | PASS | 3 files, 13 tests |
| Frontend production build | PASS | Next.js 16.3.1, 21 generated pages |
| Backend production build | PASS | Next.js 16.3.1, 78 generated pages |
| Diff whitespace check | PASS | no whitespace errors; CRLF conversion warnings only |
| Local database lint | BLOCKED | PostgreSQL refused `127.0.0.1:54322`; Docker/Supabase is not running |
| 1366x768 at 100% | NOT VERIFIED | in-app browser runtime had no available browser |
| 1440x900 at 100% | NOT VERIFIED | in-app browser runtime had no available browser |
| Authenticated claim-to-Promosi E2E | NOT VERIFIED | requires applied migrations and seeded USER/ADMIN accounts |

## Required deployment handoff

1. Start Docker Desktop.
2. Run `npm run db:start` from the repository root. The script now explicitly
   targets `backend/supabase`.
3. Run `npm run db:lint` and `npm run db:test`.
4. Exercise claim submit -> separate ADMIN approval -> owner workspace -> Promosi
   eligibility against the local database.
5. Confirm the reviewer remains only `reviewed_by` and the claimant becomes
   `merchants.owner_id`.
6. Repeat the same transaction with a conflicting current owner and verify it is
   rejected without partial writes.
7. Perform browser QA at 1366x768 and 1440x900 at 100% zoom, including long
   merchant names, status badges, mobile navigation, and campaign forms.
8. Apply the migrations through the normal controlled deployment pipeline only
   after the local database gates pass.

## Known limitations

- Migration syntax and atomic behavior are covered by source-level tests but not
  yet confirmed by a live PostgreSQL execution.
- Private ownership evidence is structured text/contact data; a dedicated private
  document-upload bucket is not included in this change.
- The existing ownership model supports one canonical active owner via
  `merchants.owner_id`; organization/member-manager roles are not introduced.
- Opening-hours validation supports same-day intervals and does not model an
  overnight interval spanning two dates.
- No commit, push, production migration, or deployment was performed.
