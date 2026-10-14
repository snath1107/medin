from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

POST_VISIBILITIES = ("public", "connections", "private")


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    avatar_url = Column(String, nullable=True)
    headline = Column(String(120), nullable=True)  # e.g. "Consultant Neurologist"

    specialization = Column(String(100), nullable=False)
    experience_years = Column(Integer, nullable=False)
    hospital = Column(String(200), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    doctor_id = Column(String(100), nullable=True)  # medical registration number
    about = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    @property
    def name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    title = Column(String(200), nullable=False, default="")
    content = Column(JSONB, nullable=False)  # rich text document from the TipTap editor
    preview_text = Column(Text, nullable=True)  # plain text, derived from content when saving
    first_image = Column(String, nullable=True)  # derived from content when saving
    tags = Column(ARRAY(String), nullable=False, default=list, server_default="{}")

    visibility = Column(String(20), nullable=False, default="public")
    is_anonymous = Column(Boolean, nullable=False, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    author = relationship("User")

    __table_args__ = (
        CheckConstraint(
            "visibility IN ('public', 'connections', 'private')", name="ck_posts_visibility"
        ),
        Index("ix_posts_author_id_id", "author_id", "id"),
        Index("ix_posts_tags", "tags", postgresql_using="gin"),
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    content = Column(JSONB, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), nullable=True)

    author = relationship("User")

    __table_args__ = (Index("ix_comments_post_id_id", "post_id", "id"),)


# Likes, reposts and follows are "join tables". The composite primary key means
# the same pair can only exist once, so the database itself prevents double likes.


class Like(Base):
    __tablename__ = "likes"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_likes_post_id", "post_id"),)


class Repost(Base):
    __tablename__ = "reposts"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    post_id = Column(Integer, ForeignKey("posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_reposts_post_id", "post_id"),)


class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    following_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        CheckConstraint("follower_id <> following_id", name="ck_follows_not_self"),
        Index("ix_follows_following_id", "following_id"),
    )


class Experience(Base):
    __tablename__ = "experiences"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    position = Column(String(200), nullable=False)
    organization = Column(String(200), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    is_current = Column(Boolean, nullable=False, default=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Education(Base):
    __tablename__ = "educations"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    degree = Column(String(200), nullable=False)
    institution = Column(String(200), nullable=False)
    start_year = Column(Integer, nullable=False)
    end_year = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Publication(Base):
    __tablename__ = "publications"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(300), nullable=False)
    journal = Column(String(200), nullable=True)
    year = Column(Integer, nullable=True)
    url = Column(String, nullable=True)
    doi = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Invite(Base):
    __tablename__ = "invites"

    id = Column(Integer, primary_key=True)
    # Only a hash of the token is stored, so a database leak doesn't leak usable invite links.
    token_hash = Column(String(64), unique=True, nullable=False)
    # The member who created the invite (empty for invites made with the admin script).
    created_by_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)
    note = Column(Text, nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_by_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    used_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    created_by = relationship("User", foreign_keys=[created_by_id])
    used_by = relationship("User", foreign_keys=[used_by_id])


class EngagementPrompt(Base):
    __tablename__ = "engagement_prompts"

    id = Column(Integer, primary_key=True)
    title = Column(String(200), nullable=False)
    body = Column(Text, nullable=False)
    suggested_tags = Column(ARRAY(String), nullable=False, default=list, server_default="{}")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class PromptEvent(Base):
    __tablename__ = "prompt_events"

    id = Column(Integer, primary_key=True)
    prompt_id = Column(
        Integer, ForeignKey("engagement_prompts.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String(20), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (Index("ix_prompt_events_user_id_created_at", "user_id", "created_at"),)
