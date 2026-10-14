from fastapi import APIRouter, Depends, File, UploadFile

from app import models, schemas
from app.dependencies import get_current_user
from app.uploads import upload_image

router = APIRouter(prefix="/uploads", tags=["Uploads"])


@router.post("/image", response_model=schemas.UploadedImage)
def upload_post_image(
    file: UploadFile = File(...),
    user: models.User = Depends(get_current_user),
):
    """Images inside posts and comments. Returns a URL to put in the editor content."""
    return {"url": upload_image(file, folder="medin/posts")}
