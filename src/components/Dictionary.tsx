import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';

interface DictionaryEntry {
  id: string;
  word: string;
  replacement: string;
}

export default function Dictionary() {
  const { settings, updateSettings } = useSettings();
  const [newWord, setNewWord] = useState('');
  const [newReplacement, setNewReplacement] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const entries: DictionaryEntry[] = settings.dictionary || [];

  const addEntry = () => {
    if (!newWord.trim() || !newReplacement.trim()) return;

    const newEntry: DictionaryEntry = {
      id: Date.now().toString(),
      word: newWord.trim(),
      replacement: newReplacement.trim(),
    };

    updateSettings({
      dictionary: [...entries, newEntry],
    });

    setNewWord('');
    setNewReplacement('');
  };

  const removeEntry = (id: string) => {
    updateSettings({
      dictionary: entries.filter((e) => e.id !== id),
    });
  };

  const filteredEntries = entries.filter(
    (e) =>
      e.word.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.replacement.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="page dictionary-page">
      <h1 className="page-title">Dictionary</h1>

      <section className="card">
        <h2 className="card-title">Custom Word Replacements</h2>
        <p className="card-description">
          Add words that should be automatically replaced during transcription. Useful for
          technical terms, names, or commonly misheard words.
        </p>

        {/* Add new entry */}
        <div className="dictionary-add">
          <div className="input-group">
            <label>Original Word</label>
            <input
              type="text"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
              placeholder="e.g., wisp er"
              className="text-input-small"
            />
          </div>
          <div className="arrow-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12,5 19,12 12,19" />
            </svg>
          </div>
          <div className="input-group">
            <label>Replace With</label>
            <input
              type="text"
              value={newReplacement}
              onChange={(e) => setNewReplacement(e.target.value)}
              placeholder="e.g., Whisper"
              className="text-input-small"
            />
          </div>
          <button className="btn btn-primary" onClick={addEntry}>
            Add
          </button>
        </div>
      </section>

      <section className="card">
        <div className="card-header-row">
          <h2 className="card-title">Saved Entries ({entries.length})</h2>
          <div className="search-box">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="search-input"
            />
          </div>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="empty-state">
            {entries.length === 0
              ? 'No dictionary entries yet. Add your first entry above.'
              : 'No entries match your search.'}
          </div>
        ) : (
          <div className="dictionary-list">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="dictionary-entry">
                <span className="entry-word">{entry.word}</span>
                <span className="entry-arrow">→</span>
                <span className="entry-replacement">{entry.replacement}</span>
                <button
                  className="entry-delete"
                  onClick={() => removeEntry(entry.id)}
                  title="Remove"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
