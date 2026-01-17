import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export default function Home() {
  const { settings, updateSettings } = useSettings();
  const [shortcut, setShortcut] = useState(settings.keyboardShortcut || 'Shift+T');
  const [isEditingShortcut, setIsEditingShortcut] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isEditingShortcut) return;
    e.preventDefault();

    const keys: string[] = [];
    if (e.ctrlKey) keys.push('Ctrl');
    if (e.altKey) keys.push('Alt');
    if (e.shiftKey) keys.push('Shift');
    if (e.metaKey) keys.push('Cmd');

    if (e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Meta') {
      keys.push(e.key.toUpperCase());
    }

    if (keys.length > 0) {
      setShortcut(keys.join('+'));
    }
  };

  const saveShortcut = () => {
    updateSettings({ keyboardShortcut: shortcut });
    setIsEditingShortcut(false);
  };

  const resetShortcut = () => {
    setShortcut('Shift+T');
    updateSettings({ keyboardShortcut: 'Shift+T' });
    setIsEditingShortcut(false);
  };

  // Calculate used time (mock data - would come from actual usage)
  const usedSeconds = 109;
  const totalSeconds = 1600;
  const progressPercent = (usedSeconds / totalSeconds) * 100;

  return (
    <div className="page home-page">
      <h1 className="page-title">Home</h1>

      {/* Keyboard Shortcut Section */}
      <section className="card">
        <h2 className="card-title">Change keyboard shortcut</h2>
        <p className="card-description">
          Click on the input and click on the new shortcut you want to use. Hold all keys down at the same time.
        </p>

        <div className="shortcut-row">
          <input
            type="text"
            className="shortcut-input"
            value={shortcut}
            readOnly
            onFocus={() => setIsEditingShortcut(true)}
            onBlur={() => setTimeout(() => setIsEditingShortcut(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Press keys..."
          />
          <button className="btn btn-primary" onClick={saveShortcut}>
            Save Shortcut
          </button>
          <button className="btn btn-secondary" onClick={resetShortcut}>
            Reset Shortcut
          </button>
        </div>
      </section>

      {/* Recording Time Section */}
      <section className="card">
        <h2 className="card-title">Free Recording Time</h2>
        <p className="card-description">
          Every Whspr transcription uses processing power, so we limit the free recording time.
        </p>

        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="progress-text">{usedSeconds} / {totalSeconds} seconds</span>
        </div>

        <h3 className="subsection-title">Log in to get extra minutes</h3>

        <button className="google-sign-in-btn">
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span>Sign in</span>
        </button>
      </section>

      {/* Contact Support */}
      <section className="card">
        <h2 className="card-title">Contact support</h2>
        <p className="card-description">
          Please email us at <a href="mailto:support@whspr.app" className="link">support@whspr.app</a> for any support queries.
        </p>
      </section>
    </div>
  );
}
