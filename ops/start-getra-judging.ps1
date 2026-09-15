[CmdletBinding()]
param([switch]$AllowVmReset,[switch]$DeepSmoke,[int]$NetworkWaitSeconds=120)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'getra-judging-common.ps1')
$mutex=[Threading.Mutex]::new($false,'Local\GETRA-Judging-Startup');$held=$false;$started=Get-Date
try {
  try{$held=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$held=$true}
  if(-not $held){Write-Output 'GETRA startup/recovery is already running.';exit 0}
  foreach($required in @($script:GetraVmrun,$script:GetraSsh,$script:GetraCurl,$script:GetraVmPath,$script:GetraKnownHosts)){if(-not(Test-Path -LiteralPath $required -PathType Leaf)){throw "Required runtime file missing: $required"}}
  $deadline=(Get-Date).AddSeconds($NetworkWaitSeconds)
  do{$network=@(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue|Where-Object{$_.InterfaceAlias -notlike '*VMware*'}).Count -gt 0;if(-not $network){Start-Sleep -Seconds 5}}while(-not $network -and (Get-Date) -lt $deadline)
  if(-not $network){throw 'Host network did not become ready within the bounded startup window.'}
  if(@(& $script:GetraVmrun list 2>$null) -notcontains $script:GetraVmPath){$actionStart=Get-Date;& $script:GetraVmrun start $script:GetraVmPath nogui|Out-Null;Write-GetraLog RECOVERY VM 'start existing VM nogui' REQUESTED ((Get-Date)-$actionStart).TotalSeconds}
  $address=$null;$sshDeadline=(Get-Date).AddSeconds(150)
  do{$address=Resolve-GetraVmAddress;if(-not $address){Start-Sleep -Seconds 5}}while(-not $address -and (Get-Date) -lt $sshDeadline)
  if(-not $address){throw 'GETRA VM SSH did not become ready.'}
  Start-GetraContainers $address
  $localDeadline=(Get-Date).AddSeconds(90)
  do{$guest=Get-GetraGuestStatus $address;$localReady=$guest.valhalla_http -eq 'pass' -and $guest.backend_http -eq 'pass' -and $guest.frontend_http -eq 'pass';if(-not $localReady){Start-Sleep -Seconds 5}}while(-not $localReady -and (Get-Date) -lt $localDeadline)
  if(-not $localReady){throw 'Guest application dependencies did not become healthy.'}
  if(-not(Start-GetraLocalTunnel $address)){throw 'Windows localhost tunnel could not be established.'}
  $status=Get-GetraStatus
  if(-not $status.Funnel -or -not $status.PublicBackend -or -not $status.PublicWeb -or -not $status.PublicLogin){$funnelStart=Get-Date;$restored=Restore-GetraFunnel $address;Write-GetraLog RECOVERY FUNNEL 'reassert approved 443 and 8443 mappings' $(if($restored){'PASS'}else{'FAIL'}) ((Get-Date)-$funnelStart).TotalSeconds;$status=Wait-GetraReady 30}
  if((-not $status.PublicBackend -or -not $status.PublicWeb) -and $AllowVmReset -and $status.Valhalla -and $status.BackendGuest -and $status.FrontendGuest){
    $resetStart=Get-Date;& $script:GetraVmrun reset $script:GetraVmPath soft|Out-Null;Write-GetraLog RECOVERY FUNNEL_DATA_PLANE 'soft reset existing VM after healthy-local/public-failed confirmation' REQUESTED ((Get-Date)-$resetStart).TotalSeconds;Start-Sleep -Seconds 15
    $address=$null;$sshDeadline=(Get-Date).AddSeconds(150);do{$address=Resolve-GetraVmAddress;if(-not $address){Start-Sleep -Seconds 5}}while(-not $address -and (Get-Date) -lt $sshDeadline);if(-not $address){throw 'VM did not return after bounded soft reset.'}
    Start-GetraContainers $address;Start-Sleep -Seconds 10;[void](Start-GetraLocalTunnel $address);[void](Restore-GetraFunnel $address);$status=Wait-GetraReady 120
  }
  $routing='NOT_RUN';$ai='NOT_RUN'
  if($DeepSmoke){$smokeOutput=& node (Join-Path $PSScriptRoot 'judging-public-smoke.mjs') 2>$null;$smokeCode=$LASTEXITCODE;try{$smoke=($smokeOutput|Select-Object -Last 1)|ConvertFrom-Json;$routing=$smoke.routing;$ai=$smoke.ai}catch{$routing='FAIL';$ai='FAIL'};if($smokeCode -ne 0){$routing='FAIL';$ai='FAIL'}}
  Write-GetraStatusTable $status $routing $ai
  $ready=$status.Network -and $status.Internet -and $status.DNS -and $status.VM -and $status.Tailscale -and $status.Identity -and $status.Funnel -and $status.Valhalla -and $status.BackendGuest -and $status.FrontendGuest -and $status.Database -and $status.BackendValhalla -and $status.LocalBackend -and $status.LocalFrontend -and $status.PublicBackend -and $status.PublicWeb -and $status.PublicLogin
  if($DeepSmoke){$ready=$ready -and $routing -eq 'PASS' -and $ai -eq 'PASS'}
  Write-GetraLog HEALTH ALL 'startup/recovery verification' $(if($ready){'PASS'}else{'FAIL'}) ((Get-Date)-$started).TotalSeconds
  if($ready){Write-Output '';Write-Output 'GETRA ONLINE';exit 0};exit 1
} catch {Write-GetraLog RECOVERY SUPERVISOR $_.Exception.Message FAIL ((Get-Date)-$started).TotalSeconds;Write-Error 'GETRA recovery did not reach ready state. See sanitized recovery log.';exit 1}
finally{if($held){$mutex.ReleaseMutex()};$mutex.Dispose()}
