[CmdletBinding()]
param(
  [string]$VmPath = "D:\VMware\Getra-Routing\Getra-Routing.vmx",
  [string]$VmAddress = "192.168.47.131",
  [string]$SshUser = "getra",
  [int]$InitialRecoverySeconds = 180,
  [int]$ResetRecoverySeconds = 180,
  [string]$LogPath = "$env:LOCALAPPDATA\GETRA\RuntimeRecovery\recovery.log"
)

$ErrorActionPreference = "Stop"
$vmrun = "C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe"
$ssh = "$SshUser@$VmAddress"
$mutex = [Threading.Mutex]::new($false, "Local\GETRA-Runtime-Recovery")

function Write-RecoveryLog([string]$Message) {
  $directory = Split-Path -Parent $LogPath
  if ($directory) { New-Item -ItemType Directory -Force -Path $directory | Out-Null }
  $line = "{0} {1}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"), $Message
  Add-Content -LiteralPath $LogPath -Value $line -Encoding UTF8
  Write-Output $line
}

function Test-VmRunning {
  return (& $vmrun list) -contains $VmPath
}

function Test-Ssh {
  & ssh.exe -o BatchMode=yes -o ConnectTimeout=5 $ssh "true" 2>$null
  return $LASTEXITCODE -eq 0
}

function Start-RequiredContainers {
  $command = @'
for container in getra-valhalla-1 getra-full-product-10e-getra-backend-full-1 getra-full-product-10e-getra-frontend-full-1; do
  if docker inspect "$container" >/dev/null 2>&1; then
    running=$(docker inspect "$container" --format '{{.State.Running}}')
    if [ "$running" != "true" ]; then docker start "$container" >/dev/null; fi
  fi
done
'@
  & ssh.exe -o BatchMode=yes -o ConnectTimeout=5 $ssh $command 2>$null
}

function Test-RemoteReady {
  $command = @'
set -e
systemctl is-active --quiet docker
systemctl is-active --quiet tailscaled
ip route show default | grep -q '^default '
getent hosts controlplane.tailscale.com >/dev/null
test "$(docker inspect getra-valhalla-1 --format '{{.State.Health.Status}}')" = "healthy"
test "$(docker inspect getra-full-product-10e-getra-backend-full-1 --format '{{.State.Health.Status}}')" = "healthy"
test "$(docker inspect getra-full-product-10e-getra-frontend-full-1 --format '{{.State.Health.Status}}')" = "healthy"
docker exec getra-full-product-10e-getra-backend-full-1 getent hosts valhalla >/dev/null
# The payload is a small Node fetch probe, encoded to survive PowerShell/SSH quoting.
echo 'ZmV0Y2goImh0dHA6Ly92YWxoYWxsYTo4MDAyL3N0YXR1cyIpLnRoZW4ocj0+cHJvY2Vzcy5leGl0KHIub2s/MDoxKSkuY2F0Y2goKCk9PnByb2Nlc3MuZXhpdCgxKSk=' | base64 -d | docker exec -i getra-full-product-10e-getra-backend-full-1 node
curl --fail --silent --max-time 12 http://127.0.0.1:8002/status >/dev/null
curl --fail --silent --max-time 12 http://127.0.0.1:3002/api/health >/dev/null
curl --fail --silent --max-time 12 http://127.0.0.1:3003/login >/dev/null
tailscale status | grep -q getra-routing-api
tailscale funnel status | grep -q 'https://getra-routing-api.tail0ed517.ts.net '
tailscale funnel status | grep -q 'https://getra-routing-api.tail0ed517.ts.net:8443'
public_ip=$(curl --fail --silent --max-time 10 -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=getra-routing-api.tail0ed517.ts.net&type=A' | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1)
test -n "$public_ip"
curl --fail --silent --max-time 15 --resolve getra-routing-api.tail0ed517.ts.net:443:$public_ip https://getra-routing-api.tail0ed517.ts.net/api/health >/dev/null
curl --fail --silent --max-time 15 --resolve getra-routing-api.tail0ed517.ts.net:8443:$public_ip https://getra-routing-api.tail0ed517.ts.net:8443/login >/dev/null
'@
  & ssh.exe -o BatchMode=yes -o ConnectTimeout=5 $ssh $command 2>$null
  return $LASTEXITCODE -eq 0
}

function Wait-ForRecovery([int]$TimeoutSeconds) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  $containersStarted = $false
  while ((Get-Date) -lt $deadline) {
    if (Test-Ssh) {
      if (-not $containersStarted) {
        Start-RequiredContainers
        $containersStarted = $true
      }
      if (Test-RemoteReady) { return $true }
    }
    Start-Sleep -Seconds 5
  }
  return $false
}

try {
  if (-not $mutex.WaitOne(0)) {
    Write-Output "GETRA recovery is already running."
    exit 0
  }
  if (-not (Test-Path -LiteralPath $vmrun)) { throw "vmrun.exe was not found." }
  if (-not (Test-Path -LiteralPath $VmPath)) { throw "Approved GETRA VM was not found." }

  if (-not (Test-VmRunning)) {
    Write-RecoveryLog "VM is stopped; starting the existing GETRA-Routing VM."
    & $vmrun start $VmPath nogui | Out-Null
  } else {
    Write-RecoveryLog "VM is already running; waiting for normal network and service recovery."
  }

  if (Wait-ForRecovery $InitialRecoverySeconds) {
    Write-RecoveryLog "GETRA runtime is healthy without a VM reset."
    exit 0
  }

  Write-RecoveryLog "Runtime did not recover within $InitialRecoverySeconds seconds; requesting one soft VM reset."
  & $vmrun reset $VmPath soft | Out-Null
  if (Wait-ForRecovery $ResetRecoverySeconds) {
    Write-RecoveryLog "GETRA runtime recovered after one soft VM reset."
    exit 0
  }

  Write-RecoveryLog "GETRA runtime recovery failed after the bounded retry."
  exit 1
} catch {
  Write-RecoveryLog "GETRA runtime recovery failed: $($_.Exception.Message)"
  exit 1
} finally {
  try { $mutex.ReleaseMutex() } catch { }
  $mutex.Dispose()
}
