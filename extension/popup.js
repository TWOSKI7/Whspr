// Whspr Voice Input Popup Script

const BACKEND_URL = 'http://localhost:5000';

// Elements
const connectionStatus = document.getElementById('connection-status');
const modelSelect = document.getElementById('model-select');
const settingHelp = document.querySelector('.setting-help');

// Check backend health
async function checkBackendHealth() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/health`, {
      method: 'GET',
      mode: 'cors'
    });

    if (response.ok) {
      connectionStatus.textContent = 'Connected';
      connectionStatus.className = 'status-value connected';
      return true;
    } else {
      throw new Error('Backend not responding');
    }
  } catch (error) {
    connectionStatus.textContent = 'Disconnected';
    connectionStatus.className = 'status-value disconnected';
    settingHelp.textContent = 'Backend not running. Start Whspr backend at localhost:5000';
    return false;
  }
}

// Fetch available models
async function fetchModels() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/models`, {
      method: 'GET',
      mode: 'cors'
    });

    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }

    const data = await response.json();
    const models = data.models || [];

    if (models.length === 0) {
      settingHelp.textContent = 'No models available. Configure models in backend.';
      return;
    }

    // Clear and populate model select
    modelSelect.innerHTML = '';
    models.forEach(model => {
      const option = document.createElement('option');
      option.value = model.id || model.name || model;
      option.textContent = formatModelName(model.name || model);
      modelSelect.appendChild(option);
    });

    // Load saved selection
    chrome.storage.local.get(['selectedModel'], (result) => {
      if (result.selectedModel) {
        modelSelect.value = result.selectedModel;
      } else {
        // Default to first model
        modelSelect.value = models[0].id || models[0].name || models[0];
      }
    });

    settingHelp.textContent = `${models.length} model(s) available. Select your preferred model.`;

  } catch (error) {
    console.error('Error fetching models:', error);
    settingHelp.textContent = 'Could not load models. Check backend connection.';
  }
}

// Format model name for display
function formatModelName(name) {
  // Convert model ID to friendly name
  const nameMap = {
    'tiny': 'Tiny (Fastest, least accurate)',
    'tiny.en': 'Tiny English (Fastest, English only)',
    'base': 'Base (Fast, good balance)',
    'base.en': 'Base English (Fast, English only)',
    'small': 'Small (Slower, more accurate)',
    'small.en': 'Small English (English only)',
    'medium': 'Medium (Slow, very accurate)',
    'medium.en': 'Medium English (English only)',
    'large': 'Large (Slowest, best accuracy)',
    'large-v1': 'Large v1 (Best accuracy)',
    'large-v2': 'Large v2 (Best accuracy)',
    'large-v3': 'Large v3 (Best accuracy)'
  };

  return nameMap[name] || name.charAt(0).toUpperCase() + name.slice(1);
}

// Save model selection
modelSelect.addEventListener('change', () => {
  const selectedModel = modelSelect.value;
  chrome.storage.local.set({ selectedModel }, () => {
    console.log('Model saved:', selectedModel);
  });
});

// Initialize popup
async function initialize() {
  const isConnected = await checkBackendHealth();
  if (isConnected) {
    await fetchModels();
  }
}

// Run initialization
initialize();

// Refresh connection status every 5 seconds
setInterval(checkBackendHealth, 5000);
