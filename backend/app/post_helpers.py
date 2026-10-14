"""Post logic shared by the feed, profiles and search."""

import re

from fastapi import HTTPException
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload

from app import models, schemas

# ---------- Building posts from editor content ----------


def extract_preview_text(content: dict, limit: int = 180) -> str:
    parts: list[str] = []

    def walk(node: dict):
        if node.get("type") == "text":
            parts.append(node.get("text", ""))
        for child in node.get("content") or []:
            walk(child)

    walk(content)
    text = re.sub(r"\s+", " ", " ".join(parts)).strip()
    if len(text) <= limit:
        return text
    # Cut at the last whole word so previews never end mid-word.
    return text[:limit].rsplit(" ", 1)[0]


def extract_first_image(content: dict) -> str | None:
    def walk(node: dict):
        if node.get("type") == "image":
            return (node.get("attrs") or {}).get("src")
        for child in node.get("content") or []:
            found = walk(child)
            if found:
                return found
        return None

    return walk(content)


def normalize_tags(tags: list[str]) -> list[str]:
    """Lowercase, trim, collapse spaces, drop empties and duplicates (keeping order)."""
    result: list[str] = []
    for tag in tags:
        cleaned = re.sub(r"\s+", " ", tag.strip().lower())[:30]
        if cleaned and cleaned not in result:
            result.append(cleaned)
    return result


def is_empty_document(content: dict) -> bool:
    return not extract_preview_text(content) and not extract_first_image(content)


# ---------- Who can see what ----------
#
#   public       -> every logged-in user
#   connections  -> the author and the author's followers
#   private      -> only the author (a draft)
#
# Every endpoint that returns posts uses these two functions, so the rule lives in one place.


def visible_to(viewer_id: int):
    """SQL condition: posts the viewer is allowed to see."""
    followed_authors = select(models.Follow.following_id).where(
        models.Follow.follower_id == viewer_id
    )
    return or_(
        models.Post.visibility == "public",
        models.Post.author_id == viewer_id,
        and_(
            models.Post.visibility == "connections",
            models.Post.author_id.in_(followed_authors),
        ),
    )


def published():
    """SQL condition: not a private draft. Drafts only show up on your own Drafts tab."""
    return models.Post.visibility != "private"


def get_visible_post_or_404(db: Session, post_id: int, viewer_id: int) -> models.Post:
    # A post you can't see gets the same 404 as one that doesn't exist,
    # so private posts can't be discovered by guessing ids.
    post = (
        db.query(models.Post)
        .filter(models.Post.id == post_id, visible_to(viewer_id))
        .first()
    )
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return post


def posts_query(db: Session):
    """Base query for posts, loading each author in the same SQL query (a JOIN)."""
    return db.query(models.Post).options(joinedload(models.Post.author))


# ---------- Turning posts into API responses ----------


def serialize_posts(db: Session, posts: list[models.Post], viewer_id: int) -> list[schemas.PostOut]:
    """Adds counts and "did I like / repost / follow" flags to a page of posts.

    This runs a fixed number of queries (one per table below) no matter how many
    posts are on the page. Doing a query per post instead would be the classic
    "N+1 query" problem.
    """
    if not posts:
        return []

    post_ids = [post.id for post in posts]

    def counts_and_mine(model):
        rows = (
            db.query(
                model.post_id,
                func.count(),
                func.bool_or(model.user_id == viewer_id),
            )
            .filter(model.post_id.in_(post_ids))
            .group_by(model.post_id)
            .all()
        )
        return {post_id: (count, mine) for post_id, count, mine in rows}

    likes = counts_and_mine(models.Like)
    reposts = counts_and_mine(models.Repost)

    comment_counts = dict(
        db.query(models.Comment.post_id, func.count())
        .filter(models.Comment.post_id.in_(post_ids))
        .group_by(models.Comment.post_id)
        .all()
    )

    author_ids = {post.author_id for post in posts}
    followed_author_ids = {
        row[0]
        for row in db.query(models.Follow.following_id).filter(
            models.Follow.follower_id == viewer_id,
            models.Follow.following_id.in_(author_ids),
        )
    }

    result = []
    for post in posts:
        like_count, liked = likes.get(post.id, (0, False))
        repost_count, reposted = reposts.get(post.id, (0, False))

        result.append(
            schemas.PostOut(
                id=post.id,
                title=post.title,
                content=post.content,
                preview_text=post.preview_text,
                first_image=post.first_image,
                tags=post.tags or [],
                visibility=post.visibility,
                is_anonymous=post.is_anonymous,
                created_at=post.created_at,
                author=None if post.is_anonymous else schemas.UserBrief.model_validate(post.author),
                is_mine=post.author_id == viewer_id,
                is_following_author=(
                    not post.is_anonymous and post.author_id in followed_author_ids
                ),
                like_count=like_count,
                comment_count=comment_counts.get(post.id, 0),
                repost_count=repost_count,
                is_liked=liked,
                is_reposted=reposted,
            )
        )

    return result


def serialize_users(db: Session, users: list[models.User], viewer_id: int) -> list[schemas.UserCard]:
    """User cards with "do I follow them" filled in using a single query."""
    if not users:
        return []

    followed_ids = {
        row[0]
        for row in db.query(models.Follow.following_id).filter(
            models.Follow.follower_id == viewer_id,
            models.Follow.following_id.in_([user.id for user in users]),
        )
    }

    return [
        schemas.UserCard.model_validate(user).model_copy(
            update={"is_following": user.id in followed_ids}
        )
        for user in users
    ]
