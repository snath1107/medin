"""Test setup: a real Postgres test database, wiped between tests.

Run with:  pytest
Uses TEST_DATABASE_URL (default: postgresql://localhost:5432/medin_test).
"""

import itertools
import os
import secrets
from datetime import datetime, timedelta, timezone

# Must be set before the app is imported, because app/config.py reads them on import.
os.environ["DATABASE_URL"] = os.getenv(
    "TEST_DATABASE_URL", "postgresql://localhost:5432/medin_test"
)
os.environ["SECRET_KEY"] = "test-secret-key-that-is-at-least-32-bytes"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import text  # noqa: E402

from app import models  # noqa: E402
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.security import hash_invite_token  # noqa: E402


@pytest.fixture(scope="session", autouse=True)
def database_schema():
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)
    yield
    Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def clean_tables():
    yield
    table_names = ", ".join(table.name for table in Base.metadata.sorted_tables)
    with engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {table_names} RESTART IDENTITY CASCADE"))


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


def create_invite(expires_in_days: int = 14) -> str:
    """Creates an invite directly in the database and returns the raw token."""
    token = secrets.token_urlsafe(16)
    with SessionLocal() as session:
        session.add(
            models.Invite(
                token_hash=hash_invite_token(token),
                expires_at=datetime.now(timezone.utc) + timedelta(days=expires_in_days),
            )
        )
        session.commit()
    return token


_emails = itertools.count(1)


def signup_payload(**overrides) -> dict:
    payload = {
        "email": f"doctor{next(_emails)}@example.com",
        "password": "correct-horse-battery",
        "first_name": "Asha",
        "last_name": "Rao",
        "specialization": "Cardiology",
        "experience_years": 8,
        "hospital": "City Hospital",
        "city": "Pune",
        "invite_token": create_invite(),
    }
    payload.update(overrides)
    return payload


class LoggedInUser:
    """A test client with its own cookie jar, i.e. one logged-in browser."""

    def __init__(self, **overrides):
        self.client = TestClient(app)
        response = self.client.post("/auth/signup", json=signup_payload(**overrides))
        assert response.status_code == 201, response.text
        self.data = response.json()
        self.id = self.data["id"]

    def __getattr__(self, name):
        # user.get(...), user.post(...) etc. go straight to the client
        return getattr(self.client, name)

    def create_post(self, **fields) -> dict:
        body = {
            "title": "A case",
            "content": doc("Some clinical detail"),
            "visibility": "public",
            "is_anonymous": False,
        }
        body.update(fields)
        response = self.client.post("/posts", json=body)
        assert response.status_code == 201, response.text
        return response.json()


@pytest.fixture
def make_user():
    return LoggedInUser


def doc(text_value: str) -> dict:
    """A minimal rich-text document in the editor's format."""
    return {
        "type": "doc",
        "content": [{"type": "paragraph", "content": [{"type": "text", "text": text_value}]}],
    }
