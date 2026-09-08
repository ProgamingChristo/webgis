# GETRA Phase 12A.2.3 Real Sleep/Wake Auto-Recovery Remediation

Date: 2026-09-08, Asia/Jakarta. Mode: **INFRASTRUCTURE REMEDIATION AND MACHINE QA**.

## Decision

```text
PHASE_12A_2_2_STATUS=SUPERSEDED_BY_REAL_WORLD_FAILURE
PHASE_12A_2_3_MACHINE_QA=PASS
PHASE_12A_2_3_STATUS=AWAITING_OWNER_REAL_SLEEP_WAKE_ACCEPTANCE
REAL_SLEEP_WAKE_OWNER_TEST=PENDING
PHASE_12A_3_CONSOLIDATION=BLOCKED_UNTIL_OWNER_SLEEP_WAKE_PASS
PHASE_12B=DO_NOT_START
PUBLIC_SOURCE_DEPLOYMENT=NOT_EXECUTED
PUBLIC_RUNTIME_SOURCE_CHANGED=NO
OWNER_WORKSPACE_TOUCHED=NO
WHILE_LAPTOP_SLEEPING=OFFLINE_EXPECTED
24_7_AVAILABILITY=NO
```

The real owner sleep/wake failure overrides the earlier machine-only acceptance.
This remediation changes only Windows recovery automation. The accepted public
frontend remains revision `e87e8ee5dd42ecdac1e6587b12e8c8e9f3a673c3`.
No Phase 12A.2.3 source was deployed into the public application runtime.

## Source Lock

| Item | Evidence |
| --- | --- |
| Input release | `3fa5280c826c230230dd322ca4c3b72bf6b477e2` |
| Dedicated workspace | `D:\Getra_Final_12A23` |
| Dedicated branch | `phase12a23-real-sleep-wake-recovery` |
| Release identity | Final commit containing this report; exact SHA is recorded in delivery output |
| Protected owner workspace | `D:\Getra_Production`, not modified by this phase |
| Public source deployment | Not executed |

## Evidence-Backed Failure Chain

The owner wake occurred at `2026-09-07 23:17:23 +07:00`. The laptop was on
battery. The previous Scheduled Task had both
`DisallowStartIfOnBatteries=true` and `StopIfGoingOnBatteries=true`, so the wake
trigger could not run. The task did not start until `23:20:48`, exactly when the
Windows Kernel-Power event recorded `AcOnline=true`. It then reported the runtime
healthy at `23:20:58`. An earlier wake at `20:54:03` produced only a recovery
start line; Windows switched to battery and slept again, leaving no completion.

VMware logs independently show that host sleep paused the running VM and host
wake resumed it with repeated virtual Ethernet link transitions. The guest did
not perform an Ubuntu suspend cycle; the hypervisor froze and resumed its
running boot.

A controlled VM resume reproduced the deeper service condition:

```text
Windows/VM wake-like resume
-> Ubuntu ens33 UP, default route PASS, gateway PASS, internet PASS
-> Docker active; required containers still running
-> Valhalla internal route service healthy
-> frontend internal HTTP 200
-> backend internal health HTTP 503 DATABASE_UNAVAILABLE
-> Docker host loopback ports 3002, 3003, and 8002 timed out
-> Funnel mappings existed but public frontend/backend were unavailable
-> one automatic soft VM reset restored database, ports, Funnel targets, and routing
```

Restarting only the existing containers did not repair this reproduced frozen
network/database state. It was therefore removed from the final algorithm instead
of retained as an ineffective delay.

A second recovery defect was found during machine QA: immediately after resume,
VMware Tools could temporarily report the guest Tailscale address as its primary
IPv4 address. The old static address avoided that specific selection but would
fail if NAT DHCP changed. A third historical weakness was intermittent shell
quoting failure when multiline probes crossed Windows PowerShell, SSH, and Bash.

## Remediation

| Component | Final behavior |
| --- | --- |
| Scheduled Task power policy | Starts and continues on battery |
| Triggers | User logon, Power-Troubleshooter resume event, session unlock fallback |
| VM address discovery | NAT candidates from VMware Tools, VM MAC neighbor, and VMware DHCP lease; each candidate must pass SSH |
| Remote probes | UTF-8/base64 transport with LF normalization into Bash |
| Candidate errors | One unreachable historical candidate cannot abort the remaining candidates |
| Natural recovery | Readiness-based checks for up to 60 seconds |
| Bounded fallback | One soft reset of the existing VM, then up to 180 seconds of readiness checks |
| Logging | Sanitized component snapshot, discovery source, and total readiness time |
| Deployment behavior | No Git operation, image build, source deployment, graph rebuild, database mutation, or Funnel reset |

The installed scripts under `%LOCALAPPDATA%\GETRA\RuntimeRecovery` hash-match the
repository scripts. Installing twice produces the same three triggers and task
settings. `MultipleInstances=IgnoreNew` plus a named mutex prevents overlapping
recovery runs.

## Machine Recovery Results

The final wake-like VM suspend/resume test used the installed Scheduled Task as
the only recovery actor. Natural readiness remained incomplete, the single soft
reset was selected, and the full public chain recovered in `138.6` seconds. Task
result was `0`. The final read-only status reported:

```text
VM_RUNNING=TRUE
UBUNTU_SSH=TRUE
VM_ADDRESS_SOURCE=vmware-tools-nat
ubuntu_network=online
docker=active
tailscale=active
frontend=healthy
backend=healthy
valhalla=healthy
database=connected
provider=reachable
provider_dns=resolved
provider_backend=reachable
funnel_443=configured
funnel_8443=configured
public_backend=reachable
public_frontend=reachable
```

All required containers retain `unless-stopped`. Valhalla uses the existing
1.6 GiB routing-data bind mount and existing `jabodetabek_tiles.tar`. No graph or
volume change was performed.

## Provider And Routing Regression

Valhalla was stopped and started in a bounded controlled test while the backend
remained running. The unavailable request returned `SERVICE_UNAVAILABLE` with
`ROUTING_PROVIDER_UNREACHABLE`. After the same Valhalla container became healthy,
the same request returned a genuine `ROUTABLE` motorcycle route with two provider
candidates, 5,947 m and 975 s. Backend container identity, start time, and restart
count were unchanged. This proves provider reconnection without backend restart
and that the failure was not cached.

The public browser regression after final machine recovery passed:

| Check | Result |
| --- | --- |
| Login | PASS |
| Walking | PASS, 3 real candidates |
| Motorcycle | PASS, 3 real candidates |
| Car | PASS, 2 real candidates |
| Fastest / alternative / selection | PASS |
| Route labels and provider geometry | PASS |
| UMKM GIS / corridor / candidate | PASS / 150 m / PASS |
| Active Journey layout and stop | PASS with simulated GPS; physical test not repeated |
| Backend-to-Valhalla DNS and HTTP | PASS |

The route cache stores only `ROUTABLE` results. Provider health is evaluated on
each health request, and route attempts call the provider directly when no valid
successful cache entry exists. `NO_ROUTE` remains distinct from provider
unavailability.

## Quality And Safety

| Gate | Result |
| --- | --- |
| PowerShell syntax | PASS |
| Installer idempotency | PASS |
| Installed/repository script hash match | PASS |
| Scheduled Task battery/trigger validation | PASS |
| Wake-like automatic recovery | PASS, 138.6 seconds |
| Provider recovery without backend restart | PASS |
| Public three-mode/multi-route browser regression | PASS |
| Backend/frontend application suites | NOT REQUIRED; application source unchanged |
| Production build | NOT REQUIRED; application source unchanged |
| Direct frontend Valhalla call | NONE |
| Valhalla public exposure | NONE; only VM loopback `127.0.0.1:8002` |
| Fake route / straight-line fallback / fake traffic | NONE |
| Graph rebuild / Docker prune / Funnel reset | NOT EXECUTED |
| Secret exposure in changed scope | NONE |

## Owner Acceptance Boundary

Machine QA cannot close a real-world sleep/wake phase. Exact real recovery layer
timings remain `NOT_AVAILABLE_UNTIL_OWNER_TEST`. The owner must now perform:

```text
pre-sleep routing PASS
-> Windows sleep
-> Windows wake while AC may still be disconnected
-> wait up to 5 minutes without terminal commands
-> public login and walking/motorcycle/car routing PASS
```

Until that evidence is supplied,
`REAL_SLEEP_WAKE_OWNER_TEST=PENDING`, Phase 12A.3 remains blocked, and Phase 12B
must not start.
