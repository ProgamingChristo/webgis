# GETRA Valhalla Routing - Prerequisites

Date: 2026-09-02 Asia/Jakarta

## Verified On Current Machine

This verification was executed on Windows with Docker Desktop, not on the target Linux VPS.

- Docker Engine: `29.2.1`
- Docker Compose: `v5.1.0`
- Docker backend: Linux / Docker Desktop
- Node.js: `v25.2.1`
- npm: `11.7.0`
- Host `osmium`: not installed on PATH
- Dockerized `osmium`: `osmium version 1.15.0`
- D: free disk during audit: `58,382,331,904` bytes free of `179,104,116,736` bytes
- Host memory during audit: `16,478,072 KB` total visible, `2,040,868 KB` free

## VPS Items Not Verified Here

- Linux VPS package state
- `df -h` on VPS
- `free -h` on VPS
- TLS reverse proxy on VPS
- External firewall exposure from public internet

## Environment Fixes Applied

- Root `.env.local` NUL bytes removed.
- Empty duplicate Supabase public keys removed.
- Existing local Supabase values copied from `backend/.env.local` into root `.env.local` without printing values.
- Non-secret routing values added to root `.env.local`.
- Local production bootstrap used `APP_BASE_URL=https://api.localhost` because production env validation requires HTTPS origin.

No secret values were printed.

