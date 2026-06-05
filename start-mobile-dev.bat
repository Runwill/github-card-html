@echo off
chcp 65001 >nul
echo ========================================
echo   Mobile Dev - Tailscale Remote Access
echo ========================================
echo.

set OPENCODE_SERVER_PASSWORD=demo123
set PROJECT_DIR=E:\重要文件\card-html

echo [1/4] Starting Vite dev server on port 5173...
start "Vite Dev Server" /min cmd /c "cd /d %PROJECT_DIR% && npx vite --host 0.0.0.0 --port 5173"

echo [2/4] Starting OpenCode Web on port 3000...
start "OpenCode Web" /min cmd /c "set OPENCODE_SERVER_PASSWORD=demo123 && cd /d %PROJECT_DIR% && %LOCALAPPDATA%\opencode\opencode.exe web --hostname 0.0.0.0 --port 3000"

echo [3/4] Starting Mobile Chat on port 3001...
start "Mobile Chat" /min cmd /c "cd /d %PROJECT_DIR%\tools\mobile-chat && node server.js"

timeout /t 5 /nobreak >nul

echo [4/4] Checking services...
echo.

netstat -an | findstr "LISTENING" | findstr "3000 3001 5173"
echo.

echo ========================================
echo   Access on your phone:
echo.
echo   Preview:      http://100.95.190.86:5173
echo   OpenCode:     http://100.95.190.86:3000
echo   Mobile Chat:  http://100.95.190.86:3001
echo.
echo   Username: opencode
echo   Password: demo123
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

echo Stopping services...
taskkill /fi "WINDOWTITLE eq Vite Dev Server" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq OpenCode Web" /f >nul 2>&1
taskkill /fi "WINDOWTITLE eq Mobile Chat" /f >nul 2>&1
echo Done.
