#!/usr/bin/env python3
"""
Real-time Microphone Transcription using Whisper

Records audio from your microphone and transcribes it in real-time.

Usage:
    python mic_transcribe.py
    python mic_transcribe.py --model small
    python mic_transcribe.py --duration 30
"""
import argparse
import io
import sys
import tempfile
import wave

import numpy as np
import torch

try:
    import sounddevice as sd
except ImportError:
    print("Error: sounddevice not installed. Run: pip install sounddevice")
    sys.exit(1)

import whisper


SAMPLE_RATE = 16000  # Whisper expects 16kHz audio


def record_audio(duration: float, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    """Record audio from the microphone."""
    print(f"\n[Recording for {duration} seconds... Speak now!]")
    audio = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype=np.float32,
    )
    sd.wait()  # Wait until recording is finished
    print("[Recording complete]")
    return audio.flatten()


def transcribe_audio(model, audio: np.ndarray, language: str = None) -> str:
    """Transcribe audio using Whisper."""
    result = model.transcribe(
        audio,
        language=language,
        fp16=torch.cuda.is_available(),
    )
    return result["text"].strip()


def continuous_mode(model, chunk_duration: float, language: str = None):
    """Continuously record and transcribe in chunks."""
    print("\n" + "=" * 50)
    print("CONTINUOUS TRANSCRIPTION MODE")
    print("=" * 50)
    print(f"Recording in {chunk_duration}-second chunks")
    print("Press Ctrl+C to stop")
    print("=" * 50)

    transcript_parts = []

    try:
        while True:
            audio = record_audio(chunk_duration)

            # Skip if audio is too quiet (silence)
            if np.abs(audio).max() < 0.01:
                print("[Silence detected, skipping...]")
                continue

            print("[Transcribing...]")
            text = transcribe_audio(model, audio, language)

            if text:
                transcript_parts.append(text)
                print(f"\n>>> {text}\n")

    except KeyboardInterrupt:
        print("\n\n" + "=" * 50)
        print("FULL TRANSCRIPT:")
        print("=" * 50)
        full_transcript = " ".join(transcript_parts)
        print(full_transcript)
        print("=" * 50)
        return full_transcript


def single_recording_mode(model, duration: float, language: str = None):
    """Record once and transcribe."""
    audio = record_audio(duration)

    print("[Transcribing...]")
    text = transcribe_audio(model, audio, language)

    print("\n" + "=" * 50)
    print("TRANSCRIPT:")
    print("=" * 50)
    print(text)
    print("=" * 50)

    return text


def main():
    parser = argparse.ArgumentParser(
        description="Real-time microphone transcription using Whisper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python mic_transcribe.py                    # Single 10-second recording
    python mic_transcribe.py --duration 30      # Single 30-second recording
    python mic_transcribe.py --continuous       # Continuous mode (Ctrl+C to stop)
    python mic_transcribe.py --model small      # Use a better model
    python mic_transcribe.py --list-devices     # Show available microphones

Models (smallest to largest):
    tiny   - Fastest, least accurate
    base   - Fast, basic accuracy
    small  - Good balance
    medium - Better accuracy
    large  - Best accuracy
    turbo  - Fast and accurate
        """,
    )

    parser.add_argument(
        "--model",
        "-m",
        default="tiny",
        choices=whisper.available_models(),
        help="Whisper model to use (default: tiny)",
    )
    parser.add_argument(
        "--duration",
        "-d",
        type=float,
        default=10,
        help="Recording duration in seconds (default: 10)",
    )
    parser.add_argument(
        "--continuous",
        "-c",
        action="store_true",
        help="Continuous recording mode (press Ctrl+C to stop)",
    )
    parser.add_argument(
        "--chunk",
        type=float,
        default=5,
        help="Chunk duration for continuous mode (default: 5 seconds)",
    )
    parser.add_argument(
        "--language",
        "-l",
        default=None,
        help="Language code (e.g., en, es, fr). Auto-detected if not specified.",
    )
    parser.add_argument(
        "--output",
        "-o",
        default=None,
        help="Save transcript to file",
    )
    parser.add_argument(
        "--list-devices",
        action="store_true",
        help="List available audio input devices",
    )
    parser.add_argument(
        "--device",
        type=int,
        default=None,
        help="Audio input device index (use --list-devices to see options)",
    )

    args = parser.parse_args()

    # List devices if requested
    if args.list_devices:
        print("\nAvailable audio input devices:")
        print("-" * 40)
        devices = sd.query_devices()
        for i, dev in enumerate(devices):
            if dev["max_input_channels"] > 0:
                print(f"  [{i}] {dev['name']}")
        print("-" * 40)
        print("Use --device <index> to select a specific device")
        return

    # Set input device if specified
    if args.device is not None:
        sd.default.device = args.device

    # Check if microphone is available
    try:
        sd.check_input_settings()
    except Exception as e:
        print(f"Error: Could not access microphone: {e}")
        print("Make sure a microphone is connected and permissions are granted.")
        sys.exit(1)

    # Load model
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading {args.model} model on {device}...")
    model = whisper.load_model(args.model, device=device)
    print("Model loaded!")

    # Run transcription
    if args.continuous:
        transcript = continuous_mode(model, args.chunk, args.language)
    else:
        transcript = single_recording_mode(model, args.duration, args.language)

    # Save to file if requested
    if args.output and transcript:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(transcript)
        print(f"\nTranscript saved to: {args.output}")


if __name__ == "__main__":
    main()
