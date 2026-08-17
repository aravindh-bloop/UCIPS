from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Project
from app.db.schemas import ProjectOut
from app.db.session import get_db

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=list[ProjectOut])
def list_projects(sort: str = "priority", db: Session = Depends(get_db)):
    query = db.query(Project)
    if sort == "priority":
        query = query.order_by(Project.priority_score.desc())
    elif sort == "cost":
        query = query.order_by(Project.estimated_cost.asc())
    elif sort == "recent":
        query = query.order_by(Project.created_at.desc())
    return query.all()


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: int, db: Session = Depends(get_db)):
    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project
