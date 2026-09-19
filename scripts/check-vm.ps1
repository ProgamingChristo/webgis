. .\ops\getra-judging-common.ps1
$ip = Resolve-GetraVmAddress
Write-Host "Resolved VM IP: $ip"
$r = Invoke-GetraSsh $ip "docker ps; cat /home/getra/phase10d-qa/release.env"
Write-Host ($r.Output -join "`n")
