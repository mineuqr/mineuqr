# MineuQR Connector — Windows service uninstall helper
param(
  [string]$InstallDir = "$env:ProgramFiles\MineuQR\Connector"
)

$ErrorActionPreference = "Stop"
$ServiceName = "MineuQRConnector"
$ServiceHostExe = Join-Path $InstallDir "windows\service-host\MineuQRConnectorService.exe"

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Status -eq 'Running') { Stop-Service -Name $ServiceName -Force }
  if (Test-Path -LiteralPath $ServiceHostExe) {
    & $ServiceHostExe uninstall 2>&1 | Out-Null
  } else {
    sc.exe delete $ServiceName | Out-Null
  }
}

if (Test-Path $InstallDir) {
  Remove-Item -Recurse -Force $InstallDir
}

Write-Host "MineuQR Connector service removed."
