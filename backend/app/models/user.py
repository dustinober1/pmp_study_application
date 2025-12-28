"""User model for anonymous and registered users."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.analytics import UserAnalytics
    from app.models.collaboration import (
        Challenge,
        Discussion,
        StudyGroup,
        StudyGroupMember,
    )
    from app.models.exam import ExamSession
    from app.models.progress import FlashcardProgress, QuestionProgress
    from app.models.session import StudySession


class User(Base):
    """
    User model supporting anonymous and registered users.

    Anonymous users are created with a browser-generated UUID.
    Optional email registration upgrades the anonymous user while preserving progress.
    """

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Browser-generated UUID for anonymous users
    anonymous_id: Mapped[str] = mapped_column(
        String(36),
        unique=True,
        index=True,
        nullable=False,
    )

    # Optional email for registered users
    email: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
    )

    # Optional display name
    display_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    # Password hash for registered users (None for anonymous-only users)
    password_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    flashcard_progress: Mapped[list["FlashcardProgress"]] = relationship(
        "FlashcardProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    question_progress: Mapped[list["QuestionProgress"]] = relationship(
        "QuestionProgress",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    study_sessions: Mapped[list["StudySession"]] = relationship(
        "StudySession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    exam_sessions: Mapped[list["ExamSession"]] = relationship(
        "ExamSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Collaboration relationships
    created_groups: Mapped[list["StudyGroup"]] = relationship(
        "StudyGroup",
        foreign_keys="StudyGroup.created_by_id",
        back_populates="created_by",
        cascade="all, delete-orphan",
    )

    study_groups: Mapped[list["StudyGroup"]] = relationship(
        "StudyGroup",
        secondary="study_group_members",
        primaryjoin="User.id == StudyGroupMember.user_id",
        secondaryjoin="StudyGroup.id == StudyGroupMember.group_id",
        viewonly=True,
    )

    memberships: Mapped[list["StudyGroupMember"]] = relationship(
        "StudyGroupMember",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    discussions: Mapped[list["Discussion"]] = relationship(
        "Discussion",
        foreign_keys="Discussion.user_id",
        back_populates="author",
        cascade="all, delete-orphan",
    )

    created_challenges: Mapped[list["Challenge"]] = relationship(
        "Challenge",
        foreign_keys="Challenge.created_by_id",
        back_populates="created_by",
        cascade="all, delete-orphan",
    )

    # Analytics relationship
    analytics: Mapped["UserAnalytics"] = relationship(
        "UserAnalytics",
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )

    def __repr__(self) -> str:
        """String representation of User."""
        return f"<User(id={self.id}, email={self.email}, anonymous_id={self.anonymous_id[:8]}...)>"
