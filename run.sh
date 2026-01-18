#!/bin/bash
# Whisper Local Web Interface Launcher

echo "=================================="
echo "  Whisper Local Setup"
echo "=================================="

# Check if pip packages are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "Installing Flask..."
    pip install flask
fi

if ! python -c "import whisper" 2>/dev/null; then
    echo "Installing Whisper and dependencies..."
    pip install openai-whisper
fi

echo ""
echo "Starting Whisper Web Interface..."
echo ""
python app.py
