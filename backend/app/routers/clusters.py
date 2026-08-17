from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Cluster, Complaint
from app.db.schemas import ClusterOut, ComplaintOut
from app.db.session import get_db

router = APIRouter(prefix="/api/hotspots", tags=["hotspots"])


@router.get("", response_model=list[ClusterOut])
def list_hotspots(db: Session = Depends(get_db)):
    return db.query(Cluster).order_by(Cluster.demand_score.desc()).all()


@router.get("/{cluster_id}", response_model=ClusterOut)
def get_hotspot(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.get(Cluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return cluster


@router.get("/{cluster_id}/complaints", response_model=list[ComplaintOut])
def get_hotspot_complaints(cluster_id: int, db: Session = Depends(get_db)):
    cluster = db.get(Cluster, cluster_id)
    if not cluster:
        raise HTTPException(status_code=404, detail="Hotspot not found")
    return db.query(Complaint).filter(Complaint.cluster_id == cluster_id).order_by(Complaint.created_at.desc()).all()
