import { useState, useEffect, useRef, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { formatShortcut, matchesShortcut } from '../utils/helpers';

interface AudioBarProps {
  active: boolean;
  delay: number;
  level?: number;
}

const AudioBar = ({ active, delay, level = 0 }: AudioBarProps) => {
  return (
    <div
      className="w-1 rounded-full transition-all duration-150 ease-out"
      style={{
        animationDelay: `${delay}ms`,
        height: active ? `${Math.max(2, level * 20)}px` : '2px',
        background: active ? 'var(--cyber-primary)' : '#666666',
        boxShadow: active ? '0 0 4px var(--cyber-primary)' : 'none',
      }}
    />
  );
};

interface RecordingFloatingWidgetProps {
  onTranscription: (text: string) => void;
  onRecordingChange?: (isRecording: boolean) => void;
}

export default function RecordingFloatingWidget({
  onTranscription,
  onRecordingChange
}: RecordingFloatingWidgetProps) {
  const { settings } = useSettings();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [_isHovered, _setIsHovered] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const wsChunksRef = useRef<Blob[]>([]);

  const sendToWhisperREST = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('model', settings.model);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.text) {
        onTranscription(data.text);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendToWhisperWebSocket = async () => {
    if (!wsChunksRef.current.length) return;

    setIsProcessing(true);

    try {
      const ws = new WebSocket('ws://localhost:5000/ws/transcribe');
      websocketRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        // Send config message
        ws.send(JSON.stringify({
          type: 'config',
          model: settings.model
        }));

        // Send all accumulated chunks
        wsChunksRef.current.forEach((chunk) => {
          ws.send(chunk);
        });

        // Send flush message
        ws.send(JSON.stringify({ type: 'flush' }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.text) {
            onTranscription(data.text);
          }
          if (data.type === 'final' || data.complete) {
            ws.close();
          }
        } catch (err) {
          console.error('WebSocket message parsing failed:', err);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error, falling back to REST:', error);
        ws.close();
        // Fallback to REST API
        const audioBlob = new Blob(wsChunksRef.current, { type: 'audio/webm' });
        sendToWhisperREST(audioBlob);
      };

      ws.onclose = () => {
        console.log('WebSocket closed');
        setIsProcessing(false);
        websocketRef.current = null;
      };

    } catch (err) {
      console.error('WebSocket creation failed, falling back to REST:', err);
      const audioBlob = new Blob(wsChunksRef.current, { type: 'audio/webm' });
      await sendToWhisperREST(audioBlob);
    }
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up audio analyser for visualization
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start visualization
      const updateLevels = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const levels = Array.from(dataArray.slice(0, 12)).map(v => v / 255);
          setAudioLevels(levels);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      };
      updateLevels();

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      wsChunksRef.current = [];

      if (settings.useWebSocket) {
        // WebSocket mode: collect chunks for streaming
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            wsChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          await sendToWhisperWebSocket();
        };

        // Start with timeslice for real-time streaming
        mediaRecorder.start(250);
      } else {
        // REST mode: collect all chunks
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendToWhisperREST(audioBlob);
        };

        mediaRecorder.start();
      }

      setIsRecording(true);
      onRecordingChange?.(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, [onRecordingChange, settings.model, settings.useWebSocket]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Clean up AudioContext to prevent memory leak
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }

      setAudioLevels(new Array(12).fill(0));
      setIsRecording(false);
      onRecordingChange?.(false);
    }
  }, [isRecording, onRecordingChange]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  // Configurable keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (matchesShortcut(e, settings.shortcut)) {
        e.preventDefault();
        toggleRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording, settings.shortcut]);

  // Listen for custom toggle event from command palette
  useEffect(() => {
    const handleToggle = () => toggleRecording();
    window.addEventListener('whspr:toggle-recording', handleToggle);
    return () => window.removeEventListener('whspr:toggle-recording', handleToggle);
  }, [toggleRecording]);

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  return (
    <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`
          flex items-center justify-between gap-4 pl-4 pr-2 py-2
          backdrop-blur-[16px] rounded-2xl shadow-2xl shadow-black/50
          transition-all duration-300 relative overflow-hidden
          ${isRecording ? 'cyber-recording' : 'cyber-card'}
        `}
        style={{
          backgroundColor: 'rgba(10, 10, 15, 0.9)',
          border: '2px solid var(--cyber-primary)',
          boxShadow: isRecording
            ? '0 0 20px var(--cyber-error), 0 0 40px rgba(255, 0, 68, 0.3)'
            : '0 0 4px 1px var(--cyber-primary), 0 0 12px 4px var(--cyber-secondary), inset 0 0 10px var(--cyber-secondary)',
        }}
        onMouseEnter={() => _setIsHovered(true)}
        onMouseLeave={() => _setIsHovered(false)}
      >
        {/* Scan-line effect */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(0deg, transparent 0%, rgba(255, 136, 0, 0.05) 50%, transparent 100%)',
            backgroundSize: '100% 2px',
            animation: 'cyber-scan-line 4s linear infinite',
            opacity: 0.3,
          }}
        />

        {/* Left Side: Status Text */}
        <div
          className="text-xs font-medium select-none cursor-pointer z-10"
          onClick={toggleRecording}
          style={{ color: 'var(--cyber-text-main)' }}
        >
          {isProcessing ? (
            <span className="flex items-center gap-2" style={{ color: 'var(--cyber-primary)' }}>
              <div className="cyber-spinner" style={{ width: '12px', height: '12px' }} />
              Processing...
            </span>
          ) : isRecording ? (
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full rounded-full opacity-75"
                  style={{
                    animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
                    background: 'var(--cyber-error)',
                  }}
                ></span>
                <span
                  className="relative inline-flex rounded-full h-2 w-2"
                  style={{ background: 'var(--cyber-error)' }}
                ></span>
              </span>
              Listening...
            </span>
          ) : (
            <span style={{ color: 'var(--cyber-text-muted)' }}>
              Press{' '}
              <span
                className="cyber-badge"
                style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  fontFamily: 'var(--cyber-font-mono)',
                }}
              >
                {formatShortcut(settings.shortcut)}
              </span>
              {' '}to record
            </span>
          )}
        </div>

        {/* Center: Audio Visualizer */}
        <div className="flex items-center gap-[2px] h-6 mx-2 min-w-[60px] justify-center z-10">
          {audioLevels.map((level, i) => (
            <AudioBar
              key={i}
              active={isRecording}
              delay={i * 50}
              level={level}
            />
          ))}
        </div>

        {/* Right Side: Action Button */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className={`
            cyber-button text-xs px-3 py-1.5 z-10
            ${isProcessing ? 'opacity-35' : ''}
          `}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: isRecording ? 'rgba(255, 136, 0, 0.2)' : 'transparent',
            color: isRecording ? 'var(--cyber-primary)' : 'var(--cyber-text-muted)',
            borderColor: isRecording ? 'var(--cyber-primary)' : 'rgba(255, 136, 0, 0.3)',
          }}
        >
          {isRecording ? 'Stop' : 'Hide'}
        </button>
      </div>
    </div>
  );
}

// Add keyframes for ping animation (used by listening dot)
const style = document.createElement('style');
style.textContent = `
  @keyframes ping {
    75%, 100% {
      transform: scale(2);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
