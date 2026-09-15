@echo off
setlocal
title GETRA RECOVERY
powershell.exe -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "D:\Getra_Production\ops\recover-getra-judging.ps1"
set "GETRA_EXIT=%ERRORLEVEL%"
echo.
if "%GETRA_EXIT%"=="0" (
  echo Recovery completed successfully.
) else (
  echo Recovery requires operator attention. Review:
  echo D:\getra docs\Production docs\Runtime_Monitoring\judging-24h-recovery.log
)
echo.
pause
exit /b %GETRA_EXIT%
