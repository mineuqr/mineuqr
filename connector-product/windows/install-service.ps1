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

function Register-ConnectorService(
  [string]$Name,
  [string]$BinaryPathName,
  [string]$DisplayName
) {
  try {
    New-Service -Name $Name -BinaryPathName $BinaryPathName -DisplayName $DisplayName -StartupType Automatic -ErrorAction Stop | Out-Null
  } catch {
    throw "Service registration failed: $($_.Exception.Message)"
  }
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not (Test-Path -LiteralPath $Entry)) {
  throw "Missing service entry at $Entry"
}

$NodeExe = Resolve-NodeExecutable -PreferredPath $NodePath
$binaryPathName = "`"$NodeExe`" `"$Entry`""

$existing = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existing) {
  if ($existing.Status -eq 'Running') { Stop-Service -Name $ServiceName -Force }
  $deleteResult = Invoke-ScExe @("delete", $ServiceName)
  Assert-ScSuccess $deleteResult "sc.exe delete"
  Start-Sleep -Seconds 2
}

Register-ConnectorService -Name $ServiceName -BinaryPathName $binaryPathName -DisplayName $ServiceDisplay
Assert-ServiceRegistered -Name $ServiceName | Out-Null

$descriptionResult = Invoke-ScExe @(
  "description", $ServiceName, "MineuQR restaurant printing connector service"
)
Assert-ScSuccess $descriptionResult "sc.exe description"

$failureResult = Invoke-ScExe @(
  "failure", $ServiceName,
  "reset= 86400",
  "actions= restart/60000/restart/60000/restart/60000"
)
Assert-ScSuccess $failureResult "sc.exe failure"

try {
  Start-Service -Name $ServiceName -ErrorAction Stop
} catch {
  throw "Start-Service failed for ${ServiceName}: $($_.Exception.Message)"
}

Write-Host "MineuQR Connector service installed and started."
Write-Host "Node executable: $NodeExe"
Write-Host "Service binary path: $binaryPathName"
