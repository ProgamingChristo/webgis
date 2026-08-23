# GETRA Environment Reference

This document catalogs the critical environment variables used to configure the GETRA frontend and backend runtimes.
Values are **never** committed. Use `.env.local` in development or platform-specific secret managers in production.

## Required Variables

### 1. Supabase / Database (Backend & Frontend)
| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Both | Yes | The HTTPS endpoint for the Supabase project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Both | Yes | The public anon key for safe client operations. |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend | Yes | The secret admin key to bypass RLS. **NEVER expose to frontend.** |
| `DATABASE_URL` | Backend | Yes | The direct PostgreSQL connection string (often pooled). |

### 2. Application & API Config
| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `NEXT_PUBLIC_API_URL` | Frontend | Yes | The base URL the frontend uses to contact the backend (e.g., `http://localhost:8080`). |
| `FRONTEND_ALLOWED_ORIGINS` | Backend | Yes | Comma-separated list of allowed CORS origins (e.g., `http://localhost:3000`). |

### 3. Integrations & AI
| Variable | Scope | Required | Purpose |
|----------|-------|----------|---------|
| `AI_API_KEY` (or equivalent) | Backend | Optional | The secret key to access the LLM interpretation provider. |
| `MAPID_SECRET_KEY` (or equivalent) | Backend | Optional | The credentials required to securely communicate with the official MAPID provider. |

## Important Security Warnings
- **DO NOT** commit `.env.local` or `.env.production`.
- **DO NOT** hardcode secrets in source code, fallback logic, or documentation files.
- The `SUPABASE_SERVICE_ROLE_KEY` is highly privileged. If exposed, it compromises the entire database.
