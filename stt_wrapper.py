#!/usr/bin/env python3
"""
Whisper STT Wrapper Script

A simple wrapper script for using OpenAI's Whisper for local speech-to-text
transcription. Supports file input, microphone recording, and various output
formats.

Usage:
    python stt_wrapper.py audio.mp3                    # Transcribe a file
    python stt_wrapper.py audio.mp3 --model base      # Use specific model
    python stt_wrapper.py audio.mp3 --language en     # Specify language
    python stt_wrapper.py audio.mp3 --output result   # Save to file
    python stt_wrapper.py --record 10                 # Record 10 seconds from mic
"""

import argparse
import sys
import os
import json
from pathlib import Path

import whisper


def transcribe_audio(
    audio_path: str,
    model_name: str = "turbo",
    language: str = None,
    task: str = "transcribe",
    word_timestamps: bool = False,
    output_format: str = "text",
    verbose: bool = True,
) -> dict:
    """
    Transcribe an audio file using Whisper.

    Args:
        audio_path: Path to the audio file
        model_name: Whisper model to use (tiny, base, small, medium, large, turbo)
        language: Language code (e.g., 'en', 'ja') or None for auto-detection
        task: 'transcribe' or 'translate' (translate to English)
        word_timestamps: Whether to include word-level timestamps
        output_format: Output format ('text', 'json', 'srt', 'vtt')
        verbose: Print progress messages

    Returns:
        Dictionary containing transcription results
    """
    if verbose:
        print(f"Loading model '{model_name}'...")

    model = whisper.load_model(model_name)

    if verbose:
        print(f"Transcribing '{audio_path}'...")

    result = model.transcribe(
        audio_path,
        language=language,
        task=task,
        word_timestamps=word_timestamps,
        verbose=verbose,
    )

    return result


def format_output(result: dict, output_format: str) -> str:
    """Format the transcription result based on the specified format."""
    if output_format == "text":
        return result["text"].strip()

    elif output_format == "json":
        return json.dumps(result, indent=2, ensure_ascii=False)

    elif output_format == "srt":
        lines = []
        for i, segment in enumerate(result["segments"], 1):
            start = format_timestamp_srt(segment["start"])
            end = format_timestamp_srt(segment["end"])
            text = segment["text"].strip()
            lines.append(f"{i}\n{start} --> {end}\n{text}\n")
        return "\n".join(lines)

    elif output_format == "vtt":
        lines = ["WEBVTT\n"]
        for segment in result["segments"]:
            start = format_timestamp_vtt(segment["start"])
            end = format_timestamp_vtt(segment["end"])
            text = segment["text"].strip()
            lines.append(f"{start} --> {end}\n{text}\n")
        return "\n".join(lines)

    else:
        return result["text"].strip()


def format_timestamp_srt(seconds: float) -> str:
    """Format seconds as SRT timestamp (HH:MM:SS,mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def format_timestamp_vtt(seconds: float) -> str:
    """Format seconds as VTT timestamp (HH:MM:SS.mmm)."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{millis:03d}"


def record_audio(duration: int, output_path: str = "recording.wav") -> str:
    """
    Record audio from the microphone.

    Requires: pip install sounddevice scipy
    """
    try:
        import sounddevice as sd
        from scipy.io import wavfile
    except ImportError:
        print("Recording requires sounddevice and scipy.")
        print("Install with: pip install sounddevice scipy")
        sys.exit(1)

    sample_rate = 16000  # Whisper expects 16kHz
    print(f"Recording for {duration} seconds...")
    print("Speak now!")

    recording = sd.rec(
        int(duration * sample_rate),
        samplerate=sample_rate,
        channels=1,
        dtype="int16",
    )
    sd.wait()

    print(f"Recording saved to {output_path}")
    wavfile.write(output_path, sample_rate, recording)

    return output_path


def main():
    parser = argparse.ArgumentParser(
        description="Whisper STT Wrapper - Local Speech-to-Text",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    %(prog)s audio.mp3                     # Transcribe with default model
    %(prog)s audio.wav --model base        # Use base model (faster)
    %(prog)s audio.mp3 --model large       # Use large model (more accurate)
    %(prog)s speech.wav --language en      # Specify English
    %(prog)s japanese.mp3 --task translate # Translate to English
    %(prog)s audio.mp3 --format srt        # Output as subtitles
    %(prog)s audio.mp3 --output result     # Save to result.txt
    %(prog)s --record 10                   # Record 10 seconds from microphone
    %(prog)s --list-models                 # Show available models
        """,
    )

    parser.add_argument(
        "audio",
        nargs="?",
        help="Path to audio file (mp3, wav, m4a, etc.)",
    )

    parser.add_argument(
        "--model", "-m",
        default="turbo",
        choices=["tiny", "tiny.en", "base", "base.en", "small", "small.en",
                 "medium", "medium.en", "large", "large-v2", "large-v3", "turbo"],
        help="Whisper model to use (default: turbo)",
    )

    parser.add_argument(
        "--language", "-l",
        default=None,
        help="Language code (e.g., 'en', 'ja', 'fr'). Auto-detected if not specified.",
    )

    parser.add_argument(
        "--task", "-t",
        default="transcribe",
        choices=["transcribe", "translate"],
        help="Task: 'transcribe' or 'translate' to English (default: transcribe)",
    )

    parser.add_argument(
        "--format", "-f",
        default="text",
        choices=["text", "json", "srt", "vtt"],
        help="Output format (default: text)",
    )

    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Output file path (without extension). Prints to stdout if not specified.",
    )

    parser.add_argument(
        "--word-timestamps", "-w",
        action="store_true",
        help="Include word-level timestamps (requires json format)",
    )

    parser.add_argument(
        "--record", "-r",
        type=int,
        default=None,
        metavar="SECONDS",
        help="Record audio from microphone for specified seconds",
    )

    parser.add_argument(
        "--quiet", "-q",
        action="store_true",
        help="Suppress progress messages",
    )

    parser.add_argument(
        "--list-models",
        action="store_true",
        help="List available Whisper models",
    )

    args = parser.parse_args()

    # Handle --list-models
    if args.list_models:
        print("Available Whisper models:")
        print()
        models = [
            ("tiny", "~39M params", "~1GB VRAM", "Fastest, least accurate"),
            ("tiny.en", "~39M params", "~1GB VRAM", "English-only tiny"),
            ("base", "~74M params", "~1GB VRAM", "Fast, basic accuracy"),
            ("base.en", "~74M params", "~1GB VRAM", "English-only base"),
            ("small", "~244M params", "~2GB VRAM", "Good balance"),
            ("small.en", "~244M params", "~2GB VRAM", "English-only small"),
            ("medium", "~769M params", "~5GB VRAM", "High accuracy"),
            ("medium.en", "~769M params", "~5GB VRAM", "English-only medium"),
            ("large", "~1550M params", "~10GB VRAM", "Highest accuracy (v3)"),
            ("large-v2", "~1550M params", "~10GB VRAM", "Previous large version"),
            ("large-v3", "~1550M params", "~10GB VRAM", "Latest large version"),
            ("turbo", "~809M params", "~6GB VRAM", "Fast large model (recommended)"),
        ]
        for model, params, vram, desc in models:
            print(f"  {model:12} {params:15} {vram:12} {desc}")
        return

    # Handle --record
    if args.record:
        audio_path = record_audio(args.record)
    elif args.audio:
        audio_path = args.audio
        if not os.path.exists(audio_path):
            print(f"Error: File not found: {audio_path}", file=sys.stderr)
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)

    # Run transcription
    try:
        result = transcribe_audio(
            audio_path=audio_path,
            model_name=args.model,
            language=args.language,
            task=args.task,
            word_timestamps=args.word_timestamps,
            verbose=not args.quiet,
        )
    except Exception as e:
        print(f"Error during transcription: {e}", file=sys.stderr)
        sys.exit(1)

    # Format output
    output = format_output(result, args.format)

    # Print detected language if verbose
    if not args.quiet and result.get("language"):
        print(f"\nDetected language: {result['language']}")

    # Output results
    if args.output:
        ext = {"text": "txt", "json": "json", "srt": "srt", "vtt": "vtt"}[args.format]
        output_path = f"{args.output}.{ext}"
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(output)
        print(f"\nTranscription saved to: {output_path}")
    else:
        print("\n" + "=" * 50)
        print("TRANSCRIPTION:")
        print("=" * 50)
        print(output)


if __name__ == "__main__":
    main()
