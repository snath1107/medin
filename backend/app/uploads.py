"""Image uploads to Cloudinary."""

import logging

import cloudinary
import cloudinary.uploader
from fastapi import HTTPException, UploadFile

from app import config

logger = logging.getLogger(__name__)

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB

cloudinary.config(
    cloud_name=config.CLOUDINARY_CLOUD_NAME,
    api_key=config.CLOUDINARY_API_KEY,
    api_secret=config.CLOUDINARY_API_SECRET,
    secure=True,
)


def upload_image(file: UploadFile, folder: str) -> str:
    """Validates and uploads an image, returning its public URL.

    This is a normal (blocking) function on purpose. Endpoints that call it are
    declared with `def`, not `async def`, so FastAPI runs them in a worker
    thread and a slow upload doesn't freeze the whole server.
    """
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP or GIF images are allowed")

    data = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 5 MB or smaller")

    if not config.CLOUDINARY_CLOUD_NAME:
        raise HTTPException(status_code=503, detail="Image uploads are not configured on this server")

    try:
        result = cloudinary.uploader.upload(data, folder=folder, resource_type="image")
    except Exception:
        logger.exception("Cloudinary upload failed")
        raise HTTPException(status_code=502, detail="Image upload failed, please try again")

    return result["secure_url"]
