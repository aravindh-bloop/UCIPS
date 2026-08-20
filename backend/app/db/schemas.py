from datetime import datetime

from pydantic import BaseModel, ConfigDict


class RegisterStartRequest(BaseModel):
    name: str
    phone: str
    email: str | None = None
    password: str
    role: str = "citizen"  # citizen | authority
    preferred_language: str = "en"
    aadhaar_number: str


class RegisterStartResponse(BaseModel):
    message: str
    expires_in_seconds: int
    # Only populated because no SMS gateway is wired up yet (Twilio deferred) -- there is no
    # real delivery channel, so the OTP is returned directly instead of silently going nowhere.
    dev_otp: str | None = None


class RegisterVerifyRequest(BaseModel):
    phone: str
    otp: str


class UserLogin(BaseModel):
    identifier: str  # phone or email
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    phone: str | None
    email: str | None
    role: str
    preferred_language: str
    aadhaar_last4: str | None
    phone_verified: bool
    created_at: datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ComplaintCreate(BaseModel):
    text: str
    lat: float
    lng: float
    language: str = "en"


class ComplaintOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference_code: str
    channel: str
    language: str
    raw_text: str | None
    transcript: str | None
    image_url: str | None
    audio_url: str | None
    category: str | None
    description: str | None
    severity: int | None
    lat: float
    lng: float
    status: str
    created_at: datetime
    follow_up_question: str | None = None


class FollowUpAnswer(BaseModel):
    question: str
    answer: str


class ProgressStage(BaseModel):
    key: str
    label: str
    state: str  # done | current | pending
    detail: str | None = None
    at: datetime | None = None


class ComplaintProgressOut(BaseModel):
    complaint_id: int
    reference_code: str
    stages: list[ProgressStage]


class ClusterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    centroid_lat: float
    centroid_lng: float
    category: str
    ward_name: str
    complaint_count: int
    demand_score: float
    status: str
    created_at: datetime


class ProjectOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    cluster_id: int
    evidence_id: int | None
    title: str
    category: str
    description: str
    estimated_cost: float
    estimated_beneficiaries: int
    demand_score: float
    impact_score: float
    urgency_score: float
    feasibility_score: float
    priority_score: float
    explanation: str | None
    status: str
    created_at: datetime


class FeedbackCreate(BaseModel):
    rating: int
    comment: str | None = None


class FeedbackOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    complaint_id: int
    rating: int
    comment: str | None
    created_at: datetime


class BudgetOptimizeRequest(BaseModel):
    budget: float


class BudgetRunOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    total_budget: float
    total_cost: float
    total_expected_impact: float
    status: str
    created_at: datetime
    selected: list[ProjectOut] = []
    excluded: list[ProjectOut] = []


# ---- My Finance module ----


class SchemeDiscoverRequest(BaseModel):
    profession: str
    state: str
    age: int | None = None
    notes: str | None = None


class SchemeSource(BaseModel):
    title: str
    uri: str


class SchemeItem(BaseModel):
    name: str
    provider: str
    eligibility: str
    benefit: str
    how_to_apply: str


class SchemeDiscoverResponse(BaseModel):
    query_id: int
    schemes: list[SchemeItem]
    sources: list[SchemeSource]
    cached: bool
    grounded: bool


class SchemeGrievanceCreate(BaseModel):
    scheme_name: str
    text: str


class SchemeGrievanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scheme_name: str
    raw_text: str
    failure_description: str | None
    follow_up_question: str | None
    status: str
    created_at: datetime


class SchemeGrievanceFollowUp(BaseModel):
    question: str
    answer: str


class SchemeGrievanceClusterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    scheme_name: str
    failure_signature: str
    member_count: int
    escalation_summary: str | None
    created_at: datetime


# ---- Infrastructure Bonds + Equity Monitor (static demo data) ----


class BondInvestmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    investor_name: str
    income_bracket: str
    amount: float
    aadhaar_verified: bool
    verification_status: str
    stage: str
    invested_at: datetime
    tracker: list[ProgressStage] = []


class EquityBreakdownOut(BaseModel):
    low_amount: float
    middle_amount: float
    high_amount: float
    low_count: int
    middle_count: int
    high_count: int
    equity_gap_flagged: bool
    equity_gap_reason: str | None


class BondOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int | None
    project_title: str | None = None
    title: str
    description: str
    target_amount: float
    raised_amount: float
    interest_rate: float
    tenure_years: int
    status: str
    investor_count: int
    created_at: datetime


class BondDetailOut(BondOut):
    investments: list[BondInvestmentOut]
    equity: EquityBreakdownOut
