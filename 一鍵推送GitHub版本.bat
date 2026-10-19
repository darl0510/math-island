@echo off
chcp 65001 >nul
title 奇幻數學島 - 一鍵推送版本至 GitHub

echo ========================================================
echo  🌈 奇幻數學島 (Math Island) - 一鍵推送版本至 GitHub
echo ========================================================
echo.

cd /d "%~dp0"

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 錯誤：找不到 Git 命令，請先安裝 Git 並加入系統 PATH！
    echo.
    pause
    exit /b 1
)

echo 🔍 正在檢查 Git 倉庫狀態與變更檔案...
echo --------------------------------------------------------
git status -s
echo --------------------------------------------------------
echo.

set /p COMMIT_MSG="請輸入更新說明 (直接按 Enter 預設為 'update: 奇幻數學島版本更新'): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=update: 奇幻數學島版本更新

echo.
echo 📦 正在加入檔案到暫存區...
git add .

echo 📝 正在建立版本節點 (Commit)...
git commit -m "%COMMIT_MSG%"

echo.
echo 🚀 正在推送到 GitHub 遠端倉庫...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo  🎉 推送成功！GitHub Pages 將在 1~2 分鐘內自動更新。
    echo ========================================================
) else (
    echo.
    echo ⚠️ 推送失敗或遠端尚未設定。
    echo 若尚未建立遠端倉庫，請確認已在 GitHub 建立 math-island 倉庫，
    echo 並執行：git remote add origin https://github.com/darl0510/math-island.git
)

echo.
pause
