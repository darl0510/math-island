@echo off
chcp 65001 >nul
title Math Island - Push to GitHub

echo ========================================================
echo   Fantasy Math Island Adventure - Push to GitHub
echo ========================================================
echo.

cd /d "%~dp0"

where git >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Git not found in PATH!
    pause
    exit /b 1
)

echo [1/3] Checking Git Status...
git status -s
echo.

set /p COMMIT_MSG="Commit message (Enter to use default): "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=update: math island latest updates

echo.
echo [2/3] Adding changes and committing...
git add .
git commit -m "%COMMIT_MSG%"

echo.
echo [3/3] Pushing to GitHub...
git push origin main

if %errorlevel% equ 0 (
    echo.
    echo ========================================================
    echo   Push Success! GitHub Pages will update in 1-2 mins.
    echo ========================================================
) else (
    echo.
    echo [WARNING] Push failed. Please check your network or repository settings.
)

echo.
pause
