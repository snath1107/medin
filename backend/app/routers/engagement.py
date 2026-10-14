"""Occasional "share something" nudges shown on the feed."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user

router = APIRouter(prefix="/engagement", tags=["Engagement"])

MAX_SHOWS_PER_DAY = 2
# After someone dismisses a prompt or posts from one, leave them alone for a while.
COOLDOWN = timedelta(hours=12)
COOLDOWN_EVENTS = {"dismissed", "posted"}


@router.get("/prompts/next", response_model=schemas.EngagementPromptOut | None)
def next_prompt(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)

    events = db.query(models.PromptEvent).filter(models.PromptEvent.user_id == user.id)

    shown_today = events.filter(
        models.PromptEvent.event_type == "shown",
        models.PromptEvent.created_at >= start_of_day,
    ).count()
    if shown_today >= MAX_SHOWS_PER_DAY:
        return None

    latest = events.order_by(models.PromptEvent.created_at.desc()).first()
    if latest and latest.event_type in COOLDOWN_EVENTS and latest.created_at > now - COOLDOWN:
        return None

    # Rotate through the two newest prompts so the same one doesn't repeat back to back.
    prompts = (
        db.query(models.EngagementPrompt)
        .filter(models.EngagementPrompt.is_active.is_(True))
        .order_by(models.EngagementPrompt.created_at.desc())
        .limit(2)
        .all()
    )
    if not prompts:
        return None
    if latest and latest.prompt_id == prompts[0].id and len(prompts) > 1:
        return prompts[1]
    return prompts[0]


@router.post("/prompts/{prompt_id}/events", status_code=status.HTTP_204_NO_CONTENT)
def record_event(
    prompt_id: int,
    data: schemas.PromptEventIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not db.get(models.EngagementPrompt, prompt_id):
        raise HTTPException(status_code=404, detail="Prompt not found")

    db.add(models.PromptEvent(prompt_id=prompt_id, user_id=user.id, event_type=data.event_type))
    db.commit()
