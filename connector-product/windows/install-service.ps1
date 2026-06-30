# MineuQR Connector — Windows service install helper
param(
  [string]$InstallDir = "$env:ProgramFiles\MineuQR\Connector",
  [string]$NodePath = "node"
)

$ErrorActionPreference = "Stop"
$ServiceName = "MineuQRConnector"
$ServiceDisplay = "MineuQR Connector"
$Entry = Join-Path $InstallDir "rlc-service.mjs"
$LogDir = Join-Path $env:ProgramData "MineuQR\connector"

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path $Entry)) {
  throw "Missing service entry at $Entry"
}

$binPath = "`"$NodePath`" `"$Entry`""
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Status -eq 'Running') { Stop-Service -Name $ServiceName -Force }
  sc.exe delete $ServiceName | Out-Null
  Start-Sleep -Seconds 2
}

sc.exe create $ServiceName binPath= $binPath start= auto DisplayName= "$ServiceDisplay" | Out-Null
sc.exe description $ServiceName "MineuQR restaurant printing connector service" | Out-Null
sc.exe failure $ServiceName reset= 86400 actions= restart/60000/restart/60000/restart/60000 | Out-Null
Start-Service -Name $ServiceName

Write-Host "MineuQR Connector service installed and started."
