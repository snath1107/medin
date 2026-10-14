"""Endpoints for editing your own profile. Viewing profiles lives in users.py."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app import models, schemas
from app.database import get_db
from app.dependencies import get_current_user
from app.uploads import upload_image

router = APIRouter(prefix="/profile", tags=["Profile"])

REQUIRED_FIELDS = {"first_name", "last_name", "specialization", "experience_years"}


@router.patch("", response_model=schemas.Me)
def update_profile(
    data: schemas.ProfileUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    changes = data.model_dump(exclude_unset=True)

    for field, value in changes.items():
        if isinstance(value, str):
            value = value.strip() or None  # treat "   " the same as empty
        if value is None and field in REQUIRED_FIELDS:
            raise HTTPException(status_code=400, detail=f"{field} can't be empty")
        setattr(user, field, value)

    db.commit()
    db.refresh(user)
    return user


@router.put("/avatar", response_model=schemas.AvatarResponse)
def update_avatar(
    file: UploadFile = File(...),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.avatar_url = upload_image(file, folder="medin/avatars")
    db.commit()
    return {"avatar_url": user.avatar_url}


@router.delete("/avatar", response_model=schemas.AvatarResponse)
def remove_avatar(
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user.avatar_url = None
    db.commit()
    return {"avatar_url": None}


# ---------- Experience, education and publications ----------
# The three sections work the same way, so they share these helpers.


def add_item(db: Session, model, user: models.User, data):
    item = model(user_id=user.id, **data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_own_item_or_404(db: Session, model, item_id: int, user: models.User):
    # Filtering by user_id too means you can never edit someone else's entry.
    item = db.query(model).filter(model.id == item_id, model.user_id == user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Not found")
    return item


def update_item(db: Session, model, item_id: int, user: models.User, data):
    item = get_own_item_or_404(db, model, item_id, user)
    for field, value in data.model_dump().items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, model, item_id: int, user: models.User):
    db.delete(get_own_item_or_404(db, model, item_id, user))
    db.commit()


@router.post("/experiences", response_model=schemas.ExperienceOut, status_code=201)
def add_experience(data: schemas.ExperienceIn, user=Depends(get_current_user), db=Depends(get_db)):
    return add_item(db, models.Experience, user, data)


@router.put("/experiences/{item_id}", response_model=schemas.ExperienceOut)
def update_experience(
    item_id: int, data: schemas.ExperienceIn, user=Depends(get_current_user), db=Depends(get_db)
):
    return update_item(db, models.Experience, item_id, user, data)


@router.delete("/experiences/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_experience(item_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    delete_item(db, models.Experience, item_id, user)


@router.post("/educations", response_model=schemas.EducationOut, status_code=201)
def add_education(data: schemas.EducationIn, user=Depends(get_current_user), db=Depends(get_db)):
    return add_item(db, models.Education, user, data)


@router.put("/educations/{item_id}", response_model=schemas.EducationOut)
def update_education(
    item_id: int, data: schemas.EducationIn, user=Depends(get_current_user), db=Depends(get_db)
):
    return update_item(db, models.Education, item_id, user, data)


@router.delete("/educations/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_education(item_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    delete_item(db, models.Education, item_id, user)


@router.post("/publications", response_model=schemas.PublicationOut, status_code=201)
def add_publication(data: schemas.PublicationIn, user=Depends(get_current_user), db=Depends(get_db)):
    return add_item(db, models.Publication, user, data)


@router.put("/publications/{item_id}", response_model=schemas.PublicationOut)
def update_publication(
    item_id: int, data: schemas.PublicationIn, user=Depends(get_current_user), db=Depends(get_db)
):
    return update_item(db, models.Publication, item_id, user, data)


@router.delete("/publications/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_publication(item_id: int, user=Depends(get_current_user), db=Depends(get_db)):
    delete_item(db, models.Publication, item_id, user)
