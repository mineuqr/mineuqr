; MineuQR Connector — Inno Setup template (build on Windows release machine)
#define MyAppName "MineuQR Connector"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "MineuQR"
#define MyAppExeName "MineuQRConnectorTray.ps1"

[Setup]
AppId={{A4B8D6F2-9C3E-4F1A-B7D2-8E5F6A1C2D3E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\MineuQR\Connector
DisableProgramGroupPage=yes
OutputBaseFilename=MineuQR-Connector-{#MyAppVersion}-Setup
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "..\..\dist\connector\*"; DestDir: "{app}"; Flags: recursesubdirs
Source: "install-service.ps1"; DestDir: "{app}\windows"; Flags: ignoreversion
Source: "uninstall-service.ps1"; DestDir: "{app}\windows"; Flags: ignoreversion
Source: "MineuQRConnectorTray.ps1"; DestDir: "{app}\windows"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\{#MyAppExeName}"""; WorkingDir: "{app}"
Name: "{userstartup}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\{#MyAppExeName}"""; Tasks: startupicon

[Tasks]
Name: "startupicon"; Description: "Start tray app when Windows starts"; GroupDescription: "Additional options:"

[Run]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\install-service.ps1"" -InstallDir ""{app}"""; StatusMsg: "Installing MineuQR Connector service..."; Flags: runhidden

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\uninstall-service.ps1"" -InstallDir ""{app}"""; Flags: runhidden

[Registry]
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "DisplayName"; ValueData: "{#MyAppName}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "UninstallString"; ValueData: "{uninstallexe}"; Flags: uninsdeletekey
