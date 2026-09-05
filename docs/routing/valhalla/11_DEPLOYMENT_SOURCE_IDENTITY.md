# Deployment Source Identity

Date: 2026-09-02
Scope: Phase 1 release identity hard gate.

## Current Source State

- Branch: `finalmerge`
- HEAD: `2cf252e8bfcedbff42a40de07d6227e34ca63499`
- Worktree: DIRTY

Dirty paths:

- `.dockerignore`
- `.gitignore`
- `backend/src/modules/ai/ai.schema.ts`
- `backend/src/modules/ai/ai.service.ts`
- `backend/tests/unit/ai/ai.service.test.ts`
- `frontend/app/settings/profile/page.tsx`
- `frontend/components/getra-map.tsx`
- `frontend/src/components/providers/StakeholderProvider.tsx`
- `frontend/src/components/stakeholder/stakeholder-mode-switcher.tsx`
- `docs/routing/`

## Gate Decision

`SOURCE_REVIEWED=NO`

Application deployment must not proceed from this working tree.

## Approved Source Required

One of these is required before application checkout/deployment:

1. Commit the reviewed changes and record the new deployment SHA.
2. Provide an explicitly reviewed deployment package/snapshot from the owner.

Required fields after approval:

- `DEPLOYMENT_SOURCE_TYPE=GIT_COMMIT` or `REVIEWED_PACKAGE`
- `GETRA_DEPLOYMENT_SHA=<approved-sha-or-package-id>`
- `SOURCE_REVIEWED=YES`
- `VPS_CHECKOUT_SHA=<verified-sha>`

## Current Values

- `DEPLOYMENT_SOURCE_TYPE=BLOCKED`
- `GETRA_DEPLOYMENT_SHA=NOT_APPROVED`
- `SOURCE_REVIEWED=NO`
- `VPS_CHECKOUT_SHA=NOT_VERIFIED`

## Important Note

The audited Phase 0 commit SHA is not automatically the deployment SHA because
the worktree has uncommitted and untracked changes.
