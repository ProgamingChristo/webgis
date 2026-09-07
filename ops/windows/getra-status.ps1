[CmdletBinding()]
param(
  [string]$VmPath = "D:\VMware\Getra-Routing\Getra-Routing.vmx",
  [string]$VmAddress = "192.168.47.131",
  [string]$SshUser = "getra"
)

$ErrorActionPreference = "Stop"
$vmrun = "C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe"
$ssh = "$SshUser@$VmAddress"

function Test-Ssh {
  & ssh.exe -o BatchMode=yes -o ConnectTimeout=5 $ssh "true" 2>$null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-Path -LiteralPath $vmrun)) {
  throw "vmrun.exe was not found at the approved VMware Workstation path."
}

$runningVms = & $vmrun list
$vmRunning = $runningVms -contains $VmPath
$sshReady = $vmRunning -and (Test-Ssh)
$remoteStatus = @()

if ($sshReady) {
  $remoteCommand = @'
echo "ubuntu_network=$(ip route show default | grep -q '^default ' && getent hosts controlplane.tailscale.com >/dev/null 2>&1 && echo online || echo offline)"
echo "docker=$(systemctl is-active docker 2>/dev/null || true)"
echo "tailscale=$(systemctl is-active tailscaled 2>/dev/null || true)"
echo "frontend=$(docker inspect getra-full-product-10e-getra-frontend-full-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
echo "backend=$(docker inspect getra-full-product-10e-getra-backend-full-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
echo "valhalla=$(docker inspect getra-valhalla-1 --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"
echo "database=$(curl --fail --silent --max-time 12 http://127.0.0.1:3002/api/health >/dev/null && echo connected || echo unavailable)"
echo "provider=$(curl --fail --silent --max-time 12 http://127.0.0.1:8002/status >/dev/null && echo reachable || echo unavailable)"
echo "provider_dns=$(docker exec getra-full-product-10e-getra-backend-full-1 getent hosts valhalla >/dev/null 2>&1 && echo resolved || echo unavailable)"
# The payload is a small Node fetch probe, encoded to survive PowerShell/SSH quoting.
if echo 'ZmV0Y2goImh0dHA6Ly92YWxoYWxsYTo4MDAyL3N0YXR1cyIpLnRoZW4ocj0+cHJvY2Vzcy5leGl0KHIub2s/MDoxKSkuY2F0Y2goKCk9PnByb2Nlc3MuZXhpdCgxKSk=' | base64 -d | docker exec -i getra-full-product-10e-getra-backend-full-1 node >/dev/null 2>&1; then
  echo "provider_backend=reachable"
else
  echo "provider_backend=unavailable"
fi
echo "tailscale_node=$(tailscale status 2>/dev/null | grep -q getra-routing-api && echo connected || echo unavailable)"
echo "funnel_443=$(tailscale funnel status 2>/dev/null | grep -q 'https://getra-routing-api.tail0ed517.ts.net ' && echo configured || echo unavailable)"
echo "funnel_8443=$(tailscale funnel status 2>/dev/null | grep -q 'https://getra-routing-api.tail0ed517.ts.net:8443' && echo configured || echo unavailable)"
public_ip=$(curl --fail --silent --max-time 10 -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=getra-routing-api.tail0ed517.ts.net&type=A' | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | head -1 || true)
echo "public_dns=$(test -n "$public_ip" && echo resolved || echo unavailable)"
echo "public_backend=$(test -n "$public_ip" && curl --fail --silent --max-time 15 --resolve getra-routing-api.tail0ed517.ts.net:443:$public_ip https://getra-routing-api.tail0ed517.ts.net/api/health >/dev/null && echo reachable || echo unavailable)"
echo "public_frontend=$(test -n "$public_ip" && curl --fail --silent --max-time 15 --resolve getra-routing-api.tail0ed517.ts.net:8443:$public_ip https://getra-routing-api.tail0ed517.ts.net:8443/login >/dev/null && echo reachable || echo unavailable)"
'@
  $remoteStatus = & ssh.exe -o BatchMode=yes -o ConnectTimeout=5 $ssh $remoteCommand
}

$publicBackend = $remoteStatus -contains "public_backend=reachable"
$publicFrontend = $remoteStatus -contains "public_frontend=reachable"
$requiredRemoteStatus = @(
  "ubuntu_network=online",
  "docker=active",
  "tailscale=active",
  "frontend=healthy",
  "backend=healthy",
  "valhalla=healthy",
  "database=connected",
  "provider=reachable",
  "provider_dns=resolved",
  "provider_backend=reachable",
  "tailscale_node=connected",
  "funnel_443=configured",
  "funnel_8443=configured",
  "public_dns=resolved",
  "public_backend=reachable",
  "public_frontend=reachable"
)
$remoteReady = $requiredRemoteStatus.Where({ $remoteStatus -notcontains $_ }).Count -eq 0

Write-Output "GETRA_STATUS"
Write-Output "VM_RUNNING=$($vmRunning.ToString().ToUpperInvariant())"
Write-Output "UBUNTU_SSH=$($sshReady.ToString().ToUpperInvariant())"
$remoteStatus | ForEach-Object { Write-Output $_ }
Write-Output "PUBLIC_BACKEND=$($publicBackend.ToString().ToUpperInvariant())"
Write-Output "PUBLIC_FRONTEND=$($publicFrontend.ToString().ToUpperInvariant())"

if (-not ($vmRunning -and $sshReady -and $remoteReady -and $publicBackend -and $publicFrontend)) {
  exit 1
}
