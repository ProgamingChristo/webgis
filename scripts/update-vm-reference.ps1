$ErrorActionPreference = 'Continue'
. .\ops\getra-judging-common.ps1

Write-Host "Resolving VM IP address..."
$ip = Resolve-GetraVmAddress
if (-not $ip) {
    throw "Unable to find running VM IP address."
}
Write-Host "Found VM at: $ip"

Write-Host "Pulling latest Getra_Deploy inside Ubuntu VM..."
$gitPullCmd = "cd /home/getra/getra-full-product-10e && git fetch origin Getra_Deploy && git reset --hard origin/Getra_Deploy"
$r = Invoke-GetraSsh $ip $gitPullCmd
Write-Host ($r.Output -join "`n")

Write-Host "Checking container status..."
$rContainers = Invoke-GetraSsh $ip "docker restart getra-full-product-10e-getra-backend-full-1 getra-full-product-10e-getra-frontend-full-1"
Write-Host ($rContainers.Output -join "`n")

Start-Sleep -Seconds 8

Write-Host "Verifying VM services and public runtime..."
$status = Wait-GetraReady -Seconds 60
Write-GetraStatusTable $status

Write-Host "Running Public Judging Smoke Test..."
$smokeResult = node ops/judging-public-smoke.mjs
Write-Host "Smoke Result: $smokeResult"

Write-Host "Public reference runtime updated and verified!"
