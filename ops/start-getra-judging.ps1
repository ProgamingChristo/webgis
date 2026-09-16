[CmdletBinding()]
param([switch]$AllowVmReset, [switch]$DeepSmoke, [int]$NetworkWaitSeconds = 120)
& (Join-Path $PSScriptRoot 'start-getra-runtime.ps1') -DeepSmoke:$DeepSmoke -NetworkWaitSeconds $NetworkWaitSeconds
exit $LASTEXITCODE
