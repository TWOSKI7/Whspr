#!/usr/bin/env python3
"""
Whisper Desktop App
Run with: python3 desktop.py
"""

import os
import threading
import tkinter as tk
from tkinter import ttk, filedialog, scrolledtext
import whisper

class WhisperApp:
    def __init__(self, root):
        self.root = root
        self.root.title("Whisper - Speech to Text")
        self.root.geometry("700x600")
        self.root.configure(bg="#1a1a2e")

        # Variables
        self.model = None
        self.model_name = tk.StringVar(value="small")
        self.task = tk.StringVar(value="transcribe")
        self.language = tk.StringVar(value="")
        self.file_path = tk.StringVar(value="")
        self.status = tk.StringVar(value="Ready")

        self.setup_ui()

    def setup_ui(self):
        # Style
        style = ttk.Style()
        style.theme_use('clam')
        style.configure("TFrame", background="#1a1a2e")
        style.configure("TLabel", background="#1a1a2e", foreground="#ffffff", font=("Helvetica", 11))
        style.configure("Title.TLabel", font=("Helvetica", 24, "bold"), foreground="#00d4ff")
        style.configure("TButton", font=("Helvetica", 11), padding=10)
        style.configure("TCombobox", font=("Helvetica", 11))
        style.configure("Accent.TButton", font=("Helvetica", 12, "bold"))

        # Main container
        main = ttk.Frame(self.root, padding=30)
        main.pack(fill=tk.BOTH, expand=True)

        # Title
        ttk.Label(main, text="Whisper", style="Title.TLabel").pack(pady=(0, 5))
        ttk.Label(main, text="Speech Recognition - Running Locally", foreground="#888888").pack(pady=(0, 20))

        # File selection frame
        file_frame = ttk.Frame(main)
        file_frame.pack(fill=tk.X, pady=10)

        ttk.Label(file_frame, text="Audio File:").pack(side=tk.LEFT)

        file_entry = ttk.Entry(file_frame, textvariable=self.file_path, width=50, font=("Helvetica", 11))
        file_entry.pack(side=tk.LEFT, padx=(10, 10), fill=tk.X, expand=True)

        browse_btn = ttk.Button(file_frame, text="Browse", command=self.browse_file)
        browse_btn.pack(side=tk.RIGHT)

        # Settings frame
        settings_frame = ttk.Frame(main)
        settings_frame.pack(fill=tk.X, pady=20)

        # Model selection
        model_frame = ttk.Frame(settings_frame)
        model_frame.pack(side=tk.LEFT, padx=(0, 30))
        ttk.Label(model_frame, text="Model").pack(anchor=tk.W)
        model_combo = ttk.Combobox(model_frame, textvariable=self.model_name,
                                    values=["tiny", "base", "small", "medium", "large", "turbo"],
                                    state="readonly", width=12)
        model_combo.pack(pady=(5, 0))

        # Task selection
        task_frame = ttk.Frame(settings_frame)
        task_frame.pack(side=tk.LEFT, padx=(0, 30))
        ttk.Label(task_frame, text="Task").pack(anchor=tk.W)
        task_combo = ttk.Combobox(task_frame, textvariable=self.task,
                                   values=["transcribe", "translate"],
                                   state="readonly", width=12)
        task_combo.pack(pady=(5, 0))

        # Language selection
        lang_frame = ttk.Frame(settings_frame)
        lang_frame.pack(side=tk.LEFT)
        ttk.Label(lang_frame, text="Language").pack(anchor=tk.W)
        lang_combo = ttk.Combobox(lang_frame, textvariable=self.language,
                                   values=["", "en", "es", "fr", "de", "it", "pt", "ru", "ja", "ko", "zh"],
                                   state="readonly", width=12)
        lang_combo.pack(pady=(5, 0))

        # Transcribe button
        self.transcribe_btn = ttk.Button(main, text="Transcribe", command=self.start_transcription,
                                          style="Accent.TButton")
        self.transcribe_btn.pack(pady=20)

        # Status
        status_label = ttk.Label(main, textvariable=self.status, foreground="#888888")
        status_label.pack()

        # Result text area
        ttk.Label(main, text="Result:").pack(anchor=tk.W, pady=(20, 5))

        self.result_text = scrolledtext.ScrolledText(main, wrap=tk.WORD, height=15,
                                                      font=("Consolas", 11),
                                                      bg="#0d0d1a", fg="#ffffff",
                                                      insertbackground="#ffffff",
                                                      relief=tk.FLAT, padx=10, pady=10)
        self.result_text.pack(fill=tk.BOTH, expand=True)

        # Bottom buttons
        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill=tk.X, pady=(15, 0))

        ttk.Button(btn_frame, text="Copy", command=self.copy_result).pack(side=tk.LEFT, padx=(0, 10))
        ttk.Button(btn_frame, text="Save", command=self.save_result).pack(side=tk.LEFT)
        ttk.Button(btn_frame, text="Clear", command=self.clear_result).pack(side=tk.RIGHT)

    def browse_file(self):
        filetypes = [
            ("Audio files", "*.mp3 *.wav *.m4a *.flac *.ogg *.webm *.wma *.aac"),
            ("All files", "*.*")
        ]
        path = filedialog.askopenfilename(filetypes=filetypes)
        if path:
            self.file_path.set(path)

    def start_transcription(self):
        if not self.file_path.get():
            self.status.set("Please select an audio file")
            return

        if not os.path.exists(self.file_path.get()):
            self.status.set("File not found")
            return

        self.transcribe_btn.configure(state=tk.DISABLED)
        self.status.set("Loading model...")
        self.result_text.delete(1.0, tk.END)

        # Run in background thread
        thread = threading.Thread(target=self.transcribe)
        thread.daemon = True
        thread.start()

    def transcribe(self):
        try:
            # Load model if needed
            model_name = self.model_name.get()
            if self.model is None or getattr(self.model, '_name', None) != model_name:
                self.update_status(f"Loading {model_name} model (first time may take a while)...")
                self.model = whisper.load_model(model_name)
                self.model._name = model_name

            self.update_status("Transcribing...")

            # Transcribe
            language = self.language.get() or None
            result = self.model.transcribe(
                self.file_path.get(),
                task=self.task.get(),
                language=language
            )

            # Update UI
            self.root.after(0, lambda: self.show_result(result))

        except Exception as e:
            self.root.after(0, lambda: self.show_error(str(e)))

    def update_status(self, msg):
        self.root.after(0, lambda: self.status.set(msg))

    def show_result(self, result):
        self.result_text.delete(1.0, tk.END)
        self.result_text.insert(tk.END, result["text"].strip())
        detected_lang = result.get("language", "unknown")
        self.status.set(f"Done! Detected language: {detected_lang}")
        self.transcribe_btn.configure(state=tk.NORMAL)

    def show_error(self, error):
        self.status.set(f"Error: {error}")
        self.transcribe_btn.configure(state=tk.NORMAL)

    def copy_result(self):
        text = self.result_text.get(1.0, tk.END).strip()
        if text:
            self.root.clipboard_clear()
            self.root.clipboard_append(text)
            self.status.set("Copied to clipboard!")

    def save_result(self):
        text = self.result_text.get(1.0, tk.END).strip()
        if not text:
            self.status.set("Nothing to save")
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
        self.result_text.delete(1.0, tk.END)
        self.status.set("Ready")


if __name__ == "__main__":
    root = tk.Tk()
    app = WhisperApp(root)
    root.mainloop()
