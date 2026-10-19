@echo off
title Antigravity Token Center

python "%~dp0scan_tokens.py" --serve
if errorlevel 1 (
    py -3 "%~dp0scan_tokens.py" --serve
)

echo.
pause
