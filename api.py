from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sock import Sock
import whisper
import tempfile
import os
import requests
import json
from io import BytesIO

app = Flask(__name__)
CORS(app)
sock = Sock(app)

model = None
current_model_name = None

# Configuration for AI rewrite - can use Ollama (local) or OpenAI
REWRITE_CONFIG = {
    'provider': os.environ.get('REWRITE_PROVIDER', 'ollama'),  # 'ollama' or 'openai'
    'ollama_url': os.environ.get('OLLAMA_URL', 'http://localhost:11434'),
    'ollama_model': os.environ.get('OLLAMA_MODEL', 'llama3.2'),
    'openai_key': os.environ.get('OPENAI_API_KEY', ''),
    'openai_model': os.environ.get('OPENAI_MODEL', 'gpt-4o-mini'),
}

AVAILABLE_MODELS = {
    'tiny': {'size': '39 MB', 'description': 'Fastest, least accurate'},
    'base': {'size': '74 MB', 'description': 'Fast, basic accuracy'},
    'small': {'size': '244 MB', 'description': 'Balanced speed and accuracy'},
    'medium': {'size': '769 MB', 'description': 'Good accuracy, slower'},
    'large': {'size': '1550 MB', 'description': 'Best accuracy, slowest'},
    'turbo': {'size': '809 MB', 'description': 'Fast and accurate (recommended)'},
}

def get_model(model_name="turbo"):
    global model, current_model_name
    if model is None or current_model_name != model_name:
        print(f"Loading Whisper model: {model_name}")
        model = whisper.load_model(model_name)
        current_model_name = model_name
    return model

@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    if 'audio' not in request.files:
        return jsonify({'error': 'No audio file provided'}), 400

    audio_file = request.files['audio']
    model_name = request.form.get('model', 'turbo')

    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp:
        audio_file.save(tmp.name)
        tmp_path = tmp.name

    try:
        whisper_model = get_model(model_name)
        result = whisper_model.transcribe(tmp_path)
        return jsonify({'text': result['text']})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        os.unlink(tmp_path)

MAX_REWRITE_LENGTH = 10000

@app.route('/api/rewrite', methods=['POST'])
def rewrite():
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': 'No text provided'}), 400

    text = data['text']
    if not text or not text.strip():
        return jsonify({'error': 'Text cannot be empty'}), 400

    if len(text) > MAX_REWRITE_LENGTH:
        return jsonify({'error': f'Text too long. Maximum {MAX_REWRITE_LENGTH} characters allowed.'}), 400

    context = data.get('context', '')
    if len(context) > 2000:
        return jsonify({'error': 'Context too long. Maximum 2000 characters allowed.'}), 400

    prompt = data.get('prompt', 'Rewrite this text to be clearer and more professional')
    if len(prompt) > 500:
        return jsonify({'error': 'Prompt too long. Maximum 500 characters allowed.'}), 400

    system_msg = "You are a helpful writing assistant. Your task is to rewrite text based on user instructions."
    if context:
        system_msg += f"\n\nContext about the writing: {context}"

    user_msg = f"{prompt}\n\nText to rewrite:\n{text}"

    try:
        if REWRITE_CONFIG['provider'] == 'ollama':
            result = rewrite_with_ollama(system_msg, user_msg)
        elif REWRITE_CONFIG['provider'] == 'openai':
            result = rewrite_with_openai(system_msg, user_msg)
        else:
            return jsonify({'error': f"Unknown provider: {REWRITE_CONFIG['provider']}"}), 500

        return jsonify({'text': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def rewrite_with_ollama(system_msg, user_msg):
    url = f"{REWRITE_CONFIG['ollama_url']}/api/chat"
    response = requests.post(url, json={
        'model': REWRITE_CONFIG['ollama_model'],
        'messages': [
            {'role': 'system', 'content': system_msg},
            {'role': 'user', 'content': user_msg}
        ],
        'stream': False
    }, timeout=60)

    if response.status_code != 200:
        raise Exception(f"Ollama error: {response.text}")

    data = response.json()
    return data['message']['content']

def rewrite_with_openai(system_msg, user_msg):
    if not REWRITE_CONFIG['openai_key']:
        raise Exception("OpenAI API key not configured. Set OPENAI_API_KEY environment variable.")

    url = "https://api.openai.com/v1/chat/completions"
    response = requests.post(url, json={
        'model': REWRITE_CONFIG['openai_model'],
        'messages': [
            {'role': 'system', 'content': system_msg},
            {'role': 'user', 'content': user_msg}
        ]
    }, headers={
        'Authorization': f"Bearer {REWRITE_CONFIG['openai_key']}",
        'Content-Type': 'application/json'
    }, timeout=60)

    if response.status_code != 200:
        raise Exception(f"OpenAI error: {response.text}")

    data = response.json()
    return data['choices'][0]['message']['content']

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/config', methods=['GET'])
def config():
    return jsonify({
        'rewrite_provider': REWRITE_CONFIG['provider'],
        'ollama_model': REWRITE_CONFIG['ollama_model'],
        'openai_configured': bool(REWRITE_CONFIG['openai_key']),
    })

@app.route('/api/models', methods=['GET'])
def models():
    """Return available Whisper models with their sizes"""
    return jsonify({
        'models': AVAILABLE_MODELS,
        'current': current_model_name or 'turbo'
    })

# --- WebSocket endpoint for real-time transcription ---
@sock.route('/ws/transcribe')
def ws_transcribe(ws):
    """
    WebSocket endpoint for real-time audio streaming and transcription.

    Messages IN:
      JSON: {"type": "config", "model": "turbo"}
      Binary: raw audio chunks (WebM)
      JSON: {"type": "flush"} | {"type": "stop"}

    Messages OUT:
      {"type": "status", "state": "connected|configured|listening|processing|closed"}
      {"type": "final", "text": "...", "language": "en"}
      {"type": "error", "message": "..."}
    """
    audio_buffer = BytesIO()
    model_name = "turbo"
    chunk_count = 0

    try:
        ws.send(json.dumps({"type": "status", "state": "connected"}))

        while True:
            message = ws.receive()
            if message is None:
                break

            if isinstance(message, str):
                try:
                    data = json.loads(message)
                    msg_type = data.get('type')

                    if msg_type == 'config':
                        requested_model = data.get('model', 'turbo')
                        if requested_model in AVAILABLE_MODELS:
                            model_name = requested_model
                            ws.send(json.dumps({"type": "status", "state": "configured", "model": model_name}))
                        else:
                            ws.send(json.dumps({"type": "error", "message": f"Invalid model: {requested_model}"}))

                    elif msg_type == 'flush':
                        if audio_buffer.tell() > 0:
                            ws.send(json.dumps({"type": "status", "state": "processing"}))
                            result = transcribe_buffer(audio_buffer, model_name)
                            if 'error' in result:
                                ws.send(json.dumps({"type": "error", "message": result['error']}))
                            else:
                                ws.send(json.dumps({"type": "final", "text": result['text'], "language": result.get('language', 'unknown')}))
                            audio_buffer = BytesIO()
                            chunk_count = 0
                            ws.send(json.dumps({"type": "status", "state": "listening"}))

                    elif msg_type == 'stop':
                        ws.send(json.dumps({"type": "status", "state": "closed"}))
                        break

                except json.JSONDecodeError:
                    ws.send(json.dumps({"type": "error", "message": "Invalid JSON"}))

            elif isinstance(message, bytes):
                audio_buffer.write(message)
                chunk_count += 1

    except Exception as e:
        try:
            ws.send(json.dumps({"type": "error", "message": str(e)}))
        except:
            pass


def transcribe_buffer(audio_buffer, model_name="turbo"):
    with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as tmp:
        audio_buffer.seek(0)
        tmp.write(audio_buffer.read())
        tmp_path = tmp.name

    try:
        whisper_model = get_model(model_name)
        result = whisper_model.transcribe(tmp_path)
        return {'text': result['text'].strip(), 'language': result.get('language', 'unknown')}
    except Exception as e:
        return {'error': str(e)}
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass


if __name__ == '__main__':
    get_model()
    app.run(host='127.0.0.1', port=5000, debug=False)
