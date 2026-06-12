@echo off
setlocal EnableExtensions

set "EXTENSION_VERSION=0.1.11"
set "EXTENSION_DIR=%~dp0"
set "EXTENSION_SOURCE=%~dp0."
set "INSTALL_DIR=%USERPROFILE%\.vscode\extensions\local-tools.vscode-mobile-chat-%EXTENSION_VERSION%"
set "LAUNCH_CONFIG=%TEMP%\vscode-mobile-chat-launch.json"
set "VSIX_FILE=%EXTENSION_DIR%vscode-mobile-chat-%EXTENSION_VERSION%.vsix"
set "VSCODE_MOBILE_CHAT_AUTO_START=1"
set "VSCODE_MOBILE_CHAT_HOST=0.0.0.0"
set "VSCODE_MOBILE_CHAT_PORT=3001"
set "VSCODE_MOBILE_CHAT_REQUIRE_TOKEN=0"
set "INSTALL_EXTENSION=0"

if /I "%~1"=="--install" set "INSTALL_EXTENSION=1"
if /I "%~1"=="/install" set "INSTALL_EXTENSION=1"

where code >nul 2>nul
if errorlevel 1 (
  echo VS Code command line tool "code" was not found in PATH.
  echo Open VS Code, run "Shell Command: Install 'code' command in PATH" if available, or start the extension manually.
  pause
  exit /b 1
)

set "TAILSCALE_IP="
for /f "tokens=* delims=" %%A in ('tailscale ip -4 2^>nul') do if not defined TAILSCALE_IP set "TAILSCALE_IP=%%A"

echo Starting VS Code Mobile Chat...
echo Extension install: %INSTALL_DIR%
echo Port: %VSCODE_MOBILE_CHAT_PORT%
if defined TAILSCALE_IP (
  echo Mobile URL: http://%TAILSCALE_IP%:%VSCODE_MOBILE_CHAT_PORT%/
) else (
  echo Tailscale IP was not detected. Run "tailscale ip -4" and open:
  echo http://YOUR_TAILSCALE_IP:%VSCODE_MOBILE_CHAT_PORT%/
)
echo.

if "%INSTALL_EXTENSION%"=="1" (
  where npx >nul 2>nul
  if errorlevel 1 (
    echo Node.js npx was not found in PATH. Install Node.js or run this from a Node-enabled terminal.
    pause
    exit /b 1
  )

  pushd "%EXTENSION_SOURCE%"
  call npx --yes @vscode/vsce package --allow-missing-repository --allow-star-activation --out "%VSIX_FILE%"
  if errorlevel 1 (
    popd
    echo Failed to package local extension.
    pause
    exit /b 1
  )
  popd

  if not exist "%VSIX_FILE%" (
    echo Failed to package local extension: VSIX file was not created.
    pause
    exit /b 1
  )

  call code --install-extension "%VSIX_FILE%" --force
  if errorlevel 1 (
    echo Failed to install local extension into VS Code.
    pause
    exit /b 1
  )
  del "%VSIX_FILE%" >nul 2>nul
) else (
  call code --list-extensions | findstr /I /C:"local-tools.vscode-mobile-chat" >nul
  if errorlevel 1 (
    echo VS Code Mobile Chat extension is not installed yet.
    echo Run this once: start-tailscale.bat --install
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$config = @{ autoStart = $true; host = $env:VSCODE_MOBILE_CHAT_HOST; port = [int]$env:VSCODE_MOBILE_CHAT_PORT; requireToken = $false; expiresAt = (Get-Date).AddHours(12).ToUniversalTime().ToString('o') }; $json = $config | ConvertTo-Json; [System.IO.File]::WriteAllText($env:LAUNCH_CONFIG, $json, [System.Text.UTF8Encoding]::new($false))"

powershell -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -LocalPort $env:VSCODE_MOBILE_CHAT_PORT -State Listen -ErrorAction SilentlyContinue) { exit 0 } exit 1"
if errorlevel 1 (
  start "" "vscode://local-tools.vscode-mobile-chat/start"
  echo VS Code Mobile Chat launch config was written and activation URI was sent.
) else (
  echo Port %VSCODE_MOBILE_CHAT_PORT% is already listening. VS Code window was not changed.
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "$deadline = (Get-Date).AddSeconds(25); do { $ok = [bool](Get-NetTCPConnection -LocalPort $env:VSCODE_MOBILE_CHAT_PORT -State Listen -ErrorAction SilentlyContinue); if (-not $ok) { Start-Sleep -Milliseconds 500 } } while (-not $ok -and (Get-Date) -lt $deadline); if ($ok) { exit 0 } exit 1"
if errorlevel 1 (
  echo Mobile Chat did not start from the URI yet.
  echo Mobile Chat did not start on port %VSCODE_MOBILE_CHAT_PORT% yet.
  echo If this is the first run after installing or updating the extension, run in your existing VS Code window: Developer: Reload Window
  echo Then run this bat again.
  pause
  exit /b 1
)

echo Mobile Chat is listening on port %VSCODE_MOBILE_CHAT_PORT%.
powershell -NoProfile -ExecutionPolicy Bypass -Command "$expected = $env:EXTENSION_VERSION; try { $runtime = Invoke-RestMethod -Uri ('http://127.0.0.1:' + $env:VSCODE_MOBILE_CHAT_PORT + '/api/runtime') -TimeoutSec 5; if ($runtime.version -eq $expected) { Write-Host ('Runtime extension version: ' + $runtime.version); exit 0 }; Write-Host ('Runtime extension version mismatch. Expected ' + $expected + ', got ' + $runtime.version + '.'); exit 2 } catch { Write-Host ('Runtime version endpoint is not available yet. The installed extension is ' + $expected + ', but the running port is still served by an older loaded instance.'); exit 2 }"
if errorlevel 2 (
  echo Reload the existing VS Code window once, then run this bat again.
)
pause