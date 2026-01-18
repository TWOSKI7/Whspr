#!/usr/bin/env python3
"""
Whisper Web App - Simple GUI for OpenAI Whisper using Gradio
Run with: python whisper_app.py
"""
import gradio as gr
import whisper

# Global model cache
_model = None
_model_name = None

def load_model(model_name):
    """Load or switch Whisper model."""
    global _model, _model_name
    if _model_name != model_name:
        _model = whisper.load_model(model_name)
        _model_name = model_name
    return _model

def transcribe(audio_path, model_name, task):
    """Transcribe or translate audio file."""
    if audio_path is None:
        return "Please upload an audio file."

    try:
        model = load_model(model_name)
        result = model.transcribe(audio_path, task=task)
        return result["text"]
    except Exception as e:
        return f"Error: {e}"

def create_app():
    """Create and return the Gradio app."""
    with gr.Blocks(title="Whisper Speech Recognition") as app:
        gr.Markdown("# Whisper Speech Recognition")
        gr.Markdown("Upload an audio file to transcribe or translate it using OpenAI's Whisper.")

        with gr.Row():
            with gr.Column(scale=1):
                audio_input = gr.Audio(
                    label="Audio File",
                    type="filepath",
                    sources=["upload", "microphone"]
                )

                model_dropdown = gr.Dropdown(
                    choices=["tiny", "base", "small", "medium", "large", "turbo"],
                    value="tiny",
                    label="Model (larger = more accurate but slower)"
                )

                task_radio = gr.Radio(
                    choices=["transcribe", "translate"],
                    value="transcribe",
                    label="Task"
                )

                submit_btn = gr.Button("Transcribe", variant="primary")

            with gr.Column(scale=2):
                output_text = gr.Textbox(
                    label="Transcription",
                    lines=15
                )

        submit_btn.click(
            fn=transcribe,
            inputs=[audio_input, model_dropdown, task_radio],
            outputs=output_text
        )

        gr.Markdown("---")
        gr.Markdown("**Tips:** Smaller models (tiny, base) are faster. Larger models (medium, large, turbo) are more accurate.")

    return app

if __name__ == "__main__":
    app = create_app()
    app.launch(server_name="0.0.0.0", server_port=7861, share=False)
