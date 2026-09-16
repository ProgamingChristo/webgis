[CmdletBinding()]
param(
  [switch]$HealthWatch,
  [switch]$DeepSmoke,
  [int]$FailureThreshold = 3,
  [int]$CooldownMinutes = 10
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'getra-judging-common.ps1')

$stateDirectory = Join-Path $env:LOCALAPPDATA 'GETRA\RuntimeRecovery'
$statePath = Join-Path $stateDirectory 'state.json'
New-Item -ItemType Directory -Force -Path $stateDirectory | Out-Null

$state = @{ ConsecutiveFailures = 0; LastRecoveryUtc = $null }
if (Test-Path -LiteralPath $statePath) {
  try {
    $existing = Get-Content -LiteralPath $statePath -Raw | ConvertFrom-Json
    $state.ConsecutiveFailures = [int]$existing.ConsecutiveFailures
    $state.LastRecoveryUtc = $existing.LastRecoveryUtc
  } catch {}
}

# In interactive mode (not HealthWatch), run full startup/recovery directly
if (-not $HealthWatch) {
  & (Join-Path $PSScriptRoot 'start-getra-runtime.ps1') -DeepSmoke:$DeepSmoke
  exit $LASTEXITCODE
}

# HealthWatch mode (for periodic background monitoring)
$mutex = [Threading.Mutex]::new($false, 'Local\GETRA-Runtime-Health-Watch')
$held = $false
try {
  try { $held = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held = $true }
  if (-not $held) { exit 0 }

  $started = Get-Date
  $status = Get-GetraStatus

  $healthy = $status.Network -and $status.Internet -and $status.DNS -and $status.VM -and $status.Tailscale -and $status.Identity -and $status.Funnel -and $status.Valhalla -and $status.BackendGuest -and $status.FrontendGuest -and $status.Database -and $status.BackendValhalla -and $status.LocalBackend -and $status.LocalFrontend -and $status.PublicBackend -and $status.PublicWeb -and $status.PublicLogin

  $recoveryLog = Join-Path $script:GetraMonitoring 'getra-recovery.log'
  $healthLog = Join-Path $script:GetraMonitoring 'getra-health.log'

  if ($healthy) {
    $state.ConsecutiveFailures = 0
    Write-GetraLog HEALTH ALL '2-minute layered probe' PASS ((Get-Date) - $started).TotalSeconds
    Add-Content -LiteralPath $healthLog -Encoding UTF8 -Value ('{0} HEALTH status=OK' -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'))
  } else {
    $state.ConsecutiveFailures = [int]$state.ConsecutiveFailures + 1
    
    # Identify exact failed layer
    $failedLayer = 'UNKNOWN'
    if (-not $status.Network) { $failedLayer = 'NETWORK' }
    elseif (-not $status.DNS) { $failedLayer = 'DNS' }
    elseif (-not $status.VM) { $failedLayer = 'VM' }
    elseif (-not $status.Tailscale) { $failedLayer = 'TAILSCALE' }
    elseif (-not $status.Valhalla) { $failedLayer = 'VALHALLA' }
    elseif (-not $status.BackendGuest) { $failedLayer = 'BACKEND' }
    elseif (-not $status.FrontendGuest) { $failedLayer = 'FRONTEND' }
    elseif (-not $status.LocalBackend -or -not $status.LocalFrontend) { $failedLayer = 'LOCAL_TUNNEL' }
    elseif (-not $status.Funnel -or -not $status.PublicBackend -or -not $status.PublicWeb) { $failedLayer = 'FUNNEL' }

    Write-GetraLog HEALTH $failedLayer "confirmed failure $($state.ConsecutiveFailures)/$FailureThreshold" FAIL ((Get-Date) - $started).TotalSeconds
    Add-Content -LiteralPath $healthLog -Encoding UTF8 -Value ('{0} HEALTH status=FAIL layer={1} failure_count={2}' -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'), $failedLayer, $state.ConsecutiveFailures)

    # Cooldown & failure threshold check before triggering recovery action
    $last = if ($state.LastRecoveryUtc) { [datetime]::Parse($state.LastRecoveryUtc).ToUniversalTime() } else { [datetime]::MinValue }
    $cooldownDone = ([datetime]::UtcNow - $last).TotalMinutes -ge $CooldownMinutes

    if ($state.ConsecutiveFailures -ge $FailureThreshold -and $cooldownDone) {
      $state.LastRecoveryUtc = [datetime]::UtcNow.ToString('o')
      $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8

      # Granular recovery based on failed layer
      $addr = if ($status.VM) { Resolve-GetraVmAddress } else { $null }
      
      if (-not $status.VM) {
        Write-GetraLog RECOVERY VM 'starting VM nogui' REQUESTED 0
        & $script:GetraVmrun start $script:GetraVmPath nogui | Out-Null
      } elseif ($addr) {
        if (-not $status.Tailscale) {
          Write-GetraLog RECOVERY TAILSCALE 'restarting tailscaled in VM' REQUESTED 0
          Invoke-GetraSsh $addr 'systemctl restart tailscaled' | Out-Null
        }
        if (-not $status.Valhalla) {
          Write-GetraLog RECOVERY VALHALLA 'restarting valhalla container' REQUESTED 0
          Invoke-GetraSsh $addr 'docker restart getra-valhalla-1' | Out-Null
        }
        if (-not $status.BackendGuest) {
          Write-GetraLog RECOVERY BACKEND 'restarting backend container' REQUESTED 0
          Invoke-GetraSsh $addr 'docker restart getra-full-product-10e-getra-backend-full-1' | Out-Null
        }
        if (-not $status.FrontendGuest) {
          Write-GetraLog RECOVERY FRONTEND 'restarting frontend container' REQUESTED 0
          Invoke-GetraSsh $addr 'docker restart getra-full-product-10e-getra-frontend-full-1' | Out-Null
        }
        if (-not $status.LocalBackend -or -not $status.LocalFrontend) {
          Write-GetraLog RECOVERY LOCAL_TUNNEL 'restarting local SSH tunnels' REQUESTED 0
          Start-GetraLocalTunnel $addr | Out-Null
        }
        if (-not $status.Funnel -or -not $status.PublicBackend -or -not $status.PublicWeb) {
          Write-GetraLog RECOVERY FUNNEL 'reasserting funnel mappings' REQUESTED 0
          Restore-GetraFunnel $addr | Out-Null
        }
      }

      # Recheck health
      Start-Sleep -Seconds 10
      $newStatus = Get-GetraStatus
      $recovered = $newStatus.PublicBackend -and $newStatus.PublicWeb -and $newStatus.PublicLogin
      Add-Content -LiteralPath $recoveryLog -Encoding UTF8 -Value ('{0} RECOVERY target={1} result={2}' -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'), $failedLayer, $(if ($recovered) { 'PASS' } else { 'FAIL' }))

      if ($recovered) {
        $state.ConsecutiveFailures = 0
      }
    }
  }

  $state | ConvertTo-Json | Set-Content -LiteralPath $statePath -Encoding UTF8
} finally {
  if ($held) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
