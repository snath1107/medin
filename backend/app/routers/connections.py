from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.post_helpers import serialize_users

router = APIRouter(prefix="/connections", tags=["Connections"])

LIST_LIMIT = 100


@router.get("/followers", response_model=list[schemas.UserCard])
def my_followers(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    followers = (
        db.query(models.User)
        .join(models.Follow, models.Follow.follower_id == models.User.id)
        .filter(models.Follow.following_id == user.id)
        .order_by(models.Follow.created_at.desc())
        .limit(LIST_LIMIT)
        .all()
    )
    return serialize_users(db, followers, user.id)


@router.get("/following", response_model=list[schemas.UserCard])
def my_following(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    following = (
        db.query(models.User)
        .join(models.Follow, models.Follow.following_id == models.User.id)
        .filter(models.Follow.follower_id == user.id)
        .order_by(models.Follow.created_at.desc())
        .limit(LIST_LIMIT)
        .all()
    )
    return serialize_users(db, following, user.id)


@router.get("/suggestions", response_model=schemas.Suggestions)
def suggestions(
    limit: int = Query(6, ge=1, le=20),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Doctors you don't follow yet: first from your hospital, then your specialization."""
    already_following = select(models.Follow.following_id).where(models.Follow.follower_id == user.id)

    def candidates(*conditions, exclude_ids=()):
        return (
            db.query(models.User)
            .filter(
                *conditions,
                models.User.id != user.id,
                models.User.id.not_in(already_following),
                models.User.id.not_in(exclude_ids),
            )
            .order_by(models.User.created_at.desc())
            .limit(limit)
            .all()
        )

    same_hospital = candidates(models.User.hospital == user.hospital) if user.hospital else []
    same_specialization = candidates(
        models.User.specialization == user.specialization,
        # Don't show the same person in both lists.
        exclude_ids=[u.id for u in same_hospital],
    )

    return {
        "same_hospital": serialize_users(db, same_hospital, user.id),
        "same_specialization": serialize_users(db, same_specialization, user.id),
    }
