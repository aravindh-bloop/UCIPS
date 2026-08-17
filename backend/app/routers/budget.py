from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import BudgetRun, BudgetRunProject, Project, User
from app.db.schemas import BudgetOptimizeRequest, BudgetRunOut, ProjectOut
from app.db.session import get_db
from app.security import require_role
from app.services.knapsack import optimize_budget

router = APIRouter(prefix="/api/budget", tags=["budget"])


def _build_budget_run_out(db: Session, budget_run: BudgetRun) -> BudgetRunOut:
    links = db.query(BudgetRunProject).filter(BudgetRunProject.budget_run_id == budget_run.id).all()
    out = BudgetRunOut.model_validate(budget_run)
    out.selected = [ProjectOut.model_validate(link.project) for link in links if link.included]
    out.excluded = [ProjectOut.model_validate(link.project) for link in links if not link.included]
    return out


@router.post("/optimize", response_model=BudgetRunOut, status_code=201)
def optimize(
    payload: BudgetOptimizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("authority")),
):
    if payload.budget <= 0:
        raise HTTPException(status_code=400, detail="Budget must be positive")

    projects = db.query(Project).filter(Project.status != "rejected").all()
    if not projects:
        raise HTTPException(status_code=400, detail="No candidate projects available to optimize over")

    result = optimize_budget(projects, payload.budget)

    budget_run = BudgetRun(
        authority_id=current_user.id,
        total_budget=payload.budget,
        total_cost=result["total_cost"],
        total_expected_impact=result["total_expected_impact"],
        status="draft",
    )
    db.add(budget_run)
    db.flush()

    for project in result["selected"]:
        db.add(BudgetRunProject(budget_run_id=budget_run.id, project_id=project.id, included=True))
    for project in result["excluded"]:
        db.add(BudgetRunProject(budget_run_id=budget_run.id, project_id=project.id, included=False))
    db.commit()
    db.refresh(budget_run)

    return _build_budget_run_out(db, budget_run)


@router.get("/runs", response_model=list[BudgetRunOut])
def list_runs(db: Session = Depends(get_db)):
    runs = db.query(BudgetRun).order_by(BudgetRun.created_at.desc()).all()
    return [_build_budget_run_out(db, run) for run in runs]


@router.get("/runs/{run_id}", response_model=BudgetRunOut)
def get_run(run_id: int, db: Session = Depends(get_db)):
    run = db.get(BudgetRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Budget run not found")
    return _build_budget_run_out(db, run)


@router.post("/runs/{run_id}/approve", response_model=BudgetRunOut)
def approve_run(
    run_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("authority")),
):
    run = db.get(BudgetRun, run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Budget run not found")
    if run.status == "approved":
        raise HTTPException(status_code=409, detail="Budget run is already approved")

    run.status = "approved"
    links = db.query(BudgetRunProject).filter(BudgetRunProject.budget_run_id == run.id, BudgetRunProject.included.is_(True)).all()
    for link in links:
        link.project.status = "approved"

    db.commit()
    db.refresh(run)
    return _build_budget_run_out(db, run)
