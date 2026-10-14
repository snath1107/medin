"""Request and response shapes. Pydantic validates every request body against these."""

from datetime import date, datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Visibility = Literal["public", "connections", "private"]


class OrmModel(BaseModel):
    # Lets us build a schema straight from a SQLAlchemy object.
    model_config = ConfigDict(from_attributes=True)


# ---------- Auth ----------


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    specialization: str = Field(min_length=1, max_length=100)
    experience_years: int = Field(ge=0, le=70)
    hospital: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    doctor_id: str | None = Field(default=None, max_length=100)
    invite_token: str | None = Field(default=None, max_length=100)

    @field_validator("password")
    @classmethod
    def password_fits_bcrypt(cls, value: str) -> str:
        # bcrypt only looks at the first 72 bytes of a password.
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password is too long")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


# (InviteStatus and the other invite schemas are defined after UserBrief, below.)


# ---------- Users ----------


class UserBrief(OrmModel):
    """The small author block shown on posts and comments."""

    id: int
    name: str
    avatar_url: str | None
    specialization: str
    hospital: str | None


class InviteStatus(BaseModel):
    valid: bool
    inviter: UserBrief | None = None
    expires_at: datetime | None = None


class InviteCreated(BaseModel):
    invite_url: str
    expires_at: datetime


class InviteOut(OrmModel):
    """One of my invites. The link itself isn't stored, so it can't be shown again."""

    id: int
    created_at: datetime
    expires_at: datetime
    used_at: datetime | None
    used_by: UserBrief | None


class UserCard(UserBrief):
    """A doctor in lists: connections, suggestions, search results."""

    city: str | None
    experience_years: int
    is_following: bool = False


class Me(OrmModel):
    id: int
    email: str
    name: str
    first_name: str
    last_name: str
    avatar_url: str | None
    headline: str | None
    specialization: str
    experience_years: int
    hospital: str | None
    city: str | None
    state: str | None
    doctor_id: str | None
    about: str | None


class ProfileUpdate(BaseModel):
    """Every field is optional; only the fields that are sent get changed."""

    first_name: str | None = Field(default=None, min_length=1, max_length=100)
    last_name: str | None = Field(default=None, min_length=1, max_length=100)
    headline: str | None = Field(default=None, max_length=120)
    specialization: str | None = Field(default=None, min_length=1, max_length=100)
    experience_years: int | None = Field(default=None, ge=0, le=70)
    hospital: str | None = Field(default=None, max_length=200)
    city: str | None = Field(default=None, max_length=100)
    state: str | None = Field(default=None, max_length=100)
    doctor_id: str | None = Field(default=None, max_length=100)
    about: str | None = Field(default=None, max_length=2000)


class AvatarResponse(BaseModel):
    avatar_url: str | None


class ExperienceIn(BaseModel):
    position: str = Field(min_length=1, max_length=200)
    organization: str = Field(min_length=1, max_length=200)
    start_date: date
    end_date: date | None = None
    is_current: bool = False
    description: str | None = Field(default=None, max_length=2000)


class ExperienceOut(ExperienceIn, OrmModel):
    id: int


class EducationIn(BaseModel):
    degree: str = Field(min_length=1, max_length=200)
    institution: str = Field(min_length=1, max_length=200)
    start_year: int = Field(ge=1900, le=2100)
    end_year: int | None = Field(default=None, ge=1900, le=2100)


class EducationOut(EducationIn, OrmModel):
    id: int


class PublicationIn(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    journal: str | None = Field(default=None, max_length=200)
    year: int | None = Field(default=None, ge=1900, le=2100)
    url: str | None = Field(default=None, max_length=500)
    doi: str | None = Field(default=None, max_length=100)


class PublicationOut(PublicationIn, OrmModel):
    id: int


class ProfileStats(BaseModel):
    posts: int
    followers: int
    following: int
    drafts: int | None = None  # only included on your own profile


class Profile(OrmModel):
    id: int
    name: str
    first_name: str
    last_name: str
    avatar_url: str | None
    headline: str | None
    specialization: str
    experience_years: int
    hospital: str | None
    city: str | None
    state: str | None
    about: str | None
    is_me: bool
    is_following: bool
    stats: ProfileStats
    experiences: list[ExperienceOut]
    educations: list[EducationOut]
    publications: list[PublicationOut]


class FollowStatus(BaseModel):
    following: bool


class Suggestions(BaseModel):
    same_hospital: list[UserCard]
    same_specialization: list[UserCard]


# ---------- Posts ----------


class PostCreate(BaseModel):
    title: str = Field(default="", max_length=200)
    content: dict[str, Any]
    tags: list[str] = Field(default_factory=list, max_length=5)
    visibility: Visibility = "public"
    is_anonymous: bool = False


class PostUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=200)
    content: dict[str, Any] | None = None
    tags: list[str] | None = Field(default=None, max_length=5)
    visibility: Visibility | None = None
    is_anonymous: bool | None = None


class PostOut(BaseModel):
    id: int
    title: str
    content: dict[str, Any]
    preview_text: str | None
    first_image: str | None
    tags: list[str]
    visibility: Visibility
    is_anonymous: bool
    created_at: datetime
    # None for anonymous posts, so the real author is never sent to the browser.
    author: UserBrief | None
    is_mine: bool
    is_following_author: bool
    like_count: int
    comment_count: int
    repost_count: int
    is_liked: bool
    is_reposted: bool


class PostPage(BaseModel):
    items: list[PostOut]
    # Pass this back as `before_id` to get the next page. None means there are no more.
    next_cursor: int | None


class LikeStatus(BaseModel):
    liked: bool
    like_count: int


class RepostStatus(BaseModel):
    reposted: bool
    repost_count: int


# ---------- Comments ----------


class CommentIn(BaseModel):
    content: dict[str, Any]


class CommentOut(BaseModel):
    id: int
    post_id: int
    content: dict[str, Any]
    created_at: datetime
    author: UserBrief
    is_mine: bool


class CommentPage(BaseModel):
    items: list[CommentOut]
    next_cursor: int | None


# ---------- Search ----------


class SearchResults(BaseModel):
    query: str
    users: list[UserCard]
    posts: list[PostOut]


# ---------- Engagement prompts ----------


class EngagementPromptOut(OrmModel):
    id: int
    title: str
    body: str
    suggested_tags: list[str]


class PromptEventIn(BaseModel):
    event_type: Literal["shown", "dismissed", "clicked_post", "posted"]


# ---------- Uploads ----------


class UploadedImage(BaseModel):
    url: str
