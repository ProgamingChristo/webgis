[CmdletBinding()]
param(
  [string]$VmPath = "D:\VMware\Getra-Routing\Getra-Routing.vmx",
  [string]$VmAddress = "",
  [string]$SshUser = "getra",
  [int]$InitialRecoverySeconds = 60,
  [int]$ResetRecoverySeconds = 180,
  [string]$LogPath = "$env:LOCALAPPDATA\GETRA\RuntimeRecovery\recovery.log"
)

$ErrorActionPreference = "Stop"
$vmrun = "C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe"
$mutex = [Threading.Mutex]::new($false, "Local\GETRA-Runtime-Recovery")
$script:SshTarget = $null
$script:AddressSource = $null
$script:LastRemoteStatus = @()

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

function Test-IPv4Subnet([string]$Address, [string]$NetworkAddress, [int]$PrefixLength) {
  $addressBytes = ([Net.IPAddress]::Parse($Address)).GetAddressBytes()
  $networkBytes = ([Net.IPAddress]::Parse($NetworkAddress)).GetAddressBytes()
  for ($index = 0; $index -lt 4; $index++) {
    $bits = [Math]::Min(8, [Math]::Max(0, $PrefixLength - ($index * 8)))
    if ($bits -eq 0) { continue }
    $mask = (0xff -shl (8 - $bits)) -band 0xff
    if (($addressBytes[$index] -band $mask) -ne ($networkBytes[$index] -band $mask)) {
      return $false
    }
  }
  return $true
}

function Resolve-VmAddressCandidates {
  if ($VmAddress) {
    return ,([PSCustomObject]@{ Address = $VmAddress; Source = "parameter" })
  }

  $candidates = [Collections.Generic.List[object]]::new()
  $seen = @{}
  $natInterfaces = @(Get-NetIPAddress -InterfaceAlias "VMware Network Adapter VMnet8" `
    -AddressFamily IPv4 -ErrorAction SilentlyContinue)
  $vmrunOutput = @(& $vmrun getGuestIPAddress $VmPath 2>$null)
  foreach ($candidate in $vmrunOutput | Where-Object { $_ }) {
    $parsed = $null
    if ([Net.IPAddress]::TryParse($candidate.Trim(), [ref]$parsed) -and
        $parsed.AddressFamily -eq [Net.Sockets.AddressFamily]::InterNetwork -and
        $natInterfaces.Where({ Test-IPv4Subnet $parsed.IPAddressToString $_.IPAddress $_.PrefixLength }).Count -gt 0) {
      $seen[$parsed.IPAddressToString] = $true
      $candidates.Add([PSCustomObject]@{ Address = $parsed.IPAddressToString; Source = "vmware-tools-nat" })
    }
  }

  $vmx = Get-Content -LiteralPath $VmPath -Raw
  $macMatch = [regex]::Match(
    $vmx,
    '(?im)^ethernet0\.(?:generatedAddress|address)\s*=\s*"(?<mac>[0-9a-f:-]+)"'
  )
  if ($macMatch.Success) {
    $mac = $macMatch.Groups['mac'].Value.Replace(':', '-').ToUpperInvariant()
    foreach ($neighbor in @(Get-NetNeighbor -InterfaceAlias "VMware Network Adapter VMnet8" `
      -AddressFamily IPv4 -ErrorAction SilentlyContinue)) {
      if ($neighbor.LinkLayerAddress -eq $mac -and -not $seen[$neighbor.IPAddress]) {
        $seen[$neighbor.IPAddress] = $true
        $candidates.Add([PSCustomObject]@{ Address = $neighbor.IPAddress; Source = "vmware-nat-neighbor" })
      }
    }

    $leasePaths = @(
      "C:\ProgramData\VMware\vmnetdhcp.leases",
      "C:\ProgramData\VMware\vmnetdhcp.leases~"
    )
    $leaseMac = $mac.Replace('-', ':')
    foreach ($leasePath in $leasePaths) {
      if (-not (Test-Path -LiteralPath $leasePath)) { continue }
      $leaseText = Get-Content -LiteralPath $leasePath -Raw
      $leaseMatches = [regex]::Matches(
        $leaseText,
        "(?is)lease\s+(?<ip>[0-9.]+)\s*\{(?:(?!\n\}).)*hardware\s+ethernet\s+$([regex]::Escape($leaseMac));"
      )
      for ($index = $leaseMatches.Count - 1; $index -ge 0; $index--) {
        $leaseAddress = $leaseMatches[$index].Groups['ip'].Value
        if (-not $seen[$leaseAddress] -and
            $natInterfaces.Where({ Test-IPv4Subnet $leaseAddress $_.IPAddress $_.PrefixLength }).Count -gt 0) {
          $seen[$leaseAddress] = $true
          $candidates.Add([PSCustomObject]@{ Address = $leaseAddress; Source = "vmware-dhcp-lease" })
        }
      }
    }
  }

  return $candidates.ToArray()
}

function Test-SshTarget([string]$Target) {
  $previousPreference = $ErrorActionPreference
  try {
    $ErrorActionPreference = "Continue"
    & ssh.exe -o BatchMode=yes -o ConnectTimeout=5 -o ConnectionAttempts=1 `
      -o StrictHostKeyChecking=accept-new $Target "true" 2>$null
    return $LASTEXITCODE -eq 0
  } catch {
    return $false
  } finally {
    $ErrorActionPreference = $previousPreference
  }
}

function Test-Ssh {
  foreach ($endpoint in @(Resolve-VmAddressCandidates)) {
    $target = "$SshUser@$($endpoint.Address)"
    if (Test-SshTarget $target) {
      $script:SshTarget = $target
      $script:AddressSource = $endpoint.Source
      return $true
    }
  }
  return $false
}

function Invoke-RemoteScript([string]$Command) {
  $normalized = $Command -replace "`r`n", "`n"
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($normalized))
  & ssh.exe -o BatchMode=yes -o ConnectTimeout=5 -o ConnectionAttempts=1 `
    -o StrictHostKeyChecking=accept-new $script:SshTarget "echo '$encoded' | base64 -d | bash" 2>$null
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
  Invoke-RemoteScript $command | Out-Null
}

function Get-RemoteStatus {
  $command = @'
echo "ubuntu_network=$(ip route show default | grep -q '^default ' && getent hosts controlplane.tailscale.com >/dev/null 2>&1 && echo online || echo offline)"
echo "docker=$(systemctl is-active docker 2>/dev/null || true)"
echo "tailscale=$(systemctl is-active tailscaled 2>/dev/null || true)"
echo "frontend=$(docker inspect getra-full-product-10e-getra-frontend-full-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
echo "backend=$(docker inspect getra-full-product-10e-getra-backend-full-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
echo "valhalla=$(docker inspect getra-valhalla-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
echo "database=$(curl --fail --silent --max-time 12 http://127.0.0.1:3002/api/health >/dev/null && echo connected || echo unavailable)"
echo "provider=$(curl --fail --silent --max-time 12 http://127.0.0.1:8002/status >/dev/null && echo reachable || echo unavailable)"
echo "provider_dns=$(docker exec getra-full-product-10e-getra-backend-full-1 getent hosts valhalla >/dev/null 2>&1 && echo resolved || echo unavailable)"
# The payload is a small Node fetch probe, encoded to survive PowerShell/SSH quoting.
provider_probe=$(echo 'ZmV0Y2goImh0dHA6Ly92YWxoYWxsYTo4MDAyL3N0YXR1cyIpLnRoZW4ocj0+cHJvY2Vzcy5leGl0KHIub2s/MDoxKSkuY2F0Y2goKCk9PnByb2Nlc3MuZXhpdCgxKSk=' | base64 -d)
if docker exec getra-full-product-10e-getra-backend-full-1 node -e "$provider_probe" >/dev/null 2>&1; then
  echo "provider_backend=reachable"
else
  echo "provider_backend=unavailable"
fi
echo "tailscale_node=$(tailscale status 2>/dev/null | grep -q getra-routing-api && echo connected || echo unavailable)"
echo "funnel_443=$(tailscale funnel status 2>/dev/null | grep -q 'https://getra-routing-api.tail0ed517.ts.net ' && echo configured || echo unavailable)"
echo "funnel_8443=$(tailscale funnel status 2>/dev/null | grep -q 'https://getra-routing-api.tail0ed517.ts.net:8443' && echo configured || echo unavailable)"
public_ip=$(curl --fail --silent --max-time 10 -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=getra-routing-api.tail0ed517.ts.net&type=A' | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1 || true)
echo "public_dns=$(test -n "$public_ip" && echo resolved || echo unavailable)"
echo "public_backend=$(test -n "$public_ip" && curl --fail --silent --max-time 15 --resolve getra-routing-api.tail0ed517.ts.net:443:$public_ip https://getra-routing-api.tail0ed517.ts.net/api/health >/dev/null && echo reachable || echo unavailable)"
echo "public_frontend=$(test -n "$public_ip" && curl --fail --silent --max-time 15 --resolve getra-routing-api.tail0ed517.ts.net:8443:$public_ip https://getra-routing-api.tail0ed517.ts.net:8443/login >/dev/null && echo reachable || echo unavailable)"
'@
  return @(Invoke-RemoteScript $command)
}

function Test-RemoteReady {
  $script:LastRemoteStatus = @(Get-RemoteStatus)
  $required = @(
    "ubuntu_network=online",
    "docker=active",
    "tailscale=active",
    "frontend=healthy",
    "backend=healthy",
    "valhalla=healthy",
    "database=connected",
    "provider=reachable",
    "provider_dns=resolved",
    "provider_backend=reachable",
    "tailscale_node=connected",
    "funnel_443=configured",
    "funnel_8443=configured",
    "public_dns=resolved",
    "public_backend=reachable",
    "public_frontend=reachable"
  )
  return $required.Where({ $script:LastRemoteStatus -notcontains $_ }).Count -eq 0
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
  $startedAt = Get-Date
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
    $elapsed = [Math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
    Write-RecoveryLog "GETRA runtime is healthy without a VM reset; guest_address_source=$script:AddressSource; ready_after_seconds=$elapsed."
    exit 0
  }

  if ($script:LastRemoteStatus.Count -gt 0) {
    Write-RecoveryLog "Pre-reset status: $($script:LastRemoteStatus -join ';')."
  }
  Write-RecoveryLog "Natural recovery did not complete within $InitialRecoverySeconds seconds; requesting one soft VM reset."
  & $vmrun reset $VmPath soft | Out-Null
  if (Wait-ForRecovery $ResetRecoverySeconds) {
    $elapsed = [Math]::Round(((Get-Date) - $startedAt).TotalSeconds, 1)
    Write-RecoveryLog "GETRA runtime recovered after one soft VM reset; guest_address_source=$script:AddressSource; ready_after_seconds=$elapsed."
    exit 0
  }

  if ($script:LastRemoteStatus.Count -gt 0) {
    Write-RecoveryLog "Final status: $($script:LastRemoteStatus -join ';')."
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
