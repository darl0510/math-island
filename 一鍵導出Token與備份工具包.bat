@echo off
chcp 65001 >nul
title Token 與智慧備份工具包 一鍵自動導出精靈
echo ========================================================
echo  📦 正在掃描並打包最新優化的備份與 Token 節省工具包...
echo ========================================================
python "%~dp0package_toolkit.py"
echo.
echo 💡 導出完成！壓縮檔位於專案根目錄下的 token_and_backup_toolkit.zip。
echo    您可以直接複製該壓縮檔分享或部署到任何新專案！
echo.
pause
