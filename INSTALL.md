# Whspr - Quick Install Guide

A self-hosted web UI for OpenAI Whisper speech-to-text.

## Option 1: Quick Start (Ubuntu/WSL)

```bash
# 1. Install system dependencies
sudo apt update && sudo apt install -y ffmpeg python3 python3-pip git

# 2. Clone or update the repo
git clone https://github.com/TWOSKI7/Whspr.git ~/Whspr 2>/dev/null || (cd ~/Whspr && git fetch --all)

# 3. Checkout the branch (removes conflicts automatically)
cd ~/Whspr
git checkout -f claude/debug-frontend-backend-P1ej3

# 4. Install Python dependencies
pip3 install --break-system-packages fastapi uvicorn python-multipart openai-whisper

# 5. Run the server
cd ~/Whspr/backend && python3 main.py
```

Then open: **http://localhost:8000**

---

## Option 2: Docker (Recommended for Production)

```bash
# Clone and run with Docker
git clone https://github.com/TWOSKI7/Whspr.git
cd Whspr
git checkout claude/debug-frontend-backend-P1ej3
docker-compose up --build
```

Then open: **http://localhost:8000**

---

## Option 3: Windows (Without WSL)

1. Install Python 3.10+ from https://python.org
2. Install ffmpeg from https://ffmpeg.org or via `choco install ffmpeg`
3. Clone the repo and run:

```cmd
git clone https://github.com/TWOSKI7/Whspr.git
cd Whspr
git checkout claude/debug-frontend-backend-P1ej3
pip install fastapi uvicorn python-multipart openai-whisper
cd backend
python main.py
```

---

## Troubleshooting

### "externally-managed-environment" error
Use `--break-system-packages` flag:
```bash
pip3 install --break-system-packages <package>
```

### Git checkout conflicts
Force checkout to overwrite local files:
```bash
git checkout -f claude/debug-frontend-backend-P1ej3
```

### "No module named whisper"
Install Whisper:
```bash
pip3 install --break-system-packages openai-whisper
```

### Port 8000 already in use
Kill the process or use a different port:
```bash
# Find what's using port 8000
lsof -i :8000
# Or run on different port by editing backend/main.py
```
