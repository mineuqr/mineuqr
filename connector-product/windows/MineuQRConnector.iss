; MineuQR Connector — Inno Setup (metadata generated from connector-product/release/connector-release.json)
#include "generated\connector-installer-metadata.iss.inc"

#define MyAppExeName "MineuQRConnectorTray.ps1"

[Setup]
AppId={{{#MyAppId}}}
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
Source: "service-host\MineuQRConnectorService.exe"; DestDir: "{app}\windows\service-host"; Flags: ignoreversion
Source: "service-host\WINSW-NOTICE.txt"; DestDir: "{app}\windows\service-host"; Flags: ignoreversion
Source: "..\..\connector-product\release\connector-release.json"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{autoprograms}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\{#MyAppExeName}"""; WorkingDir: "{app}"
Name: "{userstartup}\{#MyAppName}"; Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\{#MyAppExeName}"""; Tasks: startupicon

[Tasks]
Name: "startupicon"; Description: "Start tray app when Windows starts"; GroupDescription: "Additional options:"

[UninstallRun]
Filename: "powershell.exe"; Parameters: "-ExecutionPolicy Bypass -File ""{app}\windows\uninstall-service.ps1"" -InstallDir ""{app}"""; Flags: runhidden

[Registry]
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "DisplayName"; ValueData: "{#MyAppName}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "DisplayVersion"; ValueData: "{#MyAppVersion}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "Publisher"; ValueData: "{#MyAppPublisher}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "URLInfoAbout"; ValueData: "{#MyAppSupportURL}"; Flags: uninsdeletekey
Root: HKLM; Subkey: "Software\Microsoft\Windows\CurrentVersion\Uninstall\MineuQRConnector"; ValueType: string; ValueName: "UninstallString"; ValueData: "{uninstallexe}"; Flags: uninsdeletekey

[Code]
procedure ExitProcess(uExitCode: UINT);
  external 'ExitProcess@kernel32.dll stdcall';

function InstallConnectorService: Boolean;
var
  ResultCode: Integer;
  PowerShell: String;
  Params: String;
begin
  Result := False;
  if IsWin64 then
    PowerShell := ExpandConstant('{win}\Sysnative\WindowsPowerShell\v1.0\powershell.exe')
  else
    PowerShell := ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe');
  Params := '-ExecutionPolicy Bypass -File "' + ExpandConstant('{app}\windows\install-service.ps1') + '" -InstallDir "' + ExpandConstant('{app}') + '"';
  Log('Installing MineuQR Connector service.');
  if Exec(PowerShell, Params, '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    Log('install-service.ps1 exit code: ' + IntToStr(ResultCode));
    if ResultCode = 0 then
      Result := True;
  end
  else
    Log('Failed to launch install-service.ps1');
end;

procedure CurStepChanged(CurStep: TSetupStep);
begin
  if CurStep = ssPostInstall then
  begin
    if not InstallConnectorService then
    begin
      Log('MineuQR Connector service registration failed; aborting installation.');
      ExitProcess(1);
    end;
  end;
end;
