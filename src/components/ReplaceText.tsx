import { useState } from 'react';

interface ReplacementRule {
  id: string;
  find: string;
  replace: string;
  isRegex: boolean;
  caseSensitive: boolean;
}

export default function ReplaceText() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [rules, setRules] = useState<ReplacementRule[]>([]);
  const [newFind, setNewFind] = useState('');
  const [newReplace, setNewReplace] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const addRule = () => {
    if (!newFind.trim()) return;

    const rule: ReplacementRule = {
      id: Date.now().toString(),
      find: newFind,
      replace: newReplace,
      isRegex,
      caseSensitive,
    };

    setRules([...rules, rule]);
    setNewFind('');
    setNewReplace('');
  };

  const removeRule = (id: string) => {
    setRules(rules.filter((r) => r.id !== id));
  };

  const applyReplacements = () => {
    let result = inputText;

    rules.forEach((rule) => {
      try {
        if (rule.isRegex) {
          const flags = rule.caseSensitive ? 'g' : 'gi';
          const regex = new RegExp(rule.find, flags);
          result = result.replace(regex, rule.replace);
        } else {
          if (rule.caseSensitive) {
            result = result.split(rule.find).join(rule.replace);
          } else {
            const regex = new RegExp(rule.find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
            result = result.replace(regex, rule.replace);
          }
        }
      } catch (e) {
        console.error('Invalid regex:', rule.find);
      }
    });

    setOutputText(result);
  };

  const copyOutput = () => {
    navigator.clipboard.writeText(outputText);
  };

  return (
    <div className="page replace-page">
      <h1 className="page-title">Replace Text</h1>

      <div className="replace-container">
        {/* Input/Output Section */}
        <section className="card">
          <h2 className="card-title">Text</h2>
          <div className="text-areas">
            <div className="text-area-group">
              <label>Input Text</label>
              <textarea
                className="text-input"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Paste text here..."
                rows={6}
              />
            </div>
            <div className="text-area-group">
              <label>Output Text</label>
              <textarea
                className="text-input"
                value={outputText}
                readOnly
                placeholder="Result will appear here..."
                rows={6}
              />
              {outputText && (
                <button className="copy-btn" onClick={copyOutput}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Rules Section */}
        <section className="card">
          <h2 className="card-title">Replacement Rules</h2>

          {/* Add new rule */}
          <div className="rule-add">
            <div className="rule-inputs">
              <input
                type="text"
                value={newFind}
                onChange={(e) => setNewFind(e.target.value)}
                placeholder="Find..."
                className="text-input-small"
              />
              <span className="arrow-text">→</span>
              <input
                type="text"
                value={newReplace}
                onChange={(e) => setNewReplace(e.target.value)}
                placeholder="Replace with..."
                className="text-input-small"
              />
            </div>
            <div className="rule-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isRegex}
                  onChange={(e) => setIsRegex(e.target.checked)}
                />
                Regex
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                />
                Case sensitive
              </label>
              <button className="btn btn-secondary" onClick={addRule}>
                Add Rule
              </button>
            </div>
          </div>

          {/* Rules list */}
          {rules.length > 0 && (
            <div className="rules-list">
              {rules.map((rule) => (
                <div key={rule.id} className="rule-item">
                  <code className="rule-find">{rule.find}</code>
                  <span className="rule-arrow">→</span>
                  <code className="rule-replace">{rule.replace || '(empty)'}</code>
                  <div className="rule-badges">
                    {rule.isRegex && <span className="badge">Regex</span>}
                    {rule.caseSensitive && <span className="badge">Case</span>}
                  </div>
                  <button className="rule-delete" onClick={() => removeRule(rule.id)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn btn-primary apply-btn"
            onClick={applyReplacements}
            disabled={!inputText.trim() || rules.length === 0}
          >
            Apply Replacements
          </button>
        </section>
      </div>
    </div>
  );
}
