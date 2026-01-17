import { useState } from 'react';

interface RewriteTemplate {
  id: string;
  name: string;
  prompt: string;
}

export default function RewriteMode() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const templates: RewriteTemplate[] = [
    { id: 'formal', name: 'Make Formal', prompt: 'Rewrite the following text in a formal, professional tone:' },
    { id: 'casual', name: 'Make Casual', prompt: 'Rewrite the following text in a casual, friendly tone:' },
    { id: 'concise', name: 'Make Concise', prompt: 'Rewrite the following text to be more concise and direct:' },
    { id: 'expand', name: 'Expand', prompt: 'Expand the following text with more detail and explanation:' },
    { id: 'grammar', name: 'Fix Grammar', prompt: 'Fix any grammar and spelling errors in the following text:' },
    { id: 'bullet', name: 'Bullet Points', prompt: 'Convert the following text into bullet points:' },
  ];

  const handleRewrite = async (prompt: string) => {
    if (!inputText.trim()) return;

    setIsProcessing(true);
    setShowPromptModal(false);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
      const response = await fetch(`${backendUrl}/rewrite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText, prompt }),
      });

      if (response.ok) {
        const result = await response.json();
        setOutputText(result.rewritten_text);
      } else {
        // Fallback: simple local processing
        setOutputText(`[Rewritten with: "${prompt}"]\n\n${inputText}`);
      }
    } catch (error) {
      // Fallback for demo purposes
      setOutputText(`[Processed with: "${prompt}"]\n\n${inputText}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTemplateClick = (template: RewriteTemplate) => {
    setSelectedTemplate(template.id);
    handleRewrite(template.prompt);
  };

  const handleCustomRewrite = () => {
    if (customPrompt.trim()) {
      handleRewrite(customPrompt);
      setCustomPrompt('');
    }
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(outputText);
  };

  const useOutput = () => {
    setInputText(outputText);
    setOutputText('');
  };

  return (
    <div className="page rewrite-page">
      <h1 className="page-title">
        Rewrite Mode
        <span className="badge">AI</span>
      </h1>

      <div className="rewrite-container">
        {/* Input Section */}
        <section className="card">
          <h2 className="card-title">Original Text</h2>
          <textarea
            className="text-input"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste or type your text here..."
            rows={6}
          />

          {/* Quick Rewrite Templates */}
          <div className="template-grid">
            {templates.map((template) => (
              <button
                key={template.id}
                className={`template-btn ${selectedTemplate === template.id ? 'active' : ''}`}
                onClick={() => handleTemplateClick(template)}
                disabled={isProcessing || !inputText.trim()}
              >
                {template.name}
              </button>
            ))}
          </div>

          {/* Custom Prompt Button */}
          <button
            className="btn btn-primary custom-prompt-btn"
            onClick={() => setShowPromptModal(true)}
            disabled={!inputText.trim()}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Custom Reprompt
          </button>
        </section>

        {/* Output Section */}
        {(outputText || isProcessing) && (
          <section className="card output-card">
            <h2 className="card-title">Rewritten Text</h2>
            {isProcessing ? (
              <div className="processing-indicator">
                <div className="spinner" />
                <span>Processing...</span>
              </div>
            ) : (
              <>
                <div className="output-text">{outputText}</div>
                <div className="output-actions">
                  <button className="btn btn-primary" onClick={copyOutput}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </button>
                  <button className="btn btn-secondary" onClick={useOutput}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="1 4 1 10 7 10" />
                      <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                    </svg>
                    Use as Input
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {/* Custom Prompt Modal */}
      {showPromptModal && (
        <div className="modal-overlay" onClick={() => setShowPromptModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Custom Reprompt</h3>
              <button className="modal-close" onClick={() => setShowPromptModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                Enter instructions for how you want the text to be rewritten:
              </p>
              <textarea
                className="text-input"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="E.g., 'Rewrite this as if explaining to a 5-year-old' or 'Make this sound more enthusiastic'"
                rows={4}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPromptModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCustomRewrite}
                disabled={!customPrompt.trim()}
              >
                Rewrite
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
