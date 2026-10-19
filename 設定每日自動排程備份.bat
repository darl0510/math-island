@echo off
chcp 65001 >nul
title 設定 Windows 每日自動排程備份
echo ========================================================
echo  ⏰ 正在為您的系統設定【Windows 每日自動背景備份】排程...
echo ========================================================
echo.
echo 將在每天凌晨 03:30 自動執行 auto_backup.py
echo 備份過程完全靜默，不會打擾您的日常作業。
echo.

schtasks /create /tn "LineApp_Daily_Backup" /tr "python \"%~dp0auto_backup.py\"" /sc daily /st 03:30 /f

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  🎉 成功建立排程任務：LineApp_Daily_Backup！
    echo  從今以後每天凌晨 03:30 將全自動備份所有資料庫與程式碼。
    echo  舊備份超過 14 天會自動清理，完全不佔磁碟多餘空間！
    echo ========================================================
) else (
    echo.
    echo ⚠️ 若顯示需要管理員權限，請對此 bat 檔案按右鍵選擇【以系統管理員身分執行】。
)

echo.
pause
