import { useState } from 'react';
import { Plus, Trash2, Book, ArrowRight, Edit2, Check, X } from 'lucide-react';
import { useSettings, type DictionaryEntry } from '../contexts/SettingsContext';

export default function Dictionary() {
  const { settings, addDictionaryEntry, updateDictionaryEntry, deleteDictionaryEntry } = useSettings();
  const [newFrom, setNewFrom] = useState('');
  const [newTo, setNewTo] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFrom, setEditFrom] = useState('');
  const [editTo, setEditTo] = useState('');

  const handleAdd = () => {
    if (newFrom.trim() && newTo.trim()) {
      addDictionaryEntry(newFrom.trim(), newTo.trim());
      setNewFrom('');
      setNewTo('');
    }
  };

  const startEdit = (entry: DictionaryEntry) => {
    setEditingId(entry.id);
    setEditFrom(entry.from);
    setEditTo(entry.to);
  };

  const saveEdit = () => {
    if (editingId && editFrom.trim() && editTo.trim()) {
      updateDictionaryEntry(editingId, editFrom.trim(), editTo.trim());
      setEditingId(null);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditFrom('');
    setEditTo('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="cyber-heading text-2xl flex items-center gap-2" style={{ color: 'var(--cyber-primary)' }}>
          <Book size={24} />
          Dictionary
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--cyber-text-muted)' }}>
          Automatically replace words in transcriptions
        </p>
      </div>

      {/* Add New Entry */}
      <div className="cyber-card-flat">
        <label className="block text-sm font-medium mb-3" style={{ color: 'var(--cyber-text-main)' }}>
          Add Replacement Rule
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={newFrom}
            onChange={(e) => setNewFrom(e.target.value)}
            placeholder="Word to find"
            className="cyber-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <ArrowRight size={20} className="flex-shrink-0" style={{ color: 'var(--cyber-text-dim)' }} />
          <input
            type="text"
            value={newTo}
            onChange={(e) => setNewTo(e.target.value)}
            placeholder="Replace with"
            className="cyber-input flex-1"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <button
            onClick={handleAdd}
            disabled={!newFrom.trim() || !newTo.trim()}
            className={`p-2.5 rounded-lg transition-all flex-shrink-0 ${
              newFrom.trim() && newTo.trim() ? 'cyber-button-primary' : ''
            }`}
            style={
              !newFrom.trim() || !newTo.trim()
                ? {
                    backgroundColor: 'var(--cyber-bg-dark)',
                    color: 'var(--cyber-text-dim)',
                    cursor: 'not-allowed',
                  }
                : undefined
            }
          >
            <Plus size={18} />
          </button>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--cyber-text-dim)' }}>
          Words are matched case-insensitively and only at word boundaries
        </p>
      </div>

      {/* Dictionary Entries */}
      {settings.dictionary.length === 0 ? (
        <div className="text-center py-12" style={{ color: 'var(--cyber-text-dim)' }}>
          <Book size={48} className="mx-auto mb-4 opacity-50" />
          <p>No dictionary entries yet</p>
          <p className="text-sm mt-1">Add words that Whisper often mishears</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-sm mb-3" style={{ color: 'var(--cyber-text-muted)' }}>
            {settings.dictionary.length} replacement rule{settings.dictionary.length !== 1 ? 's' : ''}
          </div>
          {settings.dictionary.map((entry) => (
            <div
              key={entry.id}
              className="cyber-card-flat group"
            >
              {editingId === entry.id ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={editFrom}
                    onChange={(e) => setEditFrom(e.target.value)}
                    className="cyber-input flex-1"
                    autoFocus
                  />
                  <ArrowRight size={18} className="flex-shrink-0" style={{ color: 'var(--cyber-text-dim)' }} />
                  <input
                    type="text"
                    value={editTo}
                    onChange={(e) => setEditTo(e.target.value)}
                    className="cyber-input flex-1"
                  />
                  <button
                    onClick={saveEdit}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'rgba(0, 255, 136, 0.2)',
                      color: 'var(--cyber-success)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.3)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 255, 136, 0.2)'}
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--cyber-bg-dark)',
                      color: 'var(--cyber-text-muted)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cyber-bg-panel)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cyber-bg-dark)';
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="cyber-mono text-sm px-2 py-1 rounded" style={{
                      color: 'var(--cyber-text-main)',
                      backgroundColor: 'var(--cyber-bg-dark)'
                    }}>
                      {entry.from}
                    </span>
                    <ArrowRight size={16} style={{ color: 'var(--cyber-primary)', opacity: 0.5 }} />
                    <span className="cyber-mono text-sm" style={{ color: 'var(--cyber-primary)' }}>
                      {entry.to}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => startEdit(entry)}
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
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => deleteDictionaryEntry(entry.id)}
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
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Common Examples */}
      {settings.dictionary.length === 0 && (
        <div className="rounded-xl p-4" style={{
          backgroundColor: 'rgba(10, 10, 15, 0.3)',
          border: '1px solid rgba(255, 136, 0, 0.1)'
        }}>
          <p className="text-sm mb-3" style={{ color: 'var(--cyber-text-muted)' }}>Common examples:</p>
          <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: 'var(--cyber-text-dim)' }}>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--cyber-bg-dark)' }}>gonna</span>
              <ArrowRight size={12} />
              <span style={{ color: 'var(--cyber-primary)' }}>going to</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--cyber-bg-dark)' }}>wanna</span>
              <ArrowRight size={12} />
              <span style={{ color: 'var(--cyber-primary)' }}>want to</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--cyber-bg-dark)' }}>kinda</span>
              <ArrowRight size={12} />
              <span style={{ color: 'var(--cyber-primary)' }}>kind of</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded" style={{ backgroundColor: 'var(--cyber-bg-dark)' }}>gotta</span>
              <ArrowRight size={12} />
              <span style={{ color: 'var(--cyber-primary)' }}>got to</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
