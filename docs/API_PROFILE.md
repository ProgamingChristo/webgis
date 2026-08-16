# User Profile API Documentation

## Base Path
`/api/profile`

## Authentication
All endpoints require a valid Supabase JWT token in the `Authorization` header.
```
Authorization: Bearer <your_supabase_jwt_token>
```

---

## 1. Get Current User Profile

Retrieves the profile of the currently authenticated user.

**Endpoint:** `GET /api/profile`

### Request
No body required.

### Responses

#### 200 OK
```json
{
  "status": "ok",
  "request_id": "req-123",
  "data": {
    "id": "uuid",
    "display_name": "John Doe",
    "avatar_url": "https://example.com/avatar.jpg",
    "role": "COMMUTER",
    "created_at": "2026-08-15T20:30:14+07:00",
    "updated_at": "2026-08-15T20:30:14+07:00"
  }
}
```

#### 401 Unauthorized
```json
{
  "status": "error",
  "request_id": "req-123",
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authorization header",
    "retryable": false
  }
}
```

#### 404 Not Found
```json
{
  "status": "error",
  "request_id": "req-123",
  "error": {
    "code": "NOT_FOUND",
    "message": "Profile not found",
    "retryable": false
  }
}
```

---

## 2. Update Current User Profile

Updates the profile of the currently authenticated user.

**Endpoint:** `PATCH /api/profile`

### Request Body
Content-Type: `application/json`

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `display_name` | string | No | The display name (2-50 chars). |
| `avatar_url` | string | No | A valid URL string. Can be null. |

*Note: At least one field must be provided. Fields like `id`, `role`, and `created_at` cannot be updated here.*

**Example:**
```json
{
  "display_name": "Jane Doe",
  "avatar_url": "https://example.com/new-avatar.jpg"
}
```

### Responses

#### 200 OK
```json
{
  "status": "ok",
  "request_id": "req-123",
  "data": {
    "id": "uuid",
    "display_name": "Jane Doe",
    "avatar_url": "https://example.com/new-avatar.jpg",
    "role": "COMMUTER",
    "created_at": "2026-08-15T20:30:14+07:00",
    "updated_at": "2026-08-15T20:31:00+07:00"
  }
}
```

#### 400 Bad Request (Validation Error)
```json
{
  "status": "error",
  "request_id": "req-123",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Display name must be at least 2 characters",
    "retryable": false
  }
}
```
