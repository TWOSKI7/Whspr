#!/usr/bin/env python3
"""
Whspr Desktop App
Runs as a native desktop window - no browser needed
"""

import sys
import threading
import time
import subprocess
import os

# Check for required packages
def install_requirements():
    packages = ['webview', 'fastapi', 'uvicorn']
    for pkg in packages:
        try:
            __import__(pkg)
        except ImportError:
            print(f"Installing {pkg}...")
            subprocess.check_call([sys.executable, '-m', 'pip', 'install',
                                   '--break-system-packages', pkg if pkg != 'webview' else 'pywebview'])

install_requirements()

import webview
import uvicorn

# Get the directory where this script is located
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(SCRIPT_DIR, 'backend')

# Add backend to path so we can import main
sys.path.insert(0, BACKEND_DIR)

# Change to backend directory for templates
os.chdir(BACKEND_DIR)

from main import app

class Server:
    def __init__(self):
        self.server = None
        self.thread = None

    def start(self, host='127.0.0.1', port=8000):
        """Start the FastAPI server in a background thread"""
        config = uvicorn.Config(app, host=host, port=port, log_level="warning")
        self.server = uvicorn.Server(config)
        self.thread = threading.Thread(target=self.server.run, daemon=True)
        self.thread.start()

        # Wait for server to start
        time.sleep(1)
        return f"http://{host}:{port}"

def main():
    print("=" * 50)
    print("  Whspr Desktop App")
    print("=" * 50)
    print()

    # Start the backend server
    print("Starting backend server...")
    server = Server()
    url = server.start()
    print(f"Server running at {url}")
    print()

    # Create desktop window
    print("Opening desktop window...")
    window = webview.create_window(
        title='Whspr - Speech to Text',
        url=url,
        width=1000,
        height=750,
        min_size=(600, 500),
        resizable=True,
        frameless=False,
        easy_drag=False,
        text_select=True
    )

    # Start the GUI (this blocks until window is closed)
    webview.start(debug=False)

    print("Window closed. Goodbye!")

if __name__ == '__main__':
    main()
