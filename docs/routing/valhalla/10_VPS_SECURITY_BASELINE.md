# VPS Security Baseline

Date: 2026-09-02
Scope: Phase 1 network, firewall, environment, reverse proxy, and TLS baseline.

## Verification Status

Status: BLOCKED

No staging VPS access was available, so firewall, public port exposure, reverse
proxy, DNS, and TLS checks were not executed.

## Expected Host Bindings

Repository Compose defaults:

- GETRA backend: `127.0.0.1:3002`
- Valhalla: `127.0.0.1:8002`

Repository state:

- `BACKEND_BIND_PRIVATE=PASS_BY_CONFIG`
- `VALHALLA_BIND_PRIVATE=PASS_BY_CONFIG`

VPS runtime state:

- `BACKEND_BIND_PRIVATE=NOT_VERIFIED_ON_VPS`
- `VALHALLA_BIND_PRIVATE=NOT_VERIFIED_ON_VPS`

## Firewall Checks Required On VPS

Run the system-appropriate firewall inspection, for example:

```bash
sudo ufw status verbose
sudo ss -ltnp
```

Expected:

- public SSH allowed only by approved policy;
- public HTTP/HTTPS allowed only if reverse proxy is configured;
- public `3002/tcp` not allowed;
- public `8002/tcp` not allowed.

Current status:

- `PUBLIC_3002_ALLOWED=NOT_VERIFIED`
- `PUBLIC_8002_ALLOWED=NOT_VERIFIED`

## Environment Contract

Expected root file:

- `.env.local`

Rules:

- Git ignored.
- Full contents must not be printed.
- Server secrets must not use `NEXT_PUBLIC_*`.
- Valhalla internal URL must not be sent to frontend.

Current VPS status:

- `ENV_FILE_PRESENT=NOT_VERIFIED`
- `REQUIRED_ROUTING_ENV_NAMES=NOT_VERIFIED`
- `SECRET_VALUES_PRINTED=NO`

## Reverse Proxy And TLS

Repository documentation supports HTTPS reverse proxy to:

- `127.0.0.1:3002`

Do not proxy public traffic to:

- `8002`

Current status:

- `STAGING_API_DNS=BLOCKED`
- `REVERSE_PROXY=BLOCKED`
- `TLS=BLOCKED`

Reason: staging hostname and VPS access were not available.

## Known Non-Routing Security Debt

Phase 0 found non-routing browser test scripts with fallback test passwords.
This is not a Valhalla routing blocker, but should be handled as separate
repository hygiene before production hardening.
