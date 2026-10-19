@echo off
chcp 65001 >nul
title 系統一鍵即時備份工具
echo ========================================================
echo  🛡️  正在啟動 LINE 停車與生活導航系統 安全備份流程...
echo ========================================================
python "%~dp0auto_backup.py"
echo.
echo 💡 備份已完成！備份檔案儲存於 backups 資料夾中。
echo.
pause
