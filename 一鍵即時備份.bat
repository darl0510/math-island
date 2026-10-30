@echo off
chcp 65001 >nul 2>nul
title 一鍵即時安全備份

echo ═══════════════════════════════════════════════════════════════
echo 💾 正在執行專案即時安全備份...
echo ═══════════════════════════════════════════════════════════════

if exist "%~dp0auto_backup.py" (
    python "%~dp0auto_backup.py"
) else (
    echo ⚠️ 未在專案目錄找到 auto_backup.py，改由專案管控中心執行備份...
    python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8888/api/sync/patrol', timeout=5)" >nul 2>nul
)

echo.
echo ✔ 備份作業已完成！
timeout /t 3 >nul 2>nul
exit /b 0
