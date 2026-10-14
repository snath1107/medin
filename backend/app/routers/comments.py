from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, cursor_page
from app.post_helpers import get_visible_post_or_404, is_empty_document

router = APIRouter(tags=["Comments"])


def serialize_comment(comment: models.Comment, viewer_id: int) -> schemas.CommentOut:
    return schemas.CommentOut(
        id=comment.id,
        post_id=comment.post_id,
        content=comment.content,
        created_at=comment.created_at,
        author=schemas.UserBrief.model_validate(comment.author),
        is_mine=comment.author_id == viewer_id,
    )


def get_own_comment_or_404(db: Session, comment_id: int, user: models.User) -> models.Comment:
    comment = db.get(models.Comment, comment_id)
    if not comment or comment.author_id != user.id:
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment


def require_text(content: dict):
    if is_empty_document(content):
        raise HTTPException(status_code=400, detail="Comment can't be empty")


@router.get("/posts/{post_id}/comments", response_model=schemas.CommentPage)
def list_comments(
    post_id: int,
    before_id: int | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # You can only read comments on a post you're allowed to see.
    get_visible_post_or_404(db, post_id, user.id)

    query = (
        db.query(models.Comment)
        .options(joinedload(models.Comment.author))
        .filter(models.Comment.post_id == post_id)
    )
    comments, next_cursor = cursor_page(query, models.Comment.id, before_id, limit)

    return {
        "items": [serialize_comment(comment, user.id) for comment in comments],
        "next_cursor": next_cursor,
    }


@router.post(
    "/posts/{post_id}/comments",
    response_model=schemas.CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    post_id: int,
    data: schemas.CommentIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_visible_post_or_404(db, post_id, user.id)
    require_text(data.content)

    comment = models.Comment(post_id=post_id, author_id=user.id, content=data.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return serialize_comment(comment, user.id)


@router.patch("/comments/{comment_id}", response_model=schemas.CommentOut)
def update_comment(
    comment_id: int,
    data: schemas.CommentIn,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = get_own_comment_or_404(db, comment_id, user)
    require_text(data.content)

    comment.content = data.content
    db.commit()
    db.refresh(comment)
    return serialize_comment(comment, user.id)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    comment = get_own_comment_or_404(db, comment_id, user)
    db.delete(comment)
    db.commit()
