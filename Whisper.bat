@echo off
echo ================================
echo    Whisper - Installing deps
echo ================================
echo.

REM Install all dependencies
pip install --quiet numpy PyQt5 sounddevice soundfile pynput openai-whisper

REM Check if torch needs special install
pip show torch >nul 2>&1
if %errorlevel% neq 0 (
    echo Installing PyTorch...
    pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu118
)

echo.
echo Starting Whisper...
echo.
pythonw "%~dp0whisper_desktop.py"
