import { useState } from 'react';
import { Trash2, Copy, Check, Clock, Search } from 'lucide-react';
import { useSettings, type TranscriptionEntry } from '../contexts/SettingsContext';
import { formatShortcut, copyToClipboard } from '../utils/helpers';

export default function History() {
  const { settings, deleteTranscription, clearHistory } = useSettings();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredHistory = settings.history.filter(entry =>
    entry.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = async (entry: TranscriptionEntry) => {
    const success = await copyToClipboard(entry.text);
    if (success) {
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to delete all transcriptions? This cannot be undone.')) {
      clearHistory();
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - timestamp;

    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="cyber-heading text-2xl" style={{ color: 'var(--cyber-primary)' }}>History</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--cyber-text-muted)' }}>
            {settings.history.length} transcription{settings.history.length !== 1 ? 's' : ''} saved
          </p>
        </div>
        {settings.history.length > 0 && (
          <button
            onClick={handleClearAll}
            className="text-sm transition-colors flex items-center gap-2"
            style={{ color: 'var(--cyber-text-muted)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cyber-error)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cyber-text-muted)'}
          >
            <Trash2 size={14} />
            Clear all
          </button>
        )}
      </div>

      {/* Search */}
      {settings.history.length > 0 && (
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--cyber-text-dim)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcriptions..."
            className="cyber-input pl-10"
          />
        </div>
      )}

      {/* History List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--cyber-text-dim)' }}>
          {settings.history.length === 0 ? (
            <>
              <Clock size={48} className="mx-auto mb-4 opacity-50" />
              <p>No transcriptions yet</p>
              <p className="text-sm mt-1">Press <kbd className="cyber-badge">{formatShortcut(settings.shortcut)}</kbd> to start recording</p>
            </>
          ) : (
            <p>No results for "{searchQuery}"</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((entry) => (
            <div
              key={entry.id}
              className="cyber-card-flat group"
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm flex-1 whitespace-pre-wrap" style={{ color: 'var(--cyber-text-main)' }}>
                  {entry.text}
                </p>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(entry)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--cyber-text-muted)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cyber-bg-dark)';
                      e.currentTarget.style.color = 'var(--cyber-text-main)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--cyber-text-muted)';
                    }}
                    title="Copy"
                  >
                    {copiedId === entry.id ? (
                      <Check size={14} style={{ color: 'var(--cyber-success)' }} />
                    ) : (
                      <Copy size={14} />
                    )}
                  </button>
                  <button
                    onClick={() => deleteTranscription(entry.id)}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'transparent',
                      color: 'var(--cyber-text-muted)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cyber-bg-dark)';
                      e.currentTarget.style.color = 'var(--cyber-error)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--cyber-text-muted)';
                    }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3 mt-3 text-xs" style={{ color: 'var(--cyber-text-dim)' }}>
                <span>{formatTime(entry.timestamp)}</span>
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--cyber-text-dim)' }} />
                <span className="cyber-badge">{entry.model}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
