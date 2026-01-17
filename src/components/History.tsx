import { useState } from 'react';
import { TranscriptionEntry, useSettings } from '../contexts/SettingsContext';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (days < 7) {
    return `${days} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export default function History() {
  const { history, removeFromHistory, clearHistory } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntry, setSelectedEntry] = useState<TranscriptionEntry | null>(null);
  const [copyNotification, setCopyNotification] = useState(false);

  const filteredHistory = history.filter(
    (entry) =>
      entry.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.language?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleExport = (entry: TranscriptionEntry, format: string) => {
    let content: string;
    let filename: string;
    let mimeType: string;

    const baseFilename = `transcription-${entry.id.slice(0, 8)}`;

    switch (format) {
      case 'json':
        content = JSON.stringify(entry, null, 2);
        filename = `${baseFilename}.json`;
        mimeType = 'application/json';
        break;
      case 'srt':
        content = generateSRT(entry);
        filename = `${baseFilename}.srt`;
        mimeType = 'text/plain';
        break;
      case 'vtt':
        content = generateVTT(entry);
        filename = `${baseFilename}.vtt`;
        mimeType = 'text/vtt';
        break;
      default:
        content = entry.text;
        filename = `${baseFilename}.txt`;
        mimeType = 'text/plain';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="page history-page">
      <h1 className="page-title">History</h1>

      {/* Copy notification */}
      {copyNotification && (
        <div className="notification success">
          Copied to clipboard!
        </div>
      )}

      <section className="card">
        <div className="card-header-row">
          <h2 className="card-title">Transcription History ({history.length})</h2>
          {history.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all history?')) {
                  clearHistory();
                }
              }}
              className="btn btn-danger-text"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Search bar */}
        {history.length > 0 && (
          <div className="search-box full-width">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search transcriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        )}

        {/* History list */}
        {filteredHistory.length > 0 ? (
          <div className="history-list">
            {filteredHistory.map((entry) => (
              <div
                key={entry.id}
                className={`history-item ${selectedEntry?.id === entry.id ? 'selected' : ''}`}
                onClick={() => setSelectedEntry(selectedEntry?.id === entry.id ? null : entry)}
              >
                <div className="history-item-header">
                  <span className="history-date">{formatDate(entry.timestamp)}</span>
                  <div className="history-meta">
                    {entry.language && (
                      <span className="badge">{entry.language.toUpperCase()}</span>
                    )}
                    <span className="history-duration">{formatDuration(entry.duration)}</span>
                  </div>
                </div>
                <div className="history-text">
                  {entry.text || <span className="text-muted">No transcription</span>}
                </div>

                {/* Expanded actions */}
                {selectedEntry?.id === entry.id && (
                  <div className="history-actions">
                    <button className="btn btn-small" onClick={(e) => { e.stopPropagation(); handleCopy(entry.text); }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                      Copy
                    </button>
                    <div className="export-dropdown">
                      <span className="export-label">Export:</span>
                      <button className="btn btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); handleExport(entry, 'txt'); }}>TXT</button>
                      <button className="btn btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); handleExport(entry, 'json'); }}>JSON</button>
                      <button className="btn btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); handleExport(entry, 'srt'); }}>SRT</button>
                      <button className="btn btn-small btn-secondary" onClick={(e) => { e.stopPropagation(); handleExport(entry, 'vtt'); }}>VTT</button>
                    </div>
                    <button
                      className="btn btn-small btn-danger"
                      onClick={(e) => { e.stopPropagation(); removeFromHistory(entry.id); setSelectedEntry(null); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3,6 5,6 21,6" />
                        <path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2" />
                      </svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : history.length > 0 ? (
          <div className="empty-state">No transcriptions match your search.</div>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="empty-title">No transcriptions yet</p>
            <p className="empty-subtitle">Record or upload audio to get started</p>
          </div>
        )}
      </section>
    </div>
  );
}

function generateSRT(entry: TranscriptionEntry): string {
  if (!entry.segments || entry.segments.length === 0) {
    return `1\n00:00:00,000 --> 00:00:${Math.floor(entry.duration)},000\n${entry.text}\n`;
  }
  return entry.segments
    .map((segment, index) => {
      const start = formatSRTTime(segment.start);
      const end = formatSRTTime(segment.end);
      return `${index + 1}\n${start} --> ${end}\n${segment.text.trim()}\n`;
    })
    .join('\n');
}

function generateVTT(entry: TranscriptionEntry): string {
  if (!entry.segments || entry.segments.length === 0) {
    return `WEBVTT\n\n00:00:00.000 --> 00:00:${Math.floor(entry.duration)}.000\n${entry.text}\n`;
  }
  const cues = entry.segments
    .map((segment) => {
      const start = formatVTTTime(segment.start);
      const end = formatVTTTime(segment.end);
      return `${start} --> ${end}\n${segment.text.trim()}\n`;
    })
    .join('\n');
  return `WEBVTT\n\n${cues}`;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
