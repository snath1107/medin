from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app import config, models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.invites import find_usable_invite
from app.security import (
    ACCESS_TOKEN_COOKIE,
    DUMMY_PASSWORD_HASH,
    create_access_token,
    hash_password,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["Auth"])

INVALID_INVITE = "This invite link is invalid, expired, or has already been used."


def set_login_cookie(response: Response, user_id: int):
    response.set_cookie(
        key=ACCESS_TOKEN_COOKIE,
        value=create_access_token(user_id),
        max_age=config.ACCESS_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,  # JavaScript can't read it, so an XSS bug can't steal the token
        samesite="lax",  # not sent on cross-site form posts, which blocks CSRF
        secure=config.COOKIE_SECURE,  # HTTPS only in production
        path="/",
    )


def clean(value: str | None) -> str | None:
    """Trims whitespace and turns empty strings into None."""
    if value is None:
        return None
    value = value.strip()
    return value or None


@router.get("/invites/{token}", response_model=schemas.InviteStatus)
def check_invite(token: str, db: Session = Depends(get_db)):
    """Lets the sign-up page check a link before showing the form, and say who sent it."""
    invite = find_usable_invite(db, token)
    if not invite:
        return {"valid": False}
    return {"valid": True, "inviter": invite.created_by, "expires_at": invite.expires_at}


@router.post("/signup", response_model=schemas.Me, status_code=status.HTTP_201_CREATED)
def signup(data: schemas.SignupRequest, response: Response, db: Session = Depends(get_db)):
    email = data.email.lower()

    if db.query(models.User).filter(models.User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    # Medin is invite-only: every signup needs an unused, unexpired invite link.
    invite = find_usable_invite(db, data.invite_token, lock=True) if data.invite_token else None
    if not invite:
        raise HTTPException(status_code=403, detail=INVALID_INVITE)

    user = models.User(
        email=email,
        password_hash=hash_password(data.password),
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        specialization=data.specialization.strip(),
        experience_years=data.experience_years,
        hospital=clean(data.hospital),
        city=clean(data.city),
        state=clean(data.state),
        doctor_id=clean(data.doctor_id),
    )
    db.add(user)

    try:
        db.flush()  # sends the INSERT so user.id is available, without committing yet
    except IntegrityError:
        # Two signups with the same email at the same moment: the unique index catches it.
        db.rollback()
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    invite.used_by_id = user.id
    invite.used_at = datetime.now(timezone.utc)

    # Creating the user and using up the invite happen in one transaction: both or neither.
    db.commit()
    db.refresh(user)

    set_login_cookie(response, user.id)
    return user


@router.post("/login", response_model=schemas.Me)
def login(data: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == data.email.lower()).first()

    # Always run a bcrypt check, even for unknown emails, so response time doesn't
    # reveal which emails have accounts. The error message is the same either way.
    password_ok = verify_password(data.password, user.password_hash if user else DUMMY_PASSWORD_HASH)
    if not user or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    set_login_cookie(response, user.id)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(response: Response):
    response.delete_cookie(ACCESS_TOKEN_COOKIE, path="/")


@router.get("/me", response_model=schemas.Me)
def me(user: models.User = Depends(get_current_user)):
    return user
