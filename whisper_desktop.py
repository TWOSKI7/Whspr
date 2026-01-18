#!/usr/bin/env python3
"""
Whisper Desktop App - Native GUI for OpenAI Whisper
"""
import sys
import os
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QComboBox, QTextEdit, QFileDialog,
    QProgressBar, QFrame, QMessageBox, QSizePolicy
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal
from PyQt5.QtGui import QFont, QPalette, QColor, QIcon

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
QLabel#fileLabel {
    background-color: #16213e;
    border: 2px dashed #0f3460;
    border-radius: 10px;
    padding: 30px;
    font-size: 14px;
    color: #888;
}
QLabel#fileLabel[hasFile="true"] {
    border: 2px solid #00d4ff;
    color: #00d4ff;
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
QPushButton#transcribeBtn {
    background-color: #00d4ff;
    color: #1a1a2e;
    font-size: 16px;
    padding: 15px 40px;
    min-width: 200px;
}
QPushButton#transcribeBtn:hover {
    background-color: #00b8e6;
}
QPushButton#transcribeBtn:disabled {
    background-color: #2a4a5a;
    color: #666;
}
QPushButton#copyBtn {
    background-color: #e94560;
    color: white;
    padding: 10px 20px;
}
QPushButton#copyBtn:hover {
    background-color: #d63050;
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
    line-height: 1.5;
}
QTextEdit:focus {
    border-color: #00d4ff;
}
QProgressBar {
    background-color: #16213e;
    border: none;
    border-radius: 10px;
    height: 8px;
    text-align: center;
}
QProgressBar::chunk {
    background-color: #00d4ff;
    border-radius: 10px;
}
QFrame#separator {
    background-color: #0f3460;
    max-height: 2px;
}
"""


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
        self.setWindowTitle("Whisper")
        self.setMinimumSize(800, 650)
        self.setGeometry(100, 100, 900, 700)

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

        subtitle = QLabel("Speech Recognition & Translation")
        subtitle.setObjectName("subtitle")
        subtitle.setAlignment(Qt.AlignCenter)
        layout.addWidget(subtitle)

        # File drop area
        self.file_label = QLabel("Click to select an audio file\n\nSupports: MP3, WAV, FLAC, M4A, OGG, WEBM")
        self.file_label.setObjectName("fileLabel")
        self.file_label.setAlignment(Qt.AlignCenter)
        self.file_label.setCursor(Qt.PointingHandCursor)
        self.file_label.mousePressEvent = lambda e: self.browse_file()
        self.file_label.setMinimumHeight(120)
        layout.addWidget(self.file_label)

        # Settings row
        settings_layout = QHBoxLayout()
        settings_layout.setSpacing(30)

        # Model selection
        model_container = QVBoxLayout()
        model_label = QLabel("Model")
        model_label.setStyleSheet("color: #888; font-size: 12px; margin-bottom: 5px;")
        model_container.addWidget(model_label)
        self.model_combo = QComboBox()
        self.model_combo.addItems(["tiny", "base", "small", "medium", "large", "turbo"])
        self.model_combo.setCurrentText("base")
        model_container.addWidget(self.model_combo)
        settings_layout.addLayout(model_container)

        # Task selection
        task_container = QVBoxLayout()
        task_label = QLabel("Task")
        task_label.setStyleSheet("color: #888; font-size: 12px; margin-bottom: 5px;")
        task_container.addWidget(task_label)
        self.task_combo = QComboBox()
        self.task_combo.addItems(["transcribe", "translate"])
        task_container.addWidget(self.task_combo)
        settings_layout.addLayout(task_container)

        settings_layout.addStretch()

        # Transcribe button
        self.transcribe_btn = QPushButton("Transcribe")
        self.transcribe_btn.setObjectName("transcribeBtn")
        self.transcribe_btn.setEnabled(False)
        self.transcribe_btn.clicked.connect(self.start_transcribe)
        settings_layout.addWidget(self.transcribe_btn)

        layout.addLayout(settings_layout)

        # Progress
        self.progress_bar = QProgressBar()
        self.progress_bar.setRange(0, 0)
        self.progress_bar.setVisible(False)
        layout.addWidget(self.progress_bar)

        self.progress_label = QLabel("")
        self.progress_label.setAlignment(Qt.AlignCenter)
        self.progress_label.setStyleSheet("color: #00d4ff; font-size: 14px;")
        layout.addWidget(self.progress_label)

        # Output section
        output_label = QLabel("Output")
        output_label.setStyleSheet("color: #888; font-size: 12px; margin-top: 10px;")
        layout.addWidget(output_label)

        self.output_text = QTextEdit()
        self.output_text.setPlaceholderText("Transcription will appear here...")
        self.output_text.setMinimumHeight(200)
        layout.addWidget(self.output_text, 1)

        # Bottom buttons
        bottom_layout = QHBoxLayout()
        bottom_layout.addStretch()

        copy_btn = QPushButton("Copy to Clipboard")
        copy_btn.setObjectName("copyBtn")
        copy_btn.clicked.connect(self.copy_output)
        bottom_layout.addWidget(copy_btn)

        layout.addLayout(bottom_layout)

    def browse_file(self):
        path, _ = QFileDialog.getOpenFileName(
            self,
            "Select Audio File",
            "",
            "Audio Files (*.mp3 *.wav *.flac *.m4a *.ogg *.webm);;All Files (*.*)"
        )
        if path:
            self.audio_path = path
            filename = os.path.basename(path)
            self.file_label.setText(f"📁  {filename}")
            self.file_label.setProperty("hasFile", True)
            self.file_label.style().unpolish(self.file_label)
            self.file_label.style().polish(self.file_label)
            self.transcribe_btn.setEnabled(True)

    def start_transcribe(self):
        if not self.audio_path:
            return

        self.transcribe_btn.setEnabled(False)
        self.output_text.clear()
        self.progress_bar.setVisible(True)

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
        self.progress_label.setText("✓ Done!")
        self.progress_bar.setVisible(False)
        self.transcribe_btn.setEnabled(True)

    def on_error(self, error):
        self.progress_label.setText("")
        self.progress_bar.setVisible(False)
        QMessageBox.critical(self, "Error", f"Transcription failed:\n{error}")
        self.transcribe_btn.setEnabled(True)

    def copy_output(self):
        text = self.output_text.toPlainText()
        if text:
            QApplication.clipboard().setText(text)
            self.progress_label.setText("✓ Copied to clipboard!")


def main():
    app = QApplication(sys.argv)
    app.setStyleSheet(DARK_STYLE)
    window = WhisperApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
