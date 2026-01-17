#!/bin/bash

echo "=================================="
echo "  Whspr - Speech to Text"
echo "=================================="
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"

# Check if backend directory exists
if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: backend/ directory not found"
    echo "Make sure you checked out the correct branch:"
    echo "  git checkout -f claude/debug-frontend-backend-P1ej3"
    exit 1
fi

# Check if templates exist
if [ ! -f "$BACKEND_DIR/templates/index.html" ]; then
    echo "Error: backend/templates/index.html not found"
    echo "Make sure you checked out the correct branch:"
    echo "  git checkout -f claude/debug-frontend-backend-P1ej3"
    exit 1
fi

# Detect Python command
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "Error: Python 3 is required"
    echo "Install with: sudo apt install python3 python3-pip"
    exit 1
fi

echo "Using: $PYTHON_CMD"

# Check for pip
if ! command -v pip3 &> /dev/null && ! command -v pip &> /dev/null; then
    echo "Error: pip is required"
    echo "Install with: sudo apt install python3-pip"
    exit 1
fi

# Detect pip command
if command -v pip3 &> /dev/null; then
    PIP_CMD="pip3"
else
    PIP_CMD="pip"
fi

# Install requirements if needed
if [ ! -f "$BACKEND_DIR/.installed" ]; then
    echo "Installing dependencies..."
    echo "(This may take a few minutes for first-time setup)"
    echo ""

    # Try with --break-system-packages first (for newer Ubuntu/Debian)
    $PIP_CMD install --break-system-packages fastapi uvicorn python-multipart 2>/dev/null || \
    $PIP_CMD install fastapi uvicorn python-multipart

    if [ $? -eq 0 ]; then
        touch "$BACKEND_DIR/.installed"
        echo "Dependencies installed successfully"
    else
        echo "Warning: Some dependencies may not have installed correctly"
    fi
fi

echo ""
echo "Starting server..."
echo "Open http://localhost:8000 in your browser"
echo ""

cd "$BACKEND_DIR"
$PYTHON_CMD main.py
