@echo off
setlocal
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "D:\Getra_Production\ops\start-getra-runtime.ps1"
exit /b %ERRORLEVEL%
