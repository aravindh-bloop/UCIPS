import json
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import OtpVerification, User
from app.db.schemas import RegisterStartRequest, RegisterStartResponse, RegisterVerifyRequest, Token, UserLogin, UserOut
from app.db.session import get_db
from app.security import create_access_token, get_current_user, hash_password, verify_password
from app.services.aadhaar import hash_aadhaar, is_valid_aadhaar, last4

router = APIRouter(prefix="/api/auth", tags=["auth"])

OTP_TTL_SECONDS = 300
OTP_MAX_ATTEMPTS = 5


@router.post("/register/start", response_model=RegisterStartResponse, status_code=status.HTTP_201_CREATED)
def register_start(payload: RegisterStartRequest, db: Session = Depends(get_db)):
    """Step 1: validate identity (Aadhaar format via the real Verhoeff checksum, phone/email
    uniqueness) and issue an OTP tied to the phone number. No user row is created yet -- the
    account only exists once the OTP is verified in step 2."""
    if payload.role not in ("citizen", "authority"):
        raise HTTPException(status_code=400, detail="role must be 'citizen' or 'authority'")

    if not is_valid_aadhaar(payload.aadhaar_number):
        raise HTTPException(status_code=400, detail="That doesn't look like a valid 12-digit Aadhaar number")

    aadhaar_hash = hash_aadhaar(payload.aadhaar_number)

    existing = db.query(User).filter(
        or_(
            User.phone == payload.phone,
            User.email == payload.email if payload.email else False,
            User.aadhaar_hash == aadhaar_hash,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account already exists for this phone, email, or Aadhaar number")

    otp = f"{secrets.randbelow(900000) + 100000}"
    pending = {
        "name": payload.name,
        "phone": payload.phone,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "preferred_language": payload.preferred_language,
        "aadhaar_hash": aadhaar_hash,
        "aadhaar_last4": last4(payload.aadhaar_number),
    }

    # Replace any earlier pending OTP for this phone rather than stacking them up.
    db.query(OtpVerification).filter(OtpVerification.phone == payload.phone).delete()
    db.add(
        OtpVerification(
            phone=payload.phone,
            otp_hash=hash_password(otp),
            payload_json=json.dumps(pending),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=OTP_TTL_SECONDS),
        )
    )
    db.commit()

    return RegisterStartResponse(
        message="OTP generated. No SMS gateway is configured, so it's returned here directly for testing.",
        expires_in_seconds=OTP_TTL_SECONDS,
        dev_otp=otp,
    )


@router.post("/register/verify", response_model=Token)
def register_verify(payload: RegisterVerifyRequest, db: Session = Depends(get_db)):
    """Step 2: check the OTP and, only now, actually create the account."""
    record = (
        db.query(OtpVerification)
        .filter(OtpVerification.phone == payload.phone)
        .order_by(OtpVerification.created_at.desc())
        .first()
    )
    if not record:
        raise HTTPException(status_code=400, detail="No pending registration for this phone number")

    if record.expires_at < datetime.now(timezone.utc):
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=400, detail="OTP has expired, please request a new one")

    if record.attempts >= OTP_MAX_ATTEMPTS:
        db.delete(record)
        db.commit()
        raise HTTPException(status_code=429, detail="Too many incorrect attempts, please request a new OTP")

    if not verify_password(payload.otp, record.otp_hash):
        record.attempts += 1
        db.commit()
        raise HTTPException(status_code=401, detail="Incorrect OTP")

    pending = json.loads(record.payload_json)
    user = User(
        name=pending["name"],
        phone=pending["phone"],
        email=pending["email"],
        password_hash=pending["password_hash"],
        role=pending["role"],
        preferred_language=pending["preferred_language"],
        aadhaar_hash=pending["aadhaar_hash"],
        aadhaar_last4=pending["aadhaar_last4"],
        phone_verified=True,
    )
    db.add(user)
    db.delete(record)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.role)
    return Token(access_token=token, user=user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(
        or_(User.phone == payload.identifier, User.email == payload.identifier)
    ).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(user.id, user.role)
    return Token(access_token=token, user=user)
