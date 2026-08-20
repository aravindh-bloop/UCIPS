"""Seeds static demo data for the Infrastructure Bonds + Equity Monitor module.

Explicitly static, per direct instruction -- there is no real bond issuance, trading, or
payment integration anywhere in this feature, and no actual money moves. It demonstrates the
workflow (an authority-facing monitor over who is funding public infrastructure via bonds,
with identity verification and per-investment tracking) using two real seeded projects as the
funding target, with intentionally different investor compositions: one bond skewed toward
high-income investors (to genuinely trip the equity-gap flag), one broadly distributed (to
show the same check correctly NOT flagging a healthy case).
"""

from datetime import datetime, timedelta, timezone

from app.db.models import Bond, BondInvestment, Project
from app.db.session import SessionLocal

DRAIN_PROJECT_TITLE = "Velachery Stormwater Drain Desilting and Expansion"
ROAD_PROJECT_TITLE = "Velachery Junction Road Repair and Safety Signage"


def _days_ago(n: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=n)


def run() -> None:
    db = SessionLocal()
    try:
        if db.query(Bond).count() > 0:
            print("Bonds already seeded, skipping.")
            return

        drain_project = db.query(Project).filter(Project.title == DRAIN_PROJECT_TITLE).first()
        road_project = db.query(Project).filter(Project.title == ROAD_PROJECT_TITLE).first()

        drain_bond = Bond(
            project_id=drain_project.id if drain_project else None,
            title="Velachery Stormwater Drain Infrastructure Bond",
            description=(
                "Funds the desilting and expansion of the Velachery stormwater drain network. "
                "Repaid over the bond tenure from municipal drainage cess revenue."
            ),
            target_amount=drain_project.estimated_cost if drain_project else 4_375_000.0,
            interest_rate=7.5,
            tenure_years=5,
            status="open",
        )
        road_bond = Bond(
            project_id=road_project.id if road_project else None,
            title="Velachery Junction Road Safety Infrastructure Bond",
            description=(
                "Funds road repair and safety signage at the Velachery junction. Repaid over "
                "the bond tenure from municipal road maintenance cess revenue."
            ),
            target_amount=road_project.estimated_cost if road_project else 6_200_000.0,
            interest_rate=7.0,
            tenure_years=7,
            status="open",
        )
        db.add_all([drain_bond, road_bond])
        db.flush()  # assign ids

        # Drain bond: deliberately skewed toward high-income investors (~89% of raised amount)
        # so the equity-gap check has a genuine positive case to flag, not just a contrived one.
        drain_investments = [
            BondInvestment(
                bond_id=drain_bond.id, investor_name="Rajesh Kumar", income_bracket="high",
                amount=500_000, aadhaar_verified=True, verification_status="verified",
                stage="allocated", invested_at=_days_ago(20),
            ),
            BondInvestment(
                bond_id=drain_bond.id, investor_name="Priya Sharma", income_bracket="high",
                amount=300_000, aadhaar_verified=True, verification_status="verified",
                stage="allocated", invested_at=_days_ago(18),
            ),
            BondInvestment(
                bond_id=drain_bond.id, investor_name="Suresh Babu", income_bracket="high",
                amount=450_000, aadhaar_verified=True, verification_status="verified",
                stage="funds_confirmed", invested_at=_days_ago(12),
            ),
            BondInvestment(
                bond_id=drain_bond.id, investor_name="Anitha Raman", income_bracket="middle",
                amount=50_000, aadhaar_verified=True, verification_status="verified",
                stage="funds_confirmed", invested_at=_days_ago(9),
            ),
            BondInvestment(
                bond_id=drain_bond.id, investor_name="Lakshmi Devi", income_bracket="low",
                amount=5_000, aadhaar_verified=False, verification_status="pending",
                stage="invested", invested_at=_days_ago(2),
            ),
        ]

        # Road bond: broadly distributed across income brackets -- the equity check should NOT
        # flag this one, demonstrating the check discriminates real cases rather than always
        # firing.
        road_investments = [
            BondInvestment(
                bond_id=road_bond.id, investor_name="Mohammed Ali", income_bracket="middle",
                amount=100_000, aadhaar_verified=True, verification_status="verified",
                stage="project_underway", invested_at=_days_ago(30),
            ),
            BondInvestment(
                bond_id=road_bond.id, investor_name="Kavitha Reddy", income_bracket="low",
                amount=20_000, aadhaar_verified=True, verification_status="verified",
                stage="project_underway", invested_at=_days_ago(28),
            ),
            BondInvestment(
                bond_id=road_bond.id, investor_name="Arjun Nair", income_bracket="high",
                amount=150_000, aadhaar_verified=True, verification_status="verified",
                stage="allocated", invested_at=_days_ago(25),
            ),
            BondInvestment(
                bond_id=road_bond.id, investor_name="Deepa Iyer", income_bracket="middle",
                amount=80_000, aadhaar_verified=True, verification_status="verified",
                stage="allocated", invested_at=_days_ago(22),
            ),
            BondInvestment(
                bond_id=road_bond.id, investor_name="Faisal Rahman", income_bracket="low",
                amount=15_000, aadhaar_verified=True, verification_status="flagged",
                stage="identity_verified", invested_at=_days_ago(5),
            ),
        ]

        db.add_all(drain_investments + road_investments)
        db.commit()
        print(f"Seeded 2 bonds with {len(drain_investments) + len(road_investments)} investments.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
