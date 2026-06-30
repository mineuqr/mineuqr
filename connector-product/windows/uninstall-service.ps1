# MineuQR Connector — Windows service uninstall helper
param(
  [string]$InstallDir = "$env:ProgramFiles\MineuQR\Connector"
)

$ErrorActionPreference = "Stop"
$ServiceName = "MineuQRConnector"

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Status -eq 'Running') { Stop-Service -Name $ServiceName -Force }
  sc.exe delete $ServiceName | Out-Null
}

if (Test-Path $InstallDir) {
  Remove-Item -Recurse -Force $InstallDir
}

Write-Host "MineuQR Connector service removed."
