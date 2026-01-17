import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { whisperAPI } from '../services/api';
import { TranscriptionEntry } from '../types';

export default function Recorder() {
  const { settings, addToHistory, updateHistoryEntry, backendStatus } = useSettings();

  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  // Transcription state
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean up audio URL on unmount
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4',
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);
      setTranscription('');

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to access microphone. Please check permissions.'
      );
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Pause/resume recording
  const togglePause = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = window.setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setIsPaused(!isPaused);
    }
  }, [isPaused]);

  // Handle file upload
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/mp4', 'audio/ogg', 'audio/flac'];
      if (!validTypes.some(type => file.type.includes(type.split('/')[1]))) {
        setError('Unsupported file format. Please use WAV, MP3, WebM, MP4, OGG, or FLAC.');
        return;
      }

      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
      setError(null);
      setTranscription('');
    }
  }, []);

  // Transcribe audio
  const transcribeAudio = useCallback(async () => {
    if (!audioBlob) {
      setError('No audio to transcribe');
      return;
    }

    if (!backendStatus.connected) {
      setError('Backend not connected. Please start the backend server.');
      return;
    }

    setIsTranscribing(true);
    setError(null);

    // Create a pending history entry
    const entryId = crypto.randomUUID();
    const pendingEntry: TranscriptionEntry = {
      id: entryId,
      text: '',
      timestamp: new Date(),
      duration: recordingTime,
      language: settings.language === 'auto' ? 'detecting...' : settings.language,
      status: 'processing',
    };
    addToHistory(pendingEntry);

    try {
      const result = await whisperAPI.transcribe({
        audioFile: audioBlob,
        model: settings.model,
        language: settings.language === 'auto' ? undefined : settings.language,
        wordTimestamps: settings.wordTimestamps,
      });

      if (result.success && result.data) {
        setTranscription(result.data.text);
        updateHistoryEntry(entryId, {
          text: result.data.text,
          segments: result.data.segments,
          language: result.data.language,
          duration: result.data.duration || recordingTime,
          status: 'completed',
        });
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Transcription failed';
      setError(errorMessage);
      updateHistoryEntry(entryId, {
        status: 'error',
        error: errorMessage,
      });
    } finally {
      setIsTranscribing(false);
    }
  }, [audioBlob, backendStatus.connected, settings, recordingTime, addToHistory, updateHistoryEntry]);

  // Clear current recording
  const clearRecording = useCallback(() => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setTranscription('');
    setError(null);
    setRecordingTime(0);
  }, [audioUrl]);

  // Copy transcription to clipboard
  const copyToClipboard = useCallback(async () => {
    if (transcription) {
      await navigator.clipboard.writeText(transcription);
    }
  }, [transcription]);

  return (
    <div className="recorder-container max-w-2xl mx-auto">
      <div className="card p-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
          Audio Transcription
        </h2>

        {/* Error message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Recording area */}
        <div className="flex flex-col items-center mb-8">
          {/* Recording visualization */}
          <div className="relative mb-6">
            {isRecording && (
              <div className="absolute inset-0 bg-red-500/20 rounded-full recording-pulse" />
            )}
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center ${
                isRecording
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              {isRecording ? (
                <div className="flex items-end gap-1 h-8">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={`w-1.5 bg-red-500 rounded-full waveform-bar ${
                        isPaused ? 'h-2' : ''
                      }`}
                      style={isPaused ? {} : { animationDelay: `${i * 0.1}s` }}
                    />
                  ))}
                </div>
              ) : (
                <svg
                  className="w-12 h-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </div>
          </div>

          {/* Timer */}
          {(isRecording || recordingTime > 0) && (
            <div className="text-3xl font-mono text-gray-700 dark:text-gray-300 mb-4">
              {formatTime(recordingTime)}
            </div>
          )}

          {/* Recording controls */}
          <div className="flex items-center gap-4">
            {!isRecording ? (
              <>
                <button
                  onClick={startRecording}
                  className="btn btn-primary flex items-center gap-2"
                  disabled={isTranscribing}
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="6" />
                  </svg>
                  Start Recording
                </button>

                <span className="text-gray-400">or</span>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn btn-secondary flex items-center gap-2"
                  disabled={isTranscribing}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                    />
                  </svg>
                  Upload Audio
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </>
            ) : (
              <>
                <button
                  onClick={togglePause}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  {isPaused ? (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      Pause
                    </>
                  )}
                </button>

                <button
                  onClick={stopRecording}
                  className="btn btn-danger flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="1" />
                  </svg>
                  Stop
                </button>
              </>
            )}
          </div>
        </div>

        {/* Audio preview and transcribe button */}
        {audioUrl && !isRecording && (
          <div className="border-t dark:border-gray-700 pt-6">
            <div className="mb-4">
              <audio
                src={audioUrl}
                controls
                className="w-full"
              />
            </div>

            <div className="flex items-center gap-4 justify-center">
              <button
                onClick={transcribeAudio}
                disabled={isTranscribing || !backendStatus.connected}
                className="btn btn-primary flex items-center gap-2"
              >
                {isTranscribing ? (
                  <>
                    <div className="w-5 h-5 spinner" />
                    Transcribing...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    Transcribe
                  </>
                )}
              </button>

              <button
                onClick={clearRecording}
                disabled={isTranscribing}
                className="btn btn-secondary"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Transcription result */}
        {transcription && (
          <div className="border-t dark:border-gray-700 pt-6 mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-medium text-gray-800 dark:text-white">
                Transcription
              </h3>
              <button
                onClick={copyToClipboard}
                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy
              </button>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {transcription}
              </p>
            </div>
          </div>
        )}

        {/* Quick settings */}
        <div className="border-t dark:border-gray-700 pt-6 mt-6">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <span>
              Model: <strong className="text-gray-700 dark:text-gray-300">{settings.model}</strong>
            </span>
            <span>
              Language:{' '}
              <strong className="text-gray-700 dark:text-gray-300">
                {settings.language === 'auto' ? 'Auto-detect' : settings.language}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
