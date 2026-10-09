from __future__ import annotations

import io
import json
import threading
import wave
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parent
MODEL_PATH = ROOT / "voice" / "vi_VN-vais1000-medium.onnx"
HOST = "127.0.0.1"
PORT = 8765

if not MODEL_PATH.is_file():
    raise SystemExit(
        "Vietnamese voice model is missing. Close this window and run start_app.bat again."
    )

print("Loading Vietnamese voice model. This can take a short while on the first launch...", flush=True)
VOICE = PiperVoice.load(str(MODEL_PATH))
VOICE_LOCK = threading.Lock()
print("Vietnamese voice is ready.", flush=True)


class LittleLinguaHandler(SimpleHTTPRequestHandler):
    server_version = "LittleLinguaLocal/1.0"

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            payload = json.dumps({"ready": True, "language": "vi-VN", "engine": "Piper local"}).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(payload)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(payload)
            return

        if parsed.path == "/api/speak":
            params = parse_qs(parsed.query)
            text = (params.get("text") or [""])[0].strip()
            slow = (params.get("slow") or ["0"])[0] == "1"
            if not text:
                self.send_error(400, "No text was provided.")
                return
            if len(text) > 500:
                self.send_error(413, "Please request a shorter phrase.")
                return
            try:
                audio_buffer = io.BytesIO()
                synth_config = SynthesisConfig(length_scale=1.28 if slow else 1.0)
                # Serialize access to the model so quick repeated clicks stay stable.
                with VOICE_LOCK:
                    with wave.open(audio_buffer, "wb") as wav_file:
                        VOICE.synthesize_wav(text, wav_file, syn_config=synth_config)
                audio = audio_buffer.getvalue()
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(audio)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(audio)
            except Exception as exc:
                body = ("Speech generation failed: " + str(exc)).encode("utf-8", errors="replace")
                self.send_response(500)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)
            return

        super().do_GET()


def main():
    server = None
    selected_port = None
    last_error = None
    # Avoid failing if another copy or another local development app uses 8765.
    for candidate_port in range(PORT, PORT + 12):
        try:
            server = ThreadingHTTPServer((HOST, candidate_port), LittleLinguaHandler)
            selected_port = candidate_port
            break
        except OSError as exc:
            last_error = exc
    if server is None or selected_port is None:
        raise SystemExit(f"Could not start the local server on ports {PORT}-{PORT + 11}: {last_error}")
    url = f"http://{HOST}:{selected_port}/"
    print(f"Little Lingua is running at {url}", flush=True)
    print("Keep this window open while using the app. Press Ctrl+C to stop it.", flush=True)
    try:
        webbrowser.open(url)
    except Exception:
        pass
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping Little Lingua...", flush=True)
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
