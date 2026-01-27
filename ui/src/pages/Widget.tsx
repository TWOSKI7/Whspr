import { useState, useEffect, useRef, useCallback } from 'react';

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
        backgroundColor: active ? 'var(--cyber-primary)' : 'var(--cyber-text-dim)'
      }}
    />
  );
};

export default function Widget() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastText, setLastText] = useState('');
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(12).fill(0));

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);
      analyserRef.current = analyser;

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

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await sendToWhisper(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Failed to start recording:', err);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setAudioLevels(new Array(12).fill(0));
      setIsRecording(false);
    }
  }, [isRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const sendToWhisper = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const response = await fetch('http://127.0.0.1:5000/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (data.text) {
        setLastText(data.text);
        // Copy to clipboard
        navigator.clipboard.writeText(data.text);
      }
    } catch (err) {
      console.error('Transcription failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // PgUp keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PageUp') {
        e.preventDefault();
        toggleRecording();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleRecording]);

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-transparent" data-tauri-drag-region>
      <div
        className="flex items-center justify-between gap-4 pl-4 pr-2 py-2 rounded-2xl shadow-2xl"
        style={{
          backgroundColor: 'rgba(10, 10, 15, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 136, 0, 0.2)',
          boxShadow: 'var(--cyber-glow-soft), 0 20px 40px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Status */}
        <div className="text-xs font-medium select-none cursor-pointer min-w-[120px]" style={{ color: 'var(--cyber-text-main)' }} onClick={toggleRecording}>
          {isProcessing ? (
            <span className="flex items-center gap-2" style={{ color: 'var(--cyber-primary)' }}>
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Processing...
            </span>
          ) : isRecording ? (
            <span className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: 'var(--cyber-primary)' }}></span>
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: 'var(--cyber-primary)' }}></span>
              </span>
              Listening...
            </span>
          ) : (
            <span style={{ color: 'var(--cyber-text-muted)' }}>
              <span className="cyber-mono cyber-badge text-[10px]">PgUp</span>
            </span>
          )}
        </div>

        {/* Visualizer */}
        <div className="flex items-center gap-[2px] h-6 mx-2 min-w-[60px] justify-center">
          {audioLevels.map((level, i) => (
            <AudioBar key={i} active={isRecording} delay={i * 50} level={level} />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={toggleRecording}
          disabled={isProcessing}
          className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all duration-200"
          style={
            isProcessing
              ? {
                  backgroundColor: 'rgba(10, 10, 15, 0.5)',
                  color: 'var(--cyber-text-dim)',
                  borderColor: 'var(--cyber-text-dim)',
                  cursor: 'not-allowed',
                }
              : isRecording
              ? {
                  backgroundColor: 'rgba(255, 136, 0, 0.2)',
                  color: 'var(--cyber-primary)',
                  borderColor: 'rgba(255, 136, 0, 0.5)',
                }
              : {
                  backgroundColor: 'transparent',
                  color: 'var(--cyber-text-dim)',
                  borderColor: 'rgba(255, 136, 0, 0.3)',
                }
          }
          onMouseEnter={(e) => {
            if (!isProcessing && isRecording) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 136, 0, 0.3)';
            } else if (!isProcessing && !isRecording) {
              e.currentTarget.style.backgroundColor = 'rgba(10, 10, 15, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isProcessing && isRecording) {
              e.currentTarget.style.backgroundColor = 'rgba(255, 136, 0, 0.2)';
            } else if (!isProcessing && !isRecording) {
              e.currentTarget.style.backgroundColor = 'transparent';
            }
          }}
        >
          {isRecording ? 'Stop' : 'Rec'}
        </button>
      </div>

      {/* Last transcription toast */}
      {lastText && !isRecording && !isProcessing && (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full rounded-lg px-3 py-2 max-w-[350px] text-xs shadow-lg" style={{
          backgroundColor: 'rgba(10, 10, 15, 0.95)',
          border: '1px solid rgba(255, 136, 0, 0.3)',
          color: 'var(--cyber-text-main)'
        }}>
          <span style={{ color: 'var(--cyber-primary)' }}>Copied:</span> {lastText.slice(0, 50)}{lastText.length > 50 ? '...' : ''}
        </div>
      )}
    </div>
  );
}
