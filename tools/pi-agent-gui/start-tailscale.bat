@echo off
setlocal EnableExtensions

set "TOOL_DIR=%~dp0"
set "PI_AGENT_GUI_HOST=0.0.0.0"
set "PI_AGENT_GUI_PORT=3002"
set "PI_AGENT_GUI_APPROVE=1"
if not defined PI_AGENT_GUI_TARGET set "PI_AGENT_GUI_TARGET=%TOOL_DIR%..\.."

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found in PATH. Install Node.js before starting Pi Agent GUI.
  pause
  exit /b 1
)

where pi >nul 2>nul
if errorlevel 1 (
  echo Pi command was not found in PATH.
  echo Install it first:
  echo npm install -g --ignore-scripts @earendil-works/pi-coding-agent
  pause
  exit /b 1
)

echo Checking for existing Pi Agent GUI server...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process | Where-Object { $_.ProcessId -ne $PID -and $_.CommandLine -like '*pi-agent-gui*src*server.js*' } | ForEach-Object { Write-Host ('Stopping existing PID: ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force }"

set "TAILSCALE_IP="
for /f "tokens=* delims=" %%A in ('tailscale ip -4 2^>nul') do if not defined TAILSCALE_IP set "TAILSCALE_IP=%%A"

echo Starting Pi Agent GUI...
echo Target project: %PI_AGENT_GUI_TARGET%
echo Port: %PI_AGENT_GUI_PORT%
if defined TAILSCALE_IP (
  echo Mobile URL: http://%TAILSCALE_IP%:%PI_AGENT_GUI_PORT%/
) else (
  echo Tailscale IP was not detected. Run "tailscale ip -4" and open:
  echo http://YOUR_TAILSCALE_IP:%PI_AGENT_GUI_PORT%/
)
echo.

pushd "%TOOL_DIR%"
node src\server.js
set "EXIT_CODE=%ERRORLEVEL%"
popd

echo Pi Agent GUI stopped with exit code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%
