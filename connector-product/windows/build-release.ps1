# MineuQR Connector — production release build (Windows)
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [switch]$SkipFinalize
)

$ErrorActionPreference = "Stop"
Push-Location $RepoRoot
try {
  node scripts/connector-release-build.mjs
  if ($LASTEXITCODE -ne 0) { throw "connector-release-build failed" }

  $installerName = node scripts/connector-release-installer-name.mjs
  if ($LASTEXITCODE -ne 0) { throw "Failed to resolve installer name from canonical manifest" }

  $manifestPath = Join-Path $RepoRoot "connector-product\release\connector-release.json"
  $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
  $releaseDir = Join-Path $RepoRoot "dist\connector-release\$($manifest.version)"

  $issPath = Join-Path $RepoRoot "connector-product\windows\MineuQRConnector.iss"
  $iscc = Get-Command iscc.exe -ErrorAction SilentlyContinue
  if (-not $iscc) {
    throw "Inno Setup (iscc.exe) not found. Install Inno Setup to produce the distributable installer."
  }

  & $iscc.Source $issPath
  if ($LASTEXITCODE -ne 0) { throw "Inno Setup compile failed" }

  $outputDir = Join-Path $RepoRoot "connector-product\windows\Output"
  $installerPath = Join-Path $outputDir $installerName
  if (-not (Test-Path $installerPath)) {
    throw "Expected installer not found at $installerPath"
  }

  Copy-Item $installerPath (Join-Path $releaseDir $installerName) -Force
  Write-Host "Installer copied to dist/connector-release/$($manifest.version)/$installerName"

  if (-not $SkipFinalize) {
    node scripts/connector-release-finalize.mjs
    if ($LASTEXITCODE -ne 0) { throw "connector-release-finalize failed" }
    Write-Host "Release metadata finalized."
  }

  Write-Host "Optional next step: connector-product/windows/sign-release.ps1 (then metadata will refresh again)."
} finally {
  Pop-Location
}
