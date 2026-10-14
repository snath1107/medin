from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient

from app.main import app
from conftest import signup_payload


def token_from(url: str) -> str:
    return parse_qs(urlparse(url).query)["invite"][0]


def test_members_can_invite_colleagues(make_user):
    inviter = make_user(first_name="Rahul", last_name="Sharma")

    created = inviter.post("/invites")
    assert created.status_code == 201
    token = token_from(created.json()["invite_url"])

    status = TestClient(app).get(f"/auth/invites/{token}").json()
    assert status["valid"] is True
    assert status["inviter"]["name"] == "Rahul Sharma"

    joined = TestClient(app).post("/auth/signup", json=signup_payload(invite_token=token))
    assert joined.status_code == 201

    my_invites = inviter.get("/invites").json()
    assert my_invites[0]["used_by"]["id"] == joined.json()["id"]


def test_invite_status_for_bad_token():
    assert TestClient(app).get("/auth/invites/nope").json()["valid"] is False


def test_top_posts_are_public_and_ordered_by_likes(make_user):
    author, fan1, fan2 = make_user(), make_user(), make_user()
    popular = author.create_post(title="Popular")["id"]
    quiet = author.create_post(title="Quiet")["id"]
    hidden = author.create_post(title="Hidden", visibility="connections")["id"]
    author.create_post(title="No likes")

    for fan in (fan1, fan2):
        fan.post(f"/posts/{popular}/like")
        fan.post(f"/posts/{hidden}/like")
    fan1.post(f"/posts/{quiet}/like")

    top = fan1.get("/posts/top").json()
    assert [post["id"] for post in top] == [popular, quiet]


def test_drafts_count_and_filter(make_user):
    me, other = make_user(), make_user()
    me.create_post(visibility="public")
    draft = me.create_post(visibility="private")["id"]

    mine = me.get(f"/users/{me.id}").json()["stats"]
    assert mine == {"posts": 1, "followers": 0, "following": 0, "drafts": 1}
    assert other.get(f"/users/{me.id}").json()["stats"]["drafts"] is None

    drafts = me.get(f"/users/{me.id}/posts", params={"visibility": "private"}).json()["items"]
    assert [post["id"] for post in drafts] == [draft]


def test_headline_can_be_edited(make_user):
    me = make_user()
    me.patch("/profile", json={"headline": "Consultant Neurologist"})
    assert me.get(f"/users/{me.id}").json()["headline"] == "Consultant Neurologist"
