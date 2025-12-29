"""Micro-learning models for 2-minute flashcard sessions."""

import uuid
from datetime import datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.flashcard import Flashcard
    from app.models.task import Task
    from app.models.user import User


class MicroFlashcard(Base):
    """
    Condensed flashcard optimized for 2-minute micro-learning sessions.

    Micro flashcards are derived from regular flashcards but with:
    - Simplified content for quick review
    - Audio script for TTS playback
    - Contextual tags (commute, break, waiting)
    - Priority rating for queue scheduling
    """

    __tablename__ = "micro_flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Link to original flashcard
    source_flashcard_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("flashcards.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Simplified front content (max 200 chars)
    micro_front: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )

    # Simplified back content (max 500 chars)
    micro_back: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # Audio script for TTS (optional, uses micro_back if None)
    audio_script: Mapped[str | None] = mapped_column(
        String(600),
        nullable=True,
    )

    # Contextual tags for when to study
    context_tags: Mapped[list[str]] = mapped_column(
        Text,
        default="commute,break,waiting",
        nullable=False,
    )

    # Priority for queue scheduling (1-10, higher = more important)
    priority: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
    )

    # Estimated time to review in seconds
    estimated_seconds: Mapped[int] = mapped_column(
        Integer,
        default=30,
        nullable=False,
    )

    # Is active and available for micro sessions
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
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
    source_flashcard: Mapped["Flashcard"] = relationship(
        "Flashcard",
        foreign_keys=[source_flashcard_id],
    )

    def __repr__(self) -> str:
        return (
            f"<MicroFlashcard(id={self.id}, "
            f"micro_front='{self.micro_front[:30]}...', priority={self.priority})>"
        )


class StudyQueue(Base):
    """
    User's personalized study queue for micro-learning sessions.

    Each user has a queue that prioritizes cards based on:
    - Due cards (SM-2 scheduling)
    - Weak areas (from analytics)
    - Context (time available, location)
    - Priority
    """

    __tablename__ = "study_queues"

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

    # Micro flashcard in this queue position
    micro_flashcard_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("micro_flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Position in queue (lower = higher priority)
    position: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # Context this card is recommended for
    recommended_context: Mapped[str] = mapped_column(
        String(20),
        default="general",
        nullable=False,
    )

    # Dynamic priority score (calculated by scheduler)
    priority_score: Mapped[float] = mapped_column(
        Float,
        default=0.0,
        nullable=False,
    )

    # Is currently in active rotation
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
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
        back_populates="study_queues",
    )

    micro_flashcard: Mapped["MicroFlashcard"] = relationship(
        "MicroFlashcard",
    )

    def __repr__(self) -> str:
        return (
            f"<StudyQueue(user_id={self.user_id}, "
            f"micro_flashcard_id={self.micro_flashcard_id}, position={self.position})>"
        )


class QuickSession(Base):
    """
    A short (2-minute) micro-learning session.

    Tracks micro sessions that can be:
    - Time-boxed (exact 2 minutes)
    - Card-count based (5 cards)
    - Context-aware (commute, break, waiting)
    """

    __tablename__ = "quick_sessions"

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

    # Session context (commute, break, waiting, general)
    context: Mapped[str] = mapped_column(
        String(20),
        default="general",
        nullable=False,
    )

    # Session mode (time, cards, adaptive)
    mode: Mapped[str] = mapped_column(
        String(20),
        default="cards",
        nullable=False,
    )

    # Target for the session (seconds for time, count for cards)
    target: Mapped[int] = mapped_column(
        Integer,
        default=5,
        nullable=False,
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

    # Duration in seconds
    duration_seconds: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # Cards presented in this session (JSON array of micro_flashcard_ids)
    cards_presented: Mapped[list[int]] = mapped_column(
        Text,
        default="",
        nullable=False,
    )

    # Number of cards completed successfully
    cards_completed: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Was session completed (reached target or time limit)
    is_completed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
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
        back_populates="quick_sessions",
    )

    @property
    def cards_presented_list(self) -> list[int]:
        """Parse cards_presented JSON string to list."""
        import json

        if not self.cards_presented:
            return []
        return json.loads(self.cards_presented)

    @cards_presented_list.setter
    def cards_presented_list(self, value: list[int]) -> None:
        """Set cards_presented from list."""
        import json

        self.cards_presented = json.dumps(value)

    def __repr__(self) -> str:
        return (
            f"<QuickSession(id={self.id}, user_id={self.user_id}, "
            f"context={self.context}, mode={self.mode}, completed={self.is_completed})>"
        )


class MicroProgress(Base):
    """
    Progress tracking specifically for micro-flashcard reviews.

    Separate from regular FlashcardProgress to track micro-learning
    patterns and effectiveness.
    """

    __tablename__ = "micro_progress"

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

    micro_flashcard_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("micro_flashcards.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Micro-specific SM-2 tracking
    micro_ease_factor: Mapped[float] = mapped_column(
        Float,
        default=2.5,
        nullable=False,
    )

    micro_interval: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    micro_repetitions: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Next review (may be more aggressive than regular cards)
    next_review_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Last review info
    last_reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    last_quality: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # Total micro reviews
    review_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Correct responses
    correct_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Context performance (commute/break/waiting accuracy)
    context_accuracy: Mapped[dict[str, float]] = mapped_column(
        Text,
        default="{}",
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
        back_populates="micro_progress",
    )

    micro_flashcard: Mapped["MicroFlashcard"] = relationship(
        "MicroFlashcard",
    )

    @property
    def context_accuracy_dict(self) -> dict[str, float]:
        """Parse context_accuracy JSON to dict."""
        import json

        if not self.context_accuracy:
            return {}
        return json.loads(self.context_accuracy)

    @context_accuracy_dict.setter
    def context_accuracy_dict(self, value: dict[str, float]) -> None:
        """Set context_accuracy from dict."""
        import json

        self.context_accuracy = json.dumps(value)

    def __repr__(self) -> str:
        return (
            f"<MicroProgress(user_id={self.user_id}, "
            f"micro_flashcard_id={self.micro_flashcard_id}, ef={self.micro_ease_factor:.2f})>"
        )
