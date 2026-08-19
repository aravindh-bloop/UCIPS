from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(32), unique=True, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(16), default="citizen")  # citizen | authority
    preferred_language: Mapped[str] = mapped_column(String(8), default="en")
    aadhaar_hash: Mapped[str | None] = mapped_column(String(64), unique=True, nullable=True)
    aadhaar_last4: Mapped[str | None] = mapped_column(String(4), nullable=True)
    phone_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaints: Mapped[list["Complaint"]] = relationship(back_populates="user")


class OtpVerification(Base):
    """Pending-registration OTP state. Holds the not-yet-created account's details (as JSON)
    until the OTP is verified, so no user row exists until identity is confirmed."""

    __tablename__ = "otp_verifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    phone: Mapped[str] = mapped_column(String(32), index=True)
    otp_hash: Mapped[str] = mapped_column(String(255))
    payload_json: Mapped[str] = mapped_column(Text)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Cluster(Base):
    __tablename__ = "clusters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    centroid_lat: Mapped[float] = mapped_column(Float)
    centroid_lng: Mapped[float] = mapped_column(Float)
    category: Mapped[str] = mapped_column(String(64))
    ward_name: Mapped[str] = mapped_column(String(128), default="")
    complaint_count: Mapped[int] = mapped_column(Integer, default=0)
    demand_score: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(32), default="open")  # open | validated | actioned
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaints: Mapped[list["Complaint"]] = relationship(back_populates="cluster")
    evidence_records: Mapped[list["EvidenceRecord"]] = relationship(back_populates="cluster")
    projects: Mapped[list["Project"]] = relationship(back_populates="cluster")


class Complaint(Base):
    __tablename__ = "complaints"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    reference_code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    cluster_id: Mapped[int | None] = mapped_column(ForeignKey("clusters.id"), nullable=True)

    channel: Mapped[str] = mapped_column(String(16))  # text | voice | image | phone
    language: Mapped[str] = mapped_column(String(8), default="en")

    raw_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    audio_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    severity: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5

    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)

    status: Mapped[str] = mapped_column(String(32), default="received")
    # received | processed | clustered | in_progress | resolved

    embedding: Mapped[list[float] | None] = mapped_column(ARRAY(Float), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    user: Mapped["User | None"] = relationship(back_populates="complaints")
    cluster: Mapped["Cluster | None"] = relationship(back_populates="complaints")
    feedback: Mapped["Feedback | None"] = relationship(back_populates="complaint", uselist=False)


class EvidenceRecord(Base):
    __tablename__ = "evidence_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cluster_id: Mapped[int] = mapped_column(ForeignKey("clusters.id"))

    population_estimate: Mapped[int | None] = mapped_column(Integer, nullable=True)
    area_type: Mapped[str | None] = mapped_column(String(64), nullable=True)  # residential | commercial | mixed
    existing_infra_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    risk_flags: Mapped[str | None] = mapped_column(Text, nullable=True)  # comma-separated
    validated: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    cluster: Mapped["Cluster"] = relationship(back_populates="evidence_records")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    cluster_id: Mapped[int] = mapped_column(ForeignKey("clusters.id"))
    evidence_id: Mapped[int | None] = mapped_column(ForeignKey("evidence_records.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64))
    description: Mapped[str] = mapped_column(Text)

    estimated_cost: Mapped[float] = mapped_column(Float)
    estimated_beneficiaries: Mapped[int] = mapped_column(Integer)

    demand_score: Mapped[float] = mapped_column(Float, default=0.0)
    impact_score: Mapped[float] = mapped_column(Float, default=0.0)
    urgency_score: Mapped[float] = mapped_column(Float, default=0.0)
    feasibility_score: Mapped[float] = mapped_column(Float, default=0.0)
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(String(32), default="candidate")
    # candidate | selected | approved | rejected

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    cluster: Mapped["Cluster"] = relationship(back_populates="projects")
    budget_run_links: Mapped[list["BudgetRunProject"]] = relationship(back_populates="project")


class BudgetRun(Base):
    __tablename__ = "budget_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    authority_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    total_budget: Mapped[float] = mapped_column(Float)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    total_expected_impact: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(32), default="draft")  # draft | approved

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    project_links: Mapped[list["BudgetRunProject"]] = relationship(back_populates="budget_run")


class BudgetRunProject(Base):
    __tablename__ = "budget_run_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    budget_run_id: Mapped[int] = mapped_column(ForeignKey("budget_runs.id"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"))
    included: Mapped[bool] = mapped_column(Boolean, default=False)

    budget_run: Mapped["BudgetRun"] = relationship(back_populates="project_links")
    project: Mapped["Project"] = relationship(back_populates="budget_run_links")


class Feedback(Base):
    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    complaint_id: Mapped[int] = mapped_column(ForeignKey("complaints.id"), unique=True)
    rating: Mapped[int] = mapped_column(Integer)  # 1-5
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    complaint: Mapped["Complaint"] = relationship(back_populates="feedback")
