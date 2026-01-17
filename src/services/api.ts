import {
  TranscriptionRequest,
  TranscriptionResponse,
  ApiResponse,
  BackendStatus,
} from '../types';

// API configuration
const DEFAULT_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

class WhisperAPI {
  private baseUrl: string;

  constructor(baseUrl: string = DEFAULT_BACKEND_URL) {
    this.baseUrl = baseUrl;
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  // Health check endpoint
  async healthCheck(): Promise<ApiResponse<BackendStatus>> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Server returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          connected: true,
          version: data.version,
          availableModels: data.models,
          gpuAvailable: data.gpu_available,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to backend',
      };
    }
  }

  // Transcribe audio
  async transcribe(request: TranscriptionRequest): Promise<ApiResponse<TranscriptionResponse>> {
    try {
      const formData = new FormData();
      formData.append('file', request.audioFile);

      if (request.model) {
        formData.append('model', request.model);
      }
      if (request.language && request.language !== 'auto') {
        formData.append('language', request.language);
      }
      if (request.task) {
        formData.append('task', request.task);
      }
      if (request.wordTimestamps !== undefined) {
        formData.append('word_timestamps', String(request.wordTimestamps));
      }

      const response = await fetch(`${this.baseUrl}/transcribe`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `Server returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          text: data.text,
          segments: data.segments || [],
          language: data.language || 'unknown',
          duration: data.duration || 0,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed',
      };
    }
  }

  // Get available models
  async getModels(): Promise<ApiResponse<string[]>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Server returned ${response.status}: ${response.statusText}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.models,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get models',
      };
    }
  }

  // Stream transcription (for real-time transcription)
  async transcribeStream(
    audioBlob: Blob,
    onProgress: (text: string) => void
  ): Promise<ApiResponse<TranscriptionResponse>> {
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('stream', 'true');

      const response = await fetch(`${this.baseUrl}/transcribe/stream`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.detail || `Server returned ${response.status}: ${response.statusText}`,
        };
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        return {
          success: false,
          error: 'Streaming not supported',
        };
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let segments: TranscriptionResponse['segments'] = [];
      let language = 'unknown';
      let duration = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) {
                fullText = data.text;
                onProgress(fullText);
              }
              if (data.segments) {
                segments = data.segments;
              }
              if (data.language) {
                language = data.language;
              }
              if (data.duration) {
                duration = data.duration;
              }
            } catch {
              // Ignore JSON parse errors for partial data
            }
          }
        }
      }

      return {
        success: true,
        data: {
          text: fullText,
          segments,
          language,
          duration,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Streaming transcription failed',
      };
    }
  }
}

// Export singleton instance
export const whisperAPI = new WhisperAPI();

// Export class for custom instances
export default WhisperAPI;
