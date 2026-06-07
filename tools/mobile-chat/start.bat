@echo off
chcp 65001 >nul

echo ========================================
echo   Mobile Dev Environment
echo ========================================

:: Kill any existing process on port 4096 to avoid password mismatch
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4096" ^| findstr "LISTENING"') do (
    echo Killing existing process on port 4096 (PID: %%a)
    taskkill /F /PID %%a >nul 2>&1
)
timeout /t 1 /nobreak >nul

:: Start OpenCode web on 4096
:: set in current env so child process inherits demo123
set OPENCODE_SERVER_PASSWORD=demo123
cd /d "%~dp0..\.."
start "OpenCode Web" /min opencode web --port 4096 --hostname 0.0.0.0

:: Start mobile chat server on 3001
cd /d "%~dp0"
start "Mobile Chat" /min node server.js

:: Start vite dev server on 5173
cd /d "%~dp0..\.."
start "Vite Dev" /min npx vite --host

echo.
echo Starting services...
timeout /t 5 /nobreak >nul

echo.
echo Checking ports:
netstat -ano | findstr "LISTENING" | findstr "3001 4096 5173"

echo.
echo ========================================
echo Services started:
echo   http://localhost:3001 - Mobile Chat
echo   http://localhost:4096 - OpenCode Web
echo   http://localhost:5173 - Vite Dev
echo ========================================
echo.
pause
