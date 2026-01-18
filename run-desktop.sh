#!/bin/bash
# Whisper Desktop App Launcher
# Just run: ./run-desktop.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================="
echo "  Whisper Desktop App"
echo "=================================="

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies if needed
if ! python3 -c "import whisper" 2>/dev/null; then
    echo "Installing Whisper (this may take a few minutes)..."
    pip install openai-whisper
fi

echo "Launching desktop app..."
python3 desktop.py
