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
    <div className="settings-container max-w-2xl mx-auto">
      <div className="card p-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">
          Settings
        </h2>

        {/* Backend Connection */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            Backend Connection
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Backend URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={settings.backendUrl}
                  onChange={(e) => updateSettings({ backendUrl: e.target.value })}
                  className="input flex-1"
                  placeholder="http://localhost:8000"
                />
                <button
                  onClick={() => checkBackendConnection()}
                  className="btn btn-secondary whitespace-nowrap"
                >
                  Test Connection
                </button>
              </div>
            </div>

            <div className="flex items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <span
                className={`w-3 h-3 rounded-full mr-3 ${
                  backendStatus.connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <div>
                <p className="font-medium text-gray-800 dark:text-white">
                  {backendStatus.connected ? 'Connected' : 'Disconnected'}
                </p>
                {backendStatus.connected && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {backendStatus.version && `Version: ${backendStatus.version}`}
                    {backendStatus.gpuAvailable && ' | GPU accelerated'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Transcription Settings */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            Transcription
          </h3>

          <div className="space-y-4">
            {/* Model Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Model
              </label>
              <select
                value={settings.model}
                onChange={(e) => updateSettings({ model: e.target.value as typeof settings.model })}
                className="input"
              >
                {WHISPER_MODELS.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.name} ({model.parameters} params, {model.speed} speed, {model.vram} VRAM)
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Larger models are more accurate but slower. Turbo is recommended for most use cases.
              </p>
            </div>

            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value })}
                className="input"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name} {lang.code !== 'auto' && `(${lang.code})`}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Auto-detect works well for most audio. Specifying the language can improve accuracy.
              </p>
            </div>

            {/* Output Format */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Output Format (for export)
              </label>
              <select
                value={settings.outputFormat}
                onChange={(e) =>
                  updateSettings({ outputFormat: e.target.value as typeof settings.outputFormat })
                }
                className="input"
              >
                <option value="text">Plain Text (.txt)</option>
                <option value="json">JSON (.json)</option>
                <option value="srt">SubRip Subtitle (.srt)</option>
                <option value="vtt">WebVTT (.vtt)</option>
              </select>
            </div>

            {/* Word Timestamps */}
            <div className="flex items-center justify-between">
              <div>
                <label className="font-medium text-gray-700 dark:text-gray-300">
                  Word-level Timestamps
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Include timing for individual words
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.wordTimestamps}
                  onChange={(e) => updateSettings({ wordTimestamps: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>
        </section>

        {/* Advanced Settings */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            Advanced
          </h3>

          <div className="space-y-4">
            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                Temperature: {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => updateSettings({ temperature: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Lower values make the output more deterministic. 0 is recommended.
              </p>
            </div>

            {/* No Speech Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                No Speech Threshold: {settings.noSpeechThreshold}
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={settings.noSpeechThreshold}
                onChange={(e) =>
                  updateSettings({ noSpeechThreshold: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Threshold for detecting segments without speech. Higher values are stricter.
              </p>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="mb-8">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-4">
            Appearance
          </h3>

          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              Theme
            </label>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => updateSettings({ theme })}
                  className={`flex-1 py-2 px-4 rounded-lg border transition-all ${
                    settings.theme === theme
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <span className="capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Reset Button */}
        <div className="pt-4 border-t dark:border-gray-700">
          <button
            onClick={() => {
              if (window.confirm('Reset all settings to defaults?')) {
                resetSettings();
              }
            }}
            className="btn btn-secondary"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}
