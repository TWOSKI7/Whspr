#!/bin/bash
# Whisper Local Web Interface Launcher
# Just run: ./run.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=================================="
echo "  Whisper Speech-to-Text"
echo "=================================="

# Create venv if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate venv
source venv/bin/activate

# Install dependencies if needed
if ! python3 -c "import flask" 2>/dev/null; then
    echo "Installing Flask..."
    pip install flask
fi

if ! python3 -c "import whisper" 2>/dev/null; then
    echo "Installing Whisper (this may take a few minutes)..."
    pip install openai-whisper
fi

echo ""
echo "Starting server..."
echo "Open: http://localhost:5000"
echo ""
python3 app.py
