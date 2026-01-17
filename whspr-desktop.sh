#!/bin/bash

echo "================================================"
echo "  Whspr - Speech to Text Desktop App"
echo "================================================"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check for Python
if command -v python3 &> /dev/null; then
    PYTHON_CMD="python3"
elif command -v python &> /dev/null; then
    PYTHON_CMD="python"
else
    echo "ERROR: Python 3 is required"
    echo "Install with: sudo apt install python3 python3-pip"
    exit 1
fi

echo "Using: $PYTHON_CMD"

# Install pywebview if needed
$PYTHON_CMD -c "import webview" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "Installing pywebview..."
    pip3 install --break-system-packages pywebview 2>/dev/null || pip3 install pywebview
fi

# On Linux, we need GTK or Qt backend
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Check for GTK
    $PYTHON_CMD -c "import gi" 2>/dev/null
    if [ $? -ne 0 ]; then
        echo ""
        echo "NOTE: For the desktop app on Linux, you may need GTK:"
        echo "  sudo apt install python3-gi python3-gi-cairo gir1.2-gtk-3.0 gir1.2-webkit2-4.0"
        echo ""
    fi
fi

echo "Starting Whspr Desktop App..."
$PYTHON_CMD "$SCRIPT_DIR/desktop_app.py"
