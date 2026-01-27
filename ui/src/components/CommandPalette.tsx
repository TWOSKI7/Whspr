import { useState, useEffect, useRef } from 'react';
import { Command, Mic, Settings, History, FileText, X } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { formatShortcut } from '../utils/helpers';

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onCommand: (command: string) => void;
}

export default function CommandPalette({ isOpen, onClose, onCommand }: CommandPaletteProps) {
  const { settings } = useSettings();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const shortcutDisplay = formatShortcut(settings.shortcut);

  const commands: CommandItem[] = [
    { id: 'record', label: 'Start Recording', icon: Mic, shortcut: shortcutDisplay, action: () => onCommand('record') },
    { id: 'stop', label: 'Stop Recording', icon: Mic, shortcut: shortcutDisplay, action: () => onCommand('stop') },
    { id: 'settings', label: 'Open Settings', icon: Settings, action: () => onCommand('settings') },
    { id: 'history', label: 'View History', icon: History, action: () => onCommand('history') },
    { id: 'copy', label: 'Copy Last Transcription', icon: FileText, shortcut: '⌘C', action: () => onCommand('copy') },
    { id: 'clear', label: 'Clear Transcriptions', icon: X, action: () => onCommand('clear') },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="cyber-overlay"
        onClick={onClose}
      />

      {/* Palette */}
      <div className="relative w-full max-w-lg cyber-card overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800">
          <Command size={18} className="text-orange-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command..."
            className="flex-1 bg-transparent text-zinc-100 placeholder-zinc-500 outline-none text-sm cyber-input"
            style={{ border: 'none', padding: '0', background: 'transparent' }}
          />
          <kbd className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">ESC</kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-64 overflow-y-auto py-2">
          {filteredCommands.length === 0 ? (
            <div className="px-4 py-8 text-center text-zinc-500 text-sm">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => {
                  cmd.action();
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors
                  ${index === selectedIndex
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                style={index === selectedIndex ? { boxShadow: 'var(--cyber-border-glow)' } : undefined}
              >
                <cmd.icon size={16} />
                <span className="flex-1 text-left">{cmd.label}</span>
                {cmd.shortcut && (
                  <kbd className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
                    {cmd.shortcut}
                  </kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
