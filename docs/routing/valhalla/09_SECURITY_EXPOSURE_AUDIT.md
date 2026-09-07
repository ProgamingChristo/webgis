# GETRA Valhalla Routing - Security Exposure Audit

Date: 2026-09-02 Asia/Jakarta

## Local Host Binding

Observed listening sockets:

- `127.0.0.1:3002`
- `127.0.0.1:8002`

No `0.0.0.0` binding was observed for backend or Valhalla on this machine.

## Backend Environment Boundary

Backend container routing values:

- `ROUTING_PROVIDER=valhalla`
- `ROUTING_BASE_URL=http://valhalla:8002`
- `ROUTING_TIMEOUT_MS=12000`
- `ROUTING_CACHE_TTL_MS=300000`
- `APP_ENV=production`

The backend talks to Valhalla through Docker DNS, not through a public browser-facing URL.

## API Response Secret Scan

Checked authenticated provider-health and routing responses for obvious exposure patterns:

- API key marker: not found
- `service_role`: not found
- `Bearer`: not found
- Supabase secret marker: not found
- `valhalla:8002`: not found in frontend-facing API response

## Not Verified On This Machine

- Public internet port exposure for the target VPS
- HTTPS reverse proxy
- Firewall rules from an external network
- Vercel frontend CORS from production origin

These require the actual VPS/domain environment.

