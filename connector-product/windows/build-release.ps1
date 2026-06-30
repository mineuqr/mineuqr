# MineuQR Connector — production release build (Windows)
param(
  [string]$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path,
  [string]$Version = $null
)

$ErrorActionPreference = "Stop"
Push-Location $RepoRoot
try {
  if (-not $Version) {
    $manifestPath = Join-Path $RepoRoot "connector-product\release\connector-release.json"
    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $Version = $manifest.version
  }

  node scripts/connector-release-build.mjs
  if ($LASTEXITCODE -ne 0) { throw "connector-release-build failed" }

  $issPath = Join-Path $RepoRoot "connector-product\windows\MineuQRConnector.iss"
  $iscc = Get-Command iscc.exe -ErrorAction SilentlyContinue
  if (-not $iscc) {
    Write-Host "Inno Setup (iscc.exe) not found. Bundle staged; compile installer manually with:"
    Write-Host "  iscc.exe `"$issPath`""
    exit 0
  }

  & $iscc.Source $issPath
  if ($LASTEXITCODE -ne 0) { throw "Inno Setup compile failed" }

  $installerName = "MineuQR-Connector-$Version-Setup.exe"
  $outputDir = Join-Path $RepoRoot "connector-product\windows\Output"
  $installerPath = Join-Path $outputDir $installerName
  if (-not (Test-Path $installerPath)) {
    throw "Expected installer not found at $installerPath"
  }

  $releaseDir = Join-Path $RepoRoot "dist\connector-release\$Version"
  Copy-Item $installerPath (Join-Path $releaseDir $installerName) -Force
  Write-Host "Installer copied to dist/connector-release/$Version/$installerName"
  Write-Host "Run sign-release.ps1 to sign the installer when signing credentials are available."
} finally {
  Pop-Location
}
