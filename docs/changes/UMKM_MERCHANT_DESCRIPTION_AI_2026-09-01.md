# UMKM Merchant Description AI Assistant

Date: 2026-09-01

## Outcome

The existing `/umkm/merchants/new` registration form now includes a compact,
optional AI writing assistant inside the merchant-description textarea. The
feature uses GETRA's existing server-side Sub2API Responses adapter and does not
change merchant submission semantics or database schema.

## Files created

- `backend/app/api/ai/merchant-description/route.ts`
- `backend/src/modules/ai/merchant-description.schema.ts`
- `backend/src/modules/ai/merchant-description.service.ts`
- `backend/tests/integration/merchant-description-route.test.ts`
- `backend/tests/unit/ai/merchant-description.service.test.ts`
- `frontend/src/features/merchant-submission/components/merchant-description-assistant.tsx`
- `frontend/tests/umkm-workspace/merchant-description-assistant.test.tsx`

## Existing architecture reused

- `backend/lib/ai/provider.ts` for explicit provider selection.
- `backend/lib/ai/sub2api.ts` for Responses API transport, timeout, error
  redaction, output extraction, strict JSON schema, and Zod parsing.
- `requireAuthenticatedUser` for canonical bearer authentication.
- `InMemoryRateLimiter` for bounded fixed-window enforcement.
- `readBoundedJsonBody`, `withApiLogger`, standard API envelopes, CORS policy,
  security headers, request IDs, and application error mapping.
- `frontend/src/services/ai.service.ts`, `authenticatedFetch`, and the canonical
  GETRA backend URL resolver.
- Existing Lucide icons and GETRA cyan/emerald/slate visual tokens.

## Endpoint

`POST /api/ai/merchant-description`

Supported modes:

- `generate`
- `improve`
- `engaging`
- `shorten`
- `proofread`

The request is a strict bounded object. `generate` requires user-supplied product
or service context, so the backend will not create a business profile from a
business name alone. Arbitrary properties such as a client-supplied system prompt
are rejected.

The GETRA response contains only:

```json
{
  "success": true,
  "data": {
    "description": "..."
  },
  "request_id": "..."
}
```

Raw provider responses and provider credentials are never returned.

## Provider parsing and factual safety

The existing Sub2API adapter calls the configured HTTPS `/responses` endpoint
with the configured model, server-owned instructions, `store: false`, a strict
JSON schema, bounded output tokens, and a timeout shorter than the route maximum.
It supports both top-level `output_text` and nested Responses message content,
then parses the JSON string with Zod.

The merchant-description service normalizes the result to one paragraph and
rejects empty, oversized, or markdown-like output. The system instructions state
that user fields are untrusted data and prohibit invented addresses, opening
hours, prices, facilities, certifications, ingredients, payment methods,
business history, promotions, and unsupported quality claims.

## Authentication, cost, and concurrency controls

The endpoint order is:

1. Authenticate bearer token.
2. Apply the AI-specific rate limit.
3. Read at most 4096 bytes.
4. Validate the strict request schema.
5. Reject a concurrent request for the same user on the current backend instance.
6. Call the provider.

The default AI policy is 15 requests per 10 minutes per authenticated user. The
UI also disables duplicate trigger/action clicks while a request is active.

The current limiter and concurrency lock are process-local. A deployment with
multiple backend replicas must enforce the same policy through a shared store or
reverse proxy.

## API key boundary

- The provider key is read only from the backend runtime.
- Backend local environment files are ignored and not tracked.
- Docker Compose forwards the server-only provider and AI-limit variables only
  to the backend container.
- No `NEXT_PUBLIC_SUB2API_*` variable, MWAPI URL, authorization header, or
  API-key-shaped value exists in tracked frontend source.
- `.env.example` contains blank secret placeholders only.

## UX behavior

- Empty textarea: the trigger tooltip is `Bantu tulis dengan AI`; a compact
  anchored popover requests products/services, optional price context when the
  form has none, and optional advantages.
- Existing textarea: the tooltip is `Perbaiki dengan AI`; the popover offers the
  four editing modes without duplicating sparkle icons.
- The business name, category, and selected structured price range are reused
  from current form state.
- Loading replaces the sparkle with a small spinner and does not disable the
  whole merchant form.
- The textarea is updated only after a successful response. If the user edits it
  while AI is running, the late result is not applied.
- Failure leaves the current text intact and shows a short Indonesian error.
- The trigger is a `type="button"` with ARIA label, tooltip, keyboard activation,
  Escape handling, focus restoration, and viewport-bounded popover width.

## Automated verification

| Gate | Result |
| --- | --- |
| Root typecheck | PASS |
| Root lint | PASS |
| Frontend tests | PASS - 29 files, 102 tests |
| Backend tests | PASS - 136 passed files, 2 skipped; 864 passed tests, 3 skipped |
| Targeted AI/security tests | PASS - 7 files, 66 tests |
| Frontend production build | PASS - 21 generated pages |
| Backend production build | PASS - 79 generated pages, including the new endpoint |
| Tracked secret scan | PASS |
| Diff whitespace check | PASS; CRLF normalization warnings only |

## Manual scenarios

1. Empty description: open sparkle, enter real products, generate, edit result.
2. Existing description: run each of improve, engaging, shorten, and proofread.
3. Provider failure: confirm the previous textarea content remains unchanged.
4. Missing backend key: confirm a safe generic UI error and no page crash.
5. Anonymous request: confirm HTTP 401 before rate limiter/provider work.
6. Exceed AI limit: confirm HTTP 429 and `Retry-After`.
7. Double click/concurrent request: confirm one provider operation only.
8. Keyboard: Tab to trigger, Enter/Space and Arrow Down to open, Escape to close.
9. Mobile: confirm the popover stays inside the viewport and above surrounding
   form content.

## Limitations and verification blockers

- Browser interaction QA is `NOT VERIFIED`: the in-app browser runtime reported
  no available browser.
- A live billable MWAPI request was not issued during automated verification;
  transport compatibility is covered by the existing Sub2API adapter tests.
- Multi-replica distributed rate limiting requires deployment infrastructure; the
  current repository implementation is process-local by design.
- The temporary development credential should be revoked/rotated after the
  development window, as already planned.
- No commit, push, deployment, or database change was performed.
