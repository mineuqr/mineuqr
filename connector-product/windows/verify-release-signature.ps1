# MineuQR Connector — Authenticode signature verification (release gate)
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$ArtifactPath = $null
)

$ErrorActionPreference = "Stop"

function Resolve-SigntoolPath {
  $signtool = $env:CONNECTOR_SIGNTOOL_PATH
  if (-not $signtool) {
    $found = Get-Command signtool.exe -ErrorAction SilentlyContinue
    if ($found) { $signtool = $found.Source }
  }
  if (-not $signtool -or -not (Test-Path -LiteralPath $signtool)) {
    $kitsRoot = Join-Path ${env:ProgramFiles(x86)} "Windows Kits\10\bin"
    if (Test-Path -LiteralPath $kitsRoot) {
      $kitsMatch = Get-ChildItem -Path $kitsRoot -Recurse -Filter "signtool.exe" -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match '\\x64\\signtool\.exe$' } |
        Sort-Object FullName -Descending |
        Select-Object -First 1
      if ($kitsMatch) { $signtool = $kitsMatch.FullName }
    }
  }
  if (-not $signtool -or -not (Test-Path -LiteralPath $signtool)) {
    throw "signtool.exe not found. Set CONNECTOR_SIGNTOOL_PATH or install Windows SDK."
  }
  return $signtool
}

if (-not $ArtifactPath) {
  $installerName = node (Join-Path $RepoRoot "scripts\connector-release-installer-name.mjs")
  if ($LASTEXITCODE -ne 0) { throw "Failed to resolve installer name from canonical manifest" }
  $manifestPath = Join-Path $RepoRoot "connector-product\release\connector-release.json"
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $ArtifactPath = Join-Path $RepoRoot "dist\connector-release\$($manifest.version)\$installerName"
}

if (-not (Test-Path -LiteralPath $ArtifactPath)) {
  throw "Artifact not found: $ArtifactPath"
}

$signtool = Resolve-SigntoolPath
Write-Host "Verifying Authenticode signature for $ArtifactPath"

$verifyOutput = & $signtool verify /pa /v /tw $ArtifactPath 2>&1
$verifyExitCode = $LASTEXITCODE
$verifyText = ($verifyOutput | Out-String).Trim()
Write-Host $verifyText

if ($verifyExitCode -ne 0) {
  throw "signtool verify failed with exit code $verifyExitCode"
}

$authenticode = Get-AuthenticodeSignature -FilePath $ArtifactPath
if ($authenticode.Status -ne "Valid") {
  throw "Authenticode signature status is $($authenticode.Status), expected Valid"
}

if (-not $authenticode.SignerCertificate) {
  throw "Authenticode signature is missing signer certificate metadata"
}

if (-not $authenticode.TimeStamperCertificate) {
  throw "Authenticode signature is missing trusted timestamp"
}

Write-Host "Signature publisher: $($authenticode.SignerCertificate.Subject)"
Write-Host "Timestamp authority: $($authenticode.TimeStamperCertificate.Subject)"
Write-Host "Authenticode verification passed."
