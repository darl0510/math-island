@echo off
chcp 65001 >nul
title 雲端雙向同步管家 (Google Drive 增量同步中心)
python "%~dp0cloud_sync.py"
echo.
pause
