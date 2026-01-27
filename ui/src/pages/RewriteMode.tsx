import { useState } from 'react';
import { Wand2, Copy, Check, RefreshCw, Trash2 } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { copyToClipboard } from '../utils/helpers';

export default function RewriteMode() {
  const { settings, updateRewriteContext } = useSettings();
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRewrite = async () => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setError(null);

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: inputText,
          context: settings.rewriteContext,
          prompt: prompt || 'Rewrite this text to be clearer and more professional',
        }),
      });

      const data = await response.json();
      if (data.error) {
        setError(data.error);
      } else {
        setOutputText(data.text);
      }
    } catch (err) {
      setError('Failed to connect to rewrite service');
    } finally {
      setIsProcessing(false);
    }
  };

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
          <Wand2 size={24} />
          Rewrite Mode
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--cyber-text-muted)' }}>
          Use AI to rephrase and improve your transcriptions
        </p>
      </div>

      {/* Context Window */}
      <div className="cyber-card-flat">
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--cyber-text-main)' }}>
          Context (optional)
        </label>
        <textarea
          value={settings.rewriteContext}
          onChange={(e) => updateRewriteContext(e.target.value)}
          placeholder="Add context about your writing style, audience, or specific requirements..."
          className="cyber-input cyber-textarea resize-none h-20"
        />
        <p className="text-xs mt-2" style={{ color: 'var(--cyber-text-dim)' }}>
          This context will be used for all rewrites. Example: "I'm writing a technical blog post for developers"
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
          placeholder="Paste or type the text you want to rewrite..."
          className="cyber-input cyber-textarea resize-none h-32"
        />
      </div>

      {/* Prompt */}
      <div className="cyber-card-flat">
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--cyber-text-main)' }}>
          Rewrite Instructions
        </label>
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Make it more formal, Simplify the language, Fix grammar..."
          className="cyber-input"
        />
      </div>

      {/* Rewrite Button */}
      <button
        onClick={handleRewrite}
        disabled={isProcessing || !inputText.trim()}
        className={`w-full py-3 font-medium flex items-center justify-center gap-2 transition-all ${
          isProcessing || !inputText.trim() ? 'cursor-not-allowed' : 'cyber-button-primary'
        }`}
        style={
          isProcessing || !inputText.trim()
            ? {
                backgroundColor: 'var(--cyber-bg-dark)',
                color: 'var(--cyber-text-dim)',
                border: '2px solid var(--cyber-text-dim)',
                boxShadow: 'none',
              }
            : undefined
        }
      >
        {isProcessing ? (
          <>
            <RefreshCw size={18} className="animate-spin" />
            Rewriting...
          </>
        ) : (
          <>
            <Wand2 size={18} />
            Rewrite Text
          </>
        )}
      </button>

      {/* Error */}
      {error && (
        <div className="cyber-card-flat text-sm" style={{
          borderColor: 'var(--cyber-error)',
          backgroundColor: 'rgba(255, 0, 68, 0.1)',
          color: 'var(--cyber-error)'
        }}>
          {error}
        </div>
      )}

      {/* Output */}
      {outputText && (
        <div className="cyber-card-flat">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium" style={{ color: 'var(--cyber-text-main)' }}>
              Rewritten Text
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setInputText(outputText);
                  setOutputText('');
                }}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'var(--cyber-text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cyber-text-main)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cyber-text-muted)'}
                title="Use as input"
              >
                <RefreshCw size={12} />
                Iterate
              </button>
              <button
                onClick={handleCopy}
                className="text-xs flex items-center gap-1 transition-colors"
                style={{ color: 'var(--cyber-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cyber-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cyber-primary)'}
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => setOutputText('')}
                className="text-xs transition-colors"
                style={{ color: 'var(--cyber-text-dim)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--cyber-error)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--cyber-text-dim)'}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          <div className="rounded-lg px-4 py-3 text-sm whitespace-pre-wrap" style={{
            backgroundColor: 'var(--cyber-bg-dark)',
            border: '1px solid rgba(255, 136, 0, 0.15)',
            color: 'var(--cyber-text-main)'
          }}>
            {outputText}
          </div>
        </div>
      )}
    </div>
  );
}
