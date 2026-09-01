[CmdletBinding()]
param(
  [string]$SourceUrl = "https://download.geofabrik.de/asia/indonesia/java-latest.osm.pbf",
  [string]$DataDirectory = "routing-data",
  [switch]$KeepJavaExtract
)

$ErrorActionPreference = "Stop"
$repositoryRoot = Split-Path -Parent $PSScriptRoot
$targetDirectory = Join-Path $repositoryRoot $DataDirectory
$javaExtract = Join-Path $targetDirectory "java-latest.osm.pbf"
$jabodetabekExtract = Join-Path $targetDirectory "jabodetabek.osm.pbf"

if (-not (Get-Command osmium -ErrorAction SilentlyContinue)) {
  throw "osmium is required. Install osmium-tool and ensure 'osmium' is available on PATH."
}

New-Item -ItemType Directory -Force -Path $targetDirectory | Out-Null

if (-not (Test-Path -LiteralPath $javaExtract)) {
  Write-Host "Downloading the Java OSM extract..."
  Invoke-WebRequest -Uri $SourceUrl -OutFile $javaExtract
}

Write-Host "Clipping the Jabodetabek graph (106.30,-6.90,107.25,-5.85)..."
& osmium extract --bbox 106.30,-6.90,107.25,-5.85 $javaExtract -o $jabodetabekExtract --overwrite
if ($LASTEXITCODE -ne 0) {
  throw "osmium failed with exit code $LASTEXITCODE"
}

$extractInfo = Get-Item -LiteralPath $jabodetabekExtract
if ($extractInfo.Length -lt 1000000) {
  throw "The clipped routing extract is unexpectedly small ($($extractInfo.Length) bytes)."
}

& osmium fileinfo $jabodetabekExtract | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "osmium could not validate the clipped routing extract."
}

if (-not $KeepJavaExtract) {
  Remove-Item -LiteralPath $javaExtract
}

Write-Host "Ready: $jabodetabekExtract ($($extractInfo.Length) bytes)"
