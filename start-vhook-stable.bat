@echo off
setlocal
cd /d "%~dp0"
powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0server\run-stable.ps1"
