@echo off
REM THERMAL-PRINTING-13I.2C-2 - Windows service entrypoint (distribution package).
setlocal

set "PACKAGE_ROOT=%~dp0.."
set "AGENT_ROOT=%PACKAGE_ROOT%\agent"
cd /d "%AGENT_ROOT%" || exit /b 1

if not defined PRINT_AGENT_CONFIG_PATH (
  set "PRINT_AGENT_CONFIG_PATH=%PACKAGE_ROOT%\config\mineuqr-agent-config.json"
)

if not exist "%PRINT_AGENT_CONFIG_PATH%" (
  echo [PrintAgentService] Config not found: %PRINT_AGENT_CONFIG_PATH% >&2
  echo [PrintAgentService] Download config from dashboard and save to config\mineuqr-agent-config.json >&2
  exit /b 1
)

set "NODE_EXE=node"
where node >nul 2>&1
if errorlevel 1 (
  echo [PrintAgentService] node.exe not found on PATH. Install Node.js 20+. >&2
  exit /b 1
)

if not exist "%AGENT_ROOT%\agent.mjs" (
  echo [PrintAgentService] Agent bundle missing: %AGENT_ROOT%\agent.mjs >&2
  exit /b 1
)

set NODE_ENV=production
"%NODE_EXE%" "%AGENT_ROOT%\agent.mjs" --config "%PRINT_AGENT_CONFIG_PATH%"
