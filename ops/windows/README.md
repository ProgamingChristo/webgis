# GETRA Runtime Recovery

These scripts restore the existing owner-hosted GETRA staging runtime after
Windows logon or wake. They do not deploy source, recreate containers, rebuild
the Valhalla graph, reset Funnel, or modify the database.

## Installed Automation

The installer registers the hidden, current-user Scheduled Task
`GETRA Runtime Recovery` with two triggers:

- current-user logon;
- Windows `Power-Troubleshooter` Event ID 1 (resume from sleep).

The task uses the existing VM at
`D:\VMware\Getra-Routing\Getra-Routing.vmx`. It starts that VM only when it is
stopped, waits up to 180 seconds for normal recovery, then permits one soft VM
reset and one final 180-second wait. Concurrent invocations are ignored through
a named mutex.

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

A successful status checks the VM, Ubuntu network and DNS, Docker, Tailscale,
the exact existing frontend/backend/Valhalla containers, database health,
backend-to-Valhalla connectivity, Funnel configuration, public DNS, and both
public HTTPS endpoints. Public endpoint checks use an independent DNS-over-HTTPS
answer so a host ISP resolver cache cannot produce a false runtime diagnosis.

## Recovery Boundary

The machine-observed stale-network scenario recovered in approximately 4 minutes
17 seconds after one bounded soft VM reset. Use 5 minutes after wake as the owner
acceptance target. A healthy runtime check normally completes in a few seconds.

GETRA remains offline while the laptop or VM is asleep. This automation improves
recovery after wake; it does not provide 24/7 hosting.

If the command still exits nonzero after its bounded retry, inspect
`$env:LOCALAPPDATA\GETRA\RuntimeRecovery\recovery.log` and stop. Do not rebuild
the graph, delete Docker data, reset Funnel, or repeatedly reset the VM.
