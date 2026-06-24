<#
.SYNOPSIS
  THERMAL-PRINTING-13I.6D - Verify print agent service health and recovery.
#>
[CmdletBinding()]
param(
  [string] $ServiceName = "MineuQRPrintAgent",
  [string] $HealthUrl = "https://print.mineuqr.com/health",
  [switch] $TestRecovery
)

$ErrorActionPreference = "Stop"

function Get-PrintHostHealth {
  param([string] $Url)
  return Invoke-RestMethod -Uri $Url -Method Get
}

Write-Host "[verify] Service: $ServiceName"
$svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if (-not $svc) {
  throw "Service $ServiceName is not installed. Run install-print-agent-service.ps1 as Administrator."
}
Write-Host "[verify] Status: $($svc.Status)  StartType: $($svc.StartType)"

$health = Get-PrintHostHealth -Url $HealthUrl
Write-Host "[verify] Print Host health: $($health | ConvertTo-Json -Compress)"

if ($health.agents.online -lt 1) {
  Write-Warning "[verify] Agent not online on Print Host. Check logs in $env:ProgramData\MineuQR\logs"
}

if ($TestRecovery) {
  Write-Host "[verify] Recovery test - stopping agent processes"
  Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like "*print-agent.ts*" -or $_.CommandLine -like "*print-agent-service.cmd*" } |
    ForEach-Object {
      Write-Host "[verify] Stopping PID $($_.ProcessId)"
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }

  Start-Sleep -Seconds 12
  $svcAfter = Get-Service -Name $ServiceName
  $healthAfter = Get-PrintHostHealth -Url $HealthUrl
  Write-Host "[verify] Service after kill: $($svcAfter.Status)"
  Write-Host "[verify] Health after kill: $($healthAfter | ConvertTo-Json -Compress)"

  if ($svcAfter.Status -ne "Running") {
    throw "Service did not recover to Running"
  }
  if ($healthAfter.agents.online -lt 1) {
    throw "Agent did not reconnect after recovery test"
  }
  Write-Host "[verify] Recovery test PASSED"
}
