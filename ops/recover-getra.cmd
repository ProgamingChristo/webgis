@echo off
setlocal
title GETRA EMERGENCY RECOVERY
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "D:\Getra_Production\ops\recover-getra-runtime.ps1"
set "GETRA_EXIT=%ERRORLEVEL%"
echo.
if "%GETRA_EXIT%"=="0" (
  echo Recovery completed successfully. GETRA is online.
) else (
  echo Recovery requires operator attention. Check logs:
  echo D:\getra docs\Production docs\Runtime_Monitoring\getra-recovery.log
)
echo.
pause
exit /b %GETRA_EXIT%
