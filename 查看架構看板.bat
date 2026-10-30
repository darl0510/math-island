@echo off
chcp 65001 >nul 2>nul
title 查看 math-island 架構看板

set "DASHBOARD_URL=http://127.0.0.1:8888/projects/math-island/dashboard"

REM 優先探測 Chrome 或 Edge 原生應用視窗模式開啟 8888 總控專屬看板
for %%P in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do (
    if exist "%%~P" (
        start "" "%%~P" --app="%DASHBOARD_URL%"
        exit /b 0
    )
)

REM 平滑降級為預設瀏覽器開啟
start "" "%DASHBOARD_URL%"
exit /b 0
