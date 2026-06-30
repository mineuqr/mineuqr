# MineuQR Connector — EV code signing integration (release step; no secrets in repository)
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$ArtifactPath = $null,
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

$envFile = $SigningEnvFile
if (-not $envFile) {
  $candidate = Join-Path $RepoRoot "connector-product\release\signing.env"
  if (Test-Path $candidate) { $envFile = $candidate }
}

if ($envFile) {
  Import-SigningEnv -Path $envFile
}

$signtool = $env:CONNECTOR_SIGNTOOL_PATH
if (-not $signtool) {
  $found = Get-Command signtool.exe -ErrorAction SilentlyContinue
  if ($found) { $signtool = $found.Source }
}
if (-not $signtool -or -not (Test-Path $signtool)) {
  throw "signtool.exe not found. Set CONNECTOR_SIGNTOOL_PATH or install Windows SDK."
}

$timestampUrl = $env:CONNECTOR_SIGNING_TIMESTAMP_URL
if ([string]::IsNullOrWhiteSpace($timestampUrl)) {
  throw "CONNECTOR_SIGNING_TIMESTAMP_URL is required (see signing.env.example)."
}

if (-not $ArtifactPath) {
  $installerName = node (Join-Path $RepoRoot "scripts\connector-release-installer-name.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Failed to resolve installer name from canonical manifest" }
  $manifestPath = Join-Path $RepoRoot "connector-product\release\connector-release.json"
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $ArtifactPath = Join-Path $RepoRoot "dist\connector-release\$($manifest.version)\$installerName"
}

if (-not (Test-Path $ArtifactPath)) {
  throw "Artifact not found: $ArtifactPath"
}

$signArgs = @("sign", "/fd", "SHA256", "/tr", $timestampUrl, "/td", "SHA256")

if ($env:CONNECTOR_SIGNING_CERT_SHA1) {
  $signArgs += @("/sha1", $env:CONNECTOR_SIGNING_CERT_SHA1)
} elseif ($env:CONNECTOR_SIGNING_PFX_PATH) {
  if (-not (Test-Path $env:CONNECTOR_SIGNING_PFX_PATH)) {
    throw "PFX not found at CONNECTOR_SIGNING_PFX_PATH"
  }
  $signArgs += @("/f", $env:CONNECTOR_SIGNING_PFX_PATH)
  if ($env:CONNECTOR_SIGNING_CERT_PASSWORD) {
    $signArgs += @("/p", $env:CONNECTOR_SIGNING_CERT_PASSWORD)
  }
} else {
  throw "Configure CONNECTOR_SIGNING_CERT_SHA1 or CONNECTOR_SIGNING_PFX_PATH in signing.env (never commit secrets)."
}

$signArgs += $ArtifactPath
Write-Host "Signing $ArtifactPath"
& $signtool @signArgs
if ($LASTEXITCODE -ne 0) { throw "signtool sign failed with exit code $LASTEXITCODE" }
Write-Host "Signing complete."

node (Join-Path $RepoRoot "scripts\connector-release-finalize.mjs")
if ($LASTEXITCODE -ne 0) { throw "connector-release-finalize failed after signing" }
Write-Host "Release metadata refreshed after signing."
