# Whspr Voice Input Chrome Extension

Open-source voice-to-text for any text field on the web. Powered by local Whisper backend.

## Features

- **Universal Voice Input**: Works on any text input, textarea, or contenteditable element
- **Privacy-First**: All processing happens locally via your Whisper backend
- **Cyber-Gourmet UI**: Beautiful orange neon glow aesthetic
- **Keyboard Shortcut**: Alt+V to toggle recording
- **Smart Text Insertion**: Works with React, Vue, and other frameworks
- **Model Selection**: Choose from available Whisper models

## Installation

1. **Start the Whspr backend** at `http://localhost:5000`

2. **Load the extension in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `/home/twoski/Whspr/extension/` directory

3. **Grant microphone permission** when prompted

## Usage

1. **Focus any text input** on any webpage
2. **Click the floating mic button** or press **Alt+V**
3. **Speak your text**
4. **Click again or press Alt+V** to stop recording
5. **Wait for transcription** - text will be inserted at cursor position

## Extension Structure

```
/home/twoski/Whspr/extension/
├── manifest.json       - Chrome Extension manifest (Manifest V3)
├── content.js          - Content script (floating button, recording, text insertion)
├── background.js       - Service worker (keyboard shortcuts, state management)
├── popup.html          - Extension popup UI
├── popup.css           - Popup styles (Cyber-Gourmet theme)
├── popup.js            - Popup logic (backend health, model selection)
├── styles.css          - Injected styles (floating button, overlays)
└── README.md           - This file
```

## Backend Requirements

The extension requires the Whspr backend running at `http://localhost:5000` with these endpoints:

- `GET /api/health` - Health check
- `GET /api/models` - List available Whisper models
- `POST /api/transcribe` - Transcribe audio (accepts `audio` file and `model` parameter)

## Keyboard Shortcuts

- **Alt+V** - Toggle recording (when text input is focused)

## Browser Compatibility

- Chrome 88+ (Manifest V3 support)
- Edge 88+ (Chromium-based)
- Other Chromium browsers with Manifest V3 support

## Privacy

- All audio processing happens locally on your machine
- No data is sent to external servers
- Microphone access is only requested when you start recording

## Troubleshooting

### Extension not appearing
- Ensure Developer Mode is enabled in `chrome://extensions/`
- Check for errors in the extension details page

### "Backend not responding"
- Start the Whspr backend: `cd /home/twoski/Whspr && python app.py`
- Ensure it's running on `http://localhost:5000`
- Check the popup for connection status

### Text not inserting
- Some websites may block programmatic text insertion
- Try the keyboard shortcut instead of clicking the button
- Ensure the text field is properly focused

### Microphone not working
- Grant microphone permission when prompted
- Check Chrome's site permissions: `chrome://settings/content/microphone`
- Ensure no other application is using the microphone

## Development

To modify the extension:

1. Edit the source files in `/home/twoski/Whspr/extension/`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the Whspr Voice Input card
4. Test your changes

## License

Part of the Whspr project. See main repository for license details.
