#!/usr/bin/env python3
"""
Whisper Desktop App - Toggle Microphone with System-Wide Typing
"""
import sys
import os
import tempfile
import numpy as np
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QComboBox, QTextEdit, QMessageBox, QSystemTrayIcon,
    QMenu, QAction
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer
from PyQt5.QtGui import QFont, QIcon

DARK_STYLE = """
QMainWindow {
    background-color: #1a1a2e;
}
QWidget {
    background-color: #1a1a2e;
    color: #eaeaea;
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
}
QLabel {
    color: #eaeaea;
}
QLabel#title {
    font-size: 16px;
    font-weight: bold;
    color: #00d4ff;
}
QLabel#status {
    font-size: 12px;
    color: #888;
}
QPushButton {
    background-color: #0f3460;
    color: #eaeaea;
    border: none;
    border-radius: 6px;
    padding: 8px 16px;
    font-size: 12px;
    font-weight: bold;
}
QPushButton:hover {
    background-color: #1a4a7a;
}
QPushButton#recordBtn {
    background-color: #e94560;
    color: white;
    font-size: 14px;
    padding: 12px 24px;
    border-radius: 10px;
}
QPushButton#recordBtn:hover {
    background-color: #ff5070;
}
QPushButton#recordBtn[recording="true"] {
    background-color: #00d4ff;
    color: #1a1a2e;
}
QPushButton#settingsBtn {
    background-color: transparent;
    color: #888;
    padding: 4px 8px;
}
QPushButton#settingsBtn:hover {
    color: #00d4ff;
}
QComboBox {
    background-color: #16213e;
    color: #eaeaea;
    border: 1px solid #0f3460;
    border-radius: 4px;
    padding: 5px 10px;
    min-width: 80px;
}
QComboBox::drop-down {
    border: none;
    width: 20px;
}
QComboBox::down-arrow {
    image: none;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 6px solid #00d4ff;
    margin-right: 5px;
}
QComboBox QAbstractItemView {
    background-color: #16213e;
    color: #eaeaea;
    selection-background-color: #0f3460;
}
QTextEdit {
    background-color: #16213e;
    color: #eaeaea;
    border: 1px solid #0f3460;
    border-radius: 6px;
    padding: 8px;
    font-family: 'Consolas', monospace;
    font-size: 11px;
}
"""

WIDGET_STYLE = """
QWidget {
    background-color: #1a1a2e;
    color: #eaeaea;
    font-family: 'Segoe UI', Arial, sans-serif;
}
QLabel#status {
    color: #00d4ff;
    font-size: 11px;
}
QPushButton#micBtn {
    background-color: #e94560;
    color: white;
    border: none;
    border-radius: 25px;
    font-size: 20px;
    font-weight: bold;
}
QPushButton#micBtn:hover {
    background-color: #ff5070;
}
QPushButton#micBtn[recording="true"] {
    background-color: #00d4ff;
    color: #1a1a2e;
}
"""


class RecordingThread(QThread):
    finished = pyqtSignal(str)
    error = pyqtSignal(str)
    status = pyqtSignal(str)

    def __init__(self, audio_data, sample_rate, model_name):
        super().__init__()
        self.audio_data = audio_data
        self.sample_rate = sample_rate
        self.model_name = model_name

    def run(self):
        try:
            self.status.emit("Loading model...")
            import whisper
            import soundfile as sf

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                temp_path = f.name
                sf.write(temp_path, self.audio_data, self.sample_rate)

            model = whisper.load_model(self.model_name)
            self.status.emit("Transcribing...")
            result = model.transcribe(temp_path, task="transcribe")

            os.unlink(temp_path)
            self.finished.emit(result["text"].strip())
        except Exception as e:
            self.error.emit(str(e))


class MiniWidget(QWidget):
    """Small floating widget for quick recording"""
    def __init__(self, parent=None):
        super().__init__(parent, Qt.WindowStaysOnTopHint | Qt.FramelessWindowHint | Qt.Tool)
        self.recording = False
        self.audio_data = []
        self.sample_rate = 16000
        self.stream = None
        self.worker = None
        self.model_name = "base"
        self.drag_pos = None
        self.init_ui()

    def init_ui(self):
        self.setFixedSize(120, 80)
        self.setStyleSheet(WIDGET_STYLE)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 10, 10, 10)
        layout.setSpacing(5)

        # Mic button
        self.mic_btn = QPushButton("🎤")
        self.mic_btn.setObjectName("micBtn")
        self.mic_btn.setFixedSize(50, 50)
        self.mic_btn.clicked.connect(self.toggle_recording)

        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        btn_layout.addWidget(self.mic_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        # Status
        self.status_label = QLabel("Ready")
        self.status_label.setObjectName("status")
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drag_pos = event.globalPos() - self.frameGeometry().topLeft()

    def mouseMoveEvent(self, event):
        if event.buttons() == Qt.LeftButton and self.drag_pos:
            self.move(event.globalPos() - self.drag_pos)

    def toggle_recording(self):
        if self.recording:
            self.stop_recording()
        else:
            self.start_recording()

    def start_recording(self):
        try:
            import sounddevice as sd

            self.recording = True
            self.audio_data = []
            self.mic_btn.setText("⏹")
            self.mic_btn.setProperty("recording", True)
            self.mic_btn.style().unpolish(self.mic_btn)
            self.mic_btn.style().polish(self.mic_btn)
            self.status_label.setText("Recording...")

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
            self.status_label.setText("Mic error")
            self.recording = False

    def stop_recording(self):
        self.recording = False
        self.mic_btn.setText("🎤")
        self.mic_btn.setProperty("recording", False)
        self.mic_btn.style().unpolish(self.mic_btn)
        self.mic_btn.style().polish(self.mic_btn)

        if self.stream:
            self.stream.stop()
            self.stream.close()
            self.stream = None

        if not self.audio_data:
            self.status_label.setText("No audio")
            return

        self.status_label.setText("Processing...")
        self.mic_btn.setEnabled(False)

        audio = np.concatenate(self.audio_data, axis=0).flatten()

        self.worker = RecordingThread(audio, self.sample_rate, self.model_name)
        self.worker.finished.connect(self.on_finished)
        self.worker.error.connect(self.on_error)
        self.worker.status.connect(lambda s: self.status_label.setText(s))
        self.worker.start()

    def on_finished(self, text):
        self.status_label.setText("Done!")
        self.mic_btn.setEnabled(True)
        self.type_text(text)

    def on_error(self, error):
        self.status_label.setText("Error")
        self.mic_btn.setEnabled(True)
        print(f"Error: {error}")

    def type_text(self, text):
        """Type text into the currently focused window"""
        try:
            from pynput.keyboard import Controller
            keyboard = Controller()
            keyboard.type(text)
        except Exception as e:
            print(f"Typing error: {e}")


class WhisperApp(QMainWindow):
    def __init__(self):
        super().__init__()
        self.recording = False
        self.audio_data = []
        self.sample_rate = 16000
        self.stream = None
        self.worker = None
        self.mini_widget = None
        self.init_ui()

    def init_ui(self):
        self.setWindowTitle("Whisper")
        self.setMinimumSize(500, 450)
        self.setGeometry(100, 100, 550, 500)

        central = QWidget()
        self.setCentralWidget(central)
        layout = QVBoxLayout(central)
        layout.setSpacing(15)
        layout.setContentsMargins(25, 20, 25, 20)

        # Header
        header = QHBoxLayout()
        title = QLabel("Whisper")
        title.setObjectName("title")
        header.addWidget(title)
        header.addStretch()

        # Mini widget button
        widget_btn = QPushButton("Mini Widget")
        widget_btn.clicked.connect(self.show_mini_widget)
        header.addWidget(widget_btn)

        layout.addLayout(header)

        # Settings
        settings = QHBoxLayout()
        settings.addWidget(QLabel("Model:"))
        self.model_combo = QComboBox()
        self.model_combo.addItems(["tiny", "base", "small", "medium", "large", "turbo"])
        self.model_combo.setCurrentText("base")
        settings.addWidget(self.model_combo)
        settings.addStretch()
        layout.addLayout(settings)

        # Record button
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        self.record_btn = QPushButton("Start Recording")
        self.record_btn.setObjectName("recordBtn")
        self.record_btn.clicked.connect(self.toggle_recording)
        btn_layout.addWidget(self.record_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        # Status
        self.status_label = QLabel("")
        self.status_label.setObjectName("status")
        self.status_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(self.status_label)

        # Output
        layout.addWidget(QLabel("Transcription:"))
        self.output_text = QTextEdit()
        self.output_text.setPlaceholderText("Text will appear here and be typed into your focused app...")
        layout.addWidget(self.output_text, 1)

        # Bottom
        bottom = QHBoxLayout()
        clear_btn = QPushButton("Clear")
        clear_btn.clicked.connect(lambda: self.output_text.clear())
        bottom.addWidget(clear_btn)
        bottom.addStretch()
        copy_btn = QPushButton("Copy")
        copy_btn.clicked.connect(self.copy_output)
        bottom.addWidget(copy_btn)
        layout.addLayout(bottom)

    def show_mini_widget(self):
        if not self.mini_widget:
            self.mini_widget = MiniWidget()
            self.mini_widget.model_name = self.model_combo.currentText()
        self.mini_widget.model_name = self.model_combo.currentText()
        self.mini_widget.show()
        self.mini_widget.move(100, 100)

    def toggle_recording(self):
        if self.recording:
            self.stop_recording()
        else:
            self.start_recording()

    def start_recording(self):
        try:
            import sounddevice as sd

            self.recording = True
            self.audio_data = []
            self.record_btn.setText("Stop Recording")
            self.record_btn.setProperty("recording", True)
            self.record_btn.style().unpolish(self.record_btn)
            self.record_btn.style().polish(self.record_btn)
            self.status_label.setText("🎤 Recording... Click to stop")

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
        self.recording = False
        self.record_btn.setText("Start Recording")
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
            self.model_combo.currentText()
        )
        self.worker.finished.connect(self.on_finished)
        self.worker.error.connect(self.on_error)
        self.worker.status.connect(lambda s: self.status_label.setText(s))
        self.worker.start()

    def on_finished(self, text):
        # Add to output box
        current = self.output_text.toPlainText()
        if current:
            self.output_text.setText(current + "\n" + text)
        else:
            self.output_text.setText(text)

        self.status_label.setText("✓ Done - Text typed to focused window")
        self.record_btn.setEnabled(True)

        # Type into focused window
        self.type_text(text)

    def on_error(self, error):
        self.status_label.setText("")
        QMessageBox.critical(self, "Error", f"Failed:\n{error}")
        self.record_btn.setEnabled(True)

    def type_text(self, text):
        """Type text into the currently focused window"""
        try:
            from pynput.keyboard import Controller
            keyboard = Controller()
            keyboard.type(text)
        except Exception as e:
            print(f"Typing error: {e}")

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
