; MineuQR Connector — Inno Setup (metadata generated from connector-product/release/connector-release.json)
#include "generated\connector-installer-metadata.iss.inc"

#define MyAppExeName "MineuQRConnectorTray.ps1"

[Setup]
AppId={#MyAppId}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppCopyright={#MyAppCopyright}
AppSupportURL={#MyAppSupportURL}
AppUpdatesURL={#MyAppSupportURL}
VersionInfoCompany={#MyAppPublisher}
VersionInfoDescription={#MyAppName}
VersionInfoProductName={#MyAppName}
VersionInfoProductVersion={#MyAppVersion}
VersionInfoCopyright={#MyAppCopyright}
DefaultDirName={autopf}\MineuQR\Connector
DisableProgramGroupPage=yes
OutputBaseFilename={#MyOutputBaseFilename}
Compression=lzma
SolidCompression=yes
PrivilegesRequired=admin

[Files]
Source: "..\..\dist\connector\*"; DestDir: "{app}"; Flags: recursesubdirs
Source: "install-service.ps1"; DestDir: "{app}\windows"; Flags: ignoreversion
Source: "uninstall-service.ps1"; DestDir: "{app}\windows"; Flags: ignoreversion
Source: "MineuQRConnectorTray.ps1"; DestDir: "{app}\windows"; Flags: ignoreversion
Source: "..\..\connector-product\release\connector-release.json"; DestDir: "{app}"; Flags: ignoreversion

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
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "DisplayVersion"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "URLInfoAbout"; ValueData: "{#MyAppSupportURL}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "UninstallString"; ValueData: "{uninstallexe}"; Flags: uninsdeletekey
