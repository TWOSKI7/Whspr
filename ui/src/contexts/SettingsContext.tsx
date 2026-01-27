import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { escapeRegex } from '../utils/helpers';

export interface TranscriptionEntry {
  id: string;
  text: string;
  timestamp: number;
  model: string;
}

export interface DictionaryEntry {
  id: string;
  from: string;
  to: string;
}

export interface Settings {
  shortcut: string;
  model: string;
  useWebSocket: boolean;
  history: TranscriptionEntry[];
  dictionary: DictionaryEntry[];
  rewriteContext: string;
}

interface SettingsContextType {
  settings: Settings;
  updateShortcut: (shortcut: string) => void;
  updateModel: (model: string) => void;
  updateUseWebSocket: (useWebSocket: boolean) => void;
  addTranscription: (text: string) => void;
  clearHistory: () => void;
  deleteTranscription: (id: string) => void;
  addDictionaryEntry: (from: string, to: string) => void;
  updateDictionaryEntry: (id: string, from: string, to: string) => void;
  deleteDictionaryEntry: (id: string) => void;
  updateRewriteContext: (context: string) => void;
  applyDictionary: (text: string) => string;
}

const defaultSettings: Settings = {
  shortcut: 'PageUp',
  model: 'turbo',
  useWebSocket: true,
  history: [],
  dictionary: [],
  rewriteContext: '',
};

const SettingsContext = createContext<SettingsContextType | null>(null);

const STORAGE_KEY = 'whspr-settings';

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return { ...defaultSettings, ...JSON.parse(stored) };
      } catch {
        return defaultSettings;
      }
    }
    return defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateShortcut = (shortcut: string) => {
    setSettings(prev => ({ ...prev, shortcut }));
  };

  const updateModel = (model: string) => {
    setSettings(prev => ({ ...prev, model }));
  };

  const updateUseWebSocket = (useWebSocket: boolean) => {
    setSettings(prev => ({ ...prev, useWebSocket }));
  };

  const addTranscription = (text: string) => {
    const entry: TranscriptionEntry = {
      id: crypto.randomUUID(),
      text,
      timestamp: Date.now(),
      model: settings.model,
    };
    setSettings(prev => ({
      ...prev,
      history: [entry, ...prev.history].slice(0, 100), // Keep last 100
    }));
  };

  const clearHistory = () => {
    setSettings(prev => ({ ...prev, history: [] }));
  };

  const deleteTranscription = (id: string) => {
    setSettings(prev => ({
      ...prev,
      history: prev.history.filter(h => h.id !== id),
    }));
  };

  const addDictionaryEntry = (from: string, to: string) => {
    const entry: DictionaryEntry = {
      id: crypto.randomUUID(),
      from,
      to,
    };
    setSettings(prev => ({
      ...prev,
      dictionary: [...prev.dictionary, entry],
    }));
  };

  const updateDictionaryEntry = (id: string, from: string, to: string) => {
    setSettings(prev => ({
      ...prev,
      dictionary: prev.dictionary.map(d =>
        d.id === id ? { ...d, from, to } : d
      ),
    }));
  };

  const deleteDictionaryEntry = (id: string) => {
    setSettings(prev => ({
      ...prev,
      dictionary: prev.dictionary.filter(d => d.id !== id),
    }));
  };

  const updateRewriteContext = (context: string) => {
    setSettings(prev => ({ ...prev, rewriteContext: context }));
  };

  const applyDictionary = (text: string): string => {
    let result = text;
    for (const entry of settings.dictionary) {
      if (entry.from) {
        const regex = new RegExp(`\\b${escapeRegex(entry.from)}\\b`, 'gi');
        result = result.replace(regex, entry.to);
      }
    }
    return result;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateShortcut,
        updateModel,
        updateUseWebSocket,
        addTranscription,
        clearHistory,
        deleteTranscription,
        addDictionaryEntry,
        updateDictionaryEntry,
        deleteDictionaryEntry,
        updateRewriteContext,
        applyDictionary,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
