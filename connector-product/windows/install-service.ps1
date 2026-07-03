# MineuQR Connector — Windows service install helper
param(
  [string]$InstallDir = "$env:ProgramFiles\MineuQR\Connector",
  [string]$NodePath = ""
)

$ErrorActionPreference = "Stop"
$ServiceName = "MineuQRConnector"
$ServiceDisplay = "MineuQR Connector"
$Entry = Join-Path $InstallDir "rlc-service.mjs"
$LogDir = Join-Path $env:ProgramData "MineuQR\connector"
$ServiceHostDir = Join-Path $InstallDir "windows\service-host"
$ServiceHostExe = Join-Path $ServiceHostDir "MineuQRConnectorService.exe"
$ServiceHostXml = Join-Path $ServiceHostDir "MineuQRConnectorService.xml"

function Resolve-NodeExecutable([string]$PreferredPath) {
  if ($PreferredPath) {
    if (-not (Test-Path -LiteralPath $PreferredPath)) {
      throw "Node.js executable not found at preferred path: $PreferredPath"
    }
    return (Resolve-Path -LiteralPath $PreferredPath).ProviderPath
  }

  $candidates = @(
    (Join-Path $env:ProgramFiles "nodejs\node.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "nodejs\node.exe"),
    (Join-Path $env:LocalAppData "Programs\node\node.exe")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      return (Resolve-Path -LiteralPath $candidate).ProviderPath
    }
  }

  $toolcacheRoots = @()
  if ($env:RUNNER_TOOL_CACHE) {
    $toolcacheRoots += (Join-Path $env:RUNNER_TOOL_CACHE "node")
  }
  $toolcacheRoots += "C:\hostedtoolcache\windows\node"

  foreach ($root in $toolcacheRoots) {
    if (-not (Test-Path -LiteralPath $root)) { continue }
    $matches = Get-ChildItem -Path $root -Filter "node.exe" -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -match '\\x64\\node\.exe$' } |
      Sort-Object FullName -Descending
    if ($matches) {
      return $matches[0].FullName
    }
  }

  throw "Node.js executable not found. Install Node.js to a standard location or pass -NodePath with the full path to node.exe."
}

function Invoke-ScExe([string[]]$Arguments) {
  $scExe = Join-Path $env:windir "system32\sc.exe"
  $sysnativeScExe = Join-Path $env:windir "sysnative\sc.exe"
  if (Test-Path -LiteralPath $sysnativeScExe) {
    $scExe = $sysnativeScExe
  }

  $output = & $scExe @Arguments 2>&1
  $exitCode = $LASTEXITCODE
  return [ordered]@{
    exitCode = $exitCode
    output   = ($output | Out-String).Trim()
  }
}

function Assert-ScSuccess([hashtable]$Result, [string]$Operation) {
  if ($Result.exitCode -ne 0 -or $Result.output -match '\bFAILED\b') {
    throw "${Operation} failed (exit $($Result.exitCode)): $($Result.output)"
  }
}

function Assert-ServiceRegistered([string]$Name) {
  $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
  if ($service) {
    return $service
  }

  $query = Invoke-ScExe @("query", $Name)
  throw "Service registration verification failed for ${Name}: $($query.output)"
}

function Escape-Xml([string]$Value) {
  return [System.Security.SecurityElement]::Escape($Value)
}

function Invoke-ServiceHost([string]$Exe, [string]$Command) {
  $output = & $Exe $Command 2>&1
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "Service host ${Command} failed (exit ${exitCode}): $(($output | Out-String).Trim())"
  }
  return ($output | Out-String).Trim()
}

function Wait-ConnectorServiceRunning([string]$Name, [int]$TimeoutSeconds = 60) {
  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    $service = Get-Service -Name $Name -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq 'Running') {
      return $service
    }
    Start-Sleep -Seconds 1
  }

  $final = Get-Service -Name $Name -ErrorAction SilentlyContinue
  $lastStatus = if ($final) { $final.Status } else { "NotRegistered" }
  throw "Timed out waiting for ${Name} to reach Running state (last status: ${lastStatus})"
}

function Remove-ExistingConnectorService {
  $existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
  if (-not $existing) {
    return
  }

  if ($existing.Status -eq 'Running') {
    Stop-Service -Name $ServiceName -Force
  }

  if (Test-Path -LiteralPath $ServiceHostExe) {
    try {
      Invoke-ServiceHost -Exe $ServiceHostExe -Command "uninstall"
    } catch {
      $deleteResult = Invoke-ScExe @("delete", $ServiceName)
      Assert-ScSuccess $deleteResult "sc.exe delete"
    }
  } else {
    $deleteResult = Invoke-ScExe @("delete", $ServiceName)
    Assert-ScSuccess $deleteResult "sc.exe delete"
  }

  Start-Sleep -Seconds 2
}

function Write-ConnectorServiceHostConfig(
  [string]$NodeExe,
  [string]$EntryPath,
  [string]$InstallDirectory,
  [string]$LogDirectory
) {
  $hostLogDir = Join-Path $LogDirectory "service-host"
  New-Item -ItemType Directory -Force -Path $hostLogDir | Out-Null

  $xml = @"
<service>
  <id>$ServiceName</id>
  <name>$(Escape-Xml $ServiceDisplay)</name>
  <description>MineuQR restaurant printing connector service</description>
  <executable>$(Escape-Xml $NodeExe)</executable>
  <arguments>"$(Escape-Xml $EntryPath)"</arguments>
  <workingdirectory>$(Escape-Xml $InstallDirectory)</workingdirectory>
  <logpath>$(Escape-Xml $hostLogDir)</logpath>
  <log mode="roll-by-size">
    <sizeThreshold>10240</sizeThreshold>
    <keepFiles>8</keepFiles>
  </log>
  <onfailure action="restart" delay="60 sec"/>
  <onfailure action="restart" delay="60 sec"/>
  <onfailure action="none"/>
</service>
"@

  Set-Content -Path $ServiceHostXml -Value $xml -Encoding UTF8
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path -LiteralPath $Entry)) {
  throw "Missing service entry at $Entry"
}

if (-not (Test-Path -LiteralPath $ServiceHostExe)) {
  throw "Missing service host executable at $ServiceHostExe"
}

$NodeExe = Resolve-NodeExecutable -PreferredPath $NodePath
Remove-ExistingConnectorService
Write-ConnectorServiceHostConfig -NodeExe $NodeExe -EntryPath $Entry -InstallDirectory $InstallDir -LogDirectory $LogDir

Invoke-ServiceHost -Exe $ServiceHostExe -Command "install"
Assert-ServiceRegistered -Name $ServiceName | Out-Null

$service = Get-Service -Name $ServiceName
if ($service.Status -eq 'Stopped') {
  Invoke-ServiceHost -Exe $ServiceHostExe -Command "start"
}

Wait-ConnectorServiceRunning -Name $ServiceName | Out-Null

Write-Host "MineuQR Connector service installed and started."
Write-Host "Service host: $ServiceHostExe"
Write-Host "Node executable: $NodeExe"
Write-Host "Connector entry: $Entry"
exit 0
