# MineuQR Connector — installer smoke test (PRINT-RELEASE-AUTOMATION-1)
# SMOKE-DIAGNOSTICS-ENHANCEMENT-1 — passive operational diagnostics only
param(
  [Parameter(Mandatory = $true)][string]$InstallerPath,
  [Parameter(Mandatory = $true)][string]$ExpectedVersion,
  [Parameter(Mandatory = $true)][string]$ExpectedProductName,
  [int]$StatusPort = 9477,
  [int]$StartupTimeoutSeconds = 90,
  [string]$DiagnosticsDir = ""
)

$ErrorActionPreference = "Stop"

$script:ServiceName = "MineuQRConnector"
$script:UninstallKey = "HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"
$script:ConnectorLogPath = Join-Path $env:ProgramData "MineuQR\connector\connector.log"
$script:SmokeWindowStart = Get-Date
$script:Timeline = [System.Collections.Generic.List[object]]::new()
$script:HttpDiagnostics = [System.Collections.Generic.List[object]]::new()
$script:InstallerDiagnostics = @{}
$script:FailureReason = $null

if (-not $DiagnosticsDir) {
  $DiagnosticsDir = Join-Path $env:TEMP "mineuqr-smoke-diagnostics"
}

function Write-Step([string]$Message) {
  Write-Host "[smoke] $Message"
}

function Add-TimelineEvent([string]$Phase, [string]$Detail = "") {
  $entry = [ordered]@{
    timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
    phase        = $Phase
    detail       = $Detail
  }
  $script:Timeline.Add($entry)
  if ($Detail) {
    Write-Step "timeline: $Phase - $Detail"
  } else {
    Write-Step "timeline: $Phase"
  }
}

function Ensure-DiagnosticsDir {
  New-Item -ItemType Directory -Force -Path $DiagnosticsDir | Out-Null
}

function Write-DiagnosticText([string]$FileName, [string]$Content) {
  Ensure-DiagnosticsDir
  $path = Join-Path $DiagnosticsDir $FileName
  Set-Content -Path $path -Value $Content -Encoding UTF8
  return $path
}

function Write-DiagnosticJson([string]$FileName, $Object) {
  Ensure-DiagnosticsDir
  $path = Join-Path $DiagnosticsDir $FileName
  $Object | ConvertTo-Json -Depth 12 | Set-Content -Path $path -Encoding UTF8
  return $path
}

function Get-HttpErrorDetail([System.Exception]$Exception) {
  $detail = [ordered]@{
    message   = $Exception.Message
    type      = $Exception.GetType().FullName
    category  = "unknown"
  }

  if ($Exception -is [System.Net.WebException]) {
    $response = $Exception.Response
    if ($response) {
      $detail.statusCode = [int]$response.StatusCode
      $detail.category = "http_error"
    } elseif ($Exception.Message -match "timed out|timeout") {
      $detail.category = "timeout"
    } elseif ($Exception.Message -match "refused|actively refused") {
      $detail.category = "connection_refused"
    } else {
      $detail.category = "connection_error"
    }
  } elseif ($Exception.Message -match "404") {
    $detail.category = "not_found"
  }

  return $detail
}

function Record-HttpAttempt([string]$Url, [int]$StatusCode = $null, [System.Exception]$Exception = $null) {
  $entry = [ordered]@{
    timestampUtc = (Get-Date).ToUniversalTime().ToString("o")
    url          = $Url
    statusCode   = $StatusCode
    success      = ($StatusCode -eq 200)
  }
  if ($Exception) {
    $entry.error = Get-HttpErrorDetail $Exception
    $category = $entry.error.category
    Write-Step "health-request failed [$category]: $($Exception.Message)"
  } elseif ($StatusCode -and $StatusCode -ne 200) {
    Write-Step "health-request returned HTTP $StatusCode"
  }
  $script:HttpDiagnostics.Add($entry)
}

function Collect-ServiceDiagnostics {
  $result = [ordered]@{
    collectedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    serviceName    = $script:ServiceName
    getService     = $null
    scQuery        = $null
    scQc           = $null
  }

  try {
    $svc = Get-Service -Name $script:ServiceName -ErrorAction SilentlyContinue
    if ($svc) {
      $result.getService = [ordered]@{
        name        = $svc.Name
        displayName = $svc.DisplayName
        status      = $svc.Status.ToString()
        startType   = $svc.StartType.ToString()
        canStop     = $svc.CanStop
        canPause    = $svc.CanPauseAndContinue
      }
    }
  } catch {
    $result.getServiceError = $_.Exception.Message
  }

  $result.scQuery = (& sc.exe query $script:ServiceName 2>&1 | Out-String).Trim()
  $result.scQc = (& sc.exe qc $script:ServiceName 2>&1 | Out-String).Trim()

  Write-DiagnosticJson "service-diagnostics.json" $result
  Write-DiagnosticText "sc-query.txt" $result.scQuery
  Write-DiagnosticText "sc-qc.txt" $result.scQc
  return $result
}

function Collect-ProcessDiagnostics {
  $result = [ordered]@{
    collectedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    processes      = @()
  }

  $nameFilters = @("node", "powershell")
  foreach ($name in $nameFilters) {
    $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
    foreach ($proc in $procs) {
      $cim = $null
      try {
        $cim = Get-CimInstance Win32_Process -Filter "ProcessId=$($proc.Id)" -ErrorAction SilentlyContinue
      } catch {
        # passive collection only
      }
      $result.processes += [ordered]@{
        name            = $proc.ProcessName
        pid             = $proc.Id
        cpu             = $proc.CPU
        startTime       = if ($proc.StartTime) { $proc.StartTime.ToUniversalTime().ToString("o") } else { $null }
        executablePath  = $cim.ExecutablePath
        commandLine     = $cim.CommandLine
      }
    }
  }

  Write-DiagnosticJson "process-diagnostics.json" $result
  return $result
}

function Collect-NodeRuntimeDiagnostics {
  $result = [ordered]@{
    collectedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    nodeCommands   = @()
  }

  $nodeCmd = Get-Command node -ErrorAction SilentlyContinue
  if ($nodeCmd) {
    $versionOutput = (& node --version 2>&1 | Out-String).Trim()
    $result.nodeCommands += [ordered]@{
      source          = "PATH"
      executablePath  = $nodeCmd.Source
      version         = $versionOutput
      definition      = $nodeCmd.Definition
    }
  } else {
    $result.nodeNotFoundOnPath = $true
  }

  $serviceDiagPath = Join-Path $DiagnosticsDir "service-diagnostics.json"
  if (Test-Path $serviceDiagPath) {
    $serviceDiag = Get-Content $serviceDiagPath -Raw | ConvertFrom-Json
    $binaryPath = $serviceDiag.scQc
    if ($binaryPath -match 'BINARY_PATH_NAME\s*:\s*(.+)') {
      $result.serviceBinaryPath = $Matches[1].Trim()
    }
  }

  Write-DiagnosticJson "node-runtime-diagnostics.json" $result
  return $result
}

function Collect-PortDiagnostics {
  $result = [ordered]@{
    collectedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    port           = $StatusPort
    tcpConnections = @()
    netstat        = $null
  }

  try {
    $connections = Get-NetTCPConnection -LocalPort $StatusPort -ErrorAction SilentlyContinue
    foreach ($conn in $connections) {
      $owner = $null
      try {
        $owner = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
      } catch {
        # passive collection only
      }
      $result.tcpConnections += [ordered]@{
        localAddress  = $conn.LocalAddress
        localPort     = $conn.LocalPort
        remoteAddress = $conn.RemoteAddress
        remotePort    = $conn.RemotePort
        state         = $conn.State.ToString()
        owningPid     = $conn.OwningProcess
        owningProcess = if ($owner) { $owner.ProcessName } else { $null }
      }
    }
  } catch {
    $result.tcpConnectionError = $_.Exception.Message
  }

  $result.netstat = (netstat -ano | Select-String ":$StatusPort") | ForEach-Object { $_.Line }
  Write-DiagnosticJson "port-diagnostics.json" $result
  Write-DiagnosticText "netstat-port-$StatusPort.txt" (($result.netstat | Out-String).Trim())
  return $result
}

function Collect-RuntimeLogs {
  $result = [ordered]@{
    collectedAtUtc = (Get-Date).ToUniversalTime().ToString("o")
    logPath        = $script:ConnectorLogPath
    exists         = (Test-Path $script:ConnectorLogPath)
  }

  if ($result.exists) {
    $destName = "connector.log"
    $destPath = Join-Path $DiagnosticsDir $destName
    Ensure-DiagnosticsDir
    Copy-Item -Path $script:ConnectorLogPath -Destination $destPath -Force
    $result.bytes = (Get-Item $destPath).Length
    $result.artifactName = $destName
  }

  Write-DiagnosticJson "runtime-log-metadata.json" $result
  return $result
}

function Collect-EventLogs {
  $endTime = Get-Date
  $result = [ordered]@{
    collectedAtUtc = $endTime.ToUniversalTime().ToString("o")
    windowStartUtc = $script:SmokeWindowStart.ToUniversalTime().ToString("o")
    windowEndUtc   = $endTime.ToUniversalTime().ToString("o")
    logs           = @()
  }

  $targets = @(
    @{ name = "Application"; file = "eventlog-application.json" },
    @{ name = "System"; file = "eventlog-system-service-control.json"; provider = "Service Control Manager" },
    @{ name = "Application"; file = "eventlog-dotnet-runtime.json"; provider = ".NET Runtime" },
    @{ name = "Application"; file = "eventlog-windows-error-reporting.json"; provider = "Windows Error Reporting" }
  )

  foreach ($target in $targets) {
    $entry = [ordered]@{
      logName = $target.name
      file    = $target.file
      events  = @()
    }
    try {
      $filter = @{
        LogName   = $target.name
        StartTime = $script:SmokeWindowStart
        EndTime   = $endTime
      }
      $events = Get-WinEvent -FilterHashtable $filter -ErrorAction SilentlyContinue
      if ($target.provider) {
        $events = $events | Where-Object { $_.ProviderName -eq $target.provider }
      }
      foreach ($event in ($events | Select-Object -First 200)) {
        $entry.events += [ordered]@{
          timeCreatedUtc = $event.TimeCreated.ToUniversalTime().ToString("o")
          id             = $event.Id
          level          = $event.LevelDisplayName
          provider       = $event.ProviderName
          message        = $event.Message
        }
      }
    } catch {
      $entry.error = $_.Exception.Message
    }
    $result.logs += $entry
    Write-DiagnosticJson $target.file $entry
  }

  Write-DiagnosticJson "eventlog-summary.json" $result
  return $result
}

function Export-AllDiagnostics([string]$Stage) {
  Add-TimelineEvent "diagnostics_collect" $Stage
  Collect-ServiceDiagnostics | Out-Null
  Collect-ProcessDiagnostics | Out-Null
  Collect-NodeRuntimeDiagnostics | Out-Null
  Collect-PortDiagnostics | Out-Null
  Collect-RuntimeLogs | Out-Null
  Collect-EventLogs | Out-Null

  Write-DiagnosticJson "installer-diagnostics.json" $script:InstallerDiagnostics
  Write-DiagnosticJson "http-diagnostics.json" @($script:HttpDiagnostics)
  Write-DiagnosticJson "timeline.json" @($script:Timeline)

  $index = [ordered]@{
    program          = "SMOKE-DIAGNOSTICS-ENHANCEMENT-1"
    stage            = $Stage
    collectedAtUtc   = (Get-Date).ToUniversalTime().ToString("o")
    diagnosticsDir   = $DiagnosticsDir
    failureReason    = $script:FailureReason
    installerPath    = $InstallerPath
    expectedVersion  = $ExpectedVersion
    statusPort       = $StatusPort
    startupTimeout   = $StartupTimeoutSeconds
    artifacts        = @(
      "timeline.json",
      "installer-diagnostics.json",
      "service-diagnostics.json",
      "sc-query.txt",
      "sc-qc.txt",
      "process-diagnostics.json",
      "node-runtime-diagnostics.json",
      "port-diagnostics.json",
      "netstat-port-$StatusPort.txt",
      "runtime-log-metadata.json",
      "connector.log",
      "http-diagnostics.json",
      "eventlog-summary.json",
      "eventlog-application.json",
      "eventlog-system-service-control.json",
      "eventlog-dotnet-runtime.json",
      "eventlog-windows-error-reporting.json"
    )
  }
  Write-DiagnosticJson "diagnostics-index.json" $index
  Write-Step "diagnostics exported to $DiagnosticsDir ($Stage)"
}

function Remove-ConnectorInstallation {
  if (Get-Service -Name $script:ServiceName -ErrorAction SilentlyContinue) {
    if ((Get-Service -Name $script:ServiceName).Status -eq 'Running') {
      Stop-Service -Name $script:ServiceName -Force -ErrorAction SilentlyContinue
    }
    sc.exe delete $script:ServiceName | Out-Null
    Start-Sleep -Seconds 2
  }

  if (Test-Path $script:UninstallKey) {
    $uninstallExe = (Get-ItemProperty $script:UninstallKey).UninstallString
    if ($uninstallExe) {
      $exe = $uninstallExe.Trim([char]34)
      if (Test-Path $exe) {
        & $exe /VERYSILENT /NORESTART | Out-Null
        Start-Sleep -Seconds 5
      }
    }
  }
}

if (-not (Test-Path $InstallerPath)) {
  throw "Installer not found: $InstallerPath"
}

try {
  Add-TimelineEvent "smoke_start" "DiagnosticsDir=$DiagnosticsDir"
  Write-Step "Cleaning any prior installation"
  Remove-ConnectorInstallation
  Add-TimelineEvent "cleanup_complete"

  Write-Step "Installing connector silently"
  $installStarted = Get-Date
  $installProcess = Start-Process -FilePath $InstallerPath -ArgumentList "/VERYSILENT", "/NORESTART" -PassThru -Wait
  $installEnded = Get-Date
  $installDurationSeconds = [math]::Round(($installEnded - $installStarted).TotalSeconds, 3)

  $script:InstallerDiagnostics = [ordered]@{
    installerPath          = $InstallerPath
    exitCode               = $installProcess.ExitCode
    durationSeconds        = $installDurationSeconds
    startedAtUtc           = $installStarted.ToUniversalTime().ToString("o")
    completedAtUtc         = $installEnded.ToUniversalTime().ToString("o")
    serviceInstallObserved = $null
  }

  Add-TimelineEvent "installation_complete" "exitCode=$($installProcess.ExitCode); duration=${installDurationSeconds}s"

  if ($installProcess.ExitCode -ne 0) {
    $script:FailureReason = "installer_exit_code_$($installProcess.ExitCode)"
    throw "Installer exited with code $($installProcess.ExitCode)"
  }

  $postInstallService = Collect-ServiceDiagnostics
  $script:InstallerDiagnostics.serviceInstallObserved = [bool]$postInstallService.getService
  Add-TimelineEvent "service_diagnostics_post_install" $(if ($postInstallService.getService) { "service_present" } else { "service_missing" })

  Collect-NodeRuntimeDiagnostics | Out-Null
  Collect-ProcessDiagnostics | Out-Null
  Add-TimelineEvent "process_diagnostics_post_install"

  Write-Step "Waiting for connector health endpoint"
  $deadline = (Get-Date).AddSeconds($StartupTimeoutSeconds)
  $health = $null
  $healthUrl = "http://127.0.0.1:$StatusPort/status"
  Add-TimelineEvent "health_polling_start" $healthUrl

  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 5
      if ($response.StatusCode -eq 200) {
        Record-HttpAttempt -Url $healthUrl -StatusCode $response.StatusCode
        $health = $response.Content | ConvertFrom-Json
        Add-TimelineEvent "health_endpoint_ready" "HTTP 200"
        break
      }
      Record-HttpAttempt -Url $healthUrl -StatusCode $response.StatusCode
    } catch {
      Record-HttpAttempt -Url $healthUrl -Exception $_.Exception
      Start-Sleep -Seconds 2
    }
  }

  if (-not $health) {
    $script:FailureReason = "health_endpoint_timeout"
    Add-TimelineEvent "health_endpoint_timeout" "port=$StatusPort"
    throw "Connector health endpoint did not become ready on port $StatusPort"
  }

  if ($health.version -ne $ExpectedVersion) {
    $script:FailureReason = "health_version_mismatch"
    throw "Health version mismatch: expected $ExpectedVersion got $($health.version)"
  }
  if ($health.productName -ne $ExpectedProductName) {
    $script:FailureReason = "health_product_mismatch"
    throw "Health product mismatch: expected $ExpectedProductName got $($health.productName)"
  }
  if ($health.serviceStatus -ne "running") {
    $script:FailureReason = "health_service_status_$($health.serviceStatus)"
    throw "Connector serviceStatus expected running, got $($health.serviceStatus)"
  }

  Write-Step "Health verification passed"
  Write-Step "Smoke test succeeded for version $ExpectedVersion"
  Add-TimelineEvent "smoke_success"
}
catch {
  if (-not $script:FailureReason) {
    $script:FailureReason = $_.Exception.Message
  }
  Add-TimelineEvent "smoke_failure" $script:FailureReason
  throw
}
finally {
  Export-AllDiagnostics "pre_uninstall"
  Write-Step "Uninstalling connector"
  Remove-ConnectorInstallation
  Add-TimelineEvent "uninstall_complete"
  Export-AllDiagnostics "post_uninstall"
}
