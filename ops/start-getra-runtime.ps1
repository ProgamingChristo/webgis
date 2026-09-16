[CmdletBinding()]
param(
  [switch]$DeepSmoke,
  [int]$NetworkWaitSeconds = 120
)

$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'getra-judging-common.ps1')

$mutex = [Threading.Mutex]::new($false, 'Local\GETRA-Runtime-Startup')
$held = $false
$started = Get-Date

try {
  try { $held = $mutex.WaitOne(0) } catch [Threading.AbandonedMutexException] { $held = $true }
  if (-not $held) {
    Write-Output 'GETRA startup/recovery is already running.'
    exit 0
  }

  foreach ($required in @($script:GetraVmrun, $script:GetraSsh, $script:GetraCurl, $script:GetraVmPath, $script:GetraKnownHosts)) {
    if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
      throw "Required runtime file missing: $required"
    }
  }

  # 1. Wait for host network
  $deadline = (Get-Date).AddSeconds($NetworkWaitSeconds)
  do {
    $network = @(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue | Where-Object { $_.InterfaceAlias -notlike '*VMware*' }).Count -gt 0
    if (-not $network) { Start-Sleep -Seconds 5 }
  } while (-not $network -and (Get-Date) -lt $deadline)

  if (-not $network) {
    throw 'Host network did not become ready within the bounded startup window.'
  }

  # 2. Verify / start routing VM
  if (@(& $script:GetraVmrun list 2>$null) -notcontains $script:GetraVmPath) {
    $actionStart = Get-Date
    & $script:GetraVmrun start $script:GetraVmPath nogui | Out-Null
    Write-GetraLog RECOVERY VM 'start existing VM nogui' REQUESTED ((Get-Date) - $actionStart).TotalSeconds
  }

  # 3. Resolve VM address & verify SSH
  $address = $null
  $sshDeadline = (Get-Date).AddSeconds(150)
  do {
    $address = Resolve-GetraVmAddress
    if (-not $address) { Start-Sleep -Seconds 5 }
  } while (-not $address -and (Get-Date) -lt $sshDeadline)

  if (-not $address) {
    throw 'GETRA VM SSH did not become ready.'
  }

  # 4. Verify / start Docker containers in guest
  Start-GetraContainers $address

  # 5. Wait for guest application dependencies (Valhalla, Backend, Frontend)
  $localDeadline = (Get-Date).AddSeconds(90)
  do {
    $guest = Get-GetraGuestStatus $address
    $localReady = ($guest.valhalla_http -eq 'pass') -and ($guest.backend_http -eq 'pass') -and ($guest.frontend_http -eq 'pass')
    if (-not $localReady) { Start-Sleep -Seconds 5 }
  } while (-not $localReady -and (Get-Date) -lt $localDeadline)

  if (-not $localReady) {
    throw 'Guest application dependencies did not become healthy.'
  }

  # 6. Establish / verify local Windows SSH tunnel (3000 -> 3003, 8080 -> 3002)
  if (-not (Start-GetraLocalTunnel $address)) {
    throw 'Windows localhost tunnel could not be established.'
  }

  # 7. Verify / restore Tailscale & Funnel
  $status = Get-GetraStatus
  if (-not $status.Funnel -or -not $status.PublicBackend -or -not $status.PublicWeb -or -not $status.PublicLogin) {
    $funnelStart = Get-Date
    $restored = Restore-GetraFunnel $address
    Write-GetraLog RECOVERY FUNNEL 'reassert approved 443 and 8443 mappings' $(if ($restored) { 'PASS' } else { 'FAIL' }) ((Get-Date) - $funnelStart).TotalSeconds
    $status = Wait-GetraReady 30
  }

  # 8. Optional deep smoke test
  $routing = 'NOT_RUN'
  $ai = 'NOT_RUN'
  if ($DeepSmoke) {
    $smokeOutput = & node (Join-Path $PSScriptRoot 'judging-public-smoke.mjs') 2>$null
    $smokeCode = $LASTEXITCODE
    try {
      $smoke = ($smokeOutput | Select-Object -Last 1) | ConvertFrom-Json
      $routing = $smoke.routing
      $ai = $smoke.ai
    } catch {
      $routing = 'FAIL'
      $ai = 'FAIL'
    }
    if ($smokeCode -ne 0) {
      $routing = 'FAIL'
      $ai = 'FAIL'
    }
  }

  # 9. Output status table
  Write-GetraStatusTable $status $routing $ai

  $ready = $status.Network -and $status.Internet -and $status.DNS -and $status.VM -and $status.Tailscale -and $status.Identity -and $status.Funnel -and $status.Valhalla -and $status.BackendGuest -and $status.FrontendGuest -and $status.Database -and $status.BackendValhalla -and $status.LocalBackend -and $status.LocalFrontend -and $status.PublicBackend -and $status.PublicWeb -and $status.PublicLogin
  if ($DeepSmoke) {
    $ready = $ready -and ($routing -eq 'PASS') -and ($ai -eq 'PASS')
  }

  # Write standardized logs
  Write-GetraLog HEALTH ALL 'startup/recovery verification' $(if ($ready) { 'PASS' } else { 'FAIL' }) ((Get-Date) - $started).TotalSeconds
  
  $startupLog = Join-Path $script:GetraMonitoring 'getra-startup.log'
  Add-Content -LiteralPath $startupLog -Encoding UTF8 -Value ('{0} startup result={1} duration_seconds={2}' -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'), $(if ($ready) { 'PASS' } else { 'FAIL' }), [Math]::Round(((Get-Date) - $started).TotalSeconds, 1))

  if ($ready) {
    Write-Output ''
    Write-Output 'GETRA ONLINE'
    exit 0
  }
  exit 1
} catch {
  Write-GetraLog RECOVERY SUPERVISOR $_.Exception.Message FAIL ((Get-Date) - $started).TotalSeconds
  Write-Error "GETRA recovery did not reach ready state: $_"
  exit 1
} finally {
  if ($held) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
