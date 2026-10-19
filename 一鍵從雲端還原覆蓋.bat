@echo off
chcp 65001 >nul
title 一鍵從雲端還原覆蓋 (Google Drive 增量還原)
python "%~dp0cloud_sync.py" download
echo.
pause
