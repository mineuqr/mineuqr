# MineuQR Connector — materialize CI signing credentials (no secrets in repository)
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$SigningEnvFile = $null
)

$ErrorActionPreference = "Stop"

function Import-SigningEnv {
  param([string]$Path)
  if (-not (Test-Path $Path)) {
    throw "Signing env file not found: $Path"
  }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*#' -or $_ -match '^\s*$') { return }
    $pair = $_ -split '=', 2
    if ($pair.Count -eq 2) {
      $name = $pair[0].Trim()
      $value = $pair[1].Trim()
      if ($name) { Set-Item -Path "env:$name" -Value $value }
    }
  }
}

if ($env:CONNECTOR_SIGNING_PFX_BASE64) {
  $pfxBytes = [Convert]::FromBase64String($env:CONNECTOR_SIGNING_PFX_BASE64)
  $tempRoot = if ($env:RUNNER_TEMP) { $env:RUNNER_TEMP } else { [System.IO.Path]::GetTempPath() }
  $pfxPath = Join-Path $tempRoot "mineuqr-connector-signing.pfx"
  [System.IO.File]::WriteAllBytes($pfxPath, $pfxBytes)
  $env:CONNECTOR_SIGNING_PFX_PATH = $pfxPath
  Write-Host "Prepared signing PFX at $pfxPath"
}

if ([string]::IsNullOrWhiteSpace($env:CONNECTOR_SIGNING_TIMESTAMP_URL)) {
  $env:CONNECTOR_SIGNING_TIMESTAMP_URL = "http://timestamp.digicert.com"
}

$envFile = $SigningEnvFile
if (-not $envFile) {
  $candidate = Join-Path $RepoRoot "connector-product\release\signing.env"
  if (Test-Path $candidate) { $envFile = $candidate }
}

if ($envFile) {
  Import-SigningEnv -Path $envFile
}

$hasStoreCert = -not [string]::IsNullOrWhiteSpace($env:CONNECTOR_SIGNING_CERT_SHA1)
$hasPfx = -not [string]::IsNullOrWhiteSpace($env:CONNECTOR_SIGNING_PFX_PATH)

if (-not $hasStoreCert -and -not $hasPfx) {
  throw "Code signing credentials are not configured. Set CONNECTOR_SIGNING_PFX_BASE64 (CI secret) or CONNECTOR_SIGNING_CERT_SHA1 / CONNECTOR_SIGNING_PFX_PATH (release machine)."
}

if ($hasPfx -and -not (Test-Path -LiteralPath $env:CONNECTOR_SIGNING_PFX_PATH)) {
  throw "Signing PFX not found at CONNECTOR_SIGNING_PFX_PATH"
}

if ([string]::IsNullOrWhiteSpace($env:CONNECTOR_SIGNING_TIMESTAMP_URL)) {
  throw "CONNECTOR_SIGNING_TIMESTAMP_URL is required."
}

Write-Host "Code signing credentials prepared."
