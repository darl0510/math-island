@echo off
chcp 65001 >nul
title 一鍵打包到雲端硬碟 (Google Drive 增量同步)
python "%~dp0cloud_sync.py" upload
echo.
pause
