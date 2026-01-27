import { useState, useEffect, useRef } from 'react';
import { Settings, Keyboard, Cpu, Info, Palette } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { formatShortcut } from '../utils/helpers';
import { themes, setTheme, getCurrentTheme } from '../theme';

const MODELS = [
  { id: 'tiny', label: 'Tiny', vram: '~1GB', speed: 'Fastest' },
  { id: 'base', label: 'Base', vram: '~1GB', speed: 'Fast' },
  { id: 'small', label: 'Small', vram: '~2GB', speed: 'Medium' },
  { id: 'medium', label: 'Medium', vram: '~5GB', speed: 'Slow' },
  { id: 'turbo', label: 'Turbo', vram: '~6GB', speed: 'Fast', recommended: true },
  { id: 'large', label: 'Large', vram: '~10GB', speed: 'Slowest' },
];

export default function SettingsPage() {
  const { settings, updateShortcut, updateModel, updateUseWebSocket } = useSettings();
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(getCurrentTheme());
  const captureRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isCapturing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Build shortcut string
      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');
      if (e.metaKey) parts.push('Meta');

      // Add the key if it's not a modifier
      const key = e.key;
      if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        parts.push(key);
      }

      if (parts.length > 0 && !['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
        updateShortcut(parts.join('+'));
        setIsCapturing(false);
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (captureRef.current && !captureRef.current.contains(e.target as Node)) {
        setIsCapturing(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('click', handleClick);
    };
  }, [isCapturing, updateShortcut]);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      setCurrentTheme(customEvent.detail.theme);
    };

    window.addEventListener('cyber-theme-change', handleThemeChange);
    return () => {
      window.removeEventListener('cyber-theme-change', handleThemeChange);
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="cyber-heading text-2xl flex items-center gap-2" style={{ color: 'var(--cyber-primary)' }}>
          <Settings size={24} />
          Settings
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--cyber-text-muted)' }}>
          Configure your Whspr experience
        </p>
      </div>

      {/* Keyboard Shortcut */}
      <div className="cyber-card-flat">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--cyber-bg-dark)' }}>
            <Keyboard size={20} style={{ color: 'var(--cyber-primary)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium" style={{ color: 'var(--cyber-text-main)' }}>Recording Shortcut</h3>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--cyber-text-muted)' }}>
              Press this key combination to start/stop recording from anywhere
            </p>

            <div className="flex items-center gap-4">
              <button
                ref={captureRef}
                onClick={() => setIsCapturing(true)}
                className={`cyber-mono px-4 py-2.5 rounded-lg border text-sm transition-all ${
                  isCapturing ? 'animate-pulse' : ''
                }`}
                style={
                  isCapturing
                    ? {
                        backgroundColor: 'rgba(255, 136, 0, 0.2)',
                        borderColor: 'var(--cyber-primary)',
                        color: 'var(--cyber-primary)',
                      }
                    : {
                        backgroundColor: 'var(--cyber-bg-dark)',
                        borderColor: 'rgba(255, 136, 0, 0.3)',
                        color: 'var(--cyber-text-main)',
                      }
                }
                onMouseEnter={(e) => {
                  if (!isCapturing) {
                    e.currentTarget.style.borderColor = 'rgba(255, 136, 0, 0.5)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isCapturing) {
                    e.currentTarget.style.borderColor = 'rgba(255, 136, 0, 0.3)';
                  }
                }}
              >
                {isCapturing ? 'Press any key...' : formatShortcut(settings.shortcut)}
              </button>
              {!isCapturing && (
                <span className="text-xs" style={{ color: 'var(--cyber-text-dim)' }}>Click to change</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Theme Switcher */}
      <div className="cyber-card-flat">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--cyber-bg-dark)' }}>
            <Palette size={20} style={{ color: 'var(--cyber-primary)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium" style={{ color: 'var(--cyber-text-main)' }}>Theme</h3>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--cyber-text-muted)' }}>
              Choose your Cyber-Gourmet color theme
            </p>

            <div className="grid grid-cols-4 gap-4">
              {Object.entries(themes).map(([themeKey, themeData]) => (
                <button
                  key={themeKey}
                  onClick={() => setTheme(themeKey)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border transition-all"
                  style={{
                    borderColor: currentTheme === themeKey ? themeData.primary : 'rgba(255, 136, 0, 0.3)',
                    backgroundColor: currentTheme === themeKey ? `${themeData.primary}15` : 'transparent',
                    boxShadow: currentTheme === themeKey ? `0 0 4px 1px ${themeData.primary}, 0 0 12px 4px ${themeData.secondary}` : 'none',
                  }}
                  onMouseEnter={(e) => {
                    if (currentTheme !== themeKey) {
                      e.currentTarget.style.borderColor = 'rgba(255, 136, 0, 0.5)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (currentTheme !== themeKey) {
                      e.currentTarget.style.borderColor = 'rgba(255, 136, 0, 0.3)';
                    }
                  }}
                >
                  <div
                    className="w-12 h-12 rounded-full transition-all"
                    style={{
                      backgroundColor: themeData.primary,
                      boxShadow: currentTheme === themeKey
                        ? `0 0 15px ${themeData.primary}, 0 0 25px ${themeData.secondary}`
                        : `0 0 8px ${themeData.primary}`,
                    }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: currentTheme === themeKey ? themeData.primary : 'var(--cyber-text-muted)',
                    }}
                  >
                    {themeData.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection */}
      <div className="cyber-card-flat">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--cyber-bg-dark)' }}>
            <Cpu size={20} style={{ color: 'var(--cyber-primary)' }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium" style={{ color: 'var(--cyber-text-main)' }}>Whisper Model</h3>
            <p className="text-sm mt-1 mb-4" style={{ color: 'var(--cyber-text-muted)' }}>
              Larger models are more accurate but require more VRAM and are slower
            </p>

            <div className="grid grid-cols-3 gap-3">
              {MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => updateModel(model.id)}
                  className="relative px-4 py-3 rounded-xl border text-left transition-all"
                  style={
                    settings.model === model.id
                      ? {
                          backgroundColor: 'rgba(255, 136, 0, 0.2)',
                          borderColor: 'var(--cyber-primary)',
                          color: 'var(--cyber-primary)',
                        }
                      : {
                          borderColor: 'rgba(255, 136, 0, 0.3)',
                          color: 'var(--cyber-text-muted)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (settings.model !== model.id) {
                      e.currentTarget.style.borderColor = 'rgba(255, 136, 0, 0.5)';
                      e.currentTarget.style.color = 'var(--cyber-text-main)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (settings.model !== model.id) {
                      e.currentTarget.style.borderColor = 'rgba(255, 136, 0, 0.3)';
                      e.currentTarget.style.color = 'var(--cyber-text-muted)';
                    }
                  }}
                >
                  {model.recommended && (
                    <span className="absolute -top-2 -right-2 text-[10px] px-1.5 py-0.5 rounded" style={{
                      backgroundColor: 'var(--cyber-primary)',
                      color: 'var(--cyber-bg-dark)'
                    }}>
                      Recommended
                    </span>
                  )}
                  <div className="font-medium">{model.label}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {model.vram} • {model.speed}
                  </div>
                </button>
              ))}
            </div>

            {/* WebSocket Toggle */}
            <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(255, 136, 0, 0.2)' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h4 className="text-sm font-medium" style={{ color: 'var(--cyber-text-main)' }}>
                    WebSocket Streaming
                  </h4>
                  <p className="text-xs mt-1" style={{ color: 'var(--cyber-text-muted)' }}>
                    Stream audio in real-time for faster results
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.useWebSocket}
                    onChange={(e) => updateUseWebSocket(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div
                    className="w-11 h-6 rounded-full transition-all duration-200"
                    style={{
                      backgroundColor: settings.useWebSocket ? 'var(--cyber-primary)' : 'rgba(255, 136, 0, 0.2)',
                      boxShadow: settings.useWebSocket ? '0 0 8px var(--cyber-primary)' : 'none',
                    }}
                  >
                    <div
                      className="absolute top-0.5 left-0.5 bg-white rounded-full h-5 w-5 transition-all duration-200"
                      style={{
                        transform: settings.useWebSocket ? 'translateX(20px)' : 'translateX(0)',
                        boxShadow: settings.useWebSocket ? '0 0 4px var(--cyber-primary)' : '0 2px 4px rgba(0,0,0,0.2)',
                      }}
                    />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="rounded-xl p-4" style={{
        backgroundColor: 'rgba(10, 10, 15, 0.3)',
        border: '1px solid rgba(255, 136, 0, 0.1)'
      }}>
        <div className="flex items-start gap-3">
          <Info size={16} className="mt-0.5" style={{ color: 'var(--cyber-text-dim)' }} />
          <div className="text-sm" style={{ color: 'var(--cyber-text-dim)' }}>
            <p>Settings are automatically saved to your browser's local storage.</p>
            <p className="mt-1">Model changes take effect on the next transcription.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
