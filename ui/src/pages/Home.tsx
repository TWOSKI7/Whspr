import { Mic, Keyboard, Cpu, Command } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { formatShortcut } from '../utils/helpers';

interface HomeProps {
  usageSeconds: number;
  maxSeconds: number;
}

export default function Home({ usageSeconds, maxSeconds }: HomeProps) {
  const { settings, updateModel } = useSettings();
  const usagePercent = Math.round((usageSeconds / maxSeconds) * 100);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold cyber-heading">Home</h2>

      <div className="max-w-2xl space-y-6">
        {/* Quick Start */}
        <div className="cyber-card">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-orange-500/20 rounded-xl">
              <Mic className="text-orange-500 cyber-glow-breathe" size={32} />
            </div>
            <div>
              <h3 className="text-lg font-medium text-zinc-100">Ready to transcribe</h3>
              <p className="text-sm text-zinc-400 mt-1">
                Press <kbd className="bg-zinc-800 px-2 py-0.5 rounded border border-zinc-700 text-orange-400 font-mono text-xs">{formatShortcut(settings.shortcut)}</kbd> to start recording
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium" style={{ color: 'var(--cyber-text-muted)' }}>Quick Start Guide</h3>
          <div className="grid grid-cols-2 gap-3">
            {/* Tip 1 */}
            <div className="cyber-card-flat p-4 flex gap-3">
              <div className="flex-shrink-0">
                <Keyboard size={16} style={{ color: 'var(--cyber-text-muted)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--cyber-text-muted)' }}>
                  Press the configured keyboard shortcut to start recording
                </p>
              </div>
            </div>

            {/* Tip 2 */}
            <div className="cyber-card-flat p-4 flex gap-3">
              <div className="flex-shrink-0">
                <Mic size={16} style={{ color: 'var(--cyber-text-muted)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--cyber-text-muted)' }}>
                  Speak clearly into your microphone
                </p>
              </div>
            </div>

            {/* Tip 3 */}
            <div className="cyber-card-flat p-4 flex gap-3">
              <div className="flex-shrink-0">
                <Cpu size={16} style={{ color: 'var(--cyber-text-muted)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--cyber-text-muted)' }}>
                  Text will be transcribed using the selected Whisper model
                </p>
              </div>
            </div>

            {/* Tip 4 */}
            <div className="cyber-card-flat p-4 flex gap-3">
              <div className="flex-shrink-0">
                <Command size={16} style={{ color: 'var(--cyber-text-muted)' }} />
              </div>
              <div>
                <p className="text-xs" style={{ color: 'var(--cyber-text-muted)' }}>
                  Use Ctrl+K to open the command palette
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcut Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Keyboard size={18} className="text-orange-500" />
            <h3 className="text-lg font-medium cyber-heading">Keyboard shortcut</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            Press this key to start/stop recording. Currently set to:
          </p>

          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <input
                type="text"
                value={formatShortcut(settings.shortcut)}
                readOnly
                className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-4 py-2 text-orange-400 font-mono text-sm focus:outline-none"
              />
            </div>
            <div className="px-4 py-2 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg">
              Go to Settings to change
            </div>
          </div>
        </div>

        {/* Model Selection Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Cpu size={18} className="text-orange-500" />
            <h3 className="text-lg font-medium cyber-heading">Whisper Model</h3>
          </div>
          <p className="text-zinc-400 text-sm mb-4">
            Larger models are more accurate but slower.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {['tiny', 'base', 'small', 'medium', 'turbo', 'large'].map((model) => (
              <button
                key={model}
                onClick={() => updateModel(model)}
                className={model === settings.model ? 'cyber-button-primary' : 'cyber-button'}
              >
                {model}
              </button>
            ))}
          </div>
        </div>

        {/* Usage Card */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-medium mb-2 cyber-heading">Session Usage</h3>
          <p className="text-zinc-400 text-sm mb-4">
            Audio transcribed this session.
          </p>

          <div className="flex justify-end text-xs text-orange-400 font-mono mb-2">
            {usageSeconds} / {maxSeconds} seconds
          </div>

          <div className="cyber-progress-track">
            <div
              className="cyber-progress-bar"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
        </div>

        <div className="text-xs text-zinc-500">
          <p>Powered by OpenAI Whisper - Running locally</p>
        </div>
      </div>
    </div>
  );
}
