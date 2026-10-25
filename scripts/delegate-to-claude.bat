@echo off
chcp 65001 >nul
echo ========================================================
echo  🤖 Claude Code Autonomous Delegator (8080 自主外包工具)
echo ========================================================
python "%~dp0claude_delegator.py" %*
