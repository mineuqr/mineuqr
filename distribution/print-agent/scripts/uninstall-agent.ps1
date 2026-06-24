#Requires -RunAsAdministrator
<#
.SYNOPSIS
  THERMAL-PRINTING-13I.2C-2 - Remove MineuQR Print Agent Windows service (distribution package).
#>
[CmdletBinding()]
param(
  [string] $ServiceName = "MineuQRPrintAgent",
  [string] $NssmPath = ""
)

$ErrorActionPreference = "Stop"

function Resolve-NssmPath {
  param([string] $Explicit)
  if ($Explicit -and (Test-Path $Explicit)) { return (Resolve-Path $Explicit).Path }
  $bundled = Join-Path $PSScriptRoot "tools\nssm.exe"
  if (Test-Path $bundled) { return (Resolve-Path $bundled).Path }
  $onPath = Get-Command nssm -ErrorAction SilentlyContinue
  if ($onPath) { return $onPath.Source }
  throw "nssm.exe not found"
}

$nssm = Resolve-NssmPath -Explicit $NssmPath
$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $existing) {
  Write-Host "[uninstall] Service $ServiceName is not installed."
  exit 0
}

Write-Host "[uninstall] Stopping $ServiceName"
& $nssm stop $ServiceName confirm 2>$null | Out-Null
Start-Sleep -Seconds 2
& $nssm remove $ServiceName confirm
Write-Host "[uninstall] Removed $ServiceName"
