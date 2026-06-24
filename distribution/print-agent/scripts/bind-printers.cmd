@echo off
REM THERMAL-PRINTING-13I.2E.2 - Interactive printer binding wizard.
setlocal

set "PACKAGE_ROOT=%~dp0.."
set "CONFIG_PATH=%PACKAGE_ROOT%\config\mineuqr-agent-config.json"

if not exist "%CONFIG_PATH%" (
  echo [BindPrinters] Config not found: %CONFIG_PATH% >&2
  echo [BindPrinters] Download mineuqr-agent-config.json from the dashboard first. >&2
  exit /b 1
)

node "%PACKAGE_ROOT%\agent\bind-printers.mjs" --config "%CONFIG_PATH%" %*
