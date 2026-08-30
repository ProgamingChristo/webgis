# GETRA Project Audit - 2026-08-26

Scope: repository `C:\Users\Revan Anthony\OneDrive\Documents\GitHub\webgis`.

This audit distinguishes generated/dependency output from source. The pass excluded `node_modules`, `.next`, `frontend/.next`, `backend/.next`, `frontend/public/maplibre`, and `backend/lib/ai.zip` when counting source files.

## Source Inventory

Non-generated source inventory found 1050 files:

| Area | Files | Notes |
| --- | ---: | --- |
| `backend/` | 523 | Backend Next API routes, domain modules, repositories, Supabase migrations, tests, backend docs/scripts. |
| `frontend/` | 212 | Frontend Next app, dashboard/map UI, auth pages, feature hooks/services/components. |
| `docs/` | 279 | Handoffs, API docs, feature phase docs, setup/runbooks. Several docs are stale against current env names. |
| `data/` | 3 | Demo/reference frontend data. |
| `scripts/` | 6 | Root dev/render/admin helper scripts. |
| `types/` | 2 | Shared root types. |
| root config/docs | 25 | Package/workspace config, Docker/PM2 config, TypeScript/Vitest/Vite config, README/progress docs. |

## Runtime Failures Investigated

### 1. `NEXT_PUBLIC_API_URL belum dikonfigurasi`

Cause: frontend code reads `NEXT_PUBLIC_API_URL`, while `.env.example` still documented `NEXT_PUBLIC_GETRA_API_URL`. Running the frontend workspace without `frontend/.env.local` also meant the root `.env.local` was not enough for `next dev` in `frontend/`.

Fix applied:
- Added `frontend/.env.local` with public frontend env.
- Updated `.env.example` from `NEXT_PUBLIC_GETRA_API_URL` to `NEXT_PUBLIC_API_URL`.
- Updated `docs/GETRA_Environment_Reference.md`.

### 2. `Session tidak tersedia` overlay on `/login`

Cause: `GetraDashboard` auto-ran authenticated discovery/profile-poster requests before an authenticated context existed. The Fair Discovery hook logged the caught error with `console.error`, which triggers the Next dev overlay.

Fix applied:
- `frontend/components/getra-dashboard.tsx`: Fair Discovery is enabled only when `authContext` exists.
- `frontend/components/getra-dashboard.tsx`: profile poster fetch is enabled only when `authContext` exists.
- `frontend/src/features/fair-discovery/hooks/use-fair-discovery.ts`: removed dev-overlay `console.error`; error remains in UI state.

### 3. Supabase realtime error after subscribe

Error: `cannot add 'postgres_changes' callbacks ... after 'subscribe()'`.

Cause: community realtime reused deterministic channel names such as `community-notifications-<userId>`. In dev/React Strict Mode, mount/unmount cycles can collide with an existing subscribed channel.

Fix applied:
- `frontend/src/features/community/services/community-realtime.service.ts`: channel names now include a unique suffix per subscription while preserving the same server-side Postgres filter.

### 4. Session returns to login after browser refresh

Cause: browser auth relied only on Supabase client storage recovery. If the Supabase browser client has not restored session state before `getAccessToken()` is used, private route guards can treat the user as logged out and redirect to `/login`.

Fix applied:
- `frontend/src/lib/auth-client.ts`: stores the backend-issued session in a GETRA local session key after login/signup.
- `frontend/src/lib/auth-client.ts`: restores Supabase session from the GETRA local session key when `supabase.auth.getSession()` returns no access token.
- `frontend/src/lib/auth-client.ts`: clears the GETRA local session key on logout.

### 5. AI chat preflight and Claude SDK request shape

Cause: frontend AI calls send `Authorization` and `Content-Type`, which require a CORS preflight against the backend. `/api/ai/ask` was cataloged in endpoint policy but did not export `OPTIONS`. The Claude adapter also used `output_format`, while the installed Anthropic SDK expects `output_config.format` for `messages.parse()`.

Fix applied:
- `backend/app/api/ai/ask/route.ts`: exports `OPTIONS = createOptionsHandler("/api/ai/ask")`.
- `backend/lib/ai/anthropic.ts`: sends structured output config as `output_config: { format: zodOutputFormat(schema) }`.

### 6. AI auth-before-provider, canonical Claude, and chatbot behavior

Cause: `/api/ai/ask` only checked that an `Authorization` header existed. Intent classification could call the configured LLM before Supabase verified the token. The provider abstraction also silently tried another configured provider when the selected provider failed.

Fix applied:
- `backend/app/api/ai/ask/route.ts`: now uses `requireAuthenticatedUser()` and rate limiting before reading/generating AI output.
- `backend/lib/ai/provider.ts`: `AI_PROVIDER=claude` now makes Claude canonical; failures do not silently fallback to OpenAI.
- `backend/lib/ai/anthropic.ts`: sets bounded timeout and disables SDK retries to avoid hidden repeated paid requests.
- `backend/src/modules/ai/ai.schema.ts`: adds bounded history, provider, and map action response fields.
- `backend/src/modules/ai/ai.service.ts`: validates grounded facts with Zod before sending them to the provider and treats history as context only.
- `frontend/src/hooks/use-ai.ts` and `frontend/components/ai/ai-panel.tsx`: implement session-level multi-turn chat, loading/error state, clear/new conversation, and auto-scroll.

### 7. Authenticated route/service-role hardening

Fix applied:
- `/api/v1/transport/nodes` and `/api/v1/transport/corridors` no longer construct direct service-role/publishable clients. They validate Supabase bearer tokens and use request-scoped Supabase clients.
- `/api/v1/study-areas` and `/api/v1/study-areas/[id]` now enforce authentication explicitly instead of relying on RLS side effects.
- `/api/internal/poi/nearby`, `/api/internal/umkm/nearby`, and `/api/internal/routing/walking` now enforce authentication and do not use service-role as a substitute for user auth.
- `/api/admin/merchant-submissions*` now requires `ADMIN` at route runtime and in `API_ENDPOINT_POLICIES`.

### 8. Build/dependency stability

Fix applied:
- Root `package.json` now routes build/start/typecheck/lint/test commands through actual `frontend` and `backend` workspaces instead of invoking root `next`.
- `frontend/app/layout.tsx` no longer imports Google-hosted `next/font/google`, so production build does not require fonts.googleapis.com.
- `backend/lib/ai.zip` was removed after confirming it was a tracked, unreferenced stale backup.
- `sharp@0.35.3` is present from the lockfile at root `node_modules`, allowing backend typecheck/build to resolve backend image-processing imports.

## Frontend Audit Notes

Reviewed high-risk frontend auth/runtime areas:

- `frontend/app/layout.tsx`
- `frontend/app/login/page.tsx`
- `frontend/app/signup/page.tsx`
- `frontend/app/onboarding/page.tsx`
- `frontend/app/page.tsx`
- `frontend/components/getra-dashboard.tsx`
- `frontend/src/lib/auth-client.ts`
- `frontend/src/lib/api-client.ts`
- `frontend/src/lib/supabase/browser.ts`
- `frontend/src/features/fair-discovery/*`
- `frontend/src/features/community/api/community.api.ts`
- `frontend/src/features/community/hooks/*`
- `frontend/src/features/community/services/community-realtime.service.ts`
- selected UMKM advertising hooks/services that auto-fetch authenticated APIs.

Findings:

1. Public auth pages are protected from the dashboard auto-fetch issue after the current fix.
2. `AuthProvider` guards `/login` and `/signup` as public routes and redirects unauthenticated private routes to `/login`.
3. Community hooks still auto-load authenticated APIs when their pages mount. This is acceptable while those routes remain protected by `AuthProvider`, but future layout changes should add explicit `enabled` guards to these hooks.
4. `authenticatedFetch` intentionally throws when no session exists. Components using it must either be behind auth gating or catch the error without `console.error` overlays.
5. `CommunityNotificationsMenu` already checks `context?.user.id` before loading and subscribing.

## Backend Audit Notes

Reviewed high-risk backend/env/API areas:

- `backend/app/api/**/route.ts` route inventory.
- `backend/src/lib/auth.ts`
- `backend/src/lib/supabase/server.ts`
- `backend/src/lib/env/index.ts`
- `backend/src/lib/api-security/endpoint-policy.ts`
- `backend/src/config/bootstrap.ts`
- `backend/src/repositories/supabase-health.repository.ts`
- `backend/lib/ai/*`
- backend scripts that consume Supabase env.

Findings:

1. Backend source expects `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and many scripts expect `SUPABASE_SERVICE_ROLE_KEY`.
2. Existing root `.env.local` had `SUPABASE_SECRET_KEY`; backend canonical env validation reads `SUPABASE_SERVICE_ROLE_KEY`. Local `backend/.env.local` now includes both names to avoid split behavior.
3. The health probe uses Supabase Storage `listBuckets` with the publishable client. If Supabase/network/policy fails, `/api/health` returns 503 even if the app boots.
4. Some older backend scripts still allow `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback. This is stale naming and should be normalized later.
5. API policy catalog exists, but runtime authorization still depends on each route calling `requireAuthenticatedUser` or equivalent.

## Verification

Commands run:

```text
npm run typecheck -w frontend
```

Result: pass.

```text
npx eslint frontend/components/getra-dashboard.tsx frontend/src/features/fair-discovery/hooks/use-fair-discovery.ts frontend/src/features/community/services/community-realtime.service.ts --max-warnings=0
```

Result: pass.

```text
npx eslint frontend/src/lib/auth-client.ts backend/lib/ai/anthropic.ts backend/app/api/ai/ask/route.ts --max-warnings=0
```

Result: pass.

```text
npm run typecheck
```

Result: pass for frontend and backend.

```text
npm run lint
```

Result: pass for frontend and backend.

```text
npm run test
```

Result: pass. Backend Vitest: 78 passed, 1 skipped; 519 tests passed, 1 skipped.

```text
npm run build
```

Result: pass for frontend and backend production builds.

Focused AI/security tests added:

```text
backend/tests/integration/ai-route.test.ts
backend/tests/unit/ai/ai.service.test.ts
backend/tests/unit/ai/provider.test.ts
```

These verify invalid/missing bearer tokens do not call the provider, authenticated AI calls are rate-limited before provider calls, Claude remains canonical when `AI_PROVIDER=claude`, and grounding preserves verified facts/map entity references.

## Remaining Work

1. Add explicit `enabled` guards to community hooks that auto-fetch authenticated data if those hooks are ever mounted outside protected pages.
2. Normalize old env names in scripts:
   - Prefer `NEXT_PUBLIC_API_URL` over `NEXT_PUBLIC_GETRA_API_URL`.
   - Prefer `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` over `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - Prefer one backend secret name, ideally `SUPABASE_SERVICE_ROLE_KEY`, while keeping compatibility only where intentional.
3. Complete route-by-route authorization audit beyond the high-risk routes fixed in this pass.
4. Verify browser manually:
   - `/login` renders without overlay.
   - `/signup` does not parse HTML as JSON.
   - `/` redirects unauthenticated users to `/login`.
   - Authenticated dashboard loads without Fair Discovery/session overlay.
   - Community notification realtime subscribes without the Supabase channel callback error.
   - AI panel keeps previous turns after a question and sends follow-up context.
