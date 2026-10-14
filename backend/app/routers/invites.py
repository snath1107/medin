from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.invites import create_invite

router = APIRouter(prefix="/invites", tags=["Invites"])


@router.post("", response_model=schemas.InviteCreated, status_code=status.HTTP_201_CREATED)
def invite_colleague(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Members invite colleagues by sharing a single-use link."""
    invite, url = create_invite(db, created_by_id=user.id)
    return {"invite_url": url, "expires_at": invite.expires_at}


@router.get("", response_model=list[schemas.InviteOut])
def my_invites(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(models.Invite)
        .options(joinedload(models.Invite.used_by))
        .filter(models.Invite.created_by_id == user.id)
        .order_by(models.Invite.id.desc())
        .limit(20)
        .all()
    )
