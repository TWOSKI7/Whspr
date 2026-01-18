#!/usr/bin/env python3
"""
Whisper Desktop App - Native GUI for OpenAI Whisper
"""
import sys
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QComboBox, QTextEdit, QFileDialog,
    QProgressBar, QGroupBox, QMessageBox
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont

class TranscribeWorker(QThread):
    finished = pyqtSignal(str)
    error = pyqtSignal(str)
    progress = pyqtSignal(str)

    def __init__(self, audio_path, model_name, task):
        super().__init__()
        self.audio_path = audio_path
        self.model_name = model_name
        self.task = task

    def run(self):
        try:
            self.progress.emit("Loading model...")
            import whisper
            model = whisper.load_model(self.model_name)

            self.progress.emit("Transcribing...")
            result = model.transcribe(self.audio_path, task=self.task)

            self.finished.emit(result["text"])
        except Exception as e:
            self.error.emit(str(e))


class WhisperApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.audio_path = None
        self.worker = None
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Whisper Speech Recognition")
        self.setMinimumSize(700, 500)
        self.setGeometry(100, 100, 800, 600)

        # Central widget
        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setSpacing(15)
        layout.setContentsMargins(20, 20, 20, 20)

        # File selection group
        file_group = QGroupBox("Audio File")
        file_layout = QHBoxLayout(file_group)

        self.file_label = QLabel("No file selected")
        self.file_label.setStyleSheet("color: #666;")
        file_layout.addWidget(self.file_label, 1)

        browse_btn = QPushButton("Browse...")
        browse_btn.clicked.connect(self.browse_file)
        file_layout.addWidget(browse_btn)

        layout.addWidget(file_group)

        # Settings group
        settings_group = QGroupBox("Settings")
        settings_layout = QHBoxLayout(settings_group)

        settings_layout.addWidget(QLabel("Model:"))
        self.model_combo = QComboBox()
        self.model_combo.addItems(["tiny", "base", "small", "medium", "large", "turbo"])
        self.model_combo.setCurrentText("tiny")
        settings_layout.addWidget(self.model_combo)

        settings_layout.addSpacing(20)

        settings_layout.addWidget(QLabel("Task:"))
        self.task_combo = QComboBox()
        self.task_combo.addItems(["transcribe", "translate"])
        settings_layout.addWidget(self.task_combo)

        settings_layout.addStretch()
        layout.addWidget(settings_group)

        # Transcribe button and progress
        btn_layout = QHBoxLayout()

        self.transcribe_btn = QPushButton("Transcribe")
        self.transcribe_btn.setEnabled(False)
        self.transcribe_btn.setMinimumHeight(40)
        self.transcribe_btn.setStyleSheet("""
            QPushButton {
                background-color: #4CAF50;
                color: white;
                font-weight: bold;
                font-size: 14px;
                border-radius: 5px;
            }
            QPushButton:hover {
                background-color: #45a049;
            }
            QPushButton:disabled {
                background-color: #cccccc;
            }
        """)
        self.transcribe_btn.clicked.connect(self.start_transcribe)
        btn_layout.addWidget(self.transcribe_btn)

        layout.addLayout(btn_layout)

        # Progress
        self.progress_label = QLabel("")
        self.progress_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.progress_label)

        # Output group
        output_group = QGroupBox("Transcription")
        output_layout = QVBoxLayout(output_group)

        self.output_text = QTextEdit()
        self.output_text.setFont(QFont("Monospace", 11))
        self.output_text.setPlaceholderText("Transcription will appear here...")
        output_layout.addWidget(self.output_text)

        copy_btn = QPushButton("Copy to Clipboard")
        copy_btn.clicked.connect(self.copy_output)
        output_layout.addWidget(copy_btn)

        layout.addWidget(output_group, 1)

    def browse_file(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Audio File",
            "",
            "Audio Files (*.mp3 *.wav *.flac *.m4a *.ogg *.webm);;All Files (*.*)"
        )
        if path:
            self.audio_path = path
            self.file_label.setText(os.path.basename(path))
            self.file_label.setStyleSheet("color: #000;")
            self.transcribe_btn.setEnabled(True)

    def start_transcribe(self):
        if not self.audio_path:
            return

        self.transcribe_btn.setEnabled(False)
        self.output_text.clear()

        self.worker = TranscribeWorker(
            self.audio_path,
            self.model_combo.currentText(),
            self.task_combo.currentText()
        )
        self.worker.progress.connect(self.on_progress)
        self.worker.finished.connect(self.on_finished)
        self.worker.error.connect(self.on_error)
        self.worker.start()

    def on_progress(self, msg):
        self.progress_label.setText(msg)

    def on_finished(self, text):
        self.output_text.setText(text)
        self.progress_label.setText("Done!")
        self.transcribe_btn.setEnabled(True)

    def on_error(self, error):
        self.progress_label.setText("")
        QMessageBox.critical(self, "Error", f"Transcription failed:\n{error}")
        self.transcribe_btn.setEnabled(True)

    def copy_output(self):
        text = self.output_text.toPlainText()
        if text:
            QApplication.clipboard().setText(text)
            self.progress_label.setText("Copied!")


def main():
    app = QApplication(sys.argv)
    app.setStyle("Fusion")
    window = WhisperApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
