from sqlalchemy import event

from app.database import engine
from conftest import doc


def feed_ids(user) -> list[int]:
    return [post["id"] for post in user.get("/posts").json()["items"]]


# ---------- Visibility ----------


def test_visibility_rules_in_feed_and_post_page(make_user):
    author, follower, stranger = make_user(), make_user(), make_user()
    follower.post(f"/users/{author.id}/follow")

    public = author.create_post(visibility="public")["id"]
    connections = author.create_post(visibility="connections")["id"]
    private = author.create_post(visibility="private")["id"]

    # Drafts never show in feeds, not even the author's (they live on the Drafts tab).
    assert set(feed_ids(author)) == {public, connections}
    assert set(feed_ids(follower)) == {public, connections}
    assert set(feed_ids(stranger)) == {public}

    assert stranger.get(f"/posts/{connections}").status_code == 404
    assert follower.get(f"/posts/{private}").status_code == 404
    assert author.get(f"/posts/{private}").status_code == 200


def test_profile_posts_respect_visibility(make_user):
    author, stranger = make_user(), make_user()
    public = author.create_post(visibility="public")["id"]
    author.create_post(visibility="private")

    items = stranger.get(f"/users/{author.id}/posts").json()["items"]
    assert [post["id"] for post in items] == [public]
    assert stranger.get(f"/users/{author.id}").json()["stats"]["posts"] == 1


def test_hidden_posts_cant_be_liked_or_commented(make_user):
    author, stranger = make_user(), make_user()
    private = author.create_post(visibility="private")["id"]

    assert stranger.post(f"/posts/{private}/like").status_code == 404
    assert stranger.get(f"/posts/{private}/comments").status_code == 404
    assert stranger.post(f"/posts/{private}/comments", json={"content": doc("hi")}).status_code == 404


def test_search_respects_visibility(make_user):
    author, stranger = make_user(), make_user()
    author.create_post(title="Rare arrhythmia case", visibility="connections")
    author.create_post(title="Arrhythmia draft", visibility="private")

    assert stranger.get("/search", params={"q": "arrhythmia"}).json()["posts"] == []
    # The author finds their connections-only post, but drafts never show in search.
    assert [p["title"] for p in author.get("/search", params={"q": "arrhythmia"}).json()["posts"]] == ["Rare arrhythmia case"]


# ---------- Anonymous posts ----------


def test_anonymous_posts_never_reveal_the_author(make_user):
    author = make_user(first_name="Meera", last_name="Kapoor")
    reader = make_user()
    post_id = author.create_post(is_anonymous=True, title="Burnout")["id"]

    seen_by_reader = reader.get(f"/posts/{post_id}").json()
    assert seen_by_reader["author"] is None
    assert seen_by_reader["is_mine"] is False
    assert "author_id" not in seen_by_reader

    # The author still knows it's theirs (to edit or delete it).
    assert author.get(f"/posts/{post_id}").json()["is_mine"] is True

    # Not on their profile, and not found by searching their name.
    assert reader.get(f"/users/{author.id}/posts").json()["items"] == []
    assert reader.get("/search", params={"q": "Meera Kapoor"}).json()["posts"] == []


def test_anonymous_posts_cant_be_reposted(make_user):
    author, reader = make_user(), make_user()
    post_id = author.create_post(is_anonymous=True)["id"]
    assert reader.post(f"/posts/{post_id}/repost").status_code == 400


# ---------- Likes ----------


def test_like_is_idempotent(make_user):
    author, reader = make_user(), make_user()
    post_id = author.create_post()["id"]

    reader.post(f"/posts/{post_id}/like")
    second = reader.post(f"/posts/{post_id}/like")  # double click
    assert second.json() == {"liked": True, "like_count": 1}

    post = reader.get(f"/posts/{post_id}").json()
    assert post["is_liked"] is True and post["like_count"] == 1

    assert reader.delete(f"/posts/{post_id}/like").json() == {"liked": False, "like_count": 0}
    assert reader.delete(f"/posts/{post_id}/like").json() == {"liked": False, "like_count": 0}


def test_liking_a_missing_post_is_404(make_user):
    assert make_user().post("/posts/999999/like").status_code == 404


# ---------- Ownership ----------


def test_only_the_author_can_edit_or_delete(make_user):
    author, other = make_user(), make_user()
    post_id = author.create_post()["id"]

    assert other.patch(f"/posts/{post_id}", json={"title": "hacked"}).status_code == 404
    assert other.delete(f"/posts/{post_id}").status_code == 404

    assert author.patch(f"/posts/{post_id}", json={"title": "Updated"}).json()["title"] == "Updated"
    assert author.delete(f"/posts/{post_id}").status_code == 204
    assert author.get(f"/posts/{post_id}").status_code == 404


def test_invalid_post_data_is_rejected(make_user):
    user = make_user()
    empty = {"title": "", "content": {"type": "doc", "content": []}}
    assert user.post("/posts", json=empty).status_code == 400
    assert user.post("/posts", json={"content": doc("x"), "visibility": "everyone"}).status_code == 422


def test_tags_are_normalized(make_user):
    post = make_user().create_post(tags=["  Cardiology ", "cardiology", "ECG  Findings"])
    assert post["tags"] == ["cardiology", "ecg findings"]


# ---------- Pagination ----------


def test_feed_pages_dont_repeat_posts_even_when_new_posts_arrive(make_user):
    user = make_user()
    for i in range(5):
        user.create_post(title=f"Post {i}")

    first_page = user.get("/posts", params={"limit": 2}).json()
    user.create_post(title="Brand new post")  # arrives while scrolling
    second_page = user.get(
        "/posts", params={"limit": 2, "before_id": first_page["next_cursor"]}
    ).json()

    first_ids = [p["id"] for p in first_page["items"]]
    second_ids = [p["id"] for p in second_page["items"]]
    assert not set(first_ids) & set(second_ids)
    assert second_ids == [first_ids[-1] - 1, first_ids[-1] - 2]


def test_last_page_has_no_cursor(make_user):
    user = make_user()
    user.create_post()
    assert user.get("/posts", params={"limit": 5}).json()["next_cursor"] is None


# ---------- N+1 ----------


def count_queries(fn) -> int:
    statements = []

    def before_execute(conn, cursor, statement, *args):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", before_execute)
    try:
        fn()
    finally:
        event.remove(engine, "before_cursor_execute", before_execute)
    return len(statements)


def test_feed_query_count_does_not_grow_with_page_size(make_user):
    viewer = make_user()
    authors = [make_user() for _ in range(3)]
    for author in authors:
        for _ in range(4):
            author.create_post()

    small_page = count_queries(lambda: viewer.get("/posts", params={"limit": 2}))
    big_page = count_queries(lambda: viewer.get("/posts", params={"limit": 12}))
    assert small_page == big_page
