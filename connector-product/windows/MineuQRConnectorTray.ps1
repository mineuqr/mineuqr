# MineuQR Connector — Windows tray helper (manages service, enrollment, logs)
# Requires STA PowerShell host (see MineuQRConnector.iss shortcut and post-install launch).
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName Microsoft.VisualBasic

$ServiceName = "MineuQRConnector"
$StatusUrl = "http://127.0.0.1:9477/status"
$LogPath = Join-Path $env:ProgramData "MineuQR\connector\connector.log"
$ConfigPath = Join-Path $env:ProgramData "MineuQR\connector\config.json"
$InstallDir = Split-Path $PSScriptRoot -Parent

function Get-ConnectorStatus {
  try {
    return Invoke-RestMethod -Uri $StatusUrl -TimeoutSec 3
  } catch {
    return $null
  }
}

function Get-StatusLabel($status) {
  if (-not $status) { return "Service unavailable" }
  if (-not $status.enrolled) { return "Setup required" }
  switch ($status.connectionStatus) {
    "connected" { return "Connected" }
    "connecting" { return "Connecting..." }
    default { return "Offline" }
  }
}

function Show-EnrollmentError([string]$Message) {
  [System.Windows.Forms.MessageBox]::Show(
    $Message,
    "MineuQR Connector - Enrollment failed",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
}

function Invoke-ConnectorEnrollment {
  $code = [Microsoft.VisualBasic.Interaction]::InputBox(
    "Enter the pairing code from your MineuQR dashboard.",
    "MineuQR Connector"
  )
  if ([string]::IsNullOrWhiteSpace($code)) {
    return $false
  }

  $api = [Microsoft.VisualBasic.Interaction]::InputBox(
    "Enter your MineuQR server URL (for example https://your-restaurant.mineuqr.com).",
    "MineuQR Connector"
  )
  if ([string]::IsNullOrWhiteSpace($api)) {
    Show-EnrollmentError "Server URL is required to complete enrollment."
    return $false
  }

  $enrollScript = Join-Path $InstallDir "rlc-enroll.mjs"
  if (-not (Test-Path -LiteralPath $enrollScript)) {
    Show-EnrollmentError "Enrollment tool not found at:`n$enrollScript"
    return $false
  }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Show-EnrollmentError "Node.js was not found on PATH. Install Node.js and try again."
    return $false
  }

  $output = & node $enrollScript --token $code.Trim() --api $api.Trim() 2>&1
  $exitCode = $LASTEXITCODE
  $outputText = ($output | Out-String).Trim()

  if ($exitCode -ne 0) {
    $detail = if ($outputText) { $outputText } else { "Enrollment command exited with code $exitCode." }
    Show-EnrollmentError $detail
    return $false
  }

  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    Show-EnrollmentError "Enrollment reported success but configuration was not saved to:`n$ConfigPath"
    return $false
  }

  try {
    Restart-Service -Name $ServiceName -Force -ErrorAction Stop
  } catch {
    Show-EnrollmentError "Enrollment saved but the connector service could not be restarted:`n$($_.Exception.Message)"
    return $false
  }

  [System.Windows.Forms.MessageBox]::Show(
    "MineuQR Connector is enrolled. The service has been restarted.",
    "MineuQR Connector",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  ) | Out-Null
  return $true
}

function Test-ApartmentState {
  return [System.Threading.Thread]::CurrentThread.GetApartmentState() -eq [System.Threading.ApartmentState]::STA
}

if (-not (Test-ApartmentState)) {
  [System.Windows.Forms.MessageBox]::Show(
    "MineuQR Connector tray must run in STA mode.`n`nLaunch with:`npowershell.exe -STA -ExecutionPolicy Bypass -File `"$PSCommandPath`"",
    "MineuQR Connector",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
  exit 1
}

$notify = New-Object System.Windows.Forms.NotifyIcon
$notify.Icon = [System.Drawing.SystemIcons]::Application
$notify.Visible = $true
$notify.Text = "MineuQR Connector"

$menu = New-Object System.Windows.Forms.ContextMenuStrip
$statusItem = New-Object System.Windows.Forms.ToolStripMenuItem
$statusItem.Enabled = $false
$openSettings = New-Object System.Windows.Forms.ToolStripMenuItem
$openSettings.Text = "Open settings folder"
$openLogs = New-Object System.Windows.Forms.ToolStripMenuItem
$openLogs.Text = "View logs"
$restartService = New-Object System.Windows.Forms.ToolStripMenuItem
$restartService.Text = "Restart service"
$pairItem = New-Object System.Windows.Forms.ToolStripMenuItem
$pairItem.Text = "Enter pairing code"
$exitItem = New-Object System.Windows.Forms.ToolStripMenuItem
$exitItem.Text = "Exit tray"

$menu.Items.AddRange(@($statusItem, $openSettings, $openLogs, $restartService, $pairItem, $exitItem))
$notify.ContextMenuStrip = $menu

$script:EnrollmentPromptShown = $false

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({
  $status = Get-ConnectorStatus
  $label = Get-StatusLabel $status
  $version = if ($status) { $status.version } else { "?" }
  $statusItem.Text = "MineuQR Connector v$version - $label"
  $notify.Text = "MineuQR Connector - $label"

  if (-not $script:EnrollmentPromptShown -and $status -and -not $status.enrolled) {
    $script:EnrollmentPromptShown = $true
    $notify.ShowBalloonTip(
      15000,
      "MineuQR Connector",
      "Setup required. Right-click the tray icon and choose Enter pairing code.",
      [System.Windows.Forms.ToolTipIcon]::Info
    )
  }
})
$timer.Start()

$openSettings.Add_Click({
  $dir = Join-Path $env:ProgramData "MineuQR\connector"
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  Start-Process explorer.exe $dir
})

$openLogs.Add_Click({
  if (Test-Path $LogPath) { Start-Process notepad.exe $LogPath } else { [System.Windows.Forms.MessageBox]::Show("No log file yet.") }
})

$restartService.Add_Click({
  try {
    Restart-Service -Name $ServiceName -Force
    [System.Windows.Forms.MessageBox]::Show("Service restarted.")
  } catch {
    [System.Windows.Forms.MessageBox]::Show("Could not restart service. It may not be installed yet.")
  }
})

$pairItem.Add_Click({
  [void](Invoke-ConnectorEnrollment)
})

$exitItem.Add_Click({
  $notify.Visible = $false
  $timer.Stop()
  [System.Windows.Forms.Application]::Exit()
})

$initialStatus = Get-ConnectorStatus
if ($initialStatus -and -not $initialStatus.enrolled) {
  $script:EnrollmentPromptShown = $true
  $result = [System.Windows.Forms.MessageBox]::Show(
    "Enter your MineuQR pairing code to link this computer to your restaurant.",
    "MineuQR Connector - Setup",
    [System.Windows.Forms.MessageBoxButtons]::OKCancel,
    [System.Windows.Forms.MessageBoxIcon]::Information
  )
  if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
    [void](Invoke-ConnectorEnrollment)
  }
}

[System.Windows.Forms.Application]::Run()
