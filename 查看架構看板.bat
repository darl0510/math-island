@echo off
chcp 65001 >nul 2>nul
title 【math-island】平鋪架構健康度看板
cd /d "%~dp0"
REM ═══════════════════════════════════════════════════════════
REM  【math-island】平鋪架構健康度看板
REM  自動生成工具：customize_architecture_dashboards.py
REM ═══════════════════════════════════════════════════════════
echo.
echo  【math-island】平鋪架構健康度看板
echo  ─────────────────────────────────────────────────────
echo  啟動中，請稍候...
echo.
python "%~dp0scan_architecture.py" --serve
echo.
echo  看板服務已結束。按任意鍵關閉視窗。
pause >nul
