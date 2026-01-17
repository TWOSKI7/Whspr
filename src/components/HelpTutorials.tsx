import { useState } from 'react';

interface FAQ {
  question: string;
  answer: string;
}

export default function HelpTutorials() {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs: FAQ[] = [
    {
      question: 'How do I start recording?',
      answer:
        'You can start recording by pressing the keyboard shortcut (default: Shift+T) or by clicking the microphone button in the floating widget. The widget will show a pulsing animation when recording.',
    },
    {
      question: 'How do I change the keyboard shortcut?',
      answer:
        'Go to the Home page, click on the shortcut input field, and press the new key combination you want to use. Then click "Save Shortcut" to confirm.',
    },
    {
      question: 'What transcription models are available?',
      answer:
        'Whspr supports multiple Whisper models: tiny (fastest), base, small, medium, large (most accurate), and turbo (balanced). You can change the model in Settings.',
    },
    {
      question: 'How does the Dictionary feature work?',
      answer:
        'The Dictionary allows you to add custom word replacements. If Whisper often mishears a specific word, you can add it to the dictionary to automatically correct it in future transcriptions.',
    },
    {
      question: 'Can I use Whspr offline?',
      answer:
        'Yes! Once you download a Whisper model, transcription happens locally on your device. No internet connection is required for transcription.',
    },
    {
      question: 'How do I rewrite transcribed text?',
      answer:
        'Use the Rewrite Mode page. Paste your text, then either select a preset template (Formal, Casual, etc.) or click "Custom Reprompt" to enter your own instructions.',
    },
    {
      question: 'Where is my transcription history stored?',
      answer:
        'All transcription history is stored locally in your browser\'s storage. You can view and manage it from the History page.',
    },
    {
      question: 'How do I export my transcriptions?',
      answer:
        'In the History page, click on any transcription entry and use the export buttons to download as TXT, JSON, SRT, or VTT format.',
    },
  ];

  const shortcuts = [
    { keys: 'Shift + T', action: 'Start/Stop recording (default)' },
    { keys: 'Ctrl + C', action: 'Copy selected text' },
    { keys: 'Ctrl + V', action: 'Paste text' },
    { keys: 'Escape', action: 'Close modals/dialogs' },
  ];

  return (
    <div className="page help-page">
      <h1 className="page-title">Help & Tutorials</h1>

      {/* Quick Start */}
      <section className="card">
        <h2 className="card-title">Quick Start Guide</h2>
        <div className="quick-start-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h3>Configure Settings</h3>
              <p>Choose your preferred Whisper model and language in Settings.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h3>Start Recording</h3>
              <p>Press Shift+T or click the floating mic button to start.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h3>Speak Clearly</h3>
              <p>Speak into your microphone. Watch the pulse indicator.</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div className="step-content">
              <h3>Get Results</h3>
              <p>Stop recording and your text will appear automatically.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section className="card">
        <h2 className="card-title">Keyboard Shortcuts</h2>
        <div className="shortcuts-list">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="shortcut-row">
              <kbd className="shortcut-keys">{shortcut.keys}</kbd>
              <span className="shortcut-action">{shortcut.action}</span>
            </div>
          ))}
        </div>
      </section>

      {/* FAQs */}
      <section className="card">
        <h2 className="card-title">Frequently Asked Questions</h2>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`faq-item ${expandedFaq === index ? 'expanded' : ''}`}
            >
              <button
                className="faq-question"
                onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
              >
                <span>{faq.question}</span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="faq-chevron"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
              {expandedFaq === index && (
                <div className="faq-answer">{faq.answer}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section className="card">
        <h2 className="card-title">Need More Help?</h2>
        <p className="card-description">
          If you have questions not answered here, please reach out:
        </p>
        <div className="contact-links">
          <a href="mailto:support@whspr.app" className="contact-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            support@whspr.app
          </a>
          <a href="https://github.com/openai/whisper" target="_blank" rel="noopener noreferrer" className="contact-link">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            GitHub Repository
          </a>
        </div>
      </section>
    </div>
  );
}
