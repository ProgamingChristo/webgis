# GETRA Phase 12A.2.2 Sleep/Wake Routing Resilience

Date: 2026-09-07, Asia/Jakarta. Mode: **RESILIENCE REMEDIATION AND MACHINE QA**.

## Decision

```text
PHASE_12A_2_2_MACHINE_QA=PASS
AFTER_WAKE_AUTO_RECOVERY=PASS_MACHINE_SIMULATION
REAL_SLEEP_WAKE_OWNER_TEST=PENDING
PHASE_12A_2_2_STATUS=AWAITING_OWNER_SLEEP_WAKE_ACCEPTANCE
PUBLIC_SOURCE_DEPLOYMENT=NOT_EXECUTED
PUBLIC_RUNTIME_SOURCE_SHA=e87e8ee5dd42ecdac1e6587b12e8c8e9f3a673c3
OWNER_WORKSPACE_TOUCHED=NO
WHILE_LAPTOP_SLEEPING=OFFLINE_EXPECTED
24_7_AVAILABILITY=NO
PHASE_12B=DO_NOT_START
```

The existing accepted public runtime recovered and remains unchanged. A dedicated
Windows task now starts the existing VMware VM after logon or wake, verifies the
complete application chain, and performs at most one soft VM reset if normal
guest network recovery remains stale. It does not deploy application source or
recreate the accepted containers.

## Source And Runtime Lock

| Item | Evidence |
| --- | --- |
| Detected Phase 12A.2.1 base | `da141d4d3241cc6b9facc1ea5610c457411f8996` |
| Dedicated workspace | `D:\Getra_Final_12A22` |
| Dedicated branch | `phase12a2-2-sleep-wake-routing-resilience` |
| Release identity | Final committed branch SHA; exact value is recorded in the external delivery report |
| Public frontend runtime | `e87e8ee5dd42ecdac1e6587b12e8c8e9f3a673c3`, unchanged |
| Protected owner workspace | `D:\Getra_Production`, HEAD `2cf252e8bfcedbff42a40de07d6227e34ca63499`, not modified |

The newer clean Phase 12A.2.1 routing UX commit was detected and retained. No
source from this branch was built into or promoted to the public runtime.

## Root Cause

Two evidence-backed recovery failures were present:

1. After a Windows reboot, VMware had zero running VMs and there was no existing
   GETRA logon/wake task. The accepted stack therefore could not become available
   until the existing VM was started.
2. Historical guest logs and the controlled soft-suspend test showed Ubuntu
   networking could remain stale after resume. Docker containers still existed,
   but backend database health and backend-to-provider access remained unavailable.
   Historical health failures continued for more than 20 minutes in one wake
   window, so container restart policy alone was insufficient.

The persistent graph was present and healthy. The failure was not graph
corruption. Backend routing health is evaluated dynamically, the 300000 ms cache
stores only `ROUTABLE` results, and the frontend creates a fresh request. No
backend or frontend application fix was required for provider-state recovery.

## Recovery Implementation

| Component | Behavior |
| --- | --- |
| `getra-status.ps1` | Read-only full-chain status with meaningful nonzero exit |
| `getra-recover.ps1` | Idempotent exact-VM/exact-container recovery with mutex and bounded waits |
| `install-getra-recovery-task.ps1` | Hidden current-user logon and wake triggers |
| Normal wait | 180 seconds for VM network, services, provider, Funnel, and public endpoints |
| Fallback | One soft VM reset, followed by one final 180-second wait |
| Healthy path | Observed in approximately 2-5 seconds |
| Stale resume path | Observed recovery in 257.3 seconds, within the documented 5-minute target |

All accepted containers use `unless-stopped` and have healthchecks. Recovery
starts only an exact required container if it exists but is stopped. It never
recreates containers, deploys code, rebuilds the graph, changes Funnel, or deletes
data.

## Controlled Provider Recovery

Valhalla was temporarily stopped while the backend remained running. A unique
route request correctly returned `SERVICE_UNAVAILABLE` with
`ROUTING_PROVIDER_UNREACHABLE`. The same Valhalla container was then started and
became healthy in 6.3 seconds. Without restarting backend, the next request to the
same unique A/B returned a genuine `ROUTABLE` motorcycle route: 1,722 m and 435 s.

Backend container identity, start time, and restart count were unchanged through
that provider interruption. This proves dynamic provider health recovery and that
the error state was not cached.

## Wake-Like Machine Test

At 17:15:05 local time the exact VM was soft-suspended and the installed recovery
task was invoked. It started the existing VM. Containers initially reappeared,
but database/provider/public checks remained unavailable. At 17:18:18 the bounded
fallback requested its single soft reset. At 17:19:17 all checks passed. Container
identities were retained, restart counts remained zero, and the existing 1.6 GiB
routing-data mount and `jabodetabek_tiles.tar` were reused.

This is machine wake-like evidence, not owner real sleep/wake evidence.

## Post-Recovery Acceptance

The final public HTTPS browser regression passed through a public Funnel ingress
address obtained independently from DNS-over-HTTPS. The Windows ISP resolver had
a transient/stale `NXDOMAIN`; Cloudflare and Google public DNS both returned the
Funnel ingress records. No system DNS, hostname, CORS, or Funnel setting was
changed.

| Check | Result |
| --- | --- |
| Login/auth after recovery | PASS |
| Dynamic A/B | PASS |
| Walking / motorcycle / car | PASS / PASS / PASS |
| Fastest / alternatives / multi-route | PASS / PASS / PASS |
| Route labels and selection | PASS |
| UMKM GIS / 150 m corridor / UMKM candidate | PASS / retained / PASS |
| Maps-like planning | PASS |
| Active Journey machine smoke | PASS, simulated GPS; no physical retest |
| Backend-to-Valhalla DNS and HTTP | PASS |
| Frontend / backend / database / Valhalla | HEALTHY / HEALTHY / CONNECTED / HEALTHY |
| Tailscale / Funnel 443 / Funnel 8443 | CONNECTED / PASS / PASS |
| Funnel 8002 / direct frontend Valhalla call | NOT EXPOSED / NONE |
| Fake route / fake traffic claim | NONE / NONE |

Representative post-recovery public evidence included three candidates for each
walking and motorcycle, two for car, and a selected UMKM-area walking candidate.
All geometries and metrics came from the accepted GETRA backend and Valhalla.

## Quality Gates

| Gate | Result |
| --- | --- |
| Frontend typecheck / zero-warning lint | PASS / PASS |
| Full frontend tests | PASS: 46 files, 280 tests |
| Focused backend routing/provider tests | PASS: 4 files, 17 tests |
| Frontend production build | PASS |
| PowerShell parse and healthy idempotency | PASS |
| Controlled provider unavailable/recovery | PASS |
| Post-suspend public routing regression | PASS |
| Backend full suite | NOT REQUIRED; no backend application change |

## Owner Boundary

Owner utilities are documented in [the runtime recovery guide](../../ops/windows/README.md).
The remaining acceptance is one real owner-controlled sequence:

```text
routing PASS -> laptop sleep -> wake -> wait up to 5 minutes -> routing PASS
```

Until that observation is supplied,
`REAL_SLEEP_WAKE_OWNER_TEST=PENDING`. Phase 12A final closure and Phase 12B must
not start from this report.
