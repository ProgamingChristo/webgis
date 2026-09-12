# GETRA team local frontend

This setup runs only the frontend. Routing, spatial analysis, search, AI, UMKM,
and Admin requests pass through the local Next.js BFF to the shared GETRA
backend. Valhalla stays private behind that backend.

## Update the source

```powershell
git checkout finalmerge
git pull --ff-only origin finalmerge
npm ci
```

## Configure the frontend

Create `frontend/.env.local` from `frontend/.env.example`. Supply the
project's browser-safe Supabase URL and publishable key through the team's
approved private channel. Do not commit `.env.local`.

For the standard teammate URL, retain:

```dotenv
NEXT_PUBLIC_GETRA_API_URL=http://localhost:3000
GETRA_BACKEND_INTERNAL_URL=https://getra-routing-api.tail0ed517.ts.net
```

`NEXT_PUBLIC_GETRA_API_URL` is the browser-facing local frontend origin.
`GETRA_BACKEND_INTERNAL_URL` is read only by the Next.js server and selects
the actual GETRA backend.

Owner local-backend mode changes only the server-side target:

```dotenv
NEXT_PUBLIC_GETRA_API_URL=http://localhost:3000
GETRA_BACKEND_INTERNAL_URL=http://localhost:8080
```

Never add AI provider keys, Supabase service-role keys, passwords, or access
tokens to frontend environment files.

## Run

```powershell
npm run dev -w frontend
```

Open `http://localhost:3000`. Use an individually issued GETRA account.
Developers do not need Valhalla, routing tiles, a database dump, or a Tailscale
client.

## Verify the bridge

1. Open `http://localhost:3000/api/health`; it should report the GETRA API as
   healthy.
2. Sign in and open `/app`.
3. Search and select a merchant.
4. Use `Rute ke sini`, then verify walking, motorcycle, and car modes.
5. Open Tanya GETRA and verify a normal response.

If the shared API is unavailable, the frontend reports the service as
unreachable and does not calculate a local or straight-line route fallback.
The shared staging backend depends on the owner's machine, backend, Valhalla,
network connection, and Tailscale Funnel; it is not 24/7 production hosting.
