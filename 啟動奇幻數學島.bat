@echo off
chcp 65001 >nul 2>nul
title 奇幻數學島大冒險 (小學全年級 108 課綱)

REM ========================================================
REM  奇幻數學島大冒險 - Windows 原生獨立應用啟動器
REM  遵循 Windows BAT Craftsman Protocol 規範 (CRLF, REM, %~dp0)
REM ========================================================

set "APP_DIR=%~dp0"
set "PORT=8000"
set "URL=http://127.0.0.1:%PORT%"

REM 檢查後台是否已有伺服器在執行
netstat -ano | findstr ":%PORT% " >nul 2>nul
if errorlevel 1 (
    REM 啟動本地輕量 Python HTTP 伺服器
    start /b "" python "%APP_DIR%server.py" >nul 2>nul
    REM 等待伺服器就緒
    timeout /t 2 >nul 2>nul
)

REM 探測 Chrome 或 Edge 瀏覽器並以 --app 獨立無網址列視窗啟動
set "CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe"
set "CHROME_PATH_X86=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
set "EDGE_PATH=C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
set "EDGE_PATH_64=C:\Program Files\Microsoft\Edge\Application\msedge.exe"

if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" --app="%URL%" --window-size=1200,820
    exit /b 0
)
if exist "%CHROME_PATH_X86%" (
    start "" "%CHROME_PATH_X86%" --app="%URL%" --window-size=1200,820
    exit /b 0
)
if exist "%EDGE_PATH%" (
    start "" "%EDGE_PATH%" --app="%URL%" --window-size=1200,820
    exit /b 0
)
if exist "%EDGE_PATH_64%" (
    start "" "%EDGE_PATH_64%" --app="%URL%" --window-size=1200,820
    exit /b 0
)

REM 若無 Chrome/Edge 則平滑降級至系統預設瀏覽器
start "" "%URL%"
exit /b 0
