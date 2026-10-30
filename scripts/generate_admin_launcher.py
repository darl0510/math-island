# -*- coding: utf-8 -*-
"""
生成符合 windows-bat-craftsman 規範的【啟動後台管理中心.bat】
使用平鋪跳轉 (Flat Jump)，嚴禁在括號代碼塊內放置 Label 或嵌套跳轉
"""
import os

bat_content = """@echo off
chcp 65001 >nul 2>nul
title 奇幻數學島 - 後台管理中心

REM ========================================================
REM  奇幻數學島大冒險 - 後台管理中心啟動器
REM  遵循 Windows BAT Craftsman Protocol 規範【CRLF, REM, %~dp0】
REM ========================================================

cd /d "%~dp0"
set "APP_DIR=%~dp0"
set "PORT=8000"
set "URL=http://127.0.0.1:%PORT%/admin.html"

echo ========================================================
echo   奇幻數學島 - 後台管理中心啟動中...
echo ========================================================
echo.

REM 1. 探測本機 8000 伺服器是否已在正常提供服務【真實 HTTP Probe 杜絕 IPv6 假命中】
python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:%PORT%/api/info', timeout=0.5)" >nul 2>nul
if not errorlevel 1 goto SERVER_ALREADY_RUNNING

echo [*] 正在啟動本機伺服器【server.py】...
start "奇幻數學島伺服器" /d "%APP_DIR%" /min python "%APP_DIR%server.py"

echo [*] 正在等待伺服器就緒...
set /a RETRIES=0

:WAIT_SERVER
timeout /t 1 >nul 2>nul
python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:%PORT%/api/info', timeout=0.5)" >nul 2>nul
if not errorlevel 1 goto LAUNCH_BROWSER

set /a RETRIES+=1
if %RETRIES% lss 8 goto WAIT_SERVER
goto LAUNCH_BROWSER

:SERVER_ALREADY_RUNNING
echo [*] 偵測到本機伺服器已在背景正常運行中！

:LAUNCH_BROWSER
echo.
echo [*] 伺服器已就緒，正在開啟後台管理中心視窗...
echo --------------------------------------------------------
echo  後台管理網址: %URL%
echo  本地資料庫: data\\admin_store.json
echo --------------------------------------------------------
echo.

REM 2. 探測 Chrome 或 Edge 瀏覽器並以 --app 獨立視窗啟動
set "CHROME_PATH=C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
set "CHROME_PATH_X86=C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
set "EDGE_PATH=C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
set "EDGE_PATH_64=C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"

if exist "%CHROME_PATH%" (
    start "" "%CHROME_PATH%" --app="%URL%" --window-size=1260,860
    exit /b 0
)
if exist "%CHROME_PATH_X86%" (
    start "" "%CHROME_PATH_X86%" --app="%URL%" --window-size=1260,860
    exit /b 0
)
if exist "%EDGE_PATH%" (
    start "" "%EDGE_PATH%" --app="%URL%" --window-size=1260,860
    exit /b 0
)
if exist "%EDGE_PATH_64%" (
    start "" "%EDGE_PATH_64%" --app="%URL%" --window-size=1260,860
    exit /b 0
)

REM 若無獨立視窗支援則使用系統預設瀏覽器開啟
start "" "%URL%"
exit /b 0
"""

# 遵循 CRLF + 無 BOM 寫入
crlf_content = bat_content.replace("\r\n", "\n").replace("\n", "\r\n").encode("utf-8")
out_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "啟動後台管理中心.bat")
with open(out_path, "wb") as f:
    f.write(crlf_content)

print(f"[OK] Generated {out_path} ({len(crlf_content)} bytes, CRLF)")
