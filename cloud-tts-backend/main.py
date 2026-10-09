from __future__ import annotations

import hashlib
import os
import threading
import time
from collections import OrderedDict, defaultdict, deque
from functools import lru_cache
from typing import Deque

from flask import Flask, jsonify, make_response, request
from google.cloud import texttospeech

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 8 * 1024

ALLOWED_ORIGINS = {
    item.strip().rstrip("/")
    for item in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if item.strip()
}
VOICE_NAME = os.getenv("TTS_VOICE_NAME", "vi-VN-Neural2-A")
MAX_TEXT_LENGTH = int(os.getenv("MAX_TEXT_LENGTH", "350"))
MAX_REQUESTS_PER_MINUTE = int(os.getenv("MAX_REQUESTS_PER_MINUTE", "30"))
CACHE_LIMIT = int(os.getenv("TTS_CACHE_ENTRIES", "256"))
RATE_WINDOW_SECONDS = 60

_rate_lock = threading.Lock()
_recent_requests: dict[str, Deque[float]] = defaultdict(deque)
_cache_lock = threading.Lock()
_audio_cache: OrderedDict[str, bytes] = OrderedDict()


@lru_cache(maxsize=1)
def get_tts_client():
    # Cloud Run's attached service account is picked up automatically through ADC.
    # Do not use API keys or ship service-account credentials to the browser.
    return texttospeech.TextToSpeechClient()


def request_origin() -> str:
    return request.headers.get("Origin", "").strip().rstrip("/")


def origin_is_allowed(origin: str) -> bool:
    return bool(origin and origin in ALLOWED_ORIGINS)


@app.after_request
def add_cors_headers(response):
    origin = request_origin()
    if origin_is_allowed(origin):
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        response.headers["Access-Control-Max-Age"] = "600"
    response.headers["Vary"] = "Origin"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Cache-Control"] = "no-store"
    return response


def client_ip_key() -> str:
    # Cloud Run puts the client and proxy addresses at the end of X-Forwarded-For.
    # Trust the second-to-last entry when present instead of the first user-supplied one.
    forwarded = [part.strip() for part in request.headers.get("X-Forwarded-For", "").split(",") if part.strip()]
    if len(forwarded) >= 2:
        return forwarded[-2]
    return request.remote_addr or "unknown"


def is_rate_limited(ip: str) -> bool:
    now = time.monotonic()
    cutoff = now - RATE_WINDOW_SECONDS
    with _rate_lock:
        requests_for_ip = _recent_requests[ip]
        while requests_for_ip and requests_for_ip[0] < cutoff:
            requests_for_ip.popleft()
        if len(requests_for_ip) >= MAX_REQUESTS_PER_MINUTE:
            return True
        requests_for_ip.append(now)
        # Avoid an ever-growing in-memory map on a long-lived instance.
        if len(_recent_requests) > 2000:
            expired_ips = [key for key, values in _recent_requests.items() if not values or values[-1] < cutoff]
            for key in expired_ips[:1000]:
                _recent_requests.pop(key, None)
    return False


def cache_key(text: str, slow: bool) -> str:
    value = f"{VOICE_NAME}|{slow}|{text}".encode("utf-8")
    return hashlib.sha256(value).hexdigest()


def get_cached_audio(key: str) -> bytes | None:
    with _cache_lock:
        audio = _audio_cache.get(key)
        if audio is not None:
            _audio_cache.move_to_end(key)
        return audio


def put_cached_audio(key: str, audio: bytes) -> None:
    with _cache_lock:
        _audio_cache[key] = audio
        _audio_cache.move_to_end(key)
        while len(_audio_cache) > CACHE_LIMIT:
            _audio_cache.popitem(last=False)


def synthesize_vietnamese(text: str, slow: bool) -> bytes:
    synthesis_input = texttospeech.SynthesisInput(text=text)
    voice = texttospeech.VoiceSelectionParams(
        language_code="vi-VN",
        name=VOICE_NAME,
    )
    audio_config = texttospeech.AudioConfig(
        audio_encoding=texttospeech.AudioEncoding.MP3,
        speaking_rate=0.68 if slow else 0.92,
    )
    result = get_tts_client().synthesize_speech(
        input=synthesis_input,
        voice=voice,
        audio_config=audio_config,
    )
    if not result.audio_content:
        raise RuntimeError("Google Cloud TTS returned empty audio.")
    return bytes(result.audio_content)


@app.get("/api/health")
def health():
    return jsonify({"ready": True, "provider": "Google Cloud Text-to-Speech", "language": "vi-VN", "voice": VOICE_NAME})


@app.route("/api/speak", methods=["OPTIONS"])
def speak_preflight():
    if not origin_is_allowed(request_origin()):
        return jsonify({"error": "This website origin is not allowed."}), 403
    return make_response("", 204)


@app.post("/api/speak")
def speak():
    origin = request_origin()
    if not origin_is_allowed(origin):
        return jsonify({"error": "This website origin is not allowed. Add your GitHub Pages origin to ALLOWED_ORIGINS."}), 403

    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "Expected a JSON request body."}), 400

    text = payload.get("text", "")
    if not isinstance(text, str):
        return jsonify({"error": "The text field must be a string."}), 400
    text = text.strip()
    if not text:
        return jsonify({"error": "Please provide Vietnamese text to speak."}), 400
    if len(text) > MAX_TEXT_LENGTH:
        return jsonify({"error": f"Please request {MAX_TEXT_LENGTH} characters or fewer."}), 413

    slow = bool(payload.get("slow", False))
    if is_rate_limited(client_ip_key()):
        response = jsonify({"error": "Too many voice requests. Please wait a minute and try again."})
        response.status_code = 429
        response.headers["Retry-After"] = "60"
        return response

    key = cache_key(text, slow)
    audio = get_cached_audio(key)
    if audio is None:
        try:
            audio = synthesize_vietnamese(text, slow)
            put_cached_audio(key, audio)
        except Exception as exc:  # Keep credentials, request details, and stack traces out of responses.
            app.logger.error("Google Cloud TTS request failed (%s)", type(exc).__name__)
            return jsonify({"error": "Google Cloud speech generation failed. Check that the Text-to-Speech API is enabled and the service account has access."}), 502

    response = make_response(audio, 200)
    response.headers["Content-Type"] = "audio/mpeg"
    response.headers["Content-Length"] = str(len(audio))
    return response


if __name__ == "__main__":
    # Intended only for local development. Deploy with the included Cloud Run steps.
    app.run(host="127.0.0.1", port=int(os.getenv("PORT", "8080")), debug=False)
