#!/usr/bin/env python3
"""
Whisper Desktop App - Push-to-Talk Microphone Transcription
"""
import sys
import os
import tempfile
import numpy as np
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QComboBox, QTextEdit, QMessageBox, QSizePolicy
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt5.QtGui import QFont

DARK_STYLE = """
QMainWindow {
    background-color: #1a1a2e;
}
QWidget {
    background-color: #1a1a2e;
    color: #eaeaea;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
}
QLabel {
    color: #eaeaea;
    font-size: 13px;
}
QLabel#title {
    font-size: 28px;
    font-weight: bold;
    color: #00d4ff;
    padding: 10px 0;
}
QLabel#subtitle {
    font-size: 13px;
    color: #888;
    padding-bottom: 20px;
}
QLabel#status {
    font-size: 14px;
    color: #00d4ff;
    padding: 10px;
}
QPushButton {
    background-color: #0f3460;
    color: #eaeaea;
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    font-size: 13px;
    font-weight: bold;
}
QPushButton:hover {
    background-color: #1a4a7a;
}
QPushButton:pressed {
    background-color: #0a2540;
}
QPushButton:disabled {
    background-color: #2a2a4a;
    color: #666;
}
QPushButton#recordBtn {
    background-color: #e94560;
    color: white;
    font-size: 18px;
    padding: 25px 50px;
    min-width: 250px;
    border-radius: 15px;
}
QPushButton#recordBtn:hover {
    background-color: #ff5070;
}
QPushButton#recordBtn:pressed, QPushButton#recordBtn[recording="true"] {
    background-color: #00d4ff;
    color: #1a1a2e;
}
QPushButton#copyBtn {
    background-color: #0f3460;
    color: white;
    padding: 10px 20px;
}
QPushButton#copyBtn:hover {
    background-color: #1a4a7a;
}
QComboBox {
    background-color: #16213e;
    color: #eaeaea;
    border: 2px solid #0f3460;
    border-radius: 8px;
    padding: 10px 15px;
    min-width: 140px;
    font-size: 13px;
}
QComboBox:hover {
    border-color: #00d4ff;
}
QComboBox::drop-down {
    border: none;
    width: 30px;
}
QComboBox::down-arrow {
    image: none;
    border-left: 5px solid transparent;
    border-right: 5px solid transparent;
    border-top: 8px solid #00d4ff;
    margin-right: 10px;
}
QComboBox QAbstractItemView {
    background-color: #16213e;
    color: #eaeaea;
    selection-background-color: #0f3460;
    border: 2px solid #0f3460;
    border-radius: 8px;
    padding: 5px;
}
QTextEdit {
    background-color: #16213e;
    color: #eaeaea;
    border: 2px solid #0f3460;
    border-radius: 10px;
    padding: 15px;
    font-family: 'Consolas', 'Courier New', monospace;
    font-size: 14px;
}
QTextEdit:focus {
    border-color: #00d4ff;
}
"""


class RecordingThread(QThread):
    finished = pyqtSignal(str)
    error = pyqtSignal(str)

    def __init__(self, audio_data, sample_rate, model_name, task):
        super().__init__()
        self.audio_data = audio_data
        self.sample_rate = sample_rate
        self.model_name = model_name
        self.task = task

    def run(self):
        try:
            import whisper
            import soundfile as sf

            # Save to temp file
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_path = f.name
                sf.write(temp_path, self.audio_data, self.sample_rate)

            # Transcribe
            model = whisper.load_model(self.model_name)
            result = model.transcribe(temp_path, task=self.task)

            # Cleanup
            os.unlink(temp_path)

            self.finished.emit(result["text"])
        except Exception as e:
            self.error.emit(str(e))


class WhisperApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.recording = False
        self.audio_data = []
        self.sample_rate = 16000
        self.stream = None
        self.worker = None
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Whisper")
        self.setMinimumSize(700, 600)
        self.setGeometry(100, 100, 800, 650)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setSpacing(20)
        layout.setContentsMargins(40, 30, 40, 30)

        # Title
        title = QLabel("Whisper")
        title.setObjectName("title")
        title.setAlignment(Qt.AlignCenter)
        layout.addWidget(title)

        subtitle = QLabel("Push-to-Talk Speech Recognition")
        subtitle.setObjectName("subtitle")
        subtitle.setAlignment(Qt.AlignCenter)
        layout.addWidget(subtitle)

        # Settings row
        settings_layout = QHBoxLayout()
        settings_layout.setSpacing(30)

        model_container = QVBoxLayout()
        model_label = QLabel("Model")
        model_label.setStyleSheet("color: #888; font-size: 12px;")
        model_container.addWidget(model_label)
        self.model_combo = QComboBox()
        self.model_combo.addItems(["tiny", "base", "small", "medium", "large", "turbo"])
        self.model_combo.setCurrentText("base")
        model_container.addWidget(self.model_combo)
        settings_layout.addLayout(model_container)

        task_container = QVBoxLayout()
        task_label = QLabel("Task")
        task_label.setStyleSheet("color: #888; font-size: 12px;")
        task_container.addWidget(task_label)
        self.task_combo = QComboBox()
        self.task_combo.addItems(["transcribe", "translate"])
        task_container.addWidget(self.task_combo)
        settings_layout.addLayout(task_container)

        settings_layout.addStretch()
        layout.addLayout(settings_layout)

        layout.addSpacing(20)

        # Push to talk button
        btn_container = QHBoxLayout()
        btn_container.addStretch()

        self.record_btn = QPushButton("Hold to Talk")
        self.record_btn.setObjectName("recordBtn")
        self.record_btn.pressed.connect(self.start_recording)
        self.record_btn.released.connect(self.stop_recording)
        btn_container.addWidget(self.record_btn)

        btn_container.addStretch()
        layout.addLayout(btn_container)

        # Status
        self.status_label = QLabel("")
        self.status_label.setObjectName("status")
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)

        # Output
        output_label = QLabel("Transcription")
        output_label.setStyleSheet("color: #888; font-size: 12px; margin-top: 10px;")
        layout.addWidget(output_label)

        self.output_text = QTextEdit()
        self.output_text.setPlaceholderText("Your speech will appear here...")
        self.output_text.setMinimumHeight(180)
        layout.addWidget(self.output_text, 1)

        # Bottom buttons
        bottom_layout = QHBoxLayout()

        clear_btn = QPushButton("Clear")
        clear_btn.clicked.connect(lambda: self.output_text.clear())
        bottom_layout.addWidget(clear_btn)

        bottom_layout.addStretch()

        copy_btn = QPushButton("Copy to Clipboard")
        copy_btn.setObjectName("copyBtn")
        copy_btn.clicked.connect(self.copy_output)
        bottom_layout.addWidget(copy_btn)

        layout.addLayout(bottom_layout)

    def start_recording(self):
        try:
            import sounddevice as sd

            self.recording = True
            self.audio_data = []
            self.record_btn.setText("Recording...")
            self.record_btn.setProperty("recording", True)
            self.record_btn.style().unpolish(self.record_btn)
            self.record_btn.style().polish(self.record_btn)
            self.status_label.setText("🎤 Listening...")

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

        except Exception as e:
            self.status_label.setText(f"Error: {e}")
            self.recording = False

    def stop_recording(self):
        if not self.recording:
            return

        self.recording = False
        self.record_btn.setText("Hold to Talk")
        self.record_btn.setProperty("recording", False)
        self.record_btn.style().unpolish(self.record_btn)
        self.record_btn.style().polish(self.record_btn)

        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None

        if not self.audio_data:
            self.status_label.setText("No audio recorded")
            return

        self.status_label.setText("Processing...")
        self.record_btn.setEnabled(False)

        audio = np.concatenate(self.audio_data, axis=0).flatten()

        self.worker = RecordingThread(
            audio,
            self.sample_rate,
            self.model_combo.currentText(),
            self.task_combo.currentText()
        )
        self.worker.finished.connect(self.on_finished)
        self.worker.error.connect(self.on_error)
        self.worker.start()

    def on_finished(self, text):
        current = self.output_text.toPlainText()
        if current:
            self.output_text.setText(current + "\n" + text.strip())
        else:
            self.output_text.setText(text.strip())
        self.status_label.setText("✓ Done")
        self.record_btn.setEnabled(True)

    def on_error(self, error):
        self.status_label.setText("")
        QMessageBox.critical(self, "Error", f"Failed:\n{error}")
        self.record_btn.setEnabled(True)

    def copy_output(self):
        text = self.output_text.toPlainText()
        if text:
            QApplication.clipboard().setText(text)
            self.status_label.setText("✓ Copied!")


def main():
    app = QApplication(sys.argv)
    app.setStyleSheet(DARK_STYLE)
    window = WhisperApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
