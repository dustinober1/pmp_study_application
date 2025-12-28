"""Progress tracking models for flashcards and questions."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class FlashcardProgress(Base):
    """
    Tracks user progress on individual flashcards using SM-2 spaced repetition.

    SM-2 Algorithm:
    - ease_factor starts at 2.5 (range 1.3 to 2.5)
    - next_interval = previous_interval × ease_factor
    - Quality ratings: 0-5 (0-2 = failed, 3-5 = success)
    """

    __tablename__ = "flashcard_progress"

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

    flashcard_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # SM-2 algorithm fields
    ease_factor: Mapped[float] = mapped_column(
        Float,
        default=2.5,
        nullable=False,
    )

    interval: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    repetitions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Next scheduled review date
    next_review_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Last review date
    last_reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Total number of reviews
    review_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Count of correct responses
    correct_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Last quality rating (0-5)
    last_quality: Mapped[int | None] = mapped_column(
        Integer,
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
    user: Mapped["User"] = relationship(
        "User",
        back_populates="flashcard_progress",
    )

    def __repr__(self) -> str:
        """String representation of FlashcardProgress."""
        return (
            f"<FlashcardProgress(user_id={self.user_id}, "
            f"flashcard_id={self.flashcard_id}, ef={self.ease_factor:.2f})>"
        )


class QuestionProgress(Base):
    """
    Tracks user progress on practice questions.

    Stores answer history and correctness for each question attempt.
    """

    __tablename__ = "question_progress"

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

    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Total attempts on this question
    attempt_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Number of correct answers
    correct_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Last answer given (for review)
    last_answer: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )

    # Was the last answer correct?
    last_correct: Mapped[bool | None] = mapped_column(
        nullable=True,
    )

    # Last attempt date
    last_attempted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Response time tracking for analytics (in seconds)
    last_response_time_seconds: Mapped[float | None] = mapped_column(
        Float,
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
    user: Mapped["User"] = relationship(
        "User",
        back_populates="question_progress",
    )

    def __repr__(self) -> str:
        """String representation of QuestionProgress."""
        return (
            f"<QuestionProgress(user_id={self.user_id}, "
            f"question_id={self.question_id}, attempts={self.attempt_count})>"
        )
