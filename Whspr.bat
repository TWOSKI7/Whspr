@echo off
title Whspr Desktop App
echo ================================================
echo   Whspr - Speech to Text Desktop App
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org
    pause
    exit /b 1
)

REM Install pywebview if needed
echo Checking dependencies...
pip show pywebview >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing pywebview...
    pip install pywebview
)

REM Run the desktop app
echo Starting Whspr Desktop App...
python "%~dp0desktop_app.py"

pause
