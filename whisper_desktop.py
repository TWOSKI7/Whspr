#!/usr/bin/env python3
"""
Whisper Desktop App - Toggle Microphone with System-Wide Typing & Voice Visualizer
Hotkey: Alt+T to toggle recording
"""
import sys
import os
import tempfile
import wave
import numpy as np
from PyQt5.QtWidgets import (
    QApplication, QMainWindow, QWidget, QVBoxLayout, QHBoxLayout,
    QPushButton, QLabel, QComboBox, QTextEdit, QMessageBox, QSizePolicy
)
from PyQt5.QtCore import Qt, QThread, pyqtSignal, QTimer, QRectF, QObject
from PyQt5.QtGui import QFont, QPainter, QColor, QLinearGradient, QPainterPath

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
QLabel#hotkey {
    font-size: 11px;
    color: #666;
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
    font-size: 10px;
}
QLabel#hotkey {
    color: #666;
    font-size: 9px;
}
QPushButton#micBtn {
    background-color: #e94560;
    color: white;
    border: none;
    border-radius: 20px;
    font-size: 16px;
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


class HotkeyListener(QThread):
    """Global hotkey listener for Alt+T"""
    triggered = pyqtSignal()

    def __init__(self):
        super().__init__()
        self.running = True

    def run(self):
        try:
            from pynput import keyboard

            alt_pressed = False

            def on_press(key):
                nonlocal alt_pressed
                if key == keyboard.Key.alt_l or key == keyboard.Key.alt_r:
                    alt_pressed = True
                elif alt_pressed and hasattr(key, 'char') and key.char == 't':
                    self.triggered.emit()

            def on_release(key):
                nonlocal alt_pressed
                if key == keyboard.Key.alt_l or key == keyboard.Key.alt_r:
                    alt_pressed = False

            with keyboard.Listener(on_press=on_press, on_release=on_release) as listener:
                while self.running:
                    listener.join(0.1)

        except Exception as e:
            print(f"Hotkey listener error: {e}")

    def stop(self):
        self.running = False


class VoiceVisualizer(QWidget):
    """Real-time voice level visualizer with bars"""
    def __init__(self, parent=None, bar_count=20, mini=False):
        super().__init__(parent)
        self.bar_count = bar_count
        self.mini = mini
        self.levels = [0.0] * bar_count
        self.peak_levels = [0.0] * bar_count
        self.current_level = 0.0

        if mini:
            self.setFixedHeight(30)
            self.setMinimumWidth(80)
        else:
            self.setFixedHeight(60)
            self.setMinimumWidth(200)

        # Animation timer for smooth decay
        self.decay_timer = QTimer(self)
        self.decay_timer.timeout.connect(self.decay_levels)
        self.decay_timer.start(30)  # 30ms refresh

    def set_level(self, level):
        """Set the current audio level (0.0 to 1.0)"""
        self.current_level = min(1.0, max(0.0, level))
        # Shift levels and add new one
        self.levels.pop(0)
        self.levels.append(self.current_level)
        # Update peaks
        for i, lvl in enumerate(self.levels):
            if lvl > self.peak_levels[i]:
                self.peak_levels[i] = lvl
        self.update()

    def decay_levels(self):
        """Gradually decay peak levels"""
        changed = False
        for i in range(len(self.peak_levels)):
            if self.peak_levels[i] > self.levels[i]:
                self.peak_levels[i] = max(self.levels[i], self.peak_levels[i] - 0.05)
                changed = True
        if changed:
            self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)

        w = self.width()
        h = self.height()

        # Background
        painter.fillRect(0, 0, w, h, QColor("#16213e"))

        # Calculate bar dimensions
        spacing = 2 if self.mini else 3
        bar_width = (w - (self.bar_count + 1) * spacing) / self.bar_count

        for i, level in enumerate(self.levels):
            x = spacing + i * (bar_width + spacing)
            bar_height = max(2, level * (h - 4))
            y = h - 2 - bar_height

            # Create gradient based on level
            gradient = QLinearGradient(x, h, x, 0)
            if level < 0.3:
                gradient.setColorAt(0, QColor("#00d4ff"))
                gradient.setColorAt(1, QColor("#0099cc"))
            elif level < 0.6:
                gradient.setColorAt(0, QColor("#00ff88"))
                gradient.setColorAt(1, QColor("#00d4ff"))
            elif level < 0.8:
                gradient.setColorAt(0, QColor("#ffcc00"))
                gradient.setColorAt(1, QColor("#00ff88"))
            else:
                gradient.setColorAt(0, QColor("#ff4444"))
                gradient.setColorAt(1, QColor("#ffcc00"))

            # Draw bar with rounded corners
            painter.setBrush(gradient)
            painter.setPen(Qt.NoPen)
            radius = 2 if self.mini else 3
            painter.drawRoundedRect(QRectF(x, y, bar_width, bar_height), radius, radius)

        painter.end()

    def reset(self):
        """Reset all levels"""
        self.levels = [0.0] * self.bar_count
        self.peak_levels = [0.0] * self.bar_count
        self.current_level = 0.0
        self.update()


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
            self.status.emit("Saving audio...")

            # Validate audio data
            if self.audio_data is None or len(self.audio_data) == 0:
                self.error.emit("No audio recorded")
                return

            # Convert float32 audio to int16 for WAV file
            audio_int16 = (self.audio_data * 32767).astype(np.int16)

            # Write WAV file using built-in wave module (no external deps)
            temp_path = os.path.join(tempfile.gettempdir(), "whisper_recording.wav")
            wf = wave.open(temp_path, 'wb')
            wf.setnchannels(1)
            wf.setsampwidth(2)  # 2 bytes for int16
            wf.setframerate(self.sample_rate)
            wf.writeframes(audio_int16.tobytes())
            wf.close()

            self.status.emit("Loading model...")
            import whisper
            model = whisper.load_model(self.model_name)

            self.status.emit("Transcribing...")
            result = model.transcribe(temp_path, task="transcribe")

            try:
                os.unlink(temp_path)
            except:
                pass
            self.finished.emit(result["text"].strip())
        except Exception as e:
            self.error.emit(str(e))


class MiniWidget(QWidget):
    """Small floating widget for quick recording with visualizer"""
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
        self.setFixedSize(140, 130)
        self.setStyleSheet(WIDGET_STYLE)

        layout = QVBoxLayout(self)
        layout.setContentsMargins(10, 8, 10, 8)
        layout.setSpacing(4)

        # Visualizer
        self.visualizer = VoiceVisualizer(self, bar_count=12, mini=True)
        layout.addWidget(self.visualizer)

        # Mic button
        self.mic_btn = QPushButton("🎤")
        self.mic_btn.setObjectName("micBtn")
        self.mic_btn.setFixedSize(40, 40)
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

        # Hotkey hint
        hotkey_label = QLabel("Alt+T")
        hotkey_label.setObjectName("hotkey")
        hotkey_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(hotkey_label)

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
            self.visualizer.reset()
            self.mic_btn.setText("⏹")
            self.mic_btn.setProperty("recording", True)
            self.mic_btn.style().unpolish(self.mic_btn)
            self.mic_btn.style().polish(self.mic_btn)
            self.status_label.setText("Recording...")

            def callback(indata, frames, time, status):
                if self.recording:
                    self.audio_data.append(indata.copy())
                    # Calculate RMS level for visualizer
                    level = np.sqrt(np.mean(indata**2)) * 5  # Amplify for visibility
                    QTimer.singleShot(0, lambda: self.visualizer.set_level(level))

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
            self.visualizer.reset()
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
        self.visualizer.reset()
        self.type_text(text)

    def on_error(self, error):
        self.status_label.setText("Error")
        self.mic_btn.setEnabled(True)
        self.visualizer.reset()
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
        self.hotkey_listener = None
        self.init_ui()
        self.start_hotkey_listener()

    def init_ui(self):
        self.setWindowTitle("Whisper")
        self.setMinimumSize(500, 520)
        self.setGeometry(100, 100, 550, 570)

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

        # Voice Visualizer
        self.visualizer = VoiceVisualizer(self, bar_count=30, mini=False)
        layout.addWidget(self.visualizer)

        # Record button
        btn_layout = QHBoxLayout()
        btn_layout.addStretch()
        self.record_btn = QPushButton("Start Recording")
        self.record_btn.setObjectName("recordBtn")
        self.record_btn.clicked.connect(self.toggle_recording)
        btn_layout.addWidget(self.record_btn)
        btn_layout.addStretch()
        layout.addLayout(btn_layout)

        # Hotkey hint
        hotkey_label = QLabel("Hotkey: Alt+T to toggle recording")
        hotkey_label.setObjectName("hotkey")
        hotkey_label.setAlignment(Qt.AlignCenter)
        layout.addWidget(hotkey_label)

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

    def start_hotkey_listener(self):
        """Start the global hotkey listener"""
        self.hotkey_listener = HotkeyListener()
        self.hotkey_listener.triggered.connect(self.on_hotkey)
        self.hotkey_listener.start()

    def on_hotkey(self):
        """Handle Alt+T hotkey"""
        # If mini widget is visible, use it; otherwise use main app
        if self.mini_widget and self.mini_widget.isVisible():
            self.mini_widget.toggle_recording()
        else:
            self.toggle_recording()

    def show_mini_widget(self):
        if not self.mini_widget:
            self.mini_widget = MiniWidget()
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
            self.visualizer.reset()
            self.record_btn.setText("Stop Recording")
            self.record_btn.setProperty("recording", True)
            self.record_btn.style().unpolish(self.record_btn)
            self.record_btn.style().polish(self.record_btn)
            self.status_label.setText("🎤 Recording... Click or Alt+T to stop")

            def callback(indata, frames, time, status):
                if self.recording:
                    self.audio_data.append(indata.copy())
                    # Calculate RMS level for visualizer
                    level = np.sqrt(np.mean(indata**2)) * 5  # Amplify for visibility
                    QTimer.singleShot(0, lambda: self.visualizer.set_level(level))

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
            self.visualizer.reset()
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
        self.visualizer.reset()

        # Type into focused window
        self.type_text(text)

    def on_error(self, error):
        self.status_label.setText("")
        self.visualizer.reset()
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

    def closeEvent(self, event):
        """Clean up hotkey listener on close"""
        if self.hotkey_listener:
            self.hotkey_listener.stop()
            self.hotkey_listener.wait()
        event.accept()


def main():
    app = QApplication(sys.argv)
    app.setStyleSheet(DARK_STYLE)
    window = WhisperApp()
    window.show()
    sys.exit(app.exec_())


if __name__ == "__main__":
    main()
