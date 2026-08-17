from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db.models import User
from app.db.schemas import Token, UserLogin, UserOut, UserRegister
from app.db.session import get_db
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, db: Session = Depends(get_db)):
    if not payload.phone and not payload.email:
        raise HTTPException(status_code=400, detail="Provide at least a phone or an email")

    if payload.role not in ("citizen", "authority"):
        raise HTTPException(status_code=400, detail="role must be 'citizen' or 'authority'")

    existing = db.query(User).filter(
        or_(
            User.phone == payload.phone if payload.phone else False,
            User.email == payload.email if payload.email else False,
        )
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="A user with this phone or email already exists")

    user = User(
        name=payload.name,
        phone=payload.phone,
        email=payload.email,
        password_hash=hash_password(payload.password),
        role=payload.role,
        preferred_language=payload.preferred_language,
    )
    db.add(user)
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
