@echo off
chcp 65001 >nul
title Flat Architecture & Code Health Dashboard

echo ======================================================================
echo  Flat Architecture & Code Health Live Dashboard
echo ======================================================================
echo.
echo  [*] Local Endpoint: http://127.0.0.1:5055/architecture_dashboard.html (or auto-assigned port 5056+)
echo  [*] Master Endpoint: http://127.0.0.1:8765/architecture_dashboard.html (if active)
echo.
echo ======================================================================
echo  [+] Launching architecture scanning microservice...
echo ======================================================================
echo.
set "REAL_PY=C:\Users\達爾\AppData\Local\Python\pythoncore-3.14-64\python.exe"
if exist "%REAL_PY%" (
    "%REAL_PY%" "%~dp0scan_architecture.py" --serve
    if not errorlevel 1 goto :DONE
)

python "%~dp0scan_architecture.py" --serve
if not errorlevel 1 goto :DONE

echo.
echo [!] python command failed, trying py -3...
py -3 "%~dp0scan_architecture.py" --serve
if not errorlevel 1 goto :DONE

echo.
echo [x] Python environment not found. Please ensure Python is in your PATH.
pause
exit /b 1

:DONE
echo.
echo ======================================================================
echo  Architecture dashboard service stopped. Press any key to close...
echo ======================================================================
pause >nul
