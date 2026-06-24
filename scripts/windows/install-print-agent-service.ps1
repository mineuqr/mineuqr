#Requires -RunAsAdministrator
<#
.SYNOPSIS
  THERMAL-PRINTING-13I.6D - Install MineuQR Print Agent as a Windows service (NSSM).

.PARAMETER InstallRoot
  MineuQR repository root on the POS host.

.PARAMETER ConfigPath
  Production agent JSON config (must not use localhost validation URLs).

.PARAMETER NssmPath
  Path to nssm.exe. Defaults to scripts/windows/tools/nssm.exe then PATH.

.PARAMETER ServiceName
  Windows service name. Default: MineuQRPrintAgent

.PARAMETER ServiceAccount
  Optional DOMAIN\User or .\User for printer spooler access. Default: LocalSystem.
#>
[CmdletBinding()]
param(
  [string] $InstallRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string] $ConfigPath = "",
  [string] $NssmPath = "",
  [string] $ServiceName = "MineuQRPrintAgent",
  [string] $ServiceAccount = ""
)

$ErrorActionPreference = "Stop"

function Resolve-NssmPath {
  param([string] $Explicit)
  if ($Explicit -and (Test-Path $Explicit)) { return (Resolve-Path $Explicit).Path }
  $bundled = Join-Path $PSScriptRoot "tools\nssm.exe"
  if (Test-Path $bundled) { return (Resolve-Path $bundled).Path }
  $onPath = Get-Command nssm -ErrorAction SilentlyContinue
  if ($onPath) { return $onPath.Source }
  throw @"
nssm.exe not found.
Download NSSM 2.24 win64 from https://nssm.cc/download
Extract nssm.exe to: $bundled
Or install nssm to PATH and re-run.
"@
}

function Assert-ProductionConfig {
  param([string] $Path)
  if (-not (Test-Path $Path)) {
    throw "Agent config not found: $Path"
  }
  $raw = Get-Content -Raw -Path $Path
  if ($raw -match '127\.0\.0\.1|localhost') {
    throw "Config appears to target localhost validation runtime: $Path`nUse production.print-host config with wss://print.mineuqr.com"
  }
  if ($raw -notmatch 'wss://') {
    throw "Config must use wss:// Print Host URL: $Path"
  }
}

$InstallRoot = (Resolve-Path $InstallRoot).Path
if (-not $ConfigPath) {
  $ConfigPath = Join-Path $InstallRoot "agent\config\production.print-host.example.json"
}
$ConfigPath = (Resolve-Path $ConfigPath).Path
Assert-ProductionConfig -Path $ConfigPath

$wrapper = Join-Path $PSScriptRoot "print-agent-service.cmd"
if (-not (Test-Path $wrapper)) {
  throw "Service wrapper missing: $wrapper"
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js 20+ is required on PATH."
}

$tsxCli = Join-Path $InstallRoot "node_modules\tsx\dist\cli.mjs"
if (-not (Test-Path $tsxCli)) {
  throw "Dependencies missing. Run: cd $InstallRoot; pnpm install --frozen-lockfile"
}

$nssm = Resolve-NssmPath -Explicit $NssmPath
$logDir = Join-Path $env:ProgramData "MineuQR\logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stdoutLog = Join-Path $logDir "print-agent-stdout.log"
$stderrLog = Join-Path $logDir "print-agent-stderr.log"

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host "[install] Stopping existing service $ServiceName"
  & $nssm stop $ServiceName confirm 2>$null | Out-Null
  Start-Sleep -Seconds 2
  & $nssm remove $ServiceName confirm
  Start-Sleep -Seconds 1
}

Write-Host "[install] Registering service $ServiceName"
& $nssm install $ServiceName $wrapper
& $nssm set $ServiceName AppDirectory $InstallRoot
& $nssm set $ServiceName DisplayName "MineuQR Print Agent"
& $nssm set $ServiceName Description "MineuQR thermal print agent - connects to Print Host and executes USB spooler jobs."
& $nssm set $ServiceName Start SERVICE_AUTO_START
& $nssm set $ServiceName AppStdout $stdoutLog
& $nssm set $ServiceName AppStderr $stderrLog
& $nssm set $ServiceName AppStdoutCreationDisposition 4
& $nssm set $ServiceName AppStderrCreationDisposition 4
& $nssm set $ServiceName AppRotateFiles 1
& $nssm set $ServiceName AppRotateBytes 10485760
& $nssm set $ServiceName AppExit Default Restart
& $nssm set $ServiceName AppRestartDelay 5000
& $nssm set $ServiceName AppEnvironmentExtra "PRINT_AGENT_CONFIG_PATH=$ConfigPath"

if ($ServiceAccount) {
  Write-Host "[install] Service logon: $ServiceAccount"
  & $nssm set $ServiceName ObjectName $ServiceAccount
}

Write-Host "[install] Starting service"
& $nssm start $ServiceName

Start-Sleep -Seconds 5
$svc = Get-Service -Name $ServiceName
Write-Host "[install] Service status: $($svc.Status)"
Write-Host "[install] Config: $ConfigPath"
Write-Host "[install] Logs: $logDir"
Write-Host "[install] Verify: curl https://print.mineuqr.com/health"
