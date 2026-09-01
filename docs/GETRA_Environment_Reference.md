# GETRA Environment Reference

This document catalogs the critical environment variables used to configure the GETRA frontend and backend runtimes.
Values are **never** committed. Use `.env.local` in development or platform-specific secret managers in production.

## Required Variables

### 1. Supabase / Database (Backend & Frontend)
| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Both | Yes | The HTTPS endpoint for the Supabase project. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Both | Yes | The public publishable key for safe client operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Yes | The secret admin key to bypass RLS. **NEVER expose to frontend.** |
| `DATABASE_URL` | Backend | Yes | The direct PostgreSQL connection string (often pooled). |

### 2. Application & API Config
| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_GETRA_API_URL` | Frontend | Yes | Canonical base URL used to contact the GETRA backend (e.g., `http://localhost:8080`). `NEXT_PUBLIC_API_URL` is deprecated compatibility only. |
| `APP_ENV` | Backend | Yes in deployment | Use `production` for production. |
| `APP_BASE_URL` | Backend | Yes in deployment | Exact backend origin used by security policy. |
| `FRONTEND_ALLOWED_ORIGINS` | Backend | Yes | Comma-separated list of allowed CORS origins (e.g., `http://localhost:3000`). |

### 3. Integrations & AI
| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `AI_PROVIDER` | Backend | Yes in AI deployment | Set to `sub2api`; unset/`deterministic` is intentional fallback mode only. |
| `SUB2API_API_KEY` | Backend only | Yes when provider is `sub2api` | Secret bearer credential. Never use a `NEXT_PUBLIC_` prefix. |
| `SUB2API_MODEL` | Backend | Yes | `claude-sonnet-4-6`. |
| `SUB2API_BASE_URL` | Backend | Yes | `https://api.mwapi.dev/v1`; the adapter appends `/responses`. |
| `SUB2API_TIMEOUT_MS` | Backend | Optional | Integer from 1000 through 25000; default 20000 and shorter than the AI route duration. |
| `RATE_LIMIT_AI_MAX_REQUESTS` | Backend | Optional | Authenticated AI requests allowed per AI window; default 15. |
| `RATE_LIMIT_AI_WINDOW_MS` | Backend | Optional | AI-specific fixed window; default 600000 (10 minutes). |
| `MAPID_SECRET_KEY` (or equivalent) | Backend | Optional | The credentials required to securely communicate with the official MAPID provider. |

## Important Security Warnings
- **DO NOT** commit `.env.local` or `.env.production`.
- **DO NOT** hardcode secrets in source code, fallback logic, or documentation files.
- Each workspace loads its own file: use `frontend/.env.local` and `backend/.env.local`. Do not assume root `.env.local` is inherited.
- The current limiter is bounded and process-local. Multi-replica production must use a shared rate-limit store at the reverse proxy or application layer.
- The `SUPABASE_SERVICE_ROLE_KEY` is highly privileged. If exposed, it compromises the entire database.
