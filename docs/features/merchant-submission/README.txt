================================================================================
GETRA — GEO-ENABLED TRANSIT & RETAIL ANALYTICS
FEATURE: MERCHANT SUBMISSION & CURATION ENGINE
================================================================================

PARENT TRACK:
UMKM Intelligence & Advertising Track

FRONTEND FEATURE ROOT:
frontend/src/features/merchant-submission/

BACKEND FEATURE ROOT:
backend/src/features/merchant-submission/

FRONTEND ROUTES:
- frontend/app/umkm/merchants/new/ (New Merchant Submission & Draft Editor)
- frontend/app/umkm/submissions/[id]/ (Submission Detail & Lifecycle Tracking)

BACKEND API ROOT:
- backend/app/api/umkm/merchant-submissions/ (User Submission APIs)
- backend/app/api/admin/merchant-submissions/ (Admin Curation APIs)

PURPOSE & WORKFLOW:
Enables micro, small, and medium businesses to submit their physical locations for
inclusion in the GETRA transit discovery index. Implements strict draft staging,
interactive MapLibre coordinate selection, duplicate candidate detection, and
atomic admin approval creating canonical verified merchants.

PHASE HISTORY:
- Phase 11: Initial Foundation (Migration, PostGIS Points, RLS, Draft Staging, Admin Curation APIs, Frontend Map Picker & Form).
================================================================================
