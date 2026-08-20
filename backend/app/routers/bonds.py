from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.models import Bond, BondInvestment, User
from app.db.schemas import BondDetailOut, BondOut, BondInvestmentOut, EquityBreakdownOut, ProgressStage
from app.db.session import get_db
from app.security import get_current_user

router = APIRouter(prefix="/api/bonds", tags=["bonds"])

STAGE_ORDER = ["invested", "identity_verified", "funds_confirmed", "allocated", "project_underway", "matured"]
STAGE_LABELS = {
    "invested": "Investment received",
    "identity_verified": "Identity verified (Aadhaar)",
    "funds_confirmed": "Funds confirmed",
    "allocated": "Allocated to project",
    "project_underway": "Project underway",
    "matured": "Bond matured",
}

# Equity monitoring is intentionally simple and explainable, matching the rest of this
# project's scoring philosophy: a bond is flagged if any single income bracket accounts for
# more than this share of total raised amount, rather than a hidden/black-box fairness metric.
EQUITY_GAP_THRESHOLD = 0.70


def _investment_tracker(investment: BondInvestment) -> list[ProgressStage]:
    current_index = STAGE_ORDER.index(investment.stage) if investment.stage in STAGE_ORDER else 0
    stages = []
    for i, key in enumerate(STAGE_ORDER):
        state = "done" if i < current_index else "current" if i == current_index else "pending"
        stages.append(ProgressStage(key=key, label=STAGE_LABELS[key], state=state))
    return stages


def _equity_breakdown(investments: list[BondInvestment]) -> EquityBreakdownOut:
    totals = {"low": 0.0, "middle": 0.0, "high": 0.0}
    counts = {"low": 0, "middle": 0, "high": 0}
    for inv in investments:
        bracket = inv.income_bracket if inv.income_bracket in totals else "middle"
        totals[bracket] += inv.amount
        counts[bracket] += 1

    total_raised = sum(totals.values())
    flagged = False
    reason = None
    if total_raised > 0:
        for bracket, amount in totals.items():
            share = amount / total_raised
            if share > EQUITY_GAP_THRESHOLD:
                flagged = True
                reason = (
                    f"{bracket.capitalize()}-income investors account for {share * 100:.0f}% of this bond's "
                    f"funding -- participation is not broadly distributed across income groups."
                )
                break

    return EquityBreakdownOut(
        low_amount=totals["low"],
        middle_amount=totals["middle"],
        high_amount=totals["high"],
        low_count=counts["low"],
        middle_count=counts["middle"],
        high_count=counts["high"],
        equity_gap_flagged=flagged,
        equity_gap_reason=reason,
    )


def _bond_out(bond: Bond) -> BondOut:
    raised = sum(inv.amount for inv in bond.investments)
    return BondOut(
        id=bond.id,
        project_id=bond.project_id,
        project_title=bond.project.title if bond.project else None,
        title=bond.title,
        description=bond.description,
        target_amount=bond.target_amount,
        raised_amount=raised,
        interest_rate=bond.interest_rate,
        tenure_years=bond.tenure_years,
        status=bond.status,
        investor_count=len(bond.investments),
        created_at=bond.created_at,
    )


@router.get("", response_model=list[BondOut])
def list_bonds(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bonds = db.query(Bond).order_by(Bond.created_at.desc()).all()
    return [_bond_out(b) for b in bonds]


@router.get("/{bond_id}", response_model=BondDetailOut)
def get_bond(bond_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    bond = db.get(Bond, bond_id)
    if not bond:
        raise HTTPException(status_code=404, detail="Bond not found")

    base = _bond_out(bond)
    investments = [
        BondInvestmentOut(
            id=inv.id,
            investor_name=inv.investor_name,
            income_bracket=inv.income_bracket,
            amount=inv.amount,
            aadhaar_verified=inv.aadhaar_verified,
            verification_status=inv.verification_status,
            stage=inv.stage,
            invested_at=inv.invested_at,
            tracker=_investment_tracker(inv),
        )
        for inv in sorted(bond.investments, key=lambda i: i.invested_at, reverse=True)
    ]

    return BondDetailOut(**base.model_dump(), investments=investments, equity=_equity_breakdown(bond.investments))
