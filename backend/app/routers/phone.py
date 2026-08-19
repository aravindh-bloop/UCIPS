import requests
from fastapi import APIRouter, BackgroundTasks, Form, Response
from sqlalchemy.orm import Session
from twilio.twiml.voice_response import VoiceResponse

from app.config import settings
from app.db.models import Complaint
from app.db.session import SessionLocal
from app.routers.complaints import _finalize_complaint, _run_pipeline_tail, _unique_reference_code
from app.services.geocoding import geocode
from app.services.phone_agent import run_phone_turn
from app.services.storage import save_upload
from app.services.stt_tts import synthesize_speech, transcribe_audio

router = APIRouter(prefix="/api/phone", tags=["phone"])

MAX_TURNS = 2

# In-memory per-call state (transcript so far, turn count, detected language). A single-process
# hackathon deployment, and a call lasts at most a couple of minutes, so this doesn't need a DB
# table -- it just needs to survive between the several webhook requests Twilio makes for one
# call, which an in-memory dict does fine as long as the server process itself isn't restarted
# mid-call.
_calls: dict[str, dict] = {}


def _tts_url(text: str, language_code: str) -> str | None:
    """Synthesizes speech and returns a public URL Twilio can fetch, or None on failure (the
    caller falls back to Twilio's own built-in voice rather than dropping the call)."""
    try:
        audio_bytes = synthesize_speech(text, language_code=language_code or "en-IN")
        path = save_upload(audio_bytes, "phone_audio", "wav")
        return f"{settings.public_base_url}{path}"
    except Exception:
        return None


def _say_or_play(vr: VoiceResponse, text: str, language_code: str) -> None:
    """Prefers a real Sarvam TTS clip (so Tamil/Hindi actually sounds native) and only falls
    back to Twilio's own built-in voice if synthesis fails -- callers should never hear dead
    air because one TTS call had a hiccup."""
    url = _tts_url(text, language_code)
    if url:
        vr.play(url)
    else:
        vr.say(text)


@router.post("/incoming")
def incoming_call(CallSid: str = Form(...)):
    """First webhook Twilio hits when someone calls the UCIPS number. We don't know the
    caller's language yet, so the bootstrap greeting uses Twilio's own built-in voice (reliable,
    language-agnostic instructions) -- every reply after this uses real Sarvam TTS in whatever
    language the caller actually speaks."""
    _calls[CallSid] = {"transcript": "", "turns": 0, "language_code": "en-IN"}

    vr = VoiceResponse()
    vr.say("Hello, thank you for calling You C I P S. Please describe your problem after the beep, in any language you like.")
    vr.record(action="/api/phone/recording", method="POST", max_length=45, play_beep=True, trim_silence=True, timeout=4)
    vr.say("We did not receive a recording. Goodbye.")
    return Response(content=str(vr), media_type="application/xml")


@router.post("/recording")
def handle_recording(background_tasks: BackgroundTasks, CallSid: str = Form(...), RecordingUrl: str = Form(...)):
    """Twilio calls this once the caller finishes speaking (silence/timeout/max length hit).
    Downloads the actual recording, transcribes it for real via Sarvam, folds it into the call's
    running transcript, and asks the phone agent whether we have enough to file the report or
    need one more turn -- capped at MAX_TURNS so a confused or rambling call still terminates."""
    state = _calls.setdefault(CallSid, {"transcript": "", "turns": 0, "language_code": "en-IN"})

    vr = VoiceResponse()

    try:
        audio_resp = requests.get(f"{RecordingUrl}.wav", auth=(settings.twilio_account_sid, settings.twilio_auth_token), timeout=15)
        audio_resp.raise_for_status()
        stt_result = transcribe_audio(audio_resp.content, "recording.wav", "unknown")
        heard = stt_result.get("transcript", "").strip()
        detected_language = stt_result.get("language_code") or state["language_code"]
    except Exception:
        heard = ""
        detected_language = state["language_code"]

    state["language_code"] = detected_language
    state["turns"] += 1

    if not heard:
        # Nothing intelligible this turn -- ask again rather than silently failing the call,
        # unless we're already out of turns.
        if state["turns"] >= MAX_TURNS:
            _say_or_play(vr, "Sorry, I could not understand. Please try calling again.", detected_language)
            vr.hangup()
            _calls.pop(CallSid, None)
            return Response(content=str(vr), media_type="application/xml")

        _say_or_play(vr, "Sorry, I did not catch that. Could you say that again?", detected_language)
        vr.record(action="/api/phone/recording", method="POST", max_length=45, play_beep=True, trim_silence=True, timeout=4)
        return Response(content=str(vr), media_type="application/xml")

    state["transcript"] = f"{state['transcript']}\n{heard}".strip()

    force_ready = state["turns"] >= MAX_TURNS
    result = run_phone_turn(state["transcript"], force_ready)

    if not result["ready"]:
        _say_or_play(vr, result["spoken_reply"], detected_language)
        vr.record(action="/api/phone/recording", method="POST", max_length=45, play_beep=True, trim_silence=True, timeout=4)
        return Response(content=str(vr), media_type="application/xml")

    # Enough to file the report -- geocode whatever location was mentioned (falls back to the
    # seeded demo ward centroid if nothing resolves) and run it through the exact same pipeline
    # every other channel uses (text/voice/image), so it clusters, gets evidence-checked, and
    # can generate a project the same as any other complaint.
    lat, lng = geocode(result["location_description"])

    db: Session = SessionLocal()
    try:
        complaint = Complaint(
            reference_code=_unique_reference_code(db),
            user_id=None,
            channel="phone",
            language=detected_language,
            transcript=state["transcript"],
            category=result["category"],
            description=result["description"],
            severity=result["severity"],
            lat=lat,
            lng=lng,
            status="processed",
        )
        complaint = _finalize_complaint(db, complaint)
        background_tasks.add_task(_run_pipeline_tail, complaint.id)
        reference_code = complaint.reference_code
    finally:
        db.close()

    _calls.pop(CallSid, None)

    _say_or_play(vr, result["spoken_reply"], detected_language)
    spelled = " ".join(reference_code.replace("-", " "))
    vr.say(f"Your reference code is: {spelled}")
    vr.hangup()
    return Response(content=str(vr), media_type="application/xml")
