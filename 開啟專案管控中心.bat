@echo off
chcp 65001 >nul 2>nul
title 專案管控中心快捷入口

set "CENTER_URL=http://127.0.0.1:8888"

REM 優先探測 Chrome 或 Edge 原生應用視窗模式
for %%P in (
    "%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
    "%LocalAppData%\Google\Chrome\Application\chrome.exe"
    "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
) do (
    if exist "%%~P" (
        start "" "%%~P" --app="%CENTER_URL%"
        exit /b 0
    )
)

REM 平滑降級為預設瀏覽器開啟
start "" "%CENTER_URL%"
exit /b 0
