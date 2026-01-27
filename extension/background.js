// Whspr Voice Input Background Service Worker
// Handles keyboard shortcuts and extension state

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-recording') {
    // Send message to active tab's content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'toggle-recording' });
      }
    });
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // Open popup (handled by manifest.json)
});

// Log installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Whspr Voice Input installed successfully!');
  } else if (details.reason === 'update') {
    console.log('Whspr Voice Input updated to version', chrome.runtime.getManifest().version);
  }
});
