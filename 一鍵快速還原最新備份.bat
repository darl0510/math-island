@echo off
chcp 65001 >nul
title 系統一鍵快速還原工具
echo ========================================================
echo  ⚠️  【警告】您即將把系統還原至最新的備份存檔狀態！
echo ========================================================
echo.
echo 💡 系統在還原前會先對當前狀態做一份防護安全快照，確保絕不損壞。
echo.
set /p confirm="您確定要執行還原嗎？(Y/N): "
if /i "%confirm%"=="Y" (
    python "%~dp0restore_backup.py" latest
) else (
    echo.
    echo 已取消還原作業。
)
echo.
pause
