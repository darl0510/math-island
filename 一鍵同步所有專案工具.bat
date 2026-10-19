@echo off
chcp 65001 >nul
title Antigravity 跨專案工具鏈同步中心
echo ======================================================================
echo 🌐 正在啟動 Antigravity 跨專案工具鏈同步中心...
echo 🏛️ 總指揮中心 (SSOT): APP_9181734
echo ======================================================================
python sync_projects.py --sync
echo.
pause
