# Whspr Voice Input - Installation Guide

## Quick Start

### 1. Prerequisites

Make sure the Whspr backend is running:

```bash
cd /home/twoski/Whspr
python app.py
```

The backend should be accessible at `http://localhost:5000`

### 2. Install Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`

2. Enable **Developer mode**:
   - Look for the toggle switch in the top-right corner
   - Click it to enable Developer mode

3. Click **"Load unpacked"** button

4. Navigate to and select: `/home/twoski/Whspr/extension/`

5. The extension should now appear in your extensions list

### 3. Grant Permissions

When you first use the extension:

1. Click the extension icon in Chrome toolbar
2. Focus any text input on a webpage
3. Click the floating mic button or press Alt+V
4. Grant microphone permission when prompted

## Verify Installation

### Check Backend Connection

1. Click the Whspr extension icon in Chrome toolbar
2. Look for "Backend Status: Connected" in green
3. If disconnected, ensure the backend is running at localhost:5000

### Test Voice Input

1. Go to any webpage (e.g., google.com)
2. Click in the search box
3. You should see an orange floating mic button appear
4. Click the mic or press Alt+V
5. Speak some text
6. Click again or press Alt+V to stop
7. Text should appear in the input field

## Troubleshooting

### Extension doesn't appear after loading

**Solution**: Check for errors:
1. Go to `chrome://extensions/`
2. Find "Whspr Voice Input"
3. Click "Details"
4. Look for any error messages
5. Click "Errors" to see console logs

### Backend shows "Disconnected"

**Solution**: Start the backend:
```bash
cd /home/twoski/Whspr
python app.py
```

Verify it's running by visiting: http://localhost:5000

### Microphone permission denied

**Solution**: Grant permissions:
1. Go to `chrome://settings/content/microphone`
2. Ensure microphone is not blocked
3. Add the website to allowed sites if needed

### Floating button doesn't appear

**Solution**:
1. Refresh the webpage (Ctrl+R)
2. Reload the extension in `chrome://extensions/`
3. Make sure you're clicking in a text input field
4. Check browser console for errors (F12)

### Text doesn't insert into field

**Solution**:
1. Ensure the text field is focused before recording
2. Try using Alt+V keyboard shortcut instead
3. Some websites may block programmatic text insertion
4. Check if the site uses a custom input component

## Create Extension Icons (Optional)

The extension works without icons but will show Chrome's default icon. To add custom icons:

1. Create three PNG images:
   - `icon16.png` (16x16 pixels)
   - `icon48.png` (48x48 pixels)
   - `icon128.png` (128x128 pixels)

2. Design recommendations:
   - Microphone symbol in orange (#ff6b35)
   - Dark or transparent background
   - Neon glow effect matching the Cyber-Gourmet theme

3. Save icons in `/home/twoski/Whspr/extension/`

4. Reload the extension in `chrome://extensions/`

## Updating the Extension

After making code changes:

1. Go to `chrome://extensions/`
2. Find "Whspr Voice Input"
3. Click the refresh/reload icon
4. Test your changes

## Keyboard Shortcuts

To customize the keyboard shortcut:

1. Go to `chrome://extensions/shortcuts`
2. Find "Whspr Voice Input"
3. Click the pencil icon next to "Toggle voice recording"
4. Press your desired key combination
5. Click "OK"

## Next Steps

- Configure your preferred Whisper model in the popup
- Try voice input on different websites
- Adjust backend settings for better accuracy
- Report any issues or bugs

## Support

For issues, check:
- Extension console: Right-click extension icon > Inspect popup
- Page console: F12 > Console tab
- Backend logs: Check terminal where `python app.py` is running

---

**Note**: This extension requires an active internet connection only if your Whisper backend downloads models. All transcription happens locally on your machine.
