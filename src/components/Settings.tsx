import {
  useSettings,
  WHISPER_MODELS,
  SUPPORTED_LANGUAGES,
} from '../contexts/SettingsContext';

export default function Settings() {
  const {
    settings,
    updateSettings,
    resetSettings,
    backendStatus,
    checkBackendConnection,
  } = useSettings();

  return (
    <div className="page settings-page">
      <h1 className="page-title">Settings</h1>

      {/* Backend Connection */}
      <section className="card">
        <h2 className="card-title">Backend Connection</h2>

        <div className="setting-row">
          <label className="setting-label">Backend URL</label>
          <div className="setting-input-row">
            <input
              type="text"
              value={settings.backendUrl}
              onChange={(e) => updateSettings({ backendUrl: e.target.value })}
              className="text-input-small"
              placeholder="http://localhost:8000"
            />
            <button
              onClick={() => checkBackendConnection()}
              className="btn btn-secondary"
            >
              Test
            </button>
          </div>
        </div>

        <div className="connection-status">
          <span className={`status-dot ${backendStatus.connected ? 'connected' : 'disconnected'}`} />
          <div className="status-info">
            <span className="status-text">
              {backendStatus.connected ? 'Connected' : 'Disconnected'}
            </span>
            {backendStatus.connected && backendStatus.version && (
              <span className="status-detail">
                v{backendStatus.version} {backendStatus.gpuAvailable && '| GPU'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Transcription Settings */}
      <section className="card">
        <h2 className="card-title">Transcription</h2>

        <div className="setting-row">
          <label className="setting-label">Model</label>
          <select
            value={settings.model}
            onChange={(e) => updateSettings({ model: e.target.value as typeof settings.model })}
            className="select-input"
          >
            {WHISPER_MODELS.map((model) => (
              <option key={model.name} value={model.name}>
                {model.name} - {model.parameters} ({model.speed})
              </option>
            ))}
          </select>
          <p className="setting-hint">Larger models are more accurate but slower</p>
        </div>

        <div className="setting-row">
          <label className="setting-label">Language</label>
          <select
            value={settings.language}
            onChange={(e) => updateSettings({ language: e.target.value })}
            className="select-input"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-row">
          <label className="setting-label">Default Export Format</label>
          <select
            value={settings.outputFormat}
            onChange={(e) => updateSettings({ outputFormat: e.target.value as typeof settings.outputFormat })}
            className="select-input"
          >
            <option value="text">Plain Text (.txt)</option>
            <option value="json">JSON (.json)</option>
            <option value="srt">SubRip Subtitle (.srt)</option>
            <option value="vtt">WebVTT (.vtt)</option>
          </select>
        </div>

        <div className="setting-row toggle-row">
          <div className="setting-label-group">
            <label className="setting-label">Word-level Timestamps</label>
            <p className="setting-hint">Include timing for individual words</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.wordTimestamps}
              onChange={(e) => updateSettings({ wordTimestamps: e.target.checked })}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </section>

      {/* Advanced Settings */}
      <section className="card">
        <h2 className="card-title">Advanced</h2>

        <div className="setting-row">
          <div className="range-header">
            <label className="setting-label">Temperature</label>
            <span className="range-value">{settings.temperature}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={settings.temperature}
            onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
            className="range-input"
          />
          <p className="setting-hint">Lower values = more deterministic output</p>
        </div>

        <div className="setting-row">
          <div className="range-header">
            <label className="setting-label">No Speech Threshold</label>
            <span className="range-value">{settings.noSpeechThreshold}</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.noSpeechThreshold}
            onChange={(e) => updateSettings({ noSpeechThreshold: parseFloat(e.target.value) })}
            className="range-input"
          />
          <p className="setting-hint">Higher values are stricter</p>
        </div>
      </section>

      {/* Appearance */}
      <section className="card">
        <h2 className="card-title">Appearance</h2>

        <div className="setting-row">
          <label className="setting-label">Theme</label>
          <div className="theme-buttons">
            {(['light', 'dark', 'system'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => updateSettings({ theme })}
                className={`theme-btn ${settings.theme === theme ? 'active' : ''}`}
              >
                {theme === 'light' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5" />
                    <line x1="12" y1="1" x2="12" y2="3" />
                    <line x1="12" y1="21" x2="12" y2="23" />
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                    <line x1="1" y1="12" x2="3" y2="12" />
                    <line x1="21" y1="12" x2="23" y2="12" />
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                  </svg>
                )}
                {theme === 'dark' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                  </svg>
                )}
                {theme === 'system' && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                )}
                <span className="capitalize">{theme}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Reset */}
      <section className="card">
        <button
          onClick={() => {
            if (window.confirm('Reset all settings to defaults?')) {
              resetSettings();
            }
          }}
          className="btn btn-danger"
        >
          Reset to Defaults
        </button>
      </section>
    </div>
  );
}
