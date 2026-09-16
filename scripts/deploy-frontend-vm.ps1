. .\ops\getra-judging-common.ps1
$ip = Resolve-GetraVmAddress

Write-Host "Building getra-frontend-full on VM..."
$buildCmd = "cd /home/getra/getra-full-product-10e && docker compose --env-file /home/getra/phase10d-qa/release.env -p getra-full-product-10e -f docs/qa/phase10d/compose.yml build getra-frontend-full"
$rBuild = Invoke-GetraSsh $ip $buildCmd
Write-Host ($rBuild.Output -join "`n")

Write-Host "Recreating frontend container..."
$upCmd = "cd /home/getra/getra-full-product-10e && docker compose --env-file /home/getra/phase10d-qa/release.env -p getra-full-product-10e -f docs/qa/phase10d/compose.yml up -d --no-build getra-frontend-full"
$rUp = Invoke-GetraSsh $ip $upCmd
Write-Host ($rUp.Output -join "`n")

Write-Host "Waiting for containers to be healthy..."
Start-Sleep -Seconds 8
$psCmd = "cd /home/getra/getra-full-product-10e && docker ps --format '{{.Names}} : {{.Image}} : {{.Status}}'"
$rPs = Invoke-GetraSsh $ip $psCmd
Write-Host ($rPs.Output -join "`n")
