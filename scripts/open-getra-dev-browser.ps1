param(
  [ValidateRange(1, 65535)]
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

$edgeCandidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:LOCALAPPDATA\Microsoft\Edge\Application\msedge.exe"
)
$edgeExecutable = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $edgeExecutable) {
  throw 'Microsoft Edge tidak ditemukan. Gunakan konfigurasi GETRA: Edge tanpa ekstensi di VS Code.'
}

$getraUrl = "http://localhost:$Port/login"
try {
  $null = Invoke-WebRequest -Uri $getraUrl -UseBasicParsing -TimeoutSec 30
} catch {
  throw "Frontend GETRA belum dapat dijangkau di $getraUrl. Jalankan npm run dev terlebih dahulu."
}

# A separate persistent profile prevents an existing normal Edge process from
# reusing the tab with its already-injected React Developer Tools hook.
$getraBrowserProfile = Join-Path $env:LOCALAPPDATA 'GETRA\DevelopmentBrowser'
$null = New-Item -ItemType Directory -Path $getraBrowserProfile -Force
$edgeArguments = @(
  "--user-data-dir=`"$getraBrowserProfile`"",
  '--disable-extensions',
  '--no-first-run',
  '--no-default-browser-check',
  '--new-window',
  $getraUrl
)

# This window is the interactive development browser requested by the user.
Start-Process -FilePath $edgeExecutable -ArgumentList $edgeArguments
Write-Output "GETRA dibuka di $getraUrl dengan profil development tanpa ekstensi."
Write-Output 'Masuk sekali di jendela ini; sesi disimpan pada profil development terpisah.'
