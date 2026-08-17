import base64
import time

import requests

from app.config import settings

STT_URL = "https://api.sarvam.ai/speech-to-text"
TTS_URL = "https://api.sarvam.ai/text-to-speech"

_HEADERS = {"api-subscription-key": settings.sarvam_api_key}


_EXTENSION_MIME_TYPES = {
    "wav": "audio/wav",
    "mp3": "audio/mpeg",
    "m4a": "audio/x-m4a",
    "aac": "audio/aac",
    "ogg": "audio/ogg",
    "opus": "audio/opus",
    "flac": "audio/flac",
    "webm": "audio/webm",
    "amr": "audio/amr",
}


def transcribe_audio(file_bytes: bytes, filename: str, language_code: str = "unknown") -> dict:
    extension = filename.rsplit(".", 1)[-1].lower() if "." in filename else "wav"
    mime_type = _EXTENSION_MIME_TYPES.get(extension, "application/octet-stream")
    files = {"file": (filename, file_bytes, mime_type)}
    data = {"model": "saaras:v3", "language_code": language_code}

    last_error = None
    for attempt in range(3):
        resp = requests.post(STT_URL, headers=_HEADERS, files=files, data=data, timeout=30)
        if resp.status_code == 200:
            return resp.json()
        if resp.status_code in (429, 500, 502, 503):
            last_error = resp
            time.sleep(2 * (attempt + 1))
            continue
        resp.raise_for_status()

    raise RuntimeError(
        f"Sarvam STT failed after retries: {last_error.status_code} {last_error.text}" if last_error else "Sarvam STT failed"
    )


def synthesize_speech(text: str, language_code: str = "en-IN", speaker: str = "priya", pace: float = 1.0) -> bytes:
    payload = {
        "text": text,
        "language_code": language_code,
        "speaker": speaker,
        "model": "bulbul:v3",
        "pace": pace,
    }
    headers = {**_HEADERS, "Content-Type": "application/json"}

    last_error = None
    for attempt in range(3):
        resp = requests.post(TTS_URL, headers=headers, json=payload, timeout=30)
        if resp.status_code == 200:
            data = resp.json()
            return base64.b64decode(data["audios"][0])
        if resp.status_code in (429, 500, 502, 503):
            last_error = resp
            time.sleep(2 * (attempt + 1))
            continue
        resp.raise_for_status()

    raise RuntimeError(
        f"Sarvam TTS failed after retries: {last_error.status_code} {last_error.text}" if last_error else "Sarvam TTS failed"
    )
