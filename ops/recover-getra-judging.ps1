[CmdletBinding()]
param([switch]$HealthWatch, [int]$FailureThreshold = 3, [int]$CooldownMinutes = 10)
& (Join-Path $PSScriptRoot 'recover-getra-runtime.ps1') -HealthWatch:$HealthWatch -FailureThreshold $FailureThreshold -CooldownMinutes $CooldownMinutes
exit $LASTEXITCODE
