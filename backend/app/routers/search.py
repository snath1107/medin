from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.post_helpers import posts_query, published, serialize_posts, serialize_users, visible_to

router = APIRouter(prefix="/search", tags=["Search"])


def escape_like(text: str) -> str:
    """Makes % and _ in the user's text match literally instead of acting as wildcards."""
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("", response_model=schemas.SearchResults)
def search(
    q: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(5, ge=1, le=20),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = q.strip()
    pattern = f"%{escape_like(query)}%"
    full_name = func.concat(models.User.first_name, " ", models.User.last_name)

    users = (
        db.query(models.User)
        .filter(
            or_(
                full_name.ilike(pattern),
                models.User.specialization.ilike(pattern),
                models.User.hospital.ilike(pattern),
                models.User.city.ilike(pattern),
            )
        )
        # People whose name matches come before people whose hospital/city matches.
        .order_by(full_name.ilike(pattern).desc(), models.User.created_at.desc())
        .limit(limit)
        .all()
    )

    author_name_matches = (
        db.query(models.User.id).filter(full_name.ilike(pattern)).scalar_subquery()
    )
    posts = (
        posts_query(db)
        .filter(visible_to(user.id), published())
        .filter(
            or_(
                models.Post.title.ilike(pattern),
                models.Post.preview_text.ilike(pattern),
                func.array_to_string(models.Post.tags, " ").ilike(pattern),
                # Matching by author name must skip anonymous posts, or searching
                # someone's name would reveal which anonymous posts are theirs.
                (models.Post.author_id.in_(author_name_matches) & models.Post.is_anonymous.is_(False)),
            )
        )
        .order_by(models.Post.id.desc())
        .limit(limit)
        .all()
    )

    return {
        "query": query,
        "users": serialize_users(db, users, user.id),
        "posts": serialize_posts(db, posts, user.id),
    }
