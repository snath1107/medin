"""Password hashing and login tokens (JWT)."""

import hashlib
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.config import ACCESS_TOKEN_EXPIRE_DAYS, SECRET_KEY

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_COOKIE = "access_token"


def hash_password(password: str) -> str:
    # bcrypt adds a random salt and is deliberately slow, which makes
    # brute-forcing leaked hashes expensive.
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


# Compared against when the email doesn't exist, so a failed login takes about
# the same time either way and doesn't reveal which emails are registered.
DUMMY_PASSWORD_HASH = hash_password("not-a-real-password")


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> int | None:
    """Returns the user id, or None if the token is invalid or expired."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[JWT_ALGORITHM])
        return int(payload["sub"])
    except (jwt.InvalidTokenError, KeyError, ValueError):
        return None


def hash_invite_token(token: str) -> str:
    # Invite tokens are long random strings, so a fast hash (SHA-256) is enough here.
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
