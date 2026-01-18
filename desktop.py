#!/usr/bin/env python3
"""
Whisper Desktop App with Microphone Recording
Run with: python3 desktop.py
"""

import os
import sys
import wave
import threading
import tempfile
import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext, messagebox

# Check for required packages
try:
    import numpy as np
    import sounddevice as sd
except ImportError:
    print("Installing audio recording dependencies...")
    os.system(f"{sys.executable} -m pip install sounddevice numpy")
    import numpy as np
    import sounddevice as sd

import whisper


class MicrophoneRecorder:
    """Handles microphone recording"""

    def __init__(self, sample_rate=16000):
        self.sample_rate = sample_rate
        self.recording = False
        self.audio_data = []

    def start(self):
        """Start recording from microphone"""
        self.audio_data = []
        self.recording = True

        def callback(indata, frames, time, status):
            if self.recording:
                self.audio_data.append(indata.copy())

        self.stream = sd.InputStream(
            samplerate=self.sample_rate,
            channels=1,
            dtype=np.float32,
            callback=callback
        )
        self.stream.start()

    def stop(self):
        """Stop recording and return the audio file path"""
        self.recording = False
        self.stream.stop()
        self.stream.close()

        if not self.audio_data:
            return None

        # Combine all audio chunks
        audio = np.concatenate(self.audio_data, axis=0)

        # Save to temporary WAV file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        with wave.open(temp_file.name, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 16-bit
            wf.setframerate(self.sample_rate)
            # Convert float32 to int16
            audio_int16 = (audio * 32767).astype(np.int16)
            wf.writeframes(audio_int16.tobytes())

        return temp_file.name

    def is_recording(self):
        return self.recording


class FloatingMicWidget(tk.Toplevel):
    """Small floating microphone popup for quick recording"""

    def __init__(self, parent, on_transcribe_callback):
        super().__init__(parent)
        self.parent = parent
        self.on_transcribe = on_transcribe_callback
        self.recorder = MicrophoneRecorder()

        # Window setup - small floating widget
        self.title("Whisper Mic")
        self.geometry("200x120")
        self.resizable(False, False)
        self.attributes("-topmost", True)  # Always on top
        self.configure(bg="#1a1a2e")

        # Make window draggable
        self.bind("<Button-1>", self.start_drag)
        self.bind("<B1-Motion>", self.on_drag)

        self.setup_ui()

    def setup_ui(self):
        # Main frame
        frame = tk.Frame(self, bg="#1a1a2e", padx=15, pady=15)
        frame.pack(fill=tk.BOTH, expand=True)

        # Status label
        self.status_label = tk.Label(frame, text="Click to Record",
                                      fg="#888888", bg="#1a1a2e",
                                      font=("Helvetica", 10))
        self.status_label.pack(pady=(0, 10))

        # Big microphone button
        self.mic_btn = tk.Button(frame, text="🎤", font=("Helvetica", 32),
                                  bg="#2d2d4a", fg="#00d4ff",
                                  activebackground="#3d3d5a",
                                  relief=tk.FLAT, cursor="hand2",
                                  command=self.toggle_recording)
        self.mic_btn.pack()

        # Recording state
        self.is_recording = False

    def toggle_recording(self):
        if not self.is_recording:
            # Start recording
            self.is_recording = True
            self.mic_btn.configure(bg="#ff4444", fg="#ffffff")
            self.status_label.configure(text="Recording... Click to stop", fg="#ff4444")
            self.recorder.start()
        else:
            # Stop recording and transcribe
            self.is_recording = False
            self.mic_btn.configure(bg="#2d2d4a", fg="#00d4ff")
            self.status_label.configure(text="Processing...", fg="#00d4ff")

            audio_path = self.recorder.stop()
            if audio_path:
                self.on_transcribe(audio_path, from_mic=True)

            self.status_label.configure(text="Click to Record", fg="#888888")

    def start_drag(self, event):
        self._drag_x = event.x
        self._drag_y = event.y

    def on_drag(self, event):
        x = self.winfo_x() + event.x - self._drag_x
        y = self.winfo_y() + event.y - self._drag_y
        self.geometry(f"+{x}+{y}")


class WhisperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Whisper - Speech to Text")
        self.root.geometry("750x650")
        self.root.configure(bg="#1a1a2e")

        # Try to set icon if available
        try:
            self.root.iconname("Whisper")
        except:
            pass

        # Variables
        self.model = None
        self.model_name = tk.StringVar(value="small")
        self.task = tk.StringVar(value="transcribe")
        self.language = tk.StringVar(value="")
        self.file_path = tk.StringVar(value="")
        self.status = tk.StringVar(value="Ready - Select a file or use microphone")

        # Microphone recorder
        self.recorder = MicrophoneRecorder()
        self.is_recording = False

        # Floating widget reference
        self.floating_widget = None

        self.setup_ui()

    def setup_ui(self):
        # Style configuration
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#1a1a2e")
        style.configure("TLabel", background="#1a1a2e", foreground="#ffffff", font=("Helvetica", 11))
        style.configure("Title.TLabel", font=("Helvetica", 28, "bold"), foreground="#00d4ff")
        style.configure("Subtitle.TLabel", font=("Helvetica", 11), foreground="#666666")
        style.configure("TButton", font=("Helvetica", 11), padding=8)
        style.configure("TCombobox", font=("Helvetica", 11))
        style.configure("Record.TButton", font=("Helvetica", 11))
        style.map("TButton", background=[("active", "#3d3d5a")])

        # Main container
        main = ttk.Frame(self.root, padding=30)
        main.pack(fill=tk.BOTH, expand=True)

        # Title section
        title_frame = ttk.Frame(main)
        title_frame.pack(fill=tk.X, pady=(0, 10))

        ttk.Label(title_frame, text="Whisper", style="Title.TLabel").pack(side=tk.LEFT)

        # Floating widget button (top right)
        popup_btn = tk.Button(title_frame, text="📌 Mini", font=("Helvetica", 10),
                               bg="#2d2d4a", fg="#00d4ff", relief=tk.FLAT,
                               cursor="hand2", command=self.open_floating_widget)
        popup_btn.pack(side=tk.RIGHT, padx=5)

        ttk.Label(main, text="Local Speech Recognition with Microphone Support",
                  style="Subtitle.TLabel").pack(anchor=tk.W, pady=(0, 20))

        # === MICROPHONE SECTION ===
        mic_frame = tk.Frame(main, bg="#252542", relief=tk.FLAT)
        mic_frame.pack(fill=tk.X, pady=(0, 20), ipady=15, ipadx=15)

        mic_inner = tk.Frame(mic_frame, bg="#252542")
        mic_inner.pack(pady=10)

        tk.Label(mic_inner, text="🎤 Microphone Recording", font=("Helvetica", 12, "bold"),
                 bg="#252542", fg="#ffffff").pack(pady=(0, 10))

        self.mic_btn = tk.Button(mic_inner, text="Start Recording", font=("Helvetica", 12),
                                  bg="#00d4ff", fg="#000000", activebackground="#00a0cc",
                                  relief=tk.FLAT, cursor="hand2", padx=20, pady=8,
                                  command=self.toggle_recording)
        self.mic_btn.pack()

        self.mic_status = tk.Label(mic_inner, text="Click to record from your microphone",
                                    bg="#252542", fg="#888888", font=("Helvetica", 10))
        self.mic_status.pack(pady=(8, 0))

        # === FILE SECTION ===
        file_frame = ttk.Frame(main)
        file_frame.pack(fill=tk.X, pady=(0, 15))

        ttk.Label(file_frame, text="Or select audio file:").pack(side=tk.LEFT)

        file_entry = ttk.Entry(file_frame, textvariable=self.file_path, width=45, font=("Helvetica", 11))
        file_entry.pack(side=tk.LEFT, padx=(10, 10), fill=tk.X, expand=True)

        browse_btn = ttk.Button(file_frame, text="Browse", command=self.browse_file)
        browse_btn.pack(side=tk.RIGHT)

        # === SETTINGS SECTION ===
        settings_frame = ttk.Frame(main)
        settings_frame.pack(fill=tk.X, pady=(5, 15))

        # Model
        model_frame = ttk.Frame(settings_frame)
        model_frame.pack(side=tk.LEFT, padx=(0, 25))
        ttk.Label(model_frame, text="Model").pack(anchor=tk.W)
        model_combo = ttk.Combobox(model_frame, textvariable=self.model_name,
                                    values=["tiny", "base", "small", "medium", "large", "turbo"],
                                    state="readonly", width=12)
        model_combo.pack(pady=(5, 0))

        # Task
        task_frame = ttk.Frame(settings_frame)
        task_frame.pack(side=tk.LEFT, padx=(0, 25))
        ttk.Label(task_frame, text="Task").pack(anchor=tk.W)
        task_combo = ttk.Combobox(task_frame, textvariable=self.task,
                                   values=["transcribe", "translate"],
                                   state="readonly", width=12)
        task_combo.pack(pady=(5, 0))

        # Language
        lang_frame = ttk.Frame(settings_frame)
        lang_frame.pack(side=tk.LEFT)
        ttk.Label(lang_frame, text="Language (auto if empty)").pack(anchor=tk.W)
        lang_combo = ttk.Combobox(lang_frame, textvariable=self.language,
                                   values=["", "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh", "ar", "hi"],
                                   state="readonly", width=12)
        lang_combo.pack(pady=(5, 0))

        # Transcribe file button
        self.transcribe_btn = ttk.Button(main, text="Transcribe File", command=self.start_file_transcription)
        self.transcribe_btn.pack(pady=10)

        # Status bar
        status_frame = tk.Frame(main, bg="#1a1a2e")
        status_frame.pack(fill=tk.X, pady=(5, 10))

        self.status_label = tk.Label(status_frame, textvariable=self.status,
                                      bg="#1a1a2e", fg="#888888", font=("Helvetica", 10))
        self.status_label.pack(side=tk.LEFT)

        # Result section
        result_label = ttk.Label(main, text="Transcription Result:")
        result_label.pack(anchor=tk.W, pady=(10, 5))

        self.result_text = scrolledtext.ScrolledText(main, wrap=tk.WORD, height=12,
                                                      font=("Consolas", 11),
                                                      bg="#0d0d1a", fg="#ffffff",
                                                      insertbackground="#ffffff",
                                                      relief=tk.FLAT, padx=12, pady=12)
        self.result_text.pack(fill=tk.BOTH, expand=True)

        # Bottom action buttons
        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill=tk.X, pady=(15, 0))

        ttk.Button(btn_frame, text="📋 Copy", command=self.copy_result).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn_frame, text="💾 Save", command=self.save_result).pack(side=tk.LEFT, padx=(0, 8))
        ttk.Button(btn_frame, text="🗑 Clear", command=self.clear_result).pack(side=tk.RIGHT)

    def open_floating_widget(self):
        """Open the mini floating microphone widget"""
        if self.floating_widget is None or not self.floating_widget.winfo_exists():
            self.floating_widget = FloatingMicWidget(self.root, self.transcribe_audio)
        else:
            self.floating_widget.lift()
            self.floating_widget.focus_force()

    def toggle_recording(self):
        """Toggle microphone recording on/off"""
        if not self.is_recording:
            # Start recording
            self.is_recording = True
            self.mic_btn.configure(text="⏹ Stop Recording", bg="#ff4444", fg="#ffffff")
            self.mic_status.configure(text="Recording... Click to stop and transcribe", fg="#ff4444")
            self.recorder.start()
        else:
            # Stop recording
            self.is_recording = False
            self.mic_btn.configure(text="Start Recording", bg="#00d4ff", fg="#000000")
            self.mic_status.configure(text="Processing recording...", fg="#00d4ff")

            audio_path = self.recorder.stop()
            if audio_path:
                self.transcribe_audio(audio_path, from_mic=True)
            else:
                self.mic_status.configure(text="No audio recorded", fg="#ff4444")

    def browse_file(self):
        """Open file browser for audio files"""
        filetypes = [
            ("Audio files", "*.mp3 *.wav *.m4a *.flac *.ogg *.webm *.wma *.aac *.mp4"),
            ("All files", "*.*")
        ]
        path = filedialog.askopenfilename(filetypes=filetypes)
        if path:
            self.file_path.set(path)

    def start_file_transcription(self):
        """Start transcription of selected file"""
        if not self.file_path.get():
            messagebox.showwarning("No File", "Please select an audio file first")
            return

        if not os.path.exists(self.file_path.get()):
            messagebox.showerror("Error", "File not found")
            return

        self.transcribe_audio(self.file_path.get(), from_mic=False)

    def transcribe_audio(self, audio_path, from_mic=False):
        """Transcribe audio file in background thread"""
        self.transcribe_btn.configure(state=tk.DISABLED)
        self.mic_btn.configure(state=tk.DISABLED)
        self.status.set("Loading model...")

        def run():
            try:
                # Load model if needed
                model_name = self.model_name.get()
                if self.model is None or getattr(self.model, '_name', None) != model_name:
                    self.update_status(f"Loading {model_name} model (first time takes a while)...")
                    self.model = whisper.load_model(model_name)
                    self.model._name = model_name

                self.update_status("Transcribing audio...")

                # Transcribe
                language = self.language.get() or None
                result = self.model.transcribe(
                    audio_path,
                    task=self.task.get(),
                    language=language
                )

                # Clean up temp file from mic recording
                if from_mic and os.path.exists(audio_path):
                    os.unlink(audio_path)

                # Update UI on main thread
                self.root.after(0, lambda: self.show_result(result))

            except Exception as e:
                self.root.after(0, lambda: self.show_error(str(e)))

        thread = threading.Thread(target=run, daemon=True)
        thread.start()

    def update_status(self, msg):
        """Update status label from any thread"""
        self.root.after(0, lambda: self.status.set(msg))

    def show_result(self, result):
        """Display transcription result"""
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(tk.END, result["text"].strip())

        detected_lang = result.get("language", "unknown")
        self.status.set(f"Done! Language: {detected_lang}")

        self.transcribe_btn.configure(state=tk.NORMAL)
        self.mic_btn.configure(state=tk.NORMAL)
        self.mic_status.configure(text="Click to record from your microphone", fg="#888888")

    def show_error(self, error):
        """Display error message"""
        self.status.set(f"Error: {error}")
        self.transcribe_btn.configure(state=tk.NORMAL)
        self.mic_btn.configure(state=tk.NORMAL)
        self.mic_status.configure(text="Error occurred. Try again.", fg="#ff4444")
        messagebox.showerror("Error", error)

    def copy_result(self):
        """Copy result to clipboard"""
        text = self.result_text.get(1.0, tk.END).strip()
        if text:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.status.set("Copied to clipboard!")
        else:
            self.status.set("Nothing to copy")

    def save_result(self):
        """Save result to text file"""
        text = self.result_text.get(1.0, tk.END).strip()
        if not text:
            messagebox.showinfo("Empty", "Nothing to save")
            return

        path = filedialog.asksaveasfilename(
            defaultextension=".txt",
            filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
        )
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            self.status.set(f"Saved to {os.path.basename(path)}")

    def clear_result(self):
        """Clear the result text area"""
        self.result_text.delete(1.0, tk.END)
        self.status.set("Ready - Select a file or use microphone")


def main():
    # Check for audio device
    try:
        devices = sd.query_devices()
        input_device = sd.query_devices(kind='input')
        print(f"Using microphone: {input_device['name']}")
    except Exception as e:
        print(f"Warning: Could not detect microphone: {e}")

    root = tk.Tk()
    app = WhisperApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
