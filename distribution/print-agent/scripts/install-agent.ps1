#Requires -RunAsAdministrator
<#
.SYNOPSIS
  THERMAL-PRINTING-13I.2C-2 - Install MineuQR Print Agent service from distribution package.

.PARAMETER PackageRoot
  Extracted MineuQR-Print-Agent folder. Defaults to parent of the scripts directory.

.PARAMETER ConfigPath
  Active agent JSON config. Defaults to config\mineuqr-agent-config.json under package root.

.PARAMETER NssmPath
  Path to nssm.exe. Defaults to scripts\tools\nssm.exe then PATH.

.PARAMETER ServiceName
  Windows service name. Default: MineuQRPrintAgent
#>
[CmdletBinding()]
param(
  [string] $PackageRoot = "",
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
"@
}

function Assert-ProductionConfig {
  param([string] $Path)
  if (-not (Test-Path $Path)) {
    throw "Agent config not found: $Path`nDownload mineuqr-agent-config.json from the dashboard and save it to config\mineuqr-agent-config.json"
  }
  $raw = Get-Content -Raw -Path $Path
  if ($raw -match '127\.0\.0\.1|localhost') {
    throw "Config appears to target localhost: $Path"
  }
  if ($raw -notmatch 'wss://') {
    throw "Config must use wss:// Print Host URL: $Path"
  }
}

if (-not $PackageRoot) {
  $PackageRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
} else {
  $PackageRoot = (Resolve-Path $PackageRoot).Path
}

$AgentRoot = Join-Path $PackageRoot "agent"
if (-not (Test-Path (Join-Path $AgentRoot "agent.mjs"))) {
  throw "Agent bundle not found at $AgentRoot\agent.mjs"
}

if (-not $ConfigPath) {
  $ConfigPath = Join-Path $PackageRoot "config\mineuqr-agent-config.json"
}
$ConfigPath = (Resolve-Path $ConfigPath).Path
Assert-ProductionConfig -Path $ConfigPath

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  throw "Node.js 20+ is required on PATH."
}

$wrapper = Join-Path $PSScriptRoot "print-agent-service.cmd"
if (-not (Test-Path $wrapper)) {
  throw "Service wrapper missing: $wrapper"
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
& $nssm set $ServiceName AppDirectory $AgentRoot
& $nssm set $ServiceName DisplayName "MineuQR Print Agent"
& $nssm set $ServiceName Description "MineuQR thermal print agent - distribution package"
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
Write-Host "[install] Agent: $AgentRoot"
Write-Host "[install] Logs: $logDir"
