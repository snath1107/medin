from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, cursor_page
from app.post_helpers import (
    extract_first_image,
    extract_preview_text,
    get_visible_post_or_404,
    is_empty_document,
    normalize_tags,
    posts_query,
    published,
    serialize_posts,
    visible_to,
)

router = APIRouter(prefix="/posts", tags=["Posts"])


def get_own_post_or_404(db: Session, post_id: int, user: models.User) -> models.Post:
    post = db.get(models.Post, post_id)
    if not post or post.author_id != user.id:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


@router.get("", response_model=schemas.PostPage)
def get_feed(
    before_id: int | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = posts_query(db).filter(visible_to(user.id), published())
    posts, next_cursor = cursor_page(query, models.Post.id, before_id, limit)
    return {"items": serialize_posts(db, posts, user.id), "next_cursor": next_cursor}


@router.get("/top", response_model=list[schemas.PostOut])
def top_posts(
    limit: int = Query(5, ge=1, le=10),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The most-liked public posts from the last 7 days."""
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)

    # Count likes per post in a subquery, then join it to the posts and sort by it.
    like_counts = (
        select(models.Like.post_id, func.count().label("likes"))
        .group_by(models.Like.post_id)
        .subquery()
    )
    posts = (
        posts_query(db)
        .join(like_counts, like_counts.c.post_id == models.Post.id)
        .filter(models.Post.visibility == "public", models.Post.created_at >= week_ago)
        .order_by(like_counts.c.likes.desc(), models.Post.id.desc())
        .limit(limit)
        .all()
    )
    return serialize_posts(db, posts, user.id)


@router.post("", response_model=schemas.PostOut, status_code=status.HTTP_201_CREATED)
def create_post(
    data: schemas.PostCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not data.title.strip() and is_empty_document(data.content):
        raise HTTPException(status_code=400, detail="A post needs a title or some content")

    post = models.Post(
        author_id=user.id,
        title=data.title.strip(),
        content=data.content,
        preview_text=extract_preview_text(data.content),
        first_image=extract_first_image(data.content),
        tags=normalize_tags(data.tags),
        visibility=data.visibility,
        is_anonymous=data.is_anonymous,
    )
    db.add(post)
    db.commit()
    db.refresh(post)

    return serialize_posts(db, [post], user.id)[0]


@router.get("/{post_id}", response_model=schemas.PostOut)
def get_post(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = get_visible_post_or_404(db, post_id, user.id)
    return serialize_posts(db, [post], user.id)[0]


@router.patch("/{post_id}", response_model=schemas.PostOut)
def update_post(
    post_id: int,
    data: schemas.PostUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = get_own_post_or_404(db, post_id, user)
    changes = data.model_dump(exclude_unset=True, exclude_none=True)

    if "title" in changes:
        post.title = changes["title"].strip()
    if "content" in changes:
        post.content = changes["content"]
        post.preview_text = extract_preview_text(post.content)
        post.first_image = extract_first_image(post.content)
    if "tags" in changes:
        post.tags = normalize_tags(changes["tags"])
    if "visibility" in changes:
        post.visibility = changes["visibility"]
    if "is_anonymous" in changes:
        post.is_anonymous = changes["is_anonymous"]

    if not post.title and is_empty_document(post.content):
        raise HTTPException(status_code=400, detail="A post needs a title or some content")

    db.commit()
    db.refresh(post)
    return serialize_posts(db, [post], user.id)[0]


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = get_own_post_or_404(db, post_id, user)
    # Likes, comments and reposts are removed by the database (ON DELETE CASCADE).
    db.delete(post)
    db.commit()


# ---------- Likes ----------
#
# Like = POST, unlike = DELETE. Both are idempotent: sending the same request twice
# leaves the same result, so a double click can't accidentally undo a like.


def count_rows(db: Session, model, post_id: int) -> int:
    return db.query(model).filter(model.post_id == post_id).count()


@router.post("/{post_id}/like", response_model=schemas.LikeStatus)
def like_post(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_visible_post_or_404(db, post_id, user.id)

    # INSERT ... ON CONFLICT DO NOTHING: liking twice is simply a no-op.
    db.execute(
        insert(models.Like).values(user_id=user.id, post_id=post_id).on_conflict_do_nothing()
    )
    db.commit()
    return {"liked": True, "like_count": count_rows(db, models.Like, post_id)}


@router.delete("/{post_id}/like", response_model=schemas.LikeStatus)
def unlike_post(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_visible_post_or_404(db, post_id, user.id)

    db.query(models.Like).filter(
        models.Like.user_id == user.id, models.Like.post_id == post_id
    ).delete()
    db.commit()
    return {"liked": False, "like_count": count_rows(db, models.Like, post_id)}


# ---------- Reposts ----------


@router.post("/{post_id}/repost", response_model=schemas.RepostStatus)
def repost(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = get_visible_post_or_404(db, post_id, user.id)

    if post.author_id == user.id:
        raise HTTPException(status_code=400, detail="You can't repost your own post")
    if post.is_anonymous:
        raise HTTPException(status_code=400, detail="Anonymous posts can't be reposted")
    if post.visibility != "public":
        raise HTTPException(status_code=400, detail="Only public posts can be reposted")

    db.execute(
        insert(models.Repost).values(user_id=user.id, post_id=post_id).on_conflict_do_nothing()
    )
    db.commit()
    return {"reposted": True, "repost_count": count_rows(db, models.Repost, post_id)}


@router.delete("/{post_id}/repost", response_model=schemas.RepostStatus)
def undo_repost(
    post_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_visible_post_or_404(db, post_id, user.id)

    db.query(models.Repost).filter(
        models.Repost.user_id == user.id, models.Repost.post_id == post_id
    ).delete()
    db.commit()
    return {"reposted": False, "repost_count": count_rows(db, models.Repost, post_id)}
