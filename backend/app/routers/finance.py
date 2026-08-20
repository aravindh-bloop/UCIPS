import json
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from google.genai.errors import APIError
from sqlalchemy.orm import Session

from app.db.models import SchemeGrievance, SchemeGrievanceCluster, SchemeQuery, User
from app.db.schemas import (
    SchemeDiscoverRequest,
    SchemeDiscoverResponse,
    SchemeGrievanceClusterOut,
    SchemeGrievanceCreate,
    SchemeGrievanceFollowUp,
    SchemeGrievanceOut,
)
from app.db.session import SessionLocal, get_db
from app.security import get_current_user, require_role
from app.services.embeddings import embed_text
from app.services.scheme_clustering import recompute_scheme_clusters
from app.services.scheme_discovery import discover_schemes
from app.services.scheme_grievance_agent import diagnose_grievance

router = APIRouter(prefix="/api/finance", tags=["finance"])

CACHE_WINDOW_HOURS = 24
GRIEVANCE_MAX_TURNS = 2


@router.post("/schemes/discover", response_model=SchemeDiscoverResponse, status_code=201)
def discover(
    payload: SchemeDiscoverRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Real scheme lookup -- see services/scheme_discovery.py for the grounded/ungrounded
    fallback logic. Caches by (profession, state, age) for CACHE_WINDOW_HOURS so identical
    repeat lookups don't re-spend Gemini Search quota; a genuinely different profile always
    triggers a fresh lookup."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=CACHE_WINDOW_HOURS)
    cached = (
        db.query(SchemeQuery)
        .filter(
            SchemeQuery.profession.ilike(payload.profession.strip()),
            SchemeQuery.state.ilike(payload.state.strip()),
            SchemeQuery.age == payload.age,
            SchemeQuery.created_at >= cutoff,
        )
        .order_by(SchemeQuery.created_at.desc())
        .first()
    )
    if cached:
        result = json.loads(cached.result_json)
        return SchemeDiscoverResponse(
            query_id=cached.id,
            schemes=result["schemes"],
            sources=result["sources"],
            cached=True,
            grounded=result.get("grounded", True),
        )

    try:
        result = discover_schemes(payload.profession, payload.state, payload.age, payload.notes)
    except APIError:
        raise HTTPException(status_code=502, detail="Scheme lookup service is temporarily unavailable, please retry")

    query = SchemeQuery(
        user_id=current_user.id,
        profession=payload.profession.strip(),
        state=payload.state.strip(),
        age=payload.age,
        notes=payload.notes,
        result_json=json.dumps(result),
    )
    db.add(query)
    db.commit()
    db.refresh(query)

    return SchemeDiscoverResponse(
        query_id=query.id,
        schemes=result["schemes"],
        sources=result["sources"],
        cached=False,
        grounded=result["grounded"],
    )


def _run_grievance_pipeline_tail(grievance_id: int) -> None:
    db = SessionLocal()
    try:
        grievance = db.get(SchemeGrievance, grievance_id)
        if not grievance or not grievance.failure_description:
            return
        try:
            grievance.embedding = embed_text(grievance.failure_description)
            db.commit()
        except Exception:
            db.rollback()
            return
        try:
            recompute_scheme_clusters(db)
        except Exception:
            db.rollback()
    finally:
        db.close()


@router.post("/grievances", response_model=SchemeGrievanceOut, status_code=201)
def create_grievance(
    payload: SchemeGrievanceCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        diagnosis = diagnose_grievance(payload.text, force_ready=False)
    except APIError:
        raise HTTPException(status_code=502, detail="Diagnosis service is temporarily unavailable, please retry")

    grievance = SchemeGrievance(
        user_id=current_user.id,
        scheme_name=payload.scheme_name,
        raw_text=payload.text,
        failure_description=diagnosis["failure_description"] if diagnosis["ready"] else None,
        follow_up_question=diagnosis["follow_up_question"] or None,
        status="diagnosed" if diagnosis["ready"] else "received",
    )
    db.add(grievance)
    db.commit()
    db.refresh(grievance)

    if diagnosis["ready"]:
        background_tasks.add_task(_run_grievance_pipeline_tail, grievance.id)

    return grievance


@router.post("/grievances/{grievance_id}/followup", response_model=SchemeGrievanceOut)
def answer_grievance_followup(
    grievance_id: int,
    payload: SchemeGrievanceFollowUp,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    grievance = db.get(SchemeGrievance, grievance_id)
    if not grievance:
        raise HTTPException(status_code=404, detail="Grievance not found")
    if grievance.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your report")

    combined = f"{grievance.raw_text}\n\nFollow-up question asked: {payload.question}\nCitizen's answer: {payload.answer}"

    try:
        diagnosis = diagnose_grievance(combined, force_ready=True)  # capped at one round, same as complaint follow-up
    except APIError:
        raise HTTPException(status_code=502, detail="Diagnosis service is temporarily unavailable, please retry")

    grievance.raw_text = combined
    grievance.failure_description = diagnosis["failure_description"]
    grievance.follow_up_question = None
    grievance.status = "diagnosed"
    db.commit()
    db.refresh(grievance)

    background_tasks.add_task(_run_grievance_pipeline_tail, grievance.id)
    return grievance


@router.get("/grievances", response_model=list[SchemeGrievanceOut])
def list_my_grievances(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return (
        db.query(SchemeGrievance)
        .filter(SchemeGrievance.user_id == current_user.id)
        .order_by(SchemeGrievance.created_at.desc())
        .all()
    )


@router.get("/grievances/clusters", response_model=list[SchemeGrievanceClusterOut])
def list_grievance_clusters(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("authority")),
):
    return db.query(SchemeGrievanceCluster).order_by(SchemeGrievanceCluster.member_count.desc()).all()
