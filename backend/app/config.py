"""All settings come from environment variables (or a local .env file)."""

import os

from dotenv import load_dotenv

load_dotenv()


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name} (see .env.example)")
    return value


DATABASE_URL = _required("DATABASE_URL")

# Used to sign login tokens. Anyone who knows it can log in as any user, so keep it secret.
SECRET_KEY = _required("SECRET_KEY")
if len(SECRET_KEY) < 32:
    raise RuntimeError("SECRET_KEY must be at least 32 characters long")
ACCESS_TOKEN_EXPIRE_DAYS = 7

# The login cookie is only sent over HTTPS when this is true. Turn it on in production.
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

# Used to build invite links that point at the frontend.
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Image uploads. If these are empty, upload endpoints return a clear error.
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUDINARY_CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUDINARY_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUDINARY_API_SECRET")
