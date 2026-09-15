$stopWatch = [System.Diagnostics.Stopwatch]::StartNew()
Write-Output "Stopping backend container..."
& ssh.exe -o BatchMode=yes -o StrictHostKeyChecking=accept-new getra@192.168.47.131 "docker stop getra-full-product-10e-getra-backend-full-1" | Out-Null

$downCheck = & ssh.exe -o BatchMode=yes -o StrictHostKeyChecking=accept-new getra@192.168.47.131 "curl -s -f --max-time 2 http://127.0.0.1:3002/api/health || echo fail"
Write-Output "Backend status immediately after stop: $downCheck"

Write-Output "Executing recover-getra-judging.ps1..."
& powershell.exe -ExecutionPolicy Bypass -File "D:\Getra_Production\ops\recover-getra-judging.ps1"

$recovered = $false
for ($i = 0; $i -lt 30; $i++) {
    $check = & ssh.exe -o BatchMode=yes -o StrictHostKeyChecking=accept-new getra@192.168.47.131 "curl -s -f --max-time 2 http://127.0.0.1:3002/api/health || echo fail"
    if ($check -match '"status":\s*"ok"') {
        $recovered = $true
        break
    }
    Start-Sleep -Seconds 1
}
$stopWatch.Stop()
$elapsed = [Math]::Round($stopWatch.Elapsed.TotalSeconds, 1)

Write-Output "BACKEND_RECOVERY=$([string]$(if ($recovered) { 'PASS' } else { 'FAIL' }))"
Write-Output "BACKEND_RECOVERY_TIME=${elapsed}s"
