@echo off
setlocal
cd /d "%~dp0"
node scripts/bust-version.js
if %errorlevel% neq 0 (
  echo Script failed with exit code %errorlevel%.
  pause
  exit /b %errorlevel%
)
endlocal
