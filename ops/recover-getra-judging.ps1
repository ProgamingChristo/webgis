[CmdletBinding()]
param([switch]$HealthWatch,[int]$FailureThreshold=3,[int]$CooldownMinutes=10)
$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot 'getra-judging-common.ps1')
$stateDirectory=Join-Path $env:LOCALAPPDATA 'GETRA\JudgingRecovery';$statePath=Join-Path $stateDirectory 'state.json';New-Item -ItemType Directory -Force -Path $stateDirectory|Out-Null
$state=@{ConsecutiveFailures=0;LastRecoveryUtc=$null}
if(Test-Path -LiteralPath $statePath){try{$existing=Get-Content -LiteralPath $statePath -Raw|ConvertFrom-Json;$state.ConsecutiveFailures=[int]$existing.ConsecutiveFailures;$state.LastRecoveryUtc=$existing.LastRecoveryUtc}catch{}}
if(-not $HealthWatch){& (Join-Path $PSScriptRoot 'start-getra-judging.ps1') -AllowVmReset -DeepSmoke;exit $LASTEXITCODE}
$mutex=[Threading.Mutex]::new($false,'Local\GETRA-Judging-Health-Watch');$held=$false
try {
  try{$held=$mutex.WaitOne(0)}catch [Threading.AbandonedMutexException]{$held=$true};if(-not $held){exit 0}
  $started=Get-Date;$status=Get-GetraStatus
  $healthy=$status.Network -and $status.Internet -and $status.DNS -and $status.VM -and $status.Tailscale -and $status.Identity -and $status.Funnel -and $status.Valhalla -and $status.BackendGuest -and $status.FrontendGuest -and $status.Database -and $status.BackendValhalla -and $status.LocalBackend -and $status.LocalFrontend -and $status.PublicBackend -and $status.PublicWeb -and $status.PublicLogin
  if($healthy){$state.ConsecutiveFailures=0;Write-GetraLog HEALTH ALL '2-minute layered probe' PASS ((Get-Date)-$started).TotalSeconds}
  else{$state.ConsecutiveFailures=[int]$state.ConsecutiveFailures+1;$failure=if(-not $status.DNS){'NXDOMAIN_OR_DNS'}elseif($status.Valhalla -and $status.BackendGuest -and $status.FrontendGuest -and (-not $status.PublicBackend -or -not $status.PublicWeb)){'CONNECTION_CLOSED_OR_FUNNEL'}else{'RUNTIME_LAYER'};Write-GetraLog HEALTH $failure "confirmed failure $($state.ConsecutiveFailures)/$FailureThreshold" FAIL ((Get-Date)-$started).TotalSeconds;$last=if($state.LastRecoveryUtc){[datetime]::Parse($state.LastRecoveryUtc).ToUniversalTime()}else{[datetime]::MinValue};$cooldownDone=([datetime]::UtcNow-$last).TotalMinutes -ge $CooldownMinutes;if($state.ConsecutiveFailures -ge $FailureThreshold -and $cooldownDone){$state.LastRecoveryUtc=[datetime]::UtcNow.ToString('o');$state|ConvertTo-Json|Set-Content -LiteralPath $statePath -Encoding UTF8;& (Join-Path $PSScriptRoot 'start-getra-judging.ps1') -AllowVmReset;if($LASTEXITCODE -eq 0){$state.ConsecutiveFailures=0}}}
  $state|ConvertTo-Json|Set-Content -LiteralPath $statePath -Encoding UTF8
} finally {if($held){$mutex.ReleaseMutex()};$mutex.Dispose()}
