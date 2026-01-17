import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  AppSettings,
  TranscriptionEntry,
  WhisperModel,
  BackendStatus
} from '../types';

// Re-export types for convenience - use export {} not export type {} for Vite compatibility
export { type TranscriptionEntry } from '../types';
export { type AppSettings, type WhisperModel, type BackendStatus } from '../types';

// Available Whisper models
export const WHISPER_MODELS: WhisperModel[] = [
  { name: 'tiny', size: '39 MB', parameters: '39M', vram: '~1 GB', speed: '~10x' },
  { name: 'base', size: '74 MB', parameters: '74M', vram: '~1 GB', speed: '~7x' },
  { name: 'small', size: '244 MB', parameters: '244M', vram: '~2 GB', speed: '~4x' },
  { name: 'medium', size: '769 MB', parameters: '769M', vram: '~5 GB', speed: '~2x' },
  { name: 'large', size: '1550 MB', parameters: '1550M', vram: '~10 GB', speed: '1x' },
  { name: 'turbo', size: '809 MB', parameters: '809M', vram: '~6 GB', speed: '~8x' },
];

// Supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'uk', name: 'Ukrainian' },
];

// Default settings
const DEFAULT_SETTINGS: AppSettings = {
  model: 'turbo',
  language: 'auto',
  autoDetectLanguage: true,
  outputFormat: 'text',
  wordTimestamps: false,
  temperature: 0,
  compressionRatioThreshold: 2.4,
  logProbThreshold: -1.0,
  noSpeechThreshold: 0.6,
  theme: 'light',
  backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  keyboardShortcut: 'Shift+T',
  dictionary: [],
};

// Context interface
interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;

  // Transcription history
  history: TranscriptionEntry[];
  addTranscription: (entry: TranscriptionEntry) => void;
  addToHistory: (entry: TranscriptionEntry) => void;
  updateHistoryEntry: (id: string, updates: Partial<TranscriptionEntry>) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;

  // Backend status
  backendStatus: BackendStatus;
  checkBackendConnection: () => Promise<void>;

  // Theme
  effectiveTheme: 'light' | 'dark';
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Storage keys
const SETTINGS_STORAGE_KEY = 'whisper-app-settings';
const HISTORY_STORAGE_KEY = 'whisper-app-history';

// Provider component
interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  // Load settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    return DEFAULT_SETTINGS;
  });

  // Load history from localStorage
  const [history, setHistory] = useState<TranscriptionEntry[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
    return [];
  });

  // Backend connection status
  const [backendStatus, setBackendStatus] = useState<BackendStatus>({
    connected: false,
  });

  // Effective theme (resolved system preference)
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('light');

  // Save settings to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // Save history to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [history]);

  // Handle theme changes
  useEffect(() => {
    const updateTheme = () => {
      if (settings.theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setEffectiveTheme(prefersDark ? 'dark' : 'light');
      } else {
        setEffectiveTheme(settings.theme);
      }
    };

    updateTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [settings.theme]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', effectiveTheme);
    document.documentElement.classList.toggle('dark', effectiveTheme === 'dark');
  }, [effectiveTheme]);

  // Check backend connection
  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${settings.backendUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setBackendStatus({
          connected: true,
          version: data.version,
          availableModels: data.models,
          gpuAvailable: data.gpu_available,
        });
      } else {
        setBackendStatus({ connected: false });
      }
    } catch (error) {
      console.error('Backend connection failed:', error);
      setBackendStatus({ connected: false });
    }
  };

  // Check backend connection on mount and when URL changes
  useEffect(() => {
    checkBackendConnection();
    const interval = setInterval(checkBackendConnection, 30000);
    return () => clearInterval(interval);
  }, [settings.backendUrl]);

  // Settings methods
  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
  };

  // History methods
  const addToHistory = (entry: TranscriptionEntry) => {
    setHistory(prev => [entry, ...prev].slice(0, 100));
  };

  const addTranscription = addToHistory;

  const updateHistoryEntry = (id: string, updates: Partial<TranscriptionEntry>) => {
    setHistory(prev =>
      prev.map(entry => (entry.id === id ? { ...entry, ...updates } : entry))
    );
  };

  const removeFromHistory = (id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const value: SettingsContextType = {
    settings,
    updateSettings,
    resetSettings,
    history,
    addToHistory,
    addTranscription,
    updateHistoryEntry,
    removeFromHistory,
    clearHistory,
    backendStatus,
    checkBackendConnection,
    effectiveTheme,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// Custom hook to use settings context
export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

export default SettingsContext;
