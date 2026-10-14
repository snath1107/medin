from conftest import doc


def test_follow_and_unfollow_are_idempotent(make_user):
    me, doctor = make_user(), make_user()

    assert me.post(f"/users/{doctor.id}/follow").json() == {"following": True}
    assert me.post(f"/users/{doctor.id}/follow").json() == {"following": True}

    profile = me.get(f"/users/{doctor.id}").json()
    assert profile["is_following"] is True
    assert profile["stats"]["followers"] == 1

    assert me.delete(f"/users/{doctor.id}/follow").json() == {"following": False}
    assert me.get(f"/users/{doctor.id}").json()["is_following"] is False


def test_follow_rules(make_user):
    me = make_user()
    assert me.post(f"/users/{me.id}/follow").status_code == 400
    assert me.post("/users/999999/follow").status_code == 404


def test_profile_flags(make_user):
    me, other = make_user(), make_user()
    assert me.get(f"/users/{me.id}").json()["is_me"] is True
    assert me.get(f"/users/{other.id}").json()["is_me"] is False
    assert "email" not in me.get(f"/users/{other.id}").json()


def test_connections_lists(make_user):
    me, a, b = make_user(), make_user(), make_user()
    me.post(f"/users/{a.id}/follow")
    b.post(f"/users/{me.id}/follow")

    assert [u["id"] for u in me.get("/connections/following").json()] == [a.id]
    followers = me.get("/connections/followers").json()
    assert [u["id"] for u in followers] == [b.id]
    assert followers[0]["is_following"] is False


def test_suggestions_skip_me_and_people_i_follow(make_user):
    me = make_user(hospital="AIIMS", specialization="Neurology")
    colleague = make_user(hospital="AIIMS", specialization="Neurology")
    followed = make_user(hospital="AIIMS")
    same_field = make_user(hospital="Elsewhere", specialization="Neurology")
    me.post(f"/users/{followed.id}/follow")

    result = me.get("/connections/suggestions").json()
    assert [u["id"] for u in result["same_hospital"]] == [colleague.id]
    assert [u["id"] for u in result["same_specialization"]] == [same_field.id]


def test_update_profile(make_user):
    me = make_user()
    response = me.patch("/profile", json={"about": "  Interventional cardiologist  ", "city": ""})
    assert response.status_code == 200
    assert response.json()["about"] == "Interventional cardiologist"
    assert response.json()["city"] is None

    assert me.patch("/profile", json={"first_name": "   "}).status_code == 400


def test_profile_sections_belong_to_their_owner(make_user):
    me, other = make_user(), make_user()
    created = me.post(
        "/profile/educations",
        json={"degree": "MBBS", "institution": "AFMC", "start_year": 2010, "end_year": 2015},
    ).json()

    assert other.delete(f"/profile/educations/{created['id']}").status_code == 404
    assert me.get(f"/users/{me.id}").json()["educations"][0]["degree"] == "MBBS"
    assert me.delete(f"/profile/educations/{created['id']}").status_code == 204


def test_comments(make_user):
    author, reader = make_user(), make_user()
    post_id = author.create_post()["id"]

    created = reader.post(f"/posts/{post_id}/comments", json={"content": doc("Great case")})
    assert created.status_code == 201
    comment = created.json()

    page = author.get(f"/posts/{post_id}/comments").json()
    assert page["items"][0]["author"]["id"] == reader.id
    assert page["items"][0]["is_mine"] is False

    assert author.delete(f"/comments/{comment['id']}").status_code == 404
    assert reader.delete(f"/comments/{comment['id']}").status_code == 204
    assert author.get(f"/posts/{post_id}").json()["comment_count"] == 0
