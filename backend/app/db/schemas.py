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
