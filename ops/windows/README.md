# GETRA Runtime Recovery

These scripts restore the existing owner-hosted GETRA staging runtime after
Windows logon or wake. They do not deploy source, recreate containers, rebuild
the Valhalla graph, reset Funnel, or modify the database.

## Installed Automation

The installer registers the hidden, current-user Scheduled Task
`GETRA Runtime Recovery` with three triggers:

- current-user logon;
- Windows `Power-Troubleshooter` Event ID 1 (resume from sleep);
- current-user session unlock as a fallback wake signal.

The task is explicitly allowed to start and continue while the laptop uses its
battery. This matters because a normal lid-open wake can happen before AC power
is connected. The previous task defaults deferred recovery until AC returned.

The task uses the existing VM at
`D:\VMware\Getra-Routing\Getra-Routing.vmx`. It starts that VM only when it is
stopped and discovers the current guest NAT address from VMware Tools, the VM's
MAC neighbor, or VMware's DHCP lease. It waits up to 60 seconds for natural
recovery. If the complete chain is still unavailable, one soft VM reset followed
by a final 180-second wait is the bounded fallback. Concurrent invocations are
ignored through a named mutex.

Install or refresh the task from this checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\ops\windows\install-getra-recovery-task.ps1
```

Installed scripts and the bounded log are under
`$env:LOCALAPPDATA\GETRA\RuntimeRecovery`.

## Owner Commands

Check the complete runtime chain without exposing secrets:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\GETRA\RuntimeRecovery\getra-status.ps1"
```

Run the same bounded recovery manually if automatic recovery does not finish:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\GETRA\RuntimeRecovery\getra-recover.ps1"
```

A successful status checks the VM, dynamically resolves its current NAT address,
then checks Ubuntu network and DNS, Docker, Tailscale,
the exact existing frontend/backend/Valhalla containers, database health,
backend-to-Valhalla connectivity, Funnel configuration, public DNS, and both
public HTTPS endpoints. Public endpoint checks use an independent DNS-over-HTTPS
answer so a host ISP resolver cache cannot produce a false runtime diagnosis.

## Recovery Boundary

The machine-observed stale-network scenario needed a soft VM reset. Restarting
only the containers did not repair the stale Docker published ports and backend
database path, so the supervisor does not spend an extra retry on that ineffective
action. Use 5 minutes after wake as the owner acceptance target. A healthy runtime
check normally completes in a few seconds.

GETRA remains offline while the laptop or VM is asleep. This automation improves
recovery after wake; it does not provide 24/7 hosting.

Recovery log success lines include the VMware address-discovery source and total
readiness time. Failed bounded attempts include a sanitized component status
snapshot. If the command still exits nonzero after its bounded retry, inspect
`$env:LOCALAPPDATA\GETRA\RuntimeRecovery\recovery.log` and stop. Do not rebuild
the graph, delete Docker data, reset Funnel, or repeatedly reset the VM.
