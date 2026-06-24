@echo off
REM THERMAL-PRINTING-13I.6D - Windows service entrypoint for MineuQR Print Agent.
setlocal

set "REPO_ROOT=%~dp0..\.."
cd /d "%REPO_ROOT%" || exit /b 1

if not defined PRINT_AGENT_CONFIG_PATH (
  set "PRINT_AGENT_CONFIG_PATH=%REPO_ROOT%\agent\config\production.print-host.example.json"
)

if not exist "%PRINT_AGENT_CONFIG_PATH%" (
  echo [PrintAgentService] Config not found: %PRINT_AGENT_CONFIG_PATH% >&2
  exit /b 1
)

set "NODE_EXE=node"
where node >nul 2>&1
if errorlevel 1 (
  echo [PrintAgentService] node.exe not found on PATH >&2
  exit /b 1
)

set "TSX_CLI=%REPO_ROOT%\node_modules\tsx\dist\cli.mjs"
if not exist "%TSX_CLI%" (
  echo [PrintAgentService] tsx not installed. Run: pnpm install >&2
  exit /b 1
)

set NODE_ENV=production
"%NODE_EXE%" "%TSX_CLI%" "%REPO_ROOT%\scripts\print-agent.ts" --config "%PRINT_AGENT_CONFIG_PATH%"
