from fastapi.testclient import TestClient

from app import models
from app.main import app
from conftest import create_invite, signup_payload


def test_signup_needs_an_invite():
    client = TestClient(app)
    response = client.post("/auth/signup", json=signup_payload(invite_token=None))
    assert response.status_code == 403


def test_signup_logs_you_in_and_hashes_the_password(db):
    client = TestClient(app)
    payload = signup_payload(email="New.Doctor@Example.com")

    response = client.post("/auth/signup", json=payload)

    assert response.status_code == 201
    assert response.json()["email"] == "new.doctor@example.com"
    assert "password_hash" not in response.json()
    assert "access_token" in response.cookies

    assert client.get("/auth/me").json()["email"] == "new.doctor@example.com"

    user = db.query(models.User).one()
    assert user.password_hash != payload["password"]
    assert user.password_hash.startswith("$2")  # bcrypt


def test_invite_can_only_be_used_once():
    token = create_invite()
    assert TestClient(app).get(f"/auth/invites/{token}").json()["valid"] is True

    first = TestClient(app).post("/auth/signup", json=signup_payload(invite_token=token))
    second = TestClient(app).post("/auth/signup", json=signup_payload(invite_token=token))

    assert first.status_code == 201
    assert second.status_code == 403
    assert TestClient(app).get(f"/auth/invites/{token}").json()["valid"] is False


def test_expired_invite_is_rejected():
    token = create_invite(expires_in_days=-1)
    response = TestClient(app).post("/auth/signup", json=signup_payload(invite_token=token))
    assert response.status_code == 403


def test_duplicate_email_is_rejected_case_insensitively():
    TestClient(app).post("/auth/signup", json=signup_payload(email="dup@example.com"))
    response = TestClient(app).post("/auth/signup", json=signup_payload(email="DUP@example.com"))
    assert response.status_code == 409


def test_weak_or_invalid_signup_data_is_rejected():
    client = TestClient(app)
    assert client.post("/auth/signup", json=signup_payload(password="short")).status_code == 422
    assert client.post("/auth/signup", json=signup_payload(email="not-an-email")).status_code == 422


def test_login(make_user):
    make_user(email="login@example.com", password="correct-horse-battery")
    client = TestClient(app)

    wrong_password = client.post(
        "/auth/login", json={"email": "login@example.com", "password": "wrong-password"}
    )
    unknown_email = client.post(
        "/auth/login", json={"email": "nobody@example.com", "password": "wrong-password"}
    )
    # Same message either way, so attackers can't tell which emails exist.
    assert wrong_password.status_code == unknown_email.status_code == 401
    assert wrong_password.json() == unknown_email.json()

    ok = client.post(
        "/auth/login", json={"email": "LOGIN@example.com", "password": "correct-horse-battery"}
    )
    assert ok.status_code == 200
    assert client.get("/auth/me").status_code == 200


def test_logout_clears_the_cookie(make_user):
    user = make_user()
    assert user.post("/auth/logout").status_code == 204
    assert user.get("/auth/me").status_code == 401


def test_protected_endpoints_reject_missing_or_forged_tokens():
    client = TestClient(app)
    assert client.get("/posts").status_code == 401

    client.cookies.set("access_token", "not.a.real.token")
    assert client.get("/posts").status_code == 401
