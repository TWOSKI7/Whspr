"""
FastAPI backend server for Whisper transcription.
Connects the React frontend to the Whisper library.
"""

import os
import sys
import tempfile
from typing import Optional
from pathlib import Path

# Add parent directory to path for whisper import
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn

# Import whisper
try:
    import whisper
    WHISPER_AVAILABLE = True
except ImportError:
    WHISPER_AVAILABLE = False
    print("Warning: whisper module not found. Install with: pip install openai-whisper")

# Check for GPU
try:
    import torch
    GPU_AVAILABLE = torch.cuda.is_available()
except ImportError:
    GPU_AVAILABLE = False

# Create FastAPI app
app = FastAPI(
    title="Whisper Transcription API",
    description="API for OpenAI Whisper speech-to-text transcription",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Available models
AVAILABLE_MODELS = ["tiny", "base", "small", "medium", "large", "turbo"]

# Cache for loaded models
_model_cache = {}


def get_model(model_name: str):
    """Load and cache a Whisper model."""
    if not WHISPER_AVAILABLE:
        raise HTTPException(status_code=500, detail="Whisper not installed")

    if model_name not in AVAILABLE_MODELS:
        raise HTTPException(status_code=400, detail=f"Invalid model: {model_name}")

    if model_name not in _model_cache:
        print(f"Loading model: {model_name}")
        _model_cache[model_name] = whisper.load_model(model_name)
        print(f"Model {model_name} loaded successfully")

    return _model_cache[model_name]


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Whisper Transcription API", "status": "running"}


@app.get("/health")
async def health_check():
    """Health check endpoint with system info."""
    return {
        "status": "healthy",
        "whisper_available": WHISPER_AVAILABLE,
        "gpu_available": GPU_AVAILABLE,
        "version": whisper.__version__ if WHISPER_AVAILABLE else None,
        "models": AVAILABLE_MODELS,
    }


@app.get("/models")
async def list_models():
    """List available Whisper models."""
    return {
        "models": AVAILABLE_MODELS,
        "recommended": "turbo",
    }


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    model: str = Form(default="turbo"),
    language: Optional[str] = Form(default=None),
    task: str = Form(default="transcribe"),
    word_timestamps: bool = Form(default=False),
):
    """
    Transcribe an audio file using Whisper.

    Args:
        file: Audio file (wav, mp3, webm, etc.)
        model: Whisper model to use (tiny, base, small, medium, large, turbo)
        language: Language code (e.g., 'en', 'es'). None for auto-detection.
        task: 'transcribe' or 'translate' (translate to English)
        word_timestamps: Include word-level timestamps

    Returns:
        Transcription result with text, segments, and metadata
    """
    if not WHISPER_AVAILABLE:
        raise HTTPException(status_code=500, detail="Whisper not installed")

    # Validate file
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    # Save uploaded file to temp location
    suffix = Path(file.filename).suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        # Load model
        whisper_model = get_model(model)

        # Transcribe
        result = whisper_model.transcribe(
            tmp_path,
            language=language,
            task=task,
            word_timestamps=word_timestamps,
            verbose=False,
        )

        # Format response
        segments = []
        for seg in result.get("segments", []):
            segments.append({
                "id": seg["id"],
                "start": seg["start"],
                "end": seg["end"],
                "text": seg["text"],
                "tokens": seg.get("tokens", []),
                "temperature": seg.get("temperature", 0),
                "avgLogprob": seg.get("avg_logprob", 0),
                "compressionRatio": seg.get("compression_ratio", 0),
                "noSpeechProb": seg.get("no_speech_prob", 0),
            })

        return {
            "text": result["text"],
            "segments": segments,
            "language": result.get("language", "unknown"),
            "duration": segments[-1]["end"] if segments else 0,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except:
            pass


@app.post("/transcribe/stream")
async def transcribe_stream(
    file: UploadFile = File(...),
    model: str = Form(default="turbo"),
    language: Optional[str] = Form(default=None),
):
    """
    Stream transcription results as they become available.
    Uses Server-Sent Events (SSE) format.
    """
    if not WHISPER_AVAILABLE:
        raise HTTPException(status_code=500, detail="Whisper not installed")

    # Save uploaded file
    suffix = Path(file.filename).suffix if file.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    async def generate():
        try:
            whisper_model = get_model(model)

            # For streaming, we use the segment callback
            result = whisper_model.transcribe(
                tmp_path,
                language=language,
                verbose=False,
            )

            # Stream each segment
            text_so_far = ""
            for seg in result.get("segments", []):
                text_so_far += seg["text"]
                yield f"data: {{\\"text\\": \\"{text_so_far}\\", \\"segment\\": {{\\"start\\": {seg['start']}, \\"end\\": {seg['end']}, \\"text\\": \\"{seg['text']}\\"}}}}\\n\\n"

            # Final result
            yield f"data: {{\\"text\\": \\"{result['text']}\\", \\"language\\": \\"{result.get('language', 'unknown')}\\", \\"done\\": true}}\\n\\n"

        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass

    return StreamingResponse(generate(), media_type="text/event-stream")


@app.post("/detect-language")
async def detect_language(file: UploadFile = File(...)):
    """Detect the language of an audio file."""
    if not WHISPER_AVAILABLE:
        raise HTTPException(status_code=500, detail="Whisper not installed")

    # Save uploaded file
    suffix = Path(file.filename).suffix if file.filename else ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        model = get_model("base")  # Use small model for language detection

        # Load audio and detect language
        audio = whisper.load_audio(tmp_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)

        _, probs = model.detect_language(mel)
        detected_lang = max(probs, key=probs.get)

        return {
            "language": detected_lang,
            "confidence": probs[detected_lang],
            "probabilities": dict(sorted(probs.items(), key=lambda x: x[1], reverse=True)[:10]),
        }

    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
    )


if __name__ == "__main__":
    print("Starting Whisper Transcription API...")
    print(f"Whisper available: {WHISPER_AVAILABLE}")
    print(f"GPU available: {GPU_AVAILABLE}")

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
