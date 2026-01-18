@echo off
echo ================================
echo    Whisper - Setup & Launch
echo ================================
echo.

REM Check for FFmpeg
where ffmpeg >nul 2>&1
if %errorlevel% neq 0 (
    echo FFmpeg not found! Installing...
    echo.

    REM Try winget first
    winget install FFmpeg --silent --accept-package-agreements --accept-source-agreements 2>nul
    if %errorlevel% neq 0 (
        echo.
        echo ==========================================
        echo  FFmpeg install failed. Please install manually:
        echo  1. Download from: https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip
        echo  2. Extract to C:\ffmpeg
        echo  3. Add C:\ffmpeg\bin to your PATH
        echo ==========================================
        echo.
        pause
        exit /b 1
    )
)

REM Install Python dependencies
echo Installing Python packages...
pip install --quiet --upgrade numpy PyQt5 sounddevice pynput openai-whisper

REM Check if torch needs install/reinstall
pip show torch >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PyTorch...
    pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
)

echo.
echo Starting Whisper...
echo.
pythonw "%~dp0whisper_desktop.py"
