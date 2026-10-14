from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.pagination import DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, cursor_page
from app.post_helpers import posts_query, published, serialize_posts, visible_to

router = APIRouter(prefix="/users", tags=["Users"])


def get_user_or_404(db: Session, user_id: int) -> models.User:
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


def is_following(db: Session, follower_id: int, following_id: int) -> bool:
    return (
        db.query(models.Follow)
        .filter(
            models.Follow.follower_id == follower_id,
            models.Follow.following_id == following_id,
        )
        .first()
        is not None
    )


def profile_posts_query(db: Session, profile_id: int, viewer_id: int):
    """A user's posts as the viewer is allowed to see them. Anonymous posts never
    appear on a profile, otherwise they wouldn't be anonymous."""
    return posts_query(db).filter(
        models.Post.author_id == profile_id,
        models.Post.is_anonymous.is_(False),
        visible_to(viewer_id),
    )


@router.get("/{user_id}", response_model=schemas.Profile)
def get_profile(
    user_id: int,
    viewer: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = get_user_or_404(db, user_id)
    is_me = user.id == viewer.id

    def rows_for(model, *order_by):
        return db.query(model).filter(model.user_id == user_id).order_by(*order_by).all()

    return schemas.Profile(
        **schemas.UserCard.model_validate(user).model_dump(exclude={"is_following"}),
        first_name=user.first_name,
        last_name=user.last_name,
        headline=user.headline,
        state=user.state,
        about=user.about,
        is_me=is_me,
        is_following=is_following(db, viewer.id, user.id),
        stats=schemas.ProfileStats(
            posts=profile_posts_query(db, user_id, viewer.id).filter(published()).count(),
            followers=db.query(models.Follow).filter(models.Follow.following_id == user_id).count(),
            following=db.query(models.Follow).filter(models.Follow.follower_id == user_id).count(),
            drafts=(
                db.query(models.Post)
                .filter(models.Post.author_id == user_id, models.Post.visibility == "private")
                .count()
                if is_me
                else None
            ),
        ),
        experiences=rows_for(models.Experience, models.Experience.start_date.desc()),
        educations=rows_for(models.Education, models.Education.start_year.desc()),
        publications=rows_for(models.Publication, models.Publication.year.desc().nulls_last()),
    )


@router.get("/{user_id}/posts", response_model=schemas.PostPage)
def get_user_posts(
    user_id: int,
    before_id: int | None = None,
    limit: int = Query(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE),
    visibility: schemas.Visibility | None = None,
    viewer: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_user_or_404(db, user_id)
    query = profile_posts_query(db, user_id, viewer.id)
    if visibility:
        # e.g. ?visibility=private lists your drafts
        query = query.filter(models.Post.visibility == visibility)
    else:
        query = query.filter(published())
    posts, next_cursor = cursor_page(query, models.Post.id, before_id, limit)
    return {"items": serialize_posts(db, posts, viewer.id), "next_cursor": next_cursor}


@router.post("/{user_id}/follow", response_model=schemas.FollowStatus)
def follow(
    user_id: int,
    viewer: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_id == viewer.id:
        raise HTTPException(status_code=400, detail="You can't follow yourself")
    get_user_or_404(db, user_id)

    db.execute(
        insert(models.Follow)
        .values(follower_id=viewer.id, following_id=user_id)
        .on_conflict_do_nothing()
    )
    db.commit()
    return {"following": True}


@router.delete("/{user_id}/follow", response_model=schemas.FollowStatus)
def unfollow(
    user_id: int,
    viewer: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(models.Follow).filter(
        models.Follow.follower_id == viewer.id,
        models.Follow.following_id == user_id,
    ).delete()
    db.commit()
    return {"following": False}
