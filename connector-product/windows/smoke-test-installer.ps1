# MineuQR Connector — installer smoke test (PRINT-RELEASE-AUTOMATION-1)
param(
  [Parameter(Mandatory = $true)][string]$InstallerPath,
  [Parameter(Mandatory = $true)][string]$ExpectedVersion,
  [Parameter(Mandatory = $true)][string]$ExpectedProductName,
  [int]$StatusPort = 9477,
  [int]$StartupTimeoutSeconds = 90
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Message) {
  Write-Host "[smoke] $Message"
}

if (-not (Test-Path $InstallerPath)) {
  throw "Installer not found: $InstallerPath"
}

$uninstallKey = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"
$serviceName = "MineuQRConnector"

function Remove-ConnectorInstallation {
  if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
  if ((Get-Service -Name $serviceName).Status -eq 'Running') {
      Stop-Service -Name $serviceName -Force -ErrorAction SilentlyContinue
    }
    sc.exe delete $serviceName | Out-Null
    Start-Sleep -Seconds 2
  }

  if (Test-Path $uninstallKey) {
    $uninstallExe = (Get-ItemProperty $uninstallKey).UninstallString
    if ($uninstallExe) {
      $exe = $uninstallExe -replace '"',''
      if (Test-Path $exe) {
        & $exe /VERYSILENT /NORESTART | Out-Null
        Start-Sleep -Seconds 5
      }
    }
  }
}

try {
  Write-Step "Cleaning any prior installation"
  Remove-ConnectorInstallation

  Write-Step "Installing connector silently"
  $installProcess = Start-Process -FilePath $InstallerPath -ArgumentList "/VERYSILENT", "/NORESTART" -PassThru -Wait
  if ($installProcess.ExitCode -ne 0) {
    throw "Installer exited with code $($installProcess.ExitCode)"
  }

  Write-Step "Waiting for connector health endpoint"
  $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
  $health = $null
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri "http://127.0.0.1:$StatusPort/status" -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        $health = $response.Content | ConvertFrom-Json
        break
      }
    } catch {
      Start-Sleep -Seconds 2
    }
  }

  if (-not $health) {
    throw "Connector health endpoint did not become ready on port $StatusPort"
  }

  if ($health.version -ne $ExpectedVersion) {
    throw "Health version mismatch: expected $ExpectedVersion got $($health.version)"
  }
  if ($health.productName -ne $ExpectedProductName) {
    throw "Health product mismatch: expected $ExpectedProductName got $($health.productName)"
  }
  if ($health.serviceStatus -ne "running") {
    throw "Connector serviceStatus expected running, got $($health.serviceStatus)"
  }

  Write-Step "Health verification passed"
  Write-Step "Smoke test succeeded for version $ExpectedVersion"
}
finally {
  Write-Step "Uninstalling connector"
  Remove-ConnectorInstallation
}
