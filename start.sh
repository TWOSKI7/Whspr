#!/bin/bash

echo "=================================="
echo "  Whspr - Speech to Text"
echo "=================================="

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required"
    exit 1
fi

# Navigate to backend directory
cd "$(dirname "$0")/backend"

# Install requirements if needed
if [ ! -f ".installed" ]; then
    echo "Installing dependencies..."
    pip3 install -r requirements.txt
    touch .installed
fi

echo ""
echo "Starting server..."
echo "Open http://localhost:8000 in your browser"
echo ""

python3 main.py
