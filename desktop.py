#!/usr/bin/env python3
"""
Whisper Desktop App with Microphone Recording
Works on Windows, macOS, and Linux
"""

import os
import sys
import wave
import threading
import tempfile
import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext, messagebox

# Check and install required packages
def check_dependencies():
    missing = []
    try:
        import numpy
    except ImportError:
        missing.append("numpy")
    try:
        import sounddevice
    except ImportError:
        missing.append("sounddevice")

    if missing:
        print(f"Installing: {', '.join(missing)}...")
        os.system(f"{sys.executable} -m pip install {' '.join(missing)}")

check_dependencies()

import numpy as np
import sounddevice as sd
import whisper


class MicrophoneRecorder:
    """Handles microphone recording"""

    def __init__(self, sample_rate=16000):
        self.sample_rate = sample_rate
        self.recording = False
        self.audio_data = []
        self.stream = None
        self.available = self._check_microphone()

    def _check_microphone(self):
        """Check if microphone is available"""
        try:
            devices = sd.query_devices()
            input_device = sd.query_devices(kind='input')
            if input_device:
                print(f"Microphone found: {input_device['name']}")
                return True
        except Exception as e:
            print(f"No microphone available: {e}")
        return False

    def start(self):
        """Start recording from microphone"""
        if not self.available:
            return False

        self.audio_data = []
        self.recording = True

        def callback(indata, frames, time, status):
            if status:
                print(f"Audio status: {status}")
            if self.recording:
                self.audio_data.append(indata.copy())

        try:
            self.stream = sd.InputStream(
                samplerate=self.sample_rate,
                channels=1,
                dtype=np.float32,
                callback=callback,
                blocksize=1024
            )
            self.stream.start()
            return True
        except Exception as e:
            print(f"Failed to start recording: {e}")
            self.recording = False
            return False

    def stop(self):
        """Stop recording and return the audio file path"""
        self.recording = False

        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except:
                pass
            self.stream = None

        if not self.audio_data:
            return None

        # Combine all audio chunks
        audio = np.concatenate(self.audio_data, axis=0)

        # Save to temporary WAV file
        temp_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
        with wave.open(temp_file.name, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(self.sample_rate)
            audio_int16 = (audio * 32767).astype(np.int16)
            wf.writeframes(audio_int16.tobytes())

        return temp_file.name


class FloatingMicWidget(tk.Toplevel):
    """Small floating microphone popup for quick recording"""

    def __init__(self, parent, on_transcribe_callback, recorder):
        super().__init__(parent)
        self.parent = parent
        self.on_transcribe = on_transcribe_callback
        self.recorder = recorder

        # Window setup
        self.title("Quick Mic")
        self.geometry("180x140")
        self.resizable(False, False)
        self.attributes("-topmost", True)
        self.configure(bg="#0f0f1a")

        # Remove window decorations for cleaner look
        self.overrideredirect(False)

        self.is_recording = False
        self.setup_ui()

    def setup_ui(self):
        # Main frame with padding
        frame = tk.Frame(self, bg="#0f0f1a", padx=20, pady=15)
        frame.pack(fill=tk.BOTH, expand=True)

        # Title
        tk.Label(frame, text="Quick Record", fg="#00d4ff", bg="#0f0f1a",
                 font=("Segoe UI", 10, "bold")).pack(pady=(0, 8))

        # Status label
        self.status_label = tk.Label(frame, text="Click to start",
                                      fg="#666666", bg="#0f0f1a",
                                      font=("Segoe UI", 9))
        self.status_label.pack(pady=(0, 8))

        # Microphone button - circular style
        self.mic_btn = tk.Button(frame, text="🎤", font=("Segoe UI", 28),
                                  bg="#1e1e2e", fg="#00d4ff",
                                  activebackground="#2a2a3e", activeforeground="#00d4ff",
                                  relief=tk.FLAT, cursor="hand2",
                                  width=3, height=1,
                                  command=self.toggle_recording)
        self.mic_btn.pack(pady=5)

        # Bind drag
        self.bind("<Button-1>", self.start_drag)
        self.bind("<B1-Motion>", self.on_drag)

    def toggle_recording(self):
        if not self.recorder.available:
            self.status_label.configure(text="No microphone!", fg="#ff4444")
            return

        if not self.is_recording:
            if self.recorder.start():
                self.is_recording = True
                self.mic_btn.configure(bg="#ff4444", fg="#ffffff")
                self.status_label.configure(text="Recording...", fg="#ff4444")
            else:
                self.status_label.configure(text="Mic error!", fg="#ff4444")
        else:
            self.is_recording = False
            self.mic_btn.configure(bg="#1e1e2e", fg="#00d4ff")
            self.status_label.configure(text="Processing...", fg="#00d4ff")

            audio_path = self.recorder.stop()
            if audio_path:
                self.on_transcribe(audio_path, from_mic=True)
            self.status_label.configure(text="Click to start", fg="#666666")

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
        self.root.title("Whisper Speech-to-Text")
        self.root.geometry("800x700")
        self.root.configure(bg="#0f0f1a")
        self.root.minsize(600, 500)

        # Variables
        self.model = None
        self.model_name = tk.StringVar(value="small")
        self.task = tk.StringVar(value="transcribe")
        self.language = tk.StringVar(value="")
        self.file_path = tk.StringVar(value="")
        self.status = tk.StringVar(value="Ready")

        # Microphone
        self.recorder = MicrophoneRecorder()
        self.is_recording = False
        self.floating_widget = None

        self.setup_styles()
        self.setup_ui()

    def setup_styles(self):
        """Configure ttk styles for modern look"""
        style = ttk.Style()
        style.theme_use('clam')

        # Colors
        bg_dark = "#0f0f1a"
        bg_card = "#1a1a2e"
        bg_input = "#252540"
        fg_main = "#ffffff"
        fg_dim = "#888888"
        accent = "#00d4ff"

        style.configure(".", background=bg_dark, foreground=fg_main)
        style.configure("TFrame", background=bg_dark)
        style.configure("Card.TFrame", background=bg_card)
        style.configure("TLabel", background=bg_dark, foreground=fg_main, font=("Segoe UI", 11))
        style.configure("Title.TLabel", font=("Segoe UI", 32, "bold"), foreground=accent)
        style.configure("Subtitle.TLabel", foreground=fg_dim, font=("Segoe UI", 11))
        style.configure("CardTitle.TLabel", background=bg_card, foreground=fg_main, font=("Segoe UI", 12, "bold"))
        style.configure("CardText.TLabel", background=bg_card, foreground=fg_dim, font=("Segoe UI", 10))

        # Buttons
        style.configure("TButton", font=("Segoe UI", 11), padding=(20, 10),
                       background=bg_input, foreground=fg_main)
        style.map("TButton", background=[("active", "#3a3a5a")])

        style.configure("Accent.TButton", background=accent, foreground="#000000")
        style.map("Accent.TButton", background=[("active", "#00a0cc")])

        # Combobox
        style.configure("TCombobox", font=("Segoe UI", 11), padding=8,
                       fieldbackground=bg_input, background=bg_input)

        # Entry
        style.configure("TEntry", font=("Segoe UI", 11), padding=10,
                       fieldbackground=bg_input)

    def setup_ui(self):
        # Main container with padding
        main = ttk.Frame(self.root, padding=40)
        main.pack(fill=tk.BOTH, expand=True)

        # Header
        header = ttk.Frame(main)
        header.pack(fill=tk.X, pady=(0, 30))

        ttk.Label(header, text="Whisper", style="Title.TLabel").pack(side=tk.LEFT)

        # Mini widget button
        mini_btn = tk.Button(header, text="📌 Mini Mode", font=("Segoe UI", 10),
                             bg="#1a1a2e", fg="#00d4ff", relief=tk.FLAT,
                             activebackground="#252540", cursor="hand2",
                             padx=15, pady=8, command=self.open_floating_widget)
        mini_btn.pack(side=tk.RIGHT)

        ttk.Label(main, text="Local speech recognition powered by OpenAI Whisper",
                  style="Subtitle.TLabel").pack(anchor=tk.W, pady=(0, 25))

        # === MICROPHONE CARD ===
        mic_card = tk.Frame(main, bg="#1a1a2e", padx=30, pady=25)
        mic_card.pack(fill=tk.X, pady=(0, 20))

        # Mic card content
        mic_header = tk.Frame(mic_card, bg="#1a1a2e")
        mic_header.pack(fill=tk.X)

        tk.Label(mic_header, text="🎤  Microphone", font=("Segoe UI", 14, "bold"),
                 bg="#1a1a2e", fg="#ffffff").pack(side=tk.LEFT)

        # Mic status indicator
        mic_status_text = "Ready" if self.recorder.available else "Not available"
        mic_status_color = "#00ff88" if self.recorder.available else "#ff4444"
        self.mic_indicator = tk.Label(mic_header, text=f"● {mic_status_text}",
                                       font=("Segoe UI", 10), bg="#1a1a2e", fg=mic_status_color)
        self.mic_indicator.pack(side=tk.RIGHT)

        # Record button
        btn_frame = tk.Frame(mic_card, bg="#1a1a2e")
        btn_frame.pack(pady=(20, 10))

        self.mic_btn = tk.Button(btn_frame, text="  Start Recording  ", font=("Segoe UI", 13, "bold"),
                                  bg="#00d4ff", fg="#000000", activebackground="#00a0cc",
                                  relief=tk.FLAT, cursor="hand2", padx=30, pady=12,
                                  command=self.toggle_recording)
        self.mic_btn.pack()

        self.mic_status = tk.Label(mic_card, text="Click to record from your microphone",
                                    bg="#1a1a2e", fg="#666666", font=("Segoe UI", 10))
        self.mic_status.pack(pady=(10, 0))

        # === FILE SELECTION ===
        file_frame = ttk.Frame(main)
        file_frame.pack(fill=tk.X, pady=(0, 20))

        ttk.Label(file_frame, text="Or transcribe a file:").pack(anchor=tk.W, pady=(0, 8))

        file_input_frame = ttk.Frame(file_frame)
        file_input_frame.pack(fill=tk.X)

        self.file_entry = tk.Entry(file_input_frame, textvariable=self.file_path,
                                    font=("Segoe UI", 11), bg="#252540", fg="#ffffff",
                                    relief=tk.FLAT, insertbackground="#ffffff")
        self.file_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=12, padx=(0, 10))

        browse_btn = tk.Button(file_input_frame, text="Browse", font=("Segoe UI", 11),
                                bg="#252540", fg="#ffffff", relief=tk.FLAT,
                                activebackground="#3a3a5a", cursor="hand2",
                                padx=20, pady=10, command=self.browse_file)
        browse_btn.pack(side=tk.RIGHT)

        # === SETTINGS ROW ===
        settings_frame = ttk.Frame(main)
        settings_frame.pack(fill=tk.X, pady=(0, 20))

        # Model
        model_frame = ttk.Frame(settings_frame)
        model_frame.pack(side=tk.LEFT, padx=(0, 20))
        ttk.Label(model_frame, text="Model", style="Subtitle.TLabel").pack(anchor=tk.W)
        model_combo = ttk.Combobox(model_frame, textvariable=self.model_name,
                                    values=["tiny", "base", "small", "medium", "large", "turbo"],
                                    state="readonly", width=14, font=("Segoe UI", 11))
        model_combo.pack(pady=(5, 0))

        # Task
        task_frame = ttk.Frame(settings_frame)
        task_frame.pack(side=tk.LEFT, padx=(0, 20))
        ttk.Label(task_frame, text="Task", style="Subtitle.TLabel").pack(anchor=tk.W)
        task_combo = ttk.Combobox(task_frame, textvariable=self.task,
                                   values=["transcribe", "translate"],
                                   state="readonly", width=14, font=("Segoe UI", 11))
        task_combo.pack(pady=(5, 0))

        # Language
        lang_frame = ttk.Frame(settings_frame)
        lang_frame.pack(side=tk.LEFT)
        ttk.Label(lang_frame, text="Language", style="Subtitle.TLabel").pack(anchor=tk.W)
        lang_combo = ttk.Combobox(lang_frame, textvariable=self.language,
                                   values=["Auto", "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"],
                                   state="readonly", width=14, font=("Segoe UI", 11))
        lang_combo.set("Auto")
        lang_combo.pack(pady=(5, 0))

        # Transcribe button
        self.transcribe_btn = tk.Button(main, text="Transcribe File", font=("Segoe UI", 12),
                                         bg="#252540", fg="#ffffff", relief=tk.FLAT,
                                         activebackground="#3a3a5a", cursor="hand2",
                                         padx=25, pady=12, command=self.start_file_transcription)
        self.transcribe_btn.pack(pady=(0, 15))

        # Status
        self.status_label = tk.Label(main, textvariable=self.status,
                                      bg="#0f0f1a", fg="#666666", font=("Segoe UI", 10))
        self.status_label.pack(pady=(0, 10))

        # === RESULT AREA ===
        result_frame = ttk.Frame(main)
        result_frame.pack(fill=tk.BOTH, expand=True)

        ttk.Label(result_frame, text="Result").pack(anchor=tk.W, pady=(0, 8))

        self.result_text = scrolledtext.ScrolledText(result_frame, wrap=tk.WORD,
                                                      font=("Consolas", 12),
                                                      bg="#1a1a2e", fg="#ffffff",
                                                      insertbackground="#ffffff",
                                                      relief=tk.FLAT, padx=15, pady=15,
                                                      selectbackground="#00d4ff",
                                                      selectforeground="#000000")
        self.result_text.pack(fill=tk.BOTH, expand=True)

        # Action buttons
        btn_row = ttk.Frame(main)
        btn_row.pack(fill=tk.X, pady=(15, 0))

        for text, cmd in [("📋 Copy", self.copy_result), ("💾 Save", self.save_result)]:
            btn = tk.Button(btn_row, text=text, font=("Segoe UI", 10),
                           bg="#252540", fg="#ffffff", relief=tk.FLAT,
                           activebackground="#3a3a5a", cursor="hand2",
                           padx=15, pady=8, command=cmd)
            btn.pack(side=tk.LEFT, padx=(0, 10))

        clear_btn = tk.Button(btn_row, text="🗑 Clear", font=("Segoe UI", 10),
                              bg="#252540", fg="#ffffff", relief=tk.FLAT,
                              activebackground="#3a3a5a", cursor="hand2",
                              padx=15, pady=8, command=self.clear_result)
        clear_btn.pack(side=tk.RIGHT)

    def open_floating_widget(self):
        if self.floating_widget is None or not self.floating_widget.winfo_exists():
            self.floating_widget = FloatingMicWidget(self.root, self.transcribe_audio, self.recorder)
        else:
            self.floating_widget.lift()

    def toggle_recording(self):
        if not self.recorder.available:
            messagebox.showwarning("Microphone Not Available",
                "No microphone detected.\n\n"
                "If you're using WSL, microphone access requires additional setup.\n"
                "Try running the app directly on Windows instead.")
            return

        if not self.is_recording:
            if self.recorder.start():
                self.is_recording = True
                self.mic_btn.configure(text="  ⏹ Stop Recording  ", bg="#ff4444", fg="#ffffff")
                self.mic_status.configure(text="Recording... Click to stop", fg="#ff4444")
                self.mic_indicator.configure(text="● Recording", fg="#ff4444")
            else:
                messagebox.showerror("Error", "Failed to start recording. Check microphone permissions.")
        else:
            self.is_recording = False
            self.mic_btn.configure(text="  Start Recording  ", bg="#00d4ff", fg="#000000")
            self.mic_status.configure(text="Processing...", fg="#00d4ff")
            self.mic_indicator.configure(text="● Processing", fg="#ffaa00")

            audio_path = self.recorder.stop()
            if audio_path:
                self.transcribe_audio(audio_path, from_mic=True)
            else:
                self.mic_status.configure(text="No audio recorded", fg="#ff4444")
                self.mic_indicator.configure(text="● Ready", fg="#00ff88")

    def browse_file(self):
        filetypes = [
            ("Audio files", "*.mp3 *.wav *.m4a *.flac *.ogg *.webm *.wma *.aac *.mp4"),
            ("All files", "*.*")
        ]
        path = filedialog.askopenfilename(filetypes=filetypes)
        if path:
            self.file_path.set(path)

    def start_file_transcription(self):
        if not self.file_path.get():
            messagebox.showwarning("No File", "Please select an audio file first.")
            return
        if not os.path.exists(self.file_path.get()):
            messagebox.showerror("Error", "File not found.")
            return
        self.transcribe_audio(self.file_path.get(), from_mic=False)

    def transcribe_audio(self, audio_path, from_mic=False):
        self.transcribe_btn.configure(state=tk.DISABLED)
        self.mic_btn.configure(state=tk.DISABLED)
        self.status.set("Loading model...")

        def run():
            try:
                model_name = self.model_name.get()
                if self.model is None or getattr(self.model, '_name', None) != model_name:
                    self.update_status(f"Loading {model_name} model (first time may take a while)...")
                    self.model = whisper.load_model(model_name)
                    self.model._name = model_name

                self.update_status("Transcribing...")

                language = self.language.get()
                if language == "Auto" or language == "":
                    language = None

                result = self.model.transcribe(
                    audio_path,
                    task=self.task.get(),
                    language=language
                )

                if from_mic and os.path.exists(audio_path):
                    os.unlink(audio_path)

                self.root.after(0, lambda: self.show_result(result))

            except Exception as e:
                self.root.after(0, lambda: self.show_error(str(e)))

        threading.Thread(target=run, daemon=True).start()

    def update_status(self, msg):
        self.root.after(0, lambda: self.status.set(msg))

    def show_result(self, result):
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(tk.END, result["text"].strip())

        lang = result.get("language", "unknown")
        self.status.set(f"Done! Detected language: {lang}")

        self.transcribe_btn.configure(state=tk.NORMAL)
        self.mic_btn.configure(state=tk.NORMAL)
        self.mic_status.configure(text="Click to record from your microphone", fg="#666666")
        if self.recorder.available:
            self.mic_indicator.configure(text="● Ready", fg="#00ff88")

    def show_error(self, error):
        self.status.set(f"Error: {error}")
        self.transcribe_btn.configure(state=tk.NORMAL)
        self.mic_btn.configure(state=tk.NORMAL)
        messagebox.showerror("Error", error)

    def copy_result(self):
        text = self.result_text.get(1.0, tk.END).strip()
        if text:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.status.set("Copied to clipboard!")

    def save_result(self):
        text = self.result_text.get(1.0, tk.END).strip()
        if not text:
            return
        path = filedialog.asksaveasfilename(defaultextension=".txt",
                                             filetypes=[("Text files", "*.txt")])
        if path:
            with open(path, "w", encoding="utf-8") as f:
                f.write(text)
            self.status.set(f"Saved!")

    def clear_result(self):
        self.result_text.delete(1.0, tk.END)
        self.status.set("Ready")


def main():
    root = tk.Tk()

    # Try to set DPI awareness for sharper rendering on Windows
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass

    app = WhisperApp(root)
    root.mainloop()


if __name__ == "__main__":
    main()
