================================================================================
GETRA — GEO-ENABLED TRANSIT & RETAIL ANALYTICS
FEATURE: UMKM WORKSPACE & HEADBAR NAVIGATION
================================================================================

PARENT TRACK:
UMKM Intelligence & Advertising Track

FRONTEND FEATURE ROOT:
frontend/src/features/umkm-workspace/

BACKEND FEATURE ROOT:
backend/src/features/umkm-workspace/

FRONTEND ROUTES:
frontend/app/umkm/ (Workspace Cockpit Overview)

BACKEND API ROOT:
backend/app/api/umkm/workspace/

ACCESS RULES:
1. Canonical Account Roles remain strictly USER | ADMIN in profiles.account_role.
2. User is classified as "USER UMKM" when account_role = 'USER' AND stakeholder_modes contains 'UMKM'.
3. Access to /umkm and /api/umkm/workspace requires 'UMKM' stakeholder mode or 'ADMIN' role.
4. Anonymous users and General USERs without UMKM mode are denied (403 Forbidden).

DEPENDENCIES & SEPARATION:
- Stakeholder Mode != Merchant Ownership.
- A user with UMKM mode but 0 owned merchants can still access /umkm to submit new businesses.
- Managing campaigns and viewing analytics strictly requires verified merchant ownership in public.merchants(owner_id = user.id).

PHASE HISTORY:
- Phase 11: UMKM Headbar Navigation, /umkm Cockpit Dashboard, Owned Merchant List, Submission Status Summary, Quick Action Navigation.
================================================================================
