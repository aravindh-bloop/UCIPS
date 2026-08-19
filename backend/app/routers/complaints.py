import os

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from google.genai.errors import APIError
from sqlalchemy.orm import Session

from app.db.models import Complaint, Feedback, User
from app.db.schemas import ComplaintCreate, ComplaintOut, FeedbackCreate, FeedbackOut, FollowUpAnswer
from app.db.session import SessionLocal, get_db
from app.security import get_current_user
from app.services.clustering import recompute_all_clusters
from app.services.embeddings import embed_text
from app.services.evidence import get_or_create_evidence
from app.services.llm_extraction import extract_complaint
from app.services.project_generation import generate_or_update_project
from app.services.stt_tts import transcribe_audio
from app.services.storage import save_upload
from app.services.vision import analyze_image
from app.utils import generate_reference_code

router = APIRouter(prefix="/api/complaints", tags=["complaints"])


def _unique_reference_code(db: Session) -> str:
    for _ in range(5):
        code = generate_reference_code()
        if not db.query(Complaint).filter(Complaint.reference_code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate a unique reference code")


def _finalize_complaint(db: Session, complaint: Complaint) -> Complaint:
    """Persist the complaint. This is deliberately just the DB write -- embedding, clustering,
    evidence, and project generation all involve extra Gemini calls and used to run inline
    here, which on a slow/rate-limited request (each with up to 4 retries and 5-15s backoff)
    could push total response time past the client's upload read-timeout with no way to
    configure it higher. Those steps now run via _run_pipeline_tail after the response is
    already sent, so submission always comes back fast; hotspots/evidence/projects catch up
    moments later."""
    db.add(complaint)
    db.flush()
    db.commit()
    db.refresh(complaint)
    return complaint


def _run_pipeline_tail(complaint_id: int) -> None:
    """Runs after the HTTP response has already been sent (FastAPI BackgroundTasks), on its
    own DB session since the request-scoped one is closed by then. Best-effort throughout --
    a failure here must never surface to the citizen who already got their reference code."""
    db = SessionLocal()
    try:
        complaint = db.get(Complaint, complaint_id)
        if not complaint:
            return

        try:
            complaint.embedding = embed_text(complaint.description or complaint.raw_text or "")
            db.commit()
        except Exception:
            db.rollback()

        try:
            touched_clusters = recompute_all_clusters(db)
            for cluster in touched_clusters:
                evidence = get_or_create_evidence(db, cluster)
                generate_or_update_project(db, cluster, evidence)
            db.commit()
        except Exception:
            db.rollback()
    finally:
        db.close()


@router.post("", response_model=ComplaintOut, status_code=201)
def create_complaint(
    payload: ComplaintCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        extracted = extract_complaint(payload.text)
    except APIError:
        raise HTTPException(status_code=502, detail="AI extraction service is temporarily unavailable, please retry")

    complaint = Complaint(
        reference_code=_unique_reference_code(db),
        user_id=current_user.id,
        channel="text",
        language=payload.language,
        raw_text=payload.text,
        category=extracted["category"],
        description=extracted["description"],
        severity=extracted["severity"],
        lat=payload.lat,
        lng=payload.lng,
        status="processed",
    )
    complaint = _finalize_complaint(db, complaint)
    background_tasks.add_task(_run_pipeline_tail, complaint.id)

    out = ComplaintOut.model_validate(complaint)
    out.follow_up_question = extracted.get("follow_up_question") or None
    return out


@router.post("/{complaint_id}/followup", response_model=ComplaintOut)
def answer_follow_up(
    complaint_id: int,
    payload: FollowUpAnswer,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Closes the loop on the AI's clarifying question: folds the citizen's answer back
    into the original report and re-extracts, so the follow-up actually refines the
    complaint instead of being a dead-end message. Capped at one round by design (THIN-REAL
    per the project plan) -- this always returns follow_up_question=None."""
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your complaint")

    original = complaint.raw_text or complaint.transcript or complaint.description or ""
    combined = f"{original}\n\nFollow-up question asked: {payload.question}\nCitizen's answer: {payload.answer}"

    try:
        extracted = extract_complaint(combined)
    except APIError:
        raise HTTPException(status_code=502, detail="AI extraction service is temporarily unavailable, please retry")

    complaint.category = extracted["category"]
    complaint.description = extracted["description"]
    complaint.severity = extracted["severity"]
    if complaint.raw_text is not None:
        complaint.raw_text = combined

    complaint = _finalize_complaint(db, complaint)
    background_tasks.add_task(_run_pipeline_tail, complaint.id)
    return ComplaintOut.model_validate(complaint)


@router.post("/voice", response_model=ComplaintOut, status_code=201)
async def create_voice_complaint(
    background_tasks: BackgroundTasks,
    lat: float = Form(...),
    lng: float = Form(...),
    language_code: str = Form("unknown"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    audio_bytes = await file.read()
    extension = os.path.splitext(file.filename or "")[1].lstrip(".") or "wav"
    audio_url = save_upload(audio_bytes, "audio", extension)

    try:
        stt_result = transcribe_audio(audio_bytes, file.filename or f"audio.{extension}", language_code)
    except Exception:
        raise HTTPException(status_code=502, detail="Speech-to-text service is temporarily unavailable, please retry")

    transcript = stt_result.get("transcript", "")
    detected_language = stt_result.get("language_code") or language_code

    if not transcript.strip():
        raise HTTPException(status_code=422, detail="Could not transcribe any speech from the audio")

    try:
        extracted = extract_complaint(transcript)
    except APIError:
        raise HTTPException(status_code=502, detail="AI extraction service is temporarily unavailable, please retry")

    complaint = Complaint(
        reference_code=_unique_reference_code(db),
        user_id=current_user.id,
        channel="voice",
        language=detected_language,
        transcript=transcript,
        audio_url=audio_url,
        category=extracted["category"],
        description=extracted["description"],
        severity=extracted["severity"],
        lat=lat,
        lng=lng,
        status="processed",
    )
    complaint = _finalize_complaint(db, complaint)
    background_tasks.add_task(_run_pipeline_tail, complaint.id)

    out = ComplaintOut.model_validate(complaint)
    out.follow_up_question = extracted.get("follow_up_question") or None
    return out


@router.post("/image", response_model=ComplaintOut, status_code=201)
async def create_image_complaint(
    background_tasks: BackgroundTasks,
    lat: float = Form(...),
    lng: float = Form(...),
    caption: str | None = Form(None),
    language: str = Form("en"),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_bytes = await file.read()
    extension = os.path.splitext(file.filename or "")[1].lstrip(".") or "jpg"
    image_url = save_upload(image_bytes, "images", extension)
    mime_type = file.content_type or "image/jpeg"

    try:
        analyzed = analyze_image(image_bytes, mime_type, caption)
    except APIError:
        raise HTTPException(status_code=502, detail="AI vision service is temporarily unavailable, please retry")

    complaint = Complaint(
        reference_code=_unique_reference_code(db),
        user_id=current_user.id,
        channel="image",
        language=language,
        raw_text=caption,
        image_url=image_url,
        category=analyzed["category"],
        description=analyzed["description"],
        severity=analyzed["severity"],
        lat=lat,
        lng=lng,
        status="processed",
    )
    complaint = _finalize_complaint(db, complaint)
    background_tasks.add_task(_run_pipeline_tail, complaint.id)

    return ComplaintOut.model_validate(complaint)


@router.get("", response_model=list[ComplaintOut])
def list_my_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Complaint)
    if current_user.role == "citizen":
        query = query.filter(Complaint.user_id == current_user.id)
    return query.order_by(Complaint.created_at.desc()).all()


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role == "citizen" and complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your complaint")
    return complaint


@router.post("/{complaint_id}/feedback", response_model=FeedbackOut, status_code=201)
def submit_feedback(
    complaint_id: int,
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your complaint")
    if not 1 <= payload.rating <= 5:
        raise HTTPException(status_code=400, detail="rating must be between 1 and 5")

    existing = db.query(Feedback).filter(Feedback.complaint_id == complaint_id).first()
    if existing:
        raise HTTPException(status_code=409, detail="Feedback already submitted for this complaint")

    feedback = Feedback(complaint_id=complaint_id, rating=payload.rating, comment=payload.comment)
    db.add(feedback)
    db.commit()
    db.refresh(feedback)
    return feedback


@router.get("/{complaint_id}/feedback", response_model=FeedbackOut)
def get_feedback(
    complaint_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")
    if current_user.role == "citizen" and complaint.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your complaint")

    feedback = db.query(Feedback).filter(Feedback.complaint_id == complaint_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="No feedback submitted yet")
    return feedback
