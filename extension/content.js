// Whspr Voice Input Content Script
// Injects floating mic button and handles voice recording for any text input

(function() {
  'use strict';

  const BACKEND_URL = 'http://localhost:5000';
  let currentFocusedElement = null;
  let floatingButton = null;
  let recordingOverlay = null;
  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;
  let hideButtonTimeout = null;
  let selectedModel = 'base';

  // Load selected model from storage
  chrome.storage.local.get(['selectedModel'], (result) => {
    if (result.selectedModel) {
      selectedModel = result.selectedModel;
    }
  });

  // Listen for model changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.selectedModel) {
      selectedModel = changes.selectedModel.newValue;
    }
  });

  // Check if element is a text input
  function isTextInput(element) {
    if (!element) return false;

    const tagName = element.tagName.toLowerCase();

    // Standard inputs
    if (tagName === 'input') {
      const type = element.type.toLowerCase();
      return ['text', 'search', 'email', 'url', 'tel', 'password'].includes(type);
    }

    // Textarea
    if (tagName === 'textarea') return true;

    // Contenteditable
    if (element.isContentEditable) return true;

    return false;
  }

  // Create floating mic button
  function createFloatingButton() {
    const button = document.createElement('div');
    button.id = 'whspr-floating-mic';
    button.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z" fill="currentColor"/>
        <path d="M19 10V12C19 15.87 15.87 19 12 19C8.13 19 5 15.87 5 12V10H3V12C3 16.97 6.84 21.13 11.75 21.92V25H12.25V21.92C17.16 21.13 21 16.97 21 12V10H19Z" fill="currentColor"/>
      </svg>
    `;
    button.title = 'Click to start voice input (Alt+V)';
    return button;
  }

  // Create recording overlay
  function createRecordingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'whspr-recording-overlay';
    overlay.innerHTML = `
      <div class="whspr-status-text">Listening...</div>
      <div class="whspr-waveform">
        <span class="whspr-bar"></span>
        <span class="whspr-bar"></span>
        <span class="whspr-bar"></span>
        <span class="whspr-bar"></span>
        <span class="whspr-bar"></span>
      </div>
    `;
    return overlay;
  }

  // Create processing overlay
  function createProcessingOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'whspr-recording-overlay';
    overlay.classList.add('processing');
    overlay.innerHTML = `
      <div class="whspr-spinner"></div>
      <div class="whspr-status-text">Processing...</div>
    `;
    return overlay;
  }

  // Position button relative to focused element
  function positionButton(element) {
    if (!element || !floatingButton) return;

    const rect = element.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    // Position to the right of the input
    const left = rect.right + scrollX + 8;
    const top = rect.top + scrollY + (rect.height / 2) - 20;

    floatingButton.style.left = `${left}px`;
    floatingButton.style.top = `${top}px`;
    floatingButton.style.display = 'flex';
  }

  // Show floating button for focused input
  function showFloatingButton(element) {
    if (!isTextInput(element)) return;

    currentFocusedElement = element;

    if (!floatingButton) {
      floatingButton = createFloatingButton();
      document.body.appendChild(floatingButton);

      floatingButton.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleRecording();
      });
    }

    positionButton(element);
    clearTimeout(hideButtonTimeout);
  }

  // Hide floating button
  function hideFloatingButton(immediate = false) {
    if (!floatingButton) return;

    const hide = () => {
      if (floatingButton && !isRecording) {
        floatingButton.style.display = 'none';
      }
    };

    if (immediate) {
      hide();
    } else {
      // Delay to allow button clicks
      hideButtonTimeout = setTimeout(hide, 200);
    }
  }

  // Start recording
  async function startRecording() {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];

      mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      isRecording = true;

      // Show recording overlay
      if (floatingButton) {
        floatingButton.style.display = 'none';
      }
      recordingOverlay = createRecordingOverlay();
      document.body.appendChild(recordingOverlay);

      // Update button state
      if (floatingButton) {
        floatingButton.classList.add('recording');
      }

    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Failed to access microphone. Please grant permission.');
    }
  }

  // Stop recording
  function stopRecording() {
    if (!isRecording || !mediaRecorder) return;

    isRecording = false;
    mediaRecorder.stop();

    // Remove recording overlay
    if (recordingOverlay) {
      recordingOverlay.remove();
      recordingOverlay = null;
    }

    // Update button state
    if (floatingButton) {
      floatingButton.classList.remove('recording');
    }
  }

  // Toggle recording
  function toggleRecording() {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }

  // Transcribe audio via backend
  async function transcribeAudio(audioBlob) {
    // Show processing overlay
    const processingOverlay = createProcessingOverlay();
    document.body.appendChild(processingOverlay);

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model', selectedModel);

      const response = await fetch(`${BACKEND_URL}/api/transcribe`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.statusText}`);
      }

      const data = await response.json();
      const text = data.text || data.transcription || '';

      if (text.trim()) {
        insertTextAtCursor(text.trim());
      }

    } catch (error) {
      console.error('Error transcribing audio:', error);
      alert('Failed to transcribe audio. Make sure Whspr backend is running at localhost:5000');
    } finally {
      // Remove processing overlay
      processingOverlay.remove();

      // Show button again if element still focused
      if (currentFocusedElement && document.activeElement === currentFocusedElement) {
        if (floatingButton) {
          positionButton(currentFocusedElement);
        }
      }
    }
  }

  // Insert text at cursor position
  function insertTextAtCursor(text) {
    const element = currentFocusedElement;
    if (!element) return;

    // Try document.execCommand first (best for undo support)
    if (document.execCommand) {
      element.focus();
      const success = document.execCommand('insertText', false, text);
      if (success) {
        // Trigger events for React and other frameworks
        triggerInputEvents(element);
        return;
      }
    }

    // Handle contenteditable
    if (element.isContentEditable) {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
        triggerInputEvents(element);
        return;
      }
    }

    // Handle input/textarea
    if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      const start = element.selectionStart || 0;
      const end = element.selectionEnd || 0;
      const before = element.value.substring(0, start);
      const after = element.value.substring(end);

      element.value = before + text + after;
      element.selectionStart = element.selectionEnd = start + text.length;

      triggerInputEvents(element);
    }
  }

  // Trigger input events for React and other frameworks
  function triggerInputEvents(element) {
    // Native events
    const inputEvent = new Event('input', { bubbles: true, cancelable: true });
    const changeEvent = new Event('change', { bubbles: true, cancelable: true });

    element.dispatchEvent(inputEvent);
    element.dispatchEvent(changeEvent);

    // React-specific events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;

    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value'
    )?.set;

    if (element.tagName === 'INPUT' && nativeInputValueSetter) {
      nativeInputValueSetter.call(element, element.value);
    } else if (element.tagName === 'TEXTAREA' && nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(element, element.value);
    }

    element.dispatchEvent(new Event('input', { bubbles: true }));
  }

  // Listen for focus events
  document.addEventListener('focusin', (e) => {
    if (isTextInput(e.target)) {
      showFloatingButton(e.target);
    }
  });

  document.addEventListener('focusout', (e) => {
    if (isTextInput(e.target)) {
      hideFloatingButton();
    }
  });

  // Handle scroll and resize
  window.addEventListener('scroll', () => {
    if (currentFocusedElement && document.activeElement === currentFocusedElement) {
      positionButton(currentFocusedElement);
    }
  }, { passive: true });

  window.addEventListener('resize', () => {
    if (currentFocusedElement && document.activeElement === currentFocusedElement) {
      positionButton(currentFocusedElement);
    }
  });

  // Listen for keyboard shortcut from background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'toggle-recording') {
      // Only toggle if a text input is focused
      if (currentFocusedElement && isTextInput(document.activeElement)) {
        toggleRecording();
      }
    }
  });

  // Initialize on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isTextInput(document.activeElement)) {
        showFloatingButton(document.activeElement);
      }
    });
  } else {
    if (isTextInput(document.activeElement)) {
      showFloatingButton(document.activeElement);
    }
  }

})();
