@echo off
setlocal
cd /d "%~dp0"
echo stop> "%~dp0server.stop"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /pid %%a /f >nul 2>nul
