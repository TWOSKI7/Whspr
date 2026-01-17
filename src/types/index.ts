// Core types for the Whisper transcription app

export interface TranscriptionEntry {
  id: string;
  text: string;
  timestamp: string;
  duration: number;
  language: string;
  model: string;
  audioFile?: string;
  segments?: TranscriptionSegment[];
  status?: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avgLogprob?: number;
  compressionRatio?: number;
  noSpeechProb?: number;
}

export interface WhisperModel {
  name: 'tiny' | 'base' | 'small' | 'medium' | 'large' | 'turbo';
  size: string;
  parameters: string;
  vram: string;
  speed: string;
}

export interface DictionaryEntry {
  id: string;
  word: string;
  replacement: string;
}

export interface AppSettings {
  model: WhisperModel['name'];
  language: string;
  autoDetectLanguage: boolean;
  outputFormat: 'text' | 'json' | 'srt' | 'vtt';
  wordTimestamps: boolean;
  temperature: number;
  compressionRatioThreshold: number;
  logProbThreshold: number;
  noSpeechThreshold: number;
  theme: 'light' | 'dark' | 'system';
  backendUrl: string;
  keyboardShortcut: string;
  dictionary: DictionaryEntry[];
}

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob?: Blob;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TranscriptionRequest {
  audioFile: File | Blob;
  model?: WhisperModel['name'];
  language?: string;
  task?: 'transcribe' | 'translate';
  wordTimestamps?: boolean;
}

export interface TranscriptionResponse {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  duration: number;
}

export interface BackendStatus {
  connected: boolean;
  version?: string;
  availableModels?: WhisperModel['name'][];
  gpuAvailable?: boolean;
}
