"""Study session model for tracking user study activity."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class SessionType(str, Enum):
    """Type of study session."""

    FLASHCARD = "flashcard"
    PRACTICE_TEST = "practice_test"
    MIXED = "mixed"


class StudySession(Base):
    """
    Tracks individual study sessions for analytics and progress tracking.

    A session captures a period of focused study activity, including
    the type of content studied, duration, and performance metrics.
    """

    __tablename__ = "study_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Type of study session
    session_type: Mapped[str] = mapped_column(
        String(20),
        default=SessionType.MIXED.value,
        nullable=False,
    )

    # Optional domain/task focus for this session
    domain_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("domains.id", ondelete="SET NULL"),
        nullable=True,
    )

    task_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Session timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    ended_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Duration in seconds (calculated when session ends)
    duration_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # Flashcard metrics for this session
    flashcards_reviewed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    flashcards_correct: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Question metrics for this session
    questions_answered: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    questions_correct: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
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
    user: Mapped["User"] = relationship(
        "User",
        back_populates="study_sessions",
    )

    def __repr__(self) -> str:
        """String representation of StudySession."""
        return (
            f"<StudySession(id={self.id}, user_id={self.user_id}, "
            f"type={self.session_type}, started_at={self.started_at})>"
        )
