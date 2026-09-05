# GETRA Phase 8A Tailscale Funnel Shared Access

Date: 2026-09-05 (Asia/Jakarta)
Acceptance evidence UTC: `2026-09-04T23:33:28Z` through `2026-09-04T23:34:17Z`
Recovery verification UTC: `2026-09-05T02:25:35Z` through `2026-09-05T02:26:20Z`
Environment: `LOCAL_ROUTING_INTEGRATION`
Target access model: stable zero-cost HTTPS through Tailscale Funnel

## Status

`PHASE_8A_STATUS=VERIFIED`

The owner completed device enrollment and Funnel approval. Funnel now exposes
the GETRA backend through trusted public HTTPS. Public health and anonymous
authentication rejection were verified from the Windows execution environment
using the public hostname, public DNS answers, and certificate validation.

Public GETRA API base URL:

`https://getra-routing-api.tail0ed517.ts.net`

This report records the Phase 8A bootstrap as `LOCAL_ROUTING_INTEGRATION`.
On 2026-09-05 the owner formally re-baselined the same machine and Funnel as
`SHARED_STAGING` with hosting class `OWNER_HOSTED_TAILSCALE_STAGING`. Current
acceptance is recorded in
[the Phase 8 staging report](28_PHASE_8_SHARED_STAGING_ACCEPTANCE.md). The
remote-VPS path remains deferred until budget and authorized hosting are available.

## Verified Baseline

- Linux user: `getra`
- Linux hostname before Tailscale enrollment: `getra-router`
- Tailscale device hostname: `getra-routing-api`
- GETRA project: `/home/getra/getra`
- Approved source SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime source worktree: CLEAN
- GETRA backend container: healthy
- Valhalla container: healthy
- Backend health: HTTP 200
- Valhalla status: HTTP 200
- Backend listener: `127.0.0.1:3002`
- Valhalla listener: `127.0.0.1:8002`
- Public listener on 3002 or 8002: NONE

## Tailscale Installation

- Installation source: official Tailscale Ubuntu package repository
- Tailscale version: `1.102.3`
- `tailscaled` service: active
- `tailscaled` enabled at boot: YES
- Tailscale backend state: `Running`
- Device online: YES
- Device hostname: `getra-routing-api`
- Tailnet FQDN: `getra-routing-api.tail0ed517.ts.net`
- Sudoers modified: NO
- Docker or GETRA source modified: NO

The installation used Tailscale's official Linux installer, which configured
the signed Ubuntu Resolute package repository and installed the stable package.

## Enrollment

Command initiated:

`sudo tailscale up --hostname=getra-routing-api`

The owner completed the browser authorization. Tailscale subsequently reported
the node online with backend state `Running`.

## Funnel Configuration

The owner approved Funnel in the Tailscale browser flow. Configuration was then
applied using the installed CLI:

```bash
sudo tailscale funnel --bg --yes http://127.0.0.1:3002
```

`tailscale funnel status --json` showed exactly:

- HTTPS listener: `443`
- Public hostname: `getra-routing-api.tail0ed517.ts.net`
- Handler path: `/`
- Proxy destination: `http://127.0.0.1:3002`
- Funnel allowed for this hostname on port 443: YES
- Additional proxy targets: NONE
- Valhalla, SSH, Docker API, file, or directory targets: NONE

The configuration command exited successfully and disconnected SSH. Fresh SSH
connections confirmed Funnel remained enabled with the same hostname and target.

## Quick Tunnel And Exposure State

- Matching Cloudflare Quick Tunnel process for `127.0.0.1:3002`: NOT RUNNING
- Cloudflared stopped or uninstalled during this continuation: NO
- Tailscale Funnel configured: YES, background mode
- Public GETRA URL: `https://getra-routing-api.tail0ed517.ts.net`
- Public backend access: HTTPS Funnel on port 443 only
- Backend raw listener: `127.0.0.1:3002`
- Valhalla raw listener: `127.0.0.1:8002`
- Wildcard listener for port 3002 or 8002: NONE
- Public Valhalla exposure: NONE
- Host listener on Docker TCP port 2375: NONE
- Docker API Funnel target: NONE

## Public Acceptance

Requests used the public HTTPS hostname from Windows without Tailscale account
cookies or GETRA credentials. TLS certificate verification was explicitly enabled.

| Check | Result | Evidence |
| --- | --- | --- |
| Public DNS | PASS | Public IPv4 answers returned for the Funnel hostname |
| Trusted HTTPS | PASS | TLS 1.3, certificate authorized, hostname verified |
| `GET /api/health` | PASS | HTTP 200, `success=true`, `database=connected`, `service=getra-api`, `status=ok` |
| Anonymous `GET /api/internal/routing/provider-health` | PASS | HTTP 401, `success=false`, `error.code=UNAUTHORIZED` |
| Anonymous `POST /api/routing` | PASS | HTTP 401, `success=false`, `error.code=UNAUTHORIZED` |
| Backend loopback | PASS | Only `127.0.0.1:3002` |
| Valhalla loopback | PASS | Only `127.0.0.1:8002` |
| Funnel target restriction | PASS | Single backend target, no proxy to 8002 |
| SSH disconnect/reconnect | PASS | Background Funnel retained hostname and target |
| Post-acceptance containers | PASS | Backend and Valhalla both healthy |
| Runtime source identity | PASS | Approved SHA unchanged; `git status --porcelain` empty |
| External mobile-data test | PASS (owner-confirmed) | Owner confirmed successful access over cellular data on 2026-09-05 |

The anonymous routing POST supplied a normal walking request with origin
`-6.214120,106.682990` and destination `-6.218000,106.687000`. No authenticated
route execution was needed for this phase.

Certificate observations:

- Subject: `getra-routing-api.tail0ed517.ts.net`
- Issuer common name: `YE2`
- Valid from: `2026-09-04T22:35:04Z`
- Valid until: `2026-12-03T22:35:03Z`
- Client certificate validation bypass: NO

A separate browser-fetch tool could not open the hostname because of its own
URL safety restriction. That attempt is not counted as successful independent
network evidence. The Windows public HTTPS requests above did succeed.

## Persistence And Availability

- `URL_STABILITY=STABLE`, conditional on preserving node identity, tailnet, and
  device hostname.
- `FUNNEL_BACKGROUND=YES`
- `TAILSCALED_BOOT_ENABLED=YES`
- SSH terminal required for ongoing Funnel operation: NO
- Reboot test: NOT RUN
- Tailscaled restart recovery: PASS during the connection-closed incident below;
  background Funnel retained the same hostname and proxy target.
- `COMPUTE_AVAILABILITY=OWNER_MACHINE_DEPENDENT`

Tailscale documents that background Funnel configuration resumes after device
or Tailscale restart. This is documented behavior, not a reboot test performed
in this phase. See the official [Funnel CLI reference](https://tailscale.com/docs/reference/tailscale-cli/funnel#effects-of-rebooting-and-restarting).

The endpoint depends on the Windows laptop, VMware Ubuntu VM, Docker services,
internet access, and Tailscale node remaining available. If the laptop or VM is
offline, the API is offline. This setup does not provide 24/7 server availability.
The same URL is expected when the preserved node and services return.

The owner confirmed successful access over cellular data on 2026-09-05 using
the same public health URL:

`https://getra-routing-api.tail0ed517.ts.net/api/health`

`EXTERNAL_MOBILE_TEST=PASS`

Evidence source: owner confirmation in this conversation. The agent did not
operate the mobile device or independently inspect its response payload. The
GETRA health payload was separately verified by the automated HTTPS checks above.

## Connection-Closed Incident And Recovery

On September 5 the owner reported `ERR_CONNECTION_CLOSED` in Microsoft Edge.
This was reproduced from Windows with Schannel and Node HTTPS clients, and
from Ubuntu when explicitly connecting through each public Funnel relay.
Both public relay addresses initially closed the TLS handshake. Backend and
Valhalla containers remained healthy throughout.

The Ubuntu hostname-only HTTPS check still returned HTTP 200 because MagicDNS
resolved the hostname to the local tailnet address. That result was not accepted
as proof of working public ingress. Public relay tests retained the original
hostname for SNI and certificate validation; no DNS or hosts-file changes were
made.

Bounded daemon logs showed a VM network/default-route interruption around
`2026-09-05T02:15:30Z`, DERP reconnection, packet-filter drops, and TLS handshake
failures. This points to a Funnel ingress recovery problem following the network
change. The precise internal relay failure was not conclusively established.

Recovery action:

```bash
sudo systemctl restart tailscaled
```

The daemon restarted at approximately `2026-09-05T02:23:07Z`. Its background
Funnel configuration resumed automatically. One public relay recovered first;
the other initially still failed and then recovered before final acceptance.
The first successful response alone was not treated as full recovery.

| Recovery check | Result | Evidence |
| --- | --- | --- |
| Hostname and proxy target | PASS | Original FQDN and `http://127.0.0.1:3002` preserved |
| Windows Schannel HTTPS | PASS | HTTP 200 with GETRA health JSON |
| Public relay health repeatability | PASS | Four rounds across both DNS-advertised public IPv4 relays, 8/8 HTTP 200 |
| Health semantics | PASS | `database=connected`, `service=getra-api`, `status=ok` |
| Microsoft Edge browser | PASS | Isolated headless Edge loaded health JSON; no `ERR_CONNECTION_CLOSED` |
| Anonymous provider-health | PASS | HTTP 401 `UNAUTHORIZED` through both public relays |
| Anonymous routing POST | PASS | HTTP 401 `UNAUTHORIZED` through both public relays |
| Tailscaled state | PASS | Active, enabled at boot |
| Containers and listeners | PASS | Both healthy; 3002 and 8002 remain loopback-only |
| Runtime source | PASS | Approved SHA unchanged and worktree clean |

The Edge probe used an isolated temporary browser profile, without changing the
owner's normal profile or disabling TLS verification. Automatic execution policy
rejected deletion of that temporary profile; it remains in the Windows Temp
directory. No account login or credential entry occurred in that browser profile.

No hostname change, node re-enrollment, application change, container restart,
graph rebuild, or new public service was performed. The same health URL is valid
after recovery. This incident demonstrates that a stable hostname does not
guarantee uninterrupted availability across owner-machine network changes.

## Source And Stop Condition

- Approved and observed runtime SHA: `b3fded2cc23885b890fb7fbb30f99cdd7e6befbe`
- Runtime tracked worktree: CLEAN
- Application source changed: NO
- Frontend, PBF, graph, and database migrations changed: NO
- Sudoers modified: NO
- Source commit created: NO
- Secret values included in command output or this document: NONE

Only this local evidence document was updated. The accepted runtime checkout was
not edited. Phase 8A stops here; frontend integration remains a later phase.

No account login was automated or bypassed. No auth key, browser login token,
password, private key, or application secret was written to this document.
