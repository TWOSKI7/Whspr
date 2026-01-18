# Whisper Desktop App

A native desktop application for speech-to-text transcription using OpenAI's Whisper model. Runs 100% locally on your machine - no internet required after initial setup.

---

## Quick Start

```bash
cd Whspr
./run-desktop.sh
```

That's it! The app will open as a native desktop window.

---

## Features Overview

### 1. Microphone Recording (Main Feature)

Record audio directly from your microphone and transcribe it instantly.

**How to use:**
1. Click the **"Start Recording"** button (cyan button in the microphone section)
2. Speak into your microphone
3. Click **"Stop Recording"** when finished
4. Wait for transcription (status shows "Processing...")
5. Result appears in the text area below

**Visual indicators:**
- **Cyan button** = Ready to record
- **Red button** = Currently recording
- Status text shows current state

---

### 2. Mini Floating Microphone Widget

A small, always-on-top popup window for quick recordings without opening the full app.

**How to open:**
- Click the **"📌 Mini"** button in the top-right corner of the main window

**How to use:**
1. Click the large **🎤** microphone icon to start recording
2. Icon turns **red** while recording
3. Click again to stop and transcribe
4. Result appears in the main window

**Features:**
- Always stays on top of other windows
- Drag anywhere on screen by clicking and dragging
- Minimal footprint (200x120 pixels)
- Independent recording from main window

---

### 3. File Transcription

Transcribe existing audio files from your computer.

**Supported formats:**
- MP3, WAV, M4A, FLAC, OGG, WEBM, WMA, AAC, MP4

**How to use:**
1. Click **"Browse"** button
2. Select an audio file
3. Click **"Transcribe File"**
4. Wait for processing
5. Result appears in text area

---

### 4. Model Selection

Choose the Whisper model based on your needs.

| Model | Size | Speed | Accuracy | Best For |
|-------|------|-------|----------|----------|
| **tiny** | ~75MB | Fastest | Lower | Quick drafts, testing |
| **base** | ~150MB | Fast | Good | General use |
| **small** | ~500MB | Medium | Better | **Recommended default** |
| **medium** | ~1.5GB | Slower | High | Professional use |
| **large** | ~3GB | Slowest | Highest | Maximum accuracy |
| **turbo** | ~800MB | Fast | High | Speed + quality balance |

**How to change:**
- Use the **"Model"** dropdown before recording/transcribing
- Model loads on first use (may take time to download)

---

### 5. Task Selection

Choose what to do with the audio.

| Task | Description |
|------|-------------|
| **transcribe** | Convert speech to text in original language |
| **translate** | Convert speech to English text (any language → English) |

---

### 6. Language Selection

Specify the spoken language or let Whisper auto-detect.

**Options:**
- **Empty (default)** - Auto-detect language
- **en** - English
- **es** - Spanish
- **fr** - French
- **de** - German
- **it** - Italian
- **pt** - Portuguese
- **ru** - Russian
- **ja** - Japanese
- **ko** - Korean
- **zh** - Chinese
- **ar** - Arabic
- **hi** - Hindi

**Tip:** Specifying the language improves accuracy and speed.

---

### 7. Result Actions

After transcription, you can:

| Button | Action |
|--------|--------|
| **📋 Copy** | Copy text to clipboard |
| **💾 Save** | Save to a .txt file |
| **🗑 Clear** | Clear the result area |

---

## Status Messages

The status bar at the bottom shows current state:

| Message | Meaning |
|---------|---------|
| "Ready - Select a file or use microphone" | App is ready |
| "Loading [model] model..." | Downloading/loading AI model |
| "Transcribing audio..." | Processing your audio |
| "Done! Language: [lang]" | Finished, shows detected language |
| "Error: [message]" | Something went wrong |

---

## System Requirements

### Minimum:
- Python 3.8+
- 4GB RAM (for tiny/base models)
- Microphone (for recording feature)

### Recommended:
- Python 3.10+
- 8GB+ RAM (for small/medium models)
- 16GB+ RAM (for large model)
- NVIDIA GPU with CUDA (optional, for faster processing)

### Dependencies (auto-installed):
- `openai-whisper` - Speech recognition
- `sounddevice` - Microphone access
- `numpy` - Audio processing
- `torch` - Neural network backend
- `tkinter` - GUI (usually pre-installed with Python)

---

## Troubleshooting

### "No module named 'tkinter'"
```bash
# Ubuntu/Debian
sudo apt-get install python3-tk

# Fedora
sudo dnf install python3-tkinter

# macOS (usually pre-installed)
brew install python-tk
```

### "No microphone detected"
1. Check microphone is connected
2. Check system permissions for microphone access
3. On Linux, you may need `pulseaudio` or `pipewire`:
   ```bash
   sudo apt-get install libportaudio2
   ```

### "Model download failed"
- Check internet connection (needed only for first model download)
- Models are cached in `~/.cache/whisper/`

### App opens in browser instead of desktop
- Make sure you're running `desktop.py`, not `app.py`
- Use `./run-desktop.sh` to launch

### Slow transcription
- Use a smaller model (tiny/base)
- If you have NVIDIA GPU, ensure CUDA is installed
- Close other applications to free RAM

---

## File Structure

```
Whspr/
├── desktop.py          # Desktop app with microphone support
├── run-desktop.sh      # One-click launcher for desktop app
├── app.py              # Web interface (browser-based)
├── run.sh              # Launcher for web interface
├── whisper/            # Whisper library source
└── DESKTOP_README.md   # This file
```

---

## Keyboard Shortcuts

Currently the app uses mouse/button interactions. Future versions may add:
- `Space` - Start/stop recording
- `Ctrl+C` - Copy result
- `Ctrl+S` - Save result
- `Escape` - Close mini widget

---

## Privacy

- **100% Local Processing** - All audio is processed on your machine
- **No Data Sent** - Nothing is uploaded to any server
- **Temp Files Deleted** - Microphone recordings are automatically deleted after transcription
- **No Telemetry** - The app doesn't collect any usage data

---

## Tips for Best Results

1. **Speak clearly** - Enunciate words, especially technical terms
2. **Reduce background noise** - Find a quiet environment
3. **Use appropriate model** - Larger models = better accuracy
4. **Specify language** - If you know the language, select it
5. **Check microphone levels** - Not too quiet, not clipping
6. **First run takes time** - Model downloads on first use (~500MB for 'small')

---

## Version Info

- Desktop App Version: 1.0
- Whisper Version: 20250625
- Requires: Python 3.8+
