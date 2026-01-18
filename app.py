#!/usr/bin/env python3
"""
Whisper Local Web Interface
Run with: python app.py
Access at: http://localhost:5000
"""

import os
import tempfile
from flask import Flask, render_template_string, request, jsonify
import whisper

app = Flask(__name__)
model = None

HTML_TEMPLATE = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Whisper - Speech to Text</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: #fff;
            padding: 40px 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            font-size: 2.5rem;
            margin-bottom: 10px;
            background: linear-gradient(90deg, #00d4ff, #7b2cbf);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .subtitle {
            text-align: center;
            color: #888;
            margin-bottom: 40px;
        }
        .upload-area {
            border: 2px dashed #444;
            border-radius: 16px;
            padding: 60px 40px;
            text-align: center;
            background: rgba(255,255,255,0.02);
            transition: all 0.3s;
            cursor: pointer;
        }
        .upload-area:hover, .upload-area.dragover {
            border-color: #00d4ff;
            background: rgba(0,212,255,0.05);
        }
        .upload-area input { display: none; }
        .upload-icon { font-size: 48px; margin-bottom: 20px; }
        .upload-text { color: #aaa; }
        .btn {
            background: linear-gradient(90deg, #00d4ff, #7b2cbf);
            border: none;
            padding: 12px 32px;
            border-radius: 8px;
            color: #fff;
            font-size: 1rem;
            cursor: pointer;
            margin-top: 20px;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(0,212,255,0.3); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .settings {
            display: flex;
            gap: 20px;
            margin: 30px 0;
            flex-wrap: wrap;
            justify-content: center;
        }
        .setting {
            background: rgba(255,255,255,0.05);
            padding: 15px 20px;
            border-radius: 10px;
        }
        .setting label { display: block; color: #888; font-size: 0.85rem; margin-bottom: 8px; }
        .setting select {
            background: #1a1a2e;
            border: 1px solid #333;
            color: #fff;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 1rem;
        }
        .result {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 30px;
            margin-top: 30px;
            display: none;
        }
        .result.show { display: block; }
        .result h3 { margin-bottom: 15px; color: #00d4ff; }
        .result-text {
            background: #0d0d1a;
            padding: 20px;
            border-radius: 10px;
            line-height: 1.8;
            white-space: pre-wrap;
            max-height: 400px;
            overflow-y: auto;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 40px;
        }
        .loading.show { display: block; }
        .spinner {
            width: 50px;
            height: 50px;
            border: 3px solid #333;
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .file-name {
            margin-top: 15px;
            padding: 10px 20px;
            background: rgba(0,212,255,0.1);
            border-radius: 8px;
            display: none;
        }
        .file-name.show { display: inline-block; }
        .error { color: #ff6b6b; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Whisper</h1>
        <p class="subtitle">OpenAI's Speech Recognition - Running Locally</p>

        <div class="upload-area" id="uploadArea">
            <div class="upload-icon">🎤</div>
            <p class="upload-text">Drop an audio file here or click to browse</p>
            <p class="upload-text" style="font-size: 0.85rem; margin-top: 10px;">Supports MP3, WAV, M4A, FLAC, OGG, and more</p>
            <input type="file" id="fileInput" accept="audio/*,.mp3,.wav,.m4a,.flac,.ogg,.webm">
            <div class="file-name" id="fileName"></div>
        </div>

        <div class="settings">
            <div class="setting">
                <label>Model</label>
                <select id="modelSelect">
                    <option value="tiny">Tiny (fastest)</option>
                    <option value="base">Base</option>
                    <option value="small" selected>Small (recommended)</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large (most accurate)</option>
                    <option value="turbo">Turbo</option>
                </select>
            </div>
            <div class="setting">
                <label>Task</label>
                <select id="taskSelect">
                    <option value="transcribe">Transcribe</option>
                    <option value="translate">Translate to English</option>
                </select>
            </div>
            <div class="setting">
                <label>Language</label>
                <select id="langSelect">
                    <option value="">Auto-detect</option>
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="fr">French</option>
                    <option value="de">German</option>
                    <option value="it">Italian</option>
                    <option value="pt">Portuguese</option>
                    <option value="ru">Russian</option>
                    <option value="ja">Japanese</option>
                    <option value="ko">Korean</option>
                    <option value="zh">Chinese</option>
                </select>
            </div>
        </div>

        <div style="text-align: center;">
            <button class="btn" id="transcribeBtn" disabled>Transcribe</button>
        </div>

        <div class="loading" id="loading">
            <div class="spinner"></div>
            <p>Transcribing audio...</p>
            <p style="color: #666; font-size: 0.9rem; margin-top: 10px;">This may take a moment</p>
        </div>

        <div class="result" id="result">
            <h3>Transcription</h3>
            <div class="result-text" id="resultText"></div>
        </div>

        <p class="error" id="error"></p>
    </div>

    <script>
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const fileName = document.getElementById('fileName');
        const transcribeBtn = document.getElementById('transcribeBtn');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        const resultText = document.getElementById('resultText');
        const error = document.getElementById('error');

        let selectedFile = null;

        uploadArea.addEventListener('click', () => fileInput.click());
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length) handleFile(fileInput.files[0]);
        });

        function handleFile(file) {
            selectedFile = file;
            fileName.textContent = file.name;
            fileName.classList.add('show');
            transcribeBtn.disabled = false;
            error.textContent = '';
        }

        transcribeBtn.addEventListener('click', async () => {
            if (!selectedFile) return;

            const formData = new FormData();
            formData.append('file', selectedFile);
            formData.append('model', document.getElementById('modelSelect').value);
            formData.append('task', document.getElementById('taskSelect').value);
            formData.append('language', document.getElementById('langSelect').value);

            loading.classList.add('show');
            result.classList.remove('show');
            error.textContent = '';
            transcribeBtn.disabled = true;

            try {
                const response = await fetch('/transcribe', {
                    method: 'POST',
                    body: formData
                });
                const data = await response.json();

                if (data.error) {
                    error.textContent = data.error;
                } else {
                    resultText.textContent = data.text;
                    result.classList.add('show');
                }
            } catch (err) {
                error.textContent = 'Error: ' + err.message;
            } finally {
                loading.classList.remove('show');
                transcribeBtn.disabled = false;
            }
        });
    </script>
</body>
</html>
"""

@app.route('/')
def index():
    return render_template_string(HTML_TEMPLATE)

@app.route('/transcribe', methods=['POST'])
def transcribe():
    global model

    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'})

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'})

    model_name = request.form.get('model', 'small')
    task = request.form.get('task', 'transcribe')
    language = request.form.get('language', None) or None

    try:
        # Load model if needed
        global model
        if model is None or getattr(model, '_model_name', None) != model_name:
            print(f"Loading {model_name} model...")
            model = whisper.load_model(model_name)
            model._model_name = model_name

        # Save uploaded file temporarily
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp:
            file.save(tmp.name)
            tmp_path = tmp.name

        # Transcribe
        result = model.transcribe(
            tmp_path,
            task=task,
            language=language,
        )

        # Cleanup
        os.unlink(tmp_path)

        return jsonify({
            'text': result['text'],
            'language': result.get('language', 'unknown')
        })

    except Exception as e:
        return jsonify({'error': str(e)})

if __name__ == '__main__':
    print("\n" + "="*50)
    print("  Whisper Local Web Interface")
    print("="*50)
    print("\n  Access the app at: http://localhost:5000")
    print("\n  Press Ctrl+C to stop the server")
    print("="*50 + "\n")

    app.run(host='0.0.0.0', port=5000, debug=False)
