"""Invite links. Medin is invite-only, so every new account starts from one of these."""

import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from sqlalchemy.orm import Session

from app import config, models
from app.security import hash_invite_token

INVITE_EXPIRY_DAYS = 14


def create_invite(
    db: Session,
    created_by_id: int | None = None,
    note: str | None = None,
    days: int = INVITE_EXPIRY_DAYS,
) -> tuple[models.Invite, str]:
    """Saves a new single-use invite and returns it with its link.

    Only a hash of the token is stored, so the returned link is the only copy:
    it can't be shown again later.
    """
    token = secrets.token_urlsafe(32)
    invite = models.Invite(
        token_hash=hash_invite_token(token),
        created_by_id=created_by_id,
        note=note,
        expires_at=datetime.now(timezone.utc) + timedelta(days=days),
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    url = f"{config.FRONTEND_URL}/signup?{urlencode({'invite': token})}"
    return invite, url


def find_usable_invite(db: Session, token: str, lock: bool = False) -> models.Invite | None:
    """An invite that exists, hasn't been used and hasn't expired."""
    query = db.query(models.Invite).filter(
        models.Invite.token_hash == hash_invite_token(token),
        models.Invite.used_at.is_(None),
        models.Invite.expires_at > datetime.now(timezone.utc),
    )
    if lock:
        # Locks the row until we commit, so two people can't use the same link at the same moment.
        query = query.with_for_update()
    return query.first()
