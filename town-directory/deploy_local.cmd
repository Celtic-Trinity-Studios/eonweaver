@echo off
REM Double-click or run from cmd when FTP works (home network / VPN).
cd /d "%~dp0"
call npm run build
if errorlevel 1 exit /b 1
node deploy.cjs
pause
