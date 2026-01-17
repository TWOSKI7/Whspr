import { useState } from 'react';
import { TranscriptionEntry } from '../contexts/SettingsContext';
import { useSettings } from '../contexts/SettingsContext';

// Format duration in mm:ss format
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Format date for display
function formatDate(date: Date): string {
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

// Individual history item component
interface HistoryItemProps {
  entry: TranscriptionEntry;
  onDelete: (id: string) => void;
  onCopy: (text: string) => void;
  onExport: (entry: TranscriptionEntry) => void;
}

function HistoryItem({ entry, onDelete, onCopy, onExport }: HistoryItemProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusColor = (status: TranscriptionEntry['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-500';
      case 'processing':
        return 'text-blue-500';
      case 'pending':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: TranscriptionEntry['status']) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'processing':
        return '⟳';
      case 'pending':
        return '○';
      case 'error':
        return '✕';
      default:
        return '?';
    }
  };

  return (
    <div className="history-item border rounded-lg p-4 mb-3 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`${getStatusColor(entry.status)} font-medium`}>
              {getStatusIcon(entry.status)}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(entry.timestamp)}
            </span>
            {entry.language && (
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                {entry.language.toUpperCase()}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {formatDuration(entry.duration)}
            </span>
          </div>

          <div
            className={`text-gray-800 dark:text-gray-200 ${expanded ? '' : 'line-clamp-3'}`}
            onClick={() => setExpanded(!expanded)}
          >
            {entry.status === 'error' ? (
              <span className="text-red-500">{entry.error || 'Transcription failed'}</span>
            ) : entry.status === 'processing' ? (
              <span className="text-blue-500 animate-pulse">Processing...</span>
            ) : entry.status === 'pending' ? (
              <span className="text-yellow-500">Waiting to process...</span>
            ) : (
              entry.text || <span className="text-gray-400 italic">No transcription</span>
            )}
          </div>

          {entry.text && entry.text.length > 200 && (
            <button
              className="text-sm text-blue-500 hover:text-blue-600 mt-1"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 ml-4">
          {entry.status === 'completed' && (
            <>
              <button
                onClick={() => onCopy(entry.text)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Copy to clipboard"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => onExport(entry)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                title="Export"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => onDelete(entry.id)}
            className="p-2 text-red-400 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Segments (if available and expanded) */}
      {expanded && entry.segments && entry.segments.length > 0 && (
        <div className="mt-4 pt-4 border-t dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">
            Segments ({entry.segments.length})
          </h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {entry.segments.map((segment) => (
              <div
                key={segment.id}
                className="flex items-start gap-3 text-sm p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
              >
                <span className="text-gray-400 font-mono text-xs whitespace-nowrap">
                  {formatDuration(segment.start)} - {formatDuration(segment.end)}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{segment.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Main History component
export default function History() {
  const { history, removeFromHistory, clearHistory, settings } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [copyNotification, setCopyNotification] = useState(false);

  // Filter history based on search
  const filteredHistory = history.filter(
    (entry) =>
      entry.text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.language?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Copy text to clipboard
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Export transcription
  const handleExport = (entry: TranscriptionEntry) => {
    let content: string;
    let filename: string;
    let mimeType: string;

    const baseFilename = `transcription-${entry.id.slice(0, 8)}`;

    switch (settings.outputFormat) {
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
    <div className="history-container p-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
          Transcription History
        </h2>
        {history.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear all history?')) {
                clearHistory();
              }
            }}
            className="text-sm text-red-500 hover:text-red-600 transition-colors"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Search bar */}
      {history.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search transcriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Copy notification */}
      {copyNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          Copied to clipboard!
        </div>
      )}

      {/* History list */}
      {filteredHistory.length > 0 ? (
        <div className="history-list">
          {filteredHistory.map((entry) => (
            <HistoryItem
              key={entry.id}
              entry={entry}
              onDelete={removeFromHistory}
              onCopy={handleCopy}
              onExport={handleExport}
            />
          ))}
        </div>
      ) : history.length > 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <p>No transcriptions match your search.</p>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          <svg
            className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-lg font-medium">No transcriptions yet</p>
          <p className="text-sm mt-1">
            Record or upload audio to get started
          </p>
        </div>
      )}
    </div>
  );
}

// Helper function to generate SRT format
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

// Helper function to generate VTT format
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

// Format time for SRT (00:00:00,000)
function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

// Format time for VTT (00:00:00.000)
function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}
