import { useState } from 'react';
import { Repeat, Copy, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { escapeRegex, copyToClipboard } from '../utils/helpers';

export default function ReplaceText() {
  const { settings } = useSettings();
  const [inputText, setInputText] = useState('');
  const [findText, setFindText] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [copied, setCopied] = useState(false);

  const getOutputText = (): string => {
    if (!inputText || !findText) return inputText;

    try {
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(findText, flags);
        return inputText.replace(regex, replaceWith);
      } else {
        if (caseSensitive) {
          return inputText.split(findText).join(replaceWith);
        } else {
          const regex = new RegExp(escapeRegex(findText), 'gi');
          return inputText.replace(regex, replaceWith);
        }
      }
    } catch {
      return inputText;
    }
  };

  const outputText = getOutputText();
  const matchCount = (() => {
    if (!inputText || !findText) return 0;
    try {
      if (useRegex) {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(findText, flags);
        return (inputText.match(regex) || []).length;
      } else {
        const flags = caseSensitive ? 'g' : 'gi';
        const regex = new RegExp(escapeRegex(findText), flags);
        return (inputText.match(regex) || []).length;
      }
    } catch {
      return 0;
    }
  })();

  const handleCopy = async () => {
    const success = await copyToClipboard(outputText);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const loadFromHistory = () => {
    if (settings.history.length > 0) {
      setInputText(settings.history[0].text);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="cyber-heading text-2xl flex items-center gap-2" style={{ color: 'var(--cyber-primary)' }}>
          <Repeat size={24} />
          Replace Text
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--cyber-text-muted)' }}>
          Find and replace text in your transcriptions
        </p>
      </div>

      {/* Input Text */}
      <div className="cyber-card-flat">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--cyber-text-main)' }}>
            Input Text
          </label>
          {settings.history.length > 0 && (
            <button
              onClick={loadFromHistory}
              className="text-xs transition-colors"
              style={{ color: 'var(--cyber-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cyber-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cyber-primary)'}
            >
              Load latest transcription
            </button>
          )}
        </div>
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste or type text here..."
          className="cyber-input cyber-textarea resize-none h-32"
        />
      </div>

      {/* Find and Replace */}
      <div className="cyber-card-flat">
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--cyber-text-main)' }}>
          Find and Replace
        </label>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find..."
              className="cyber-input"
            />
          </div>
          <ArrowRight size={20} className="flex-shrink-0" style={{ color: 'var(--cyber-text-dim)' }} />
          <div className="flex-1">
            <input
              type="text"
              value={replaceWith}
              onChange={(e) => setReplaceWith(e.target.value)}
              placeholder="Replace with..."
              className="cyber-input"
            />
          </div>
        </div>

        {/* Options */}
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--cyber-text-muted)' }}>
            <input
              type="checkbox"
              checked={caseSensitive}
              onChange={(e) => setCaseSensitive(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: 'var(--cyber-bg-dark)',
                borderColor: 'var(--cyber-text-dim)',
                accentColor: 'var(--cyber-primary)'
              }}
            />
            Case sensitive
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--cyber-text-muted)' }}>
            <input
              type="checkbox"
              checked={useRegex}
              onChange={(e) => setUseRegex(e.target.checked)}
              className="w-4 h-4 rounded"
              style={{
                backgroundColor: 'var(--cyber-bg-dark)',
                borderColor: 'var(--cyber-text-dim)',
                accentColor: 'var(--cyber-primary)'
              }}
            />
            Use regex
          </label>
          {findText && (
            <span className="text-xs ml-auto" style={{ color: 'var(--cyber-text-dim)' }}>
              {matchCount} match{matchCount !== 1 ? 'es' : ''} found
            </span>
          )}
        </div>
      </div>

      {/* Output */}
      <div className="cyber-card-flat">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium" style={{ color: 'var(--cyber-text-main)' }}>
            Result
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setInputText(outputText)}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: 'var(--cyber-text-muted)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cyber-text-main)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cyber-text-muted)'}
              title="Use result as input"
            >
              <RefreshCw size={12} />
              Apply
            </button>
            <button
              onClick={handleCopy}
              disabled={!outputText}
              className="text-xs flex items-center gap-1 transition-colors"
              style={{ color: !outputText ? 'var(--cyber-text-dim)' : 'var(--cyber-primary)', opacity: !outputText ? 0.5 : 1 }}
              onMouseEnter={(e) => !outputText ? null : e.currentTarget.style.color = 'var(--cyber-secondary)'}
              onMouseLeave={(e) => !outputText ? null : e.currentTarget.style.color = 'var(--cyber-primary)'}
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <div className="rounded-lg px-4 py-3 text-sm whitespace-pre-wrap min-h-[8rem]" style={{
          backgroundColor: 'var(--cyber-bg-dark)',
          border: '1px solid rgba(255, 136, 0, 0.15)',
          color: 'var(--cyber-text-main)'
        }}>
          {outputText || <span style={{ color: 'var(--cyber-text-dim)' }}>Result will appear here...</span>}
        </div>
      </div>
    </div>
  );
}
