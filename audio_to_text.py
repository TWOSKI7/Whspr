#!/usr/bin/env python3
"""
Simple Audio-to-Text Transcription Script using Whisper

Usage:
    python audio_to_text.py <audio_file>
    python audio_to_text.py <audio_file> --model medium
    python audio_to_text.py <audio_file> --output transcript.txt
"""
import argparse
import sys

import torch

import whisper


def transcribe_audio(
    audio_path: str,
    model_name: str = "tiny",
    language: str = None,
    output_file: str = None,
    verbose: bool = True,
):
    """
    Transcribe an audio file to text.

    Parameters
    ----------
    audio_path : str
        Path to the audio file (supports mp3, wav, flac, m4a, etc.)
    model_name : str
        Whisper model to use: tiny, base, small, medium, large, turbo
    language : str
        Language code (e.g., 'en', 'es', 'fr'). Auto-detected if None.
    output_file : str
        Optional file path to save the transcript
    verbose : bool
        Print progress information

    Returns
    -------
    str
        The transcribed text
    """
    # Detect device
    device = "cuda" if torch.cuda.is_available() else "cpu"

    if verbose:
        print(f"Loading {model_name} model on {device}...")

    # Load model
    model = whisper.load_model(model_name, device=device)

    if verbose:
        print(f"Transcribing: {audio_path}")

    # Transcribe
    result = model.transcribe(
        audio_path,
        language=language,
        verbose=verbose,
    )

    text = result["text"].strip()
    detected_language = result["language"]

    if verbose:
        print(f"\nDetected language: {detected_language}")
        print("-" * 50)
        print("TRANSCRIPT:")
        print("-" * 50)
        print(text)
        print("-" * 50)

    # Save to file if requested
    if output_file:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(text)
        if verbose:
            print(f"\nTranscript saved to: {output_file}")

    return text


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe audio files to text using Whisper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
    python audio_to_text.py recording.mp3
    python audio_to_text.py interview.wav --model medium
    python audio_to_text.py speech.flac --language en --output transcript.txt
    python audio_to_text.py podcast.m4a --model turbo

Available models (smallest to largest):
    tiny    - Fastest, least accurate (~1GB VRAM)
    base    - Fast, basic accuracy (~1GB VRAM)
    small   - Good balance (~2GB VRAM)
    medium  - Better accuracy (~5GB VRAM)
    large   - Best accuracy (~10GB VRAM)
    turbo   - Fast and accurate (~6GB VRAM)
        """,
    )

    parser.add_argument("audio", help="Path to the audio file to transcribe")
    parser.add_argument(
        "--model",
        "-m",
        default="tiny",
        choices=whisper.available_models(),
        help="Whisper model to use (default: tiny)",
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
        help="Output file path to save the transcript",
    )
    parser.add_argument(
        "--quiet",
        "-q",
        action="store_true",
        help="Suppress progress output, only print transcript",
    )

    args = parser.parse_args()

    try:
        transcribe_audio(
            audio_path=args.audio,
            model_name=args.model,
            language=args.language,
            output_file=args.output,
            verbose=not args.quiet,
        )
    except FileNotFoundError:
        print(f"Error: Audio file not found: {args.audio}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
