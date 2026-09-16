. .\ops\getra-judging-common.ps1
$ip = Resolve-GetraVmAddress
$r = Invoke-GetraSsh $ip "cat /home/getra/phase10d-qa/release.env"
Write-Host ($r.Output -join "`n")
