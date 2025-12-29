"""Exam behavior profile models for real-time behavioral analysis."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.exam import ExamSession
    from app.models.user import User


class BehaviorPattern(str, Enum):
    """Detected behavior patterns during exam."""

    NORMAL = "normal"
    RUSHING = "rushing"
    DWELLING = "dwelling"
    PANIC = "panic"
    GUESSING = "guessing"
    FLAGGING_SPREE = "flagging_spree"
    SKIPPING = "skipping"
    REVISIT_LOOP = "revisit_loop"


class CoachingSeverity(str, Enum):
    """Severity level for coaching intervention."""

    INFO = "info"
    SUGGESTION = "suggestion"
    WARNING = "warning"
    URGENT = "urgent"


class ExamBehaviorProfile(Base):
    """
    Real-time behavioral profile for exam coaching.

    Tracks user behavior patterns during exam sessions including
    rushing, dwelling, panic detection, and coaching interventions.
    """

    __tablename__ = "exam_behavior_profiles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    exam_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Current detected behavior pattern
    current_pattern: Mapped[str] = mapped_column(
        String(20),
        default=BehaviorPattern.NORMAL.value,
        nullable=False,
    )

    # Pattern history as JSONB: [{"pattern": "rushing", "start_q": 10, "end_q": 15, "duration_sec": 120}]
    pattern_history: Mapped[list[dict]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    # Coaching interventions delivered: [{"question": 5, "severity": "warning", "message": "..."}]
    coaching_history: Mapped[list[dict]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
    )

    # Timing metrics
    avg_time_per_question: Mapped[float] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    fastest_question_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    slowest_question_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Flagging behavior
    total_flags: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    consecutive_flags: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    max_consecutive_flags: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Navigation behavior
    question_revisits: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    skips_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Panic indicators (rapid changes in behavior)
    rapid_answer_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    long_pause_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Time pressure metrics
    time_remaining_at_half: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    questions_completed_at_half: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    # Pace trajectory: "ahead", "on_track", "behind", "critical"
    pace_trajectory: Mapped[str] = mapped_column(
        String(10),
        default="on_track",
        nullable=False,
    )

    # Engagement score (0-100) based on consistent, measured answering
    engagement_score: Mapped[float] = mapped_column(
        Integer,
        default=100,
        nullable=False,
    )

    # Focus score (0-100) based on revisits and consistency
    focus_score: Mapped[float] = mapped_column(
        Integer,
        default=100,
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
    exam_session: Mapped["ExamSession"] = relationship(
        "ExamSession",
        back_populates="behavior_profile",
    )

    def __repr__(self) -> str:
        """String representation of ExamBehaviorProfile."""
        return (
            f"<ExamBehaviorProfile(id={self.id}, "
            f"current_pattern={self.current_pattern}, "
            f"engagement={self.engagement_score}, "
            f"focus={self.focus_score})>"
        )


class CoachingMessage(Base):
    """
    Predefined and dynamic coaching messages for exam behavior.

    Messages are categorized by pattern type and severity.
    """

    __tablename__ = "coaching_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Pattern this message addresses
    pattern: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        index=True,
    )

    # Severity level
    severity: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )

    # The coaching message text
    message: Mapped[str] = mapped_column(
        String(500),
        nullable=False,
    )

    # Short title for display
    title: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    # Suggested action (optional)
    suggested_action: Mapped[str | None] = mapped_column(
        String(200),
        nullable=True,
    )

    # Is this a predefined message (vs dynamically generated)
    is_predefined: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        """String representation of CoachingMessage."""
        return (
            f"<CoachingMessage(id={self.id}, "
            f"pattern={self.pattern}, "
            f"severity={self.severity})>"
        )
