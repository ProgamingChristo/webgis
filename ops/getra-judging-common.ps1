$script:GetraVmPath='D:\VMware\Getra-Routing\Getra-Routing.vmx'
$script:GetraVmrun='C:\Program Files (x86)\VMware\VMware Workstation\vmrun.exe'
$script:GetraSsh=Join-Path $env:WINDIR 'System32\OpenSSH\ssh.exe'
$script:GetraCurl=Join-Path $env:WINDIR 'System32\curl.exe'
$script:GetraKnownHosts=Join-Path $env:LOCALAPPDATA 'GETRA\RuntimeSupervisor\known_hosts'
$script:GetraHostName='getra-routing-api.tail0ed517.ts.net'
$script:GetraPublicApi='https://getra-routing-api.tail0ed517.ts.net'
$script:GetraPublicWeb='https://getra-routing-api.tail0ed517.ts.net:8443'
$script:GetraMonitoring='D:\getra docs\Production docs\Runtime_Monitoring'
$script:GetraContainers=@('getra-valhalla-1','getra-full-product-10e-getra-backend-full-1','getra-full-product-10e-getra-frontend-full-1')

function Write-GetraLog([string]$Kind,[string]$Component,[string]$Action,[string]$Result,[double]$DurationSeconds=0){
  New-Item -ItemType Directory -Force -Path $script:GetraMonitoring|Out-Null
  $path=Join-Path $script:GetraMonitoring $(if($Kind -eq 'HEALTH'){'judging-24h-health.log'}else{'judging-24h-recovery.log'})
  $safe=$Action -replace '[\r\n]',' ' -replace '[^A-Za-z0-9 _./:=+-]','?'
  Add-Content -LiteralPath $path -Encoding UTF8 -Value ('{0} kind={1} component={2} action="{3}" result={4} duration_seconds={5}' -f (Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK'),$Kind,$Component,$safe,$Result,[Math]::Round($DurationSeconds,1))
}
function Get-GetraSshOptions([string]$Address){@('-F','NUL','-T','-o','BatchMode=yes','-o','ConnectionAttempts=1','-o','ConnectTimeout=5','-o','ServerAliveInterval=5','-o','ServerAliveCountMax=2','-o','StrictHostKeyChecking=yes','-o',("UserKnownHostsFile=$script:GetraKnownHosts"),'-o','GlobalKnownHostsFile=NUL','-o','HostKeyAlias=getra-routing-runtime','-o','CheckHostIP=no','-o','ControlMaster=no','-o','LogLevel=ERROR',("getra@$Address"))}
function Invoke-GetraSsh([string]$Address,[string]$Command){
  $encoded=[Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes(($Command -replace "`r`n","`n")))
  $options=@(Get-GetraSshOptions $Address)
  $prev = $ErrorActionPreference
  $ErrorActionPreference = 'SilentlyContinue'
  try {
    $output = & $script:GetraSsh @options "echo '$encoded' | base64 -d | bash 2>/dev/null" 2>$null
    return [pscustomobject]@{ExitCode=$LASTEXITCODE;Output=@($output)}
  } finally {
    $ErrorActionPreference = $prev
  }
}
function Test-GetraSsh([string]$Address){if(-not $Address){return $false};$options=@(Get-GetraSshOptions $Address);$prev=$ErrorActionPreference;$ErrorActionPreference='SilentlyContinue';try{& $script:GetraSsh @options true 2>$null;return $LASTEXITCODE -eq 0}finally{$ErrorActionPreference=$prev}}
function Resolve-GetraVmAddress{
  $candidates=[Collections.Generic.List[string]]::new();$seen=@{}
  foreach($value in @(& $script:GetraVmrun getGuestIPAddress $script:GetraVmPath 2>$null)){$ip=([string]$value).Trim();if($ip -match '^192\.168\.47\.[0-9]{1,3}$' -and -not $seen[$ip]){$seen[$ip]=$true;$candidates.Add($ip)}}
  $vmx=Get-Content -LiteralPath $script:GetraVmPath -Raw;$match=[regex]::Match($vmx,'(?im)^ethernet0\.(?:generatedAddress|address)\s*=\s*"(?<mac>[0-9a-f:-]+)"')
  if($match.Success){$mac=$match.Groups['mac'].Value.Replace(':','-').ToUpperInvariant();foreach($neighbor in @(Get-NetNeighbor -InterfaceAlias 'VMware Network Adapter VMnet8' -AddressFamily IPv4 -ErrorAction SilentlyContinue)){if($neighbor.LinkLayerAddress -and $neighbor.LinkLayerAddress.Replace(':','-').ToUpperInvariant() -eq $mac -and -not $seen[$neighbor.IPAddress]){$seen[$neighbor.IPAddress]=$true;$candidates.Add([string]$neighbor.IPAddress)}}}
  foreach($candidate in $candidates){if(Test-GetraSsh $candidate){return $candidate}};return $null
}
function Test-GetraUrl([string]$Url,[int]$TimeoutSeconds=15){
  try {
    $p = Start-Process -FilePath $script:GetraCurl -ArgumentList @('-4','--fail','--silent','--output','NUL','--max-time',"$TimeoutSeconds",$Url) -NoNewWindow -Wait -PassThru
    return $p.ExitCode -eq 0
  } catch { return $false }
}
function Test-GetraDns{try{return @(Resolve-DnsName -Name $script:GetraHostName -Type A -ErrorAction Stop).Count -gt 0}catch{return $false}}
function Get-GetraGuestStatus([string]$Address){
  $command=@'
echo "docker=$(systemctl is-active docker 2>/dev/null || true)"
echo "docker_enabled=$(systemctl is-enabled docker 2>/dev/null || true)"
echo "tailscale=$(systemctl is-active tailscaled 2>/dev/null || true)"
echo "tailscale_enabled=$(systemctl is-enabled tailscaled 2>/dev/null || true)"
echo "node=$(tailscale status --json 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin).get("Self",{}).get("DNSName",""))' 2>/dev/null || true)"
echo "tailnet=$(tailscale status --json 2>/dev/null | python3 -c 'import json,sys;print(json.load(sys.stdin).get("BackendState",""))' 2>/dev/null || true)"
for pair in valhalla:getra-valhalla-1 backend:getra-full-product-10e-getra-backend-full-1 frontend:getra-full-product-10e-getra-frontend-full-1; do key=${pair%%:*}; c=${pair#*:}; echo "$key=$(docker inspect $c --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' 2>/dev/null || true)"; echo "${key}_restart=$(docker inspect $c --format '{{.HostConfig.RestartPolicy.Name}}' 2>/dev/null || true)"; done
echo "valhalla_http=$(curl -s --max-time 6 http://127.0.0.1:8002/status >/dev/null 2>&1 && echo pass || echo fail)"
health=$(curl -s --max-time 8 http://127.0.0.1:3002/api/health 2>/dev/null || true); echo "backend_http=$(test -n "$health" && echo pass || echo fail)"; echo "$health"|grep -q connected && echo database=pass || echo database=fail
probe=$(printf '%s' 'fetch("http://valhalla:8002/status").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'|base64 -w0); docker exec getra-full-product-10e-getra-backend-full-1 sh -lc "echo $probe|base64 -d|node" >/dev/null 2>&1 && echo backend_valhalla=pass || echo backend_valhalla=fail
echo "frontend_http=$(curl -s --max-time 8 http://127.0.0.1:3003/login >/dev/null 2>&1 && echo pass || echo fail)"
funnel=$(tailscale funnel status 2>/dev/null || true); echo "$funnel"|grep -q 'https://getra-routing-api.tail0ed517.ts.net ' && echo funnel443=pass || echo funnel443=fail; echo "$funnel"|grep -q 'https://getra-routing-api.tail0ed517.ts.net:8443' && echo funnel8443=pass || echo funnel8443=fail
ss -lnt|grep -q '127.0.0.1:8002 ' && echo private8002=pass || echo private8002=fail
'@
  $response=Invoke-GetraSsh $Address $command;$map=@{};foreach($line in $response.Output){if([string]$line -match '^(?<key>[a-z0-9_]+)=(?<value>.*)$'){$map[$Matches.key]=$Matches.value.Trim()}};return $map
}
function Get-GetraStatus{
  $network=@(Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue|Where-Object{$_.InterfaceAlias -notlike '*VMware*'}).Count -gt 0;$internet=Test-GetraUrl 'https://www.microsoft.com/' 6;$dns=Test-GetraDns;$running=$false
  if(Test-Path -LiteralPath $script:GetraVmrun){$running=@(& $script:GetraVmrun list 2>$null) -contains $script:GetraVmPath};$address=if($running){Resolve-GetraVmAddress}else{$null};$guest=if($address){Get-GetraGuestStatus $address}else{@{}}
  $localBackend=Test-GetraUrl 'http://127.0.0.1:8080/api/health' 5;$localFrontend=Test-GetraUrl 'http://127.0.0.1:3000/login' 5;$publicBackend=$dns -and (Test-GetraUrl "$script:GetraPublicApi/api/health" 10);$publicWeb=$dns -and (Test-GetraUrl "$script:GetraPublicWeb/" 10);$publicLogin=$dns -and (Test-GetraUrl "$script:GetraPublicWeb/login" 10)
  [ordered]@{Network=$network;Internet=$internet;DNS=$dns;VM=$running;VmIp=$address;Guest=$guest;Tailscale=($guest.tailnet -eq 'Running' -and $guest.tailscale -eq 'active');Identity=($guest.node -eq "$script:GetraHostName.");Funnel=($guest.funnel443 -eq 'pass' -and $guest.funnel8443 -eq 'pass');Valhalla=($guest.valhalla_http -eq 'pass');BackendGuest=($guest.backend_http -eq 'pass');FrontendGuest=($guest.frontend_http -eq 'pass');Database=($guest.database -eq 'pass');BackendValhalla=($guest.backend_valhalla -eq 'pass');LocalBackend=$localBackend;LocalFrontend=$localFrontend;PublicBackend=$publicBackend;PublicWeb=$publicWeb;PublicLogin=$publicLogin}
}
function Start-GetraLocalTunnel([string]$Address){
  if((Test-GetraUrl 'http://127.0.0.1:3000/login' 3) -and (Test-GetraUrl 'http://127.0.0.1:8080/api/health' 3)){return $true}
  $matches=@(Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue|Where-Object{$_.CommandLine -like '*HostKeyAlias=getra-routing-runtime*' -and ($_.CommandLine -like '*127.0.0.1:3000:127.0.0.1:3003*' -or $_.CommandLine -like '*127.0.0.1:8080:127.0.0.1:3002*')});foreach($process in $matches){Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue}
  $args=@('-F','NUL','-T','-N','-o','BatchMode=yes','-o','ExitOnForwardFailure=yes','-o','ConnectTimeout=8','-o','ServerAliveInterval=15','-o','ServerAliveCountMax=3','-o','StrictHostKeyChecking=yes','-o',("UserKnownHostsFile=$script:GetraKnownHosts"),'-o','GlobalKnownHostsFile=NUL','-o','HostKeyAlias=getra-routing-runtime','-o','CheckHostIP=no','-o','ControlMaster=no','-o','LogLevel=ERROR','-L','127.0.0.1:3000:127.0.0.1:3003','-L','127.0.0.1:8080:127.0.0.1:3002',("getra@$Address"));Start-Process -FilePath $script:GetraSsh -ArgumentList $args -WindowStyle Hidden|Out-Null
  for($i=0;$i -lt 10;$i++){Start-Sleep 1;if((Test-GetraUrl 'http://127.0.0.1:3000/login' 3) -and (Test-GetraUrl 'http://127.0.0.1:8080/api/health' 3)){return $true}};return $false
}
function Start-GetraContainers([string]$Address){
  $names=$script:GetraContainers -join ' '
  $command=@'
for c in __CONTAINERS__; do
  test "$(docker inspect "$c" --format '{{.State.Running}}' 2>/dev/null)" = true || docker start "$c" >/dev/null
done
'@
  [void](Invoke-GetraSsh $Address ($command.Replace('__CONTAINERS__',$names)))
}
function Restore-GetraFunnel([string]$Address){$r=Invoke-GetraSsh $Address "tailscale funnel --bg --yes --https=443 http://127.0.0.1:3002 >/dev/null`ntailscale funnel --bg --yes --https=8443 http://127.0.0.1:3003 >/dev/null";return $r.ExitCode -eq 0}
function Wait-GetraReady([int]$Seconds=120){$deadline=(Get-Date).AddSeconds($Seconds);do{$status=Get-GetraStatus;if($status.VM -and $status.Tailscale -and $status.Identity -and $status.Funnel -and $status.Valhalla -and $status.BackendGuest -and $status.FrontendGuest -and $status.Database -and $status.BackendValhalla -and $status.LocalBackend -and $status.LocalFrontend -and $status.PublicBackend -and $status.PublicWeb -and $status.PublicLogin){return $status};Start-Sleep 5}while((Get-Date) -lt $deadline);return $status}
function Write-GetraStatusTable($Status,[string]$Routing='NOT_RUN',[string]$AI='NOT_RUN'){
  function Mark([bool]$v){if($v){'PASS'}else{'FAIL'}}
  Write-Output 'GETRA RECOVERY'
  Write-Output ('Network ........ {0}' -f (Mark $Status.Network))
  Write-Output ('Tailscale ...... {0}' -f (Mark $Status.Tailscale))
  Write-Output ('DNS ............ {0}' -f (Mark $Status.DNS))
  Write-Output ('Valhalla ....... {0}' -f (Mark $Status.Valhalla))
  Write-Output ('Backend ........ {0}' -f (Mark ($Status.BackendGuest -and $Status.LocalBackend)))
  Write-Output ('Frontend ....... {0}' -f (Mark ($Status.FrontendGuest -and $Status.LocalFrontend)))
  Write-Output ('Funnel ......... {0}' -f (Mark $Status.Funnel))
  Write-Output ('Public frontend  {0}' -f (Mark $Status.PublicWeb))
  Write-Output ('Public login .... {0}' -f (Mark $Status.PublicLogin))
  Write-Output ('Public API ...... {0}' -f (Mark $Status.PublicBackend))
  if($Routing -ne 'NOT_RUN'){Write-Output ('Routing ........ {0}' -f $Routing)}
  if($AI -ne 'NOT_RUN'){Write-Output ('AI ............. {0}' -f $AI)}
}
