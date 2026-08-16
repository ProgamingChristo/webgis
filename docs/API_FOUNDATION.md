# GETRA API Foundation (Phase 3)

This document describes the foundational patterns for all GETRA APIs.

## 1. Response Contracts
All API responses follow a strict envelope contract.

### Success Response (200, 201)
```json
{
  "success": true,
  "data": { ... },
  "request_id": "uuid-v4"
}
```

### Paginated List Response (200)
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "total_pages": 5
  },
  "request_id": "uuid-v4"
}
```

### Error Response (400, 401, 403, 404, 500, etc)
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Public error message",
    "retryable": false
  },
  "request_id": "uuid-v4"
}
```

## 2. Validation
All endpoints must validate input using Zod via the wrapper in `src/lib/validation.ts`.
```typescript
import { validateBody, validateQuery } from "@/src/lib/validation";

// Automatically throws standardized ApplicationError("VALIDATION_ERROR")
const body = await validateBody(req, mySchema);
const query = validateQuery(req, mySchema);
```

## 3. Pagination & Query Parameters
Use the helpers from `src/lib/pagination.ts` and `src/lib/query-parser.ts`.
```typescript
import { parsePagination, buildPaginationMeta } from "@/src/lib/pagination";
import { parseSortQuery, parseSearchQuery } from "@/src/lib/query-parser";

const { page, limit } = parsePagination(req);
const { sort, order } = parseSortQuery(req, ["created_at", "updated_at"], "created_at");
const search = parseSearchQuery(req);
```

## 4. Auth & Role Guard
Authentication and Authorization are enforced at the Route Handler layer via `src/lib/auth.ts`.
```typescript
import { requireAuthenticatedUser, requireAnyRole, requireRole } from "@/src/lib/auth";

// Ensure user is logged in
const userId = await requireAuthenticatedUser(req);

// Require specific role
const { userId, role } = await requireRole(req, "ADMIN");

// Allow multiple roles
const { userId, role } = await requireAnyRole(req, ["ADMIN", "COMMUNITY"]);
```

## 5. API Logger & Wrapper
Wrap every endpoint in `withApiLogger` to provide standard logging, rate limiting, and error handling.
```typescript
import { withApiLogger } from "@/src/lib/api-logger";
import { getRequestId } from "@/src/lib/request-id";

export async function GET(req: NextRequest) {
  const reqId = getRequestId(req);
  return withApiLogger(req, reqId, async () => {
     // implementation
  });
}
```

## 6. Development Commands
- **Run dev server:** `npm run dev`
- **Lint code:** `npm run lint`
- **Typecheck:** `npm run typecheck`
- **Run tests:** `npm test`
- **Build production:** `npm run build`

### Supabase Commands
- **List migrations:** `supabase migration list`
- **Reset database (wipes data & applies seeds):** `supabase db reset`
- **Push migrations directly to remote:** `supabase db push`
