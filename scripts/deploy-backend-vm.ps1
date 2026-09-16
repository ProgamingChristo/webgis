. .\ops\getra-judging-common.ps1
$ip = Resolve-GetraVmAddress

Write-Host "Updating release.env with current SHA 697ac3f..."
$setShaCmd = "sed -i 's/GETRA_RELEASE_SHA=.*/GETRA_RELEASE_SHA=697ac3f/' /home/getra/phase10d-qa/release.env && cat /home/getra/phase10d-qa/release.env"
$r = Invoke-GetraSsh $ip $setShaCmd
Write-Host ($r.Output -join "`n")

Write-Host "Building getra-backend-full on VM..."
$buildCmd = "cd /home/getra/getra-full-product-10e && docker compose --env-file /home/getra/phase10d-qa/release.env -p getra-full-product-10e -f docs/qa/phase10d/compose.yml build getra-backend-full"
$rBuild = Invoke-GetraSsh $ip $buildCmd
Write-Host ($rBuild.Output -join "`n")

Write-Host "Recreating backend container..."
$upCmd = "cd /home/getra/getra-full-product-10e && docker compose --env-file /home/getra/phase10d-qa/release.env -p getra-full-product-10e -f docs/qa/phase10d/compose.yml up -d --no-build getra-backend-full"
$rUp = Invoke-GetraSsh $ip $upCmd
Write-Host ($rUp.Output -join "`n")
