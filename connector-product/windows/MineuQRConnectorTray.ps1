# MineuQR Connector — Windows tray helper (manages service, enrollment, logs)
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$ServiceName = "MineuQRConnector"
$StatusUrl = "http://127.0.0.1:9477/status"
$LogPath = Join-Path $env:ProgramData "MineuQR\connector\connector.log"
$InstallDir = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent

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
    "connecting" { return "Connecting…" }
    default { return "Offline" }
  }
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

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 5000
$timer.Add_Tick({
  $status = Get-ConnectorStatus
  $label = Get-StatusLabel $status
  $version = if ($status) { $status.version } else { "?" }
  $statusItem.Text = "MineuQR Connector v$version — $label"
  $notify.Text = "MineuQR Connector — $label"
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
  $code = [Microsoft.VisualBasic.Interaction]::InputBox("Enter the pairing code from your MineuQR dashboard.", "MineuQR Connector")
  if ([string]::IsNullOrWhiteSpace($code)) { return }
  $api = Read-Host "Enter your MineuQR server URL (e.g. https://your-restaurant.mineuqr.com)"
  if ([string]::IsNullOrWhiteSpace($api)) { return }
  $enrollScript = Join-Path $InstallDir "rlc-enroll.mjs"
  if (-not (Test-Path $enrollScript)) {
    [System.Windows.Forms.MessageBox]::Show("Enrollment tool not found.")
    return
  }
  & node $enrollScript --token $code --api $api
  [System.Windows.Forms.MessageBox]::Show("Pairing submitted. Restarting service…")
  try { Restart-Service -Name $ServiceName -Force } catch {}
})

$exitItem.Add_Click({
  $notify.Visible = $false
  $timer.Stop()
  [System.Windows.Forms.Application]::Exit()
})

[System.Windows.Forms.Application]::Run()
