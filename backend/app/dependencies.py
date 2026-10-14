from fastapi import Cookie, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.security import ACCESS_TOKEN_COOKIE, decode_access_token


def get_current_user(
    access_token: str | None = Cookie(default=None, alias=ACCESS_TOKEN_COOKIE),
    db: Session = Depends(get_db),
) -> models.User:
    """FastAPI dependency for protected endpoints: returns the logged-in user or responds 401."""
    user_id = decode_access_token(access_token) if access_token else None
    user = db.get(models.User, user_id) if user_id else None

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not logged in")

    return user
