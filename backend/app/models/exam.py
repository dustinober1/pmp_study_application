"""Exam models for PMP 2026 exam simulation."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.question import Question
    from app.models.user import User


class ExamStatus(str, Enum):
    """Status of an exam session."""

    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class ExamSession(Base):
    """
    Represents a full PMP exam simulation session.

    The PMP 2026 exam has 185 questions (175 scored) over 240 minutes.
    Questions are distributed across domains: People (33%), Process (41%),
    Business Environment (26%).
    """

    __tablename__ = "exam_sessions"

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

    # Exam timing
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    end_time: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Current status of the exam
    status: Mapped[str] = mapped_column(
        String(20),
        default=ExamStatus.IN_PROGRESS.value,
        nullable=False,
        index=True,
    )

    # Total time spent in seconds
    total_time_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Number of questions in this exam session
    questions_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Number of questions answered correctly
    correct_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Current question index (for resume functionality)
    current_question_index: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Flag for time expiry (user ran out of time)
    time_expired: Mapped[bool] = mapped_column(
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
        back_populates="exam_sessions",
    )

    answers: Mapped[list["ExamAnswer"]] = relationship(
        "ExamAnswer",
        back_populates="exam_session",
        cascade="all, delete-orphan",
        order_by="ExamAnswer.question_index",
    )

    report: Mapped["ExamReport"] = relationship(
        "ExamReport",
        back_populates="exam_session",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        """String representation of ExamSession."""
        return (
            f"<ExamSession(id={self.id}, user_id={self.user_id}, "
            f"status={self.status}, questions_count={self.questions_count})>"
        )


class ExamAnswer(Base):
    """
    Tracks individual answers within an exam session.

    Each answer records the question, user's selection, correctness,
    and time spent on that specific question.
    """

    __tablename__ = "exam_answers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    exam_session_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("exam_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    question_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("questions.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Order of this question in the exam (0-based index)
    question_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    # The user's selected answer (A, B, C, or D)
    selected_answer: Mapped[str] = mapped_column(
        String(1),
        nullable=False,
    )

    # Whether the answer was correct
    is_correct: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )

    # Time spent on this question in seconds
    time_spent_seconds: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )

    # Flag for marked/flagged questions (user wants to review)
    is_flagged: Mapped[bool] = mapped_column(
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
    exam_session: Mapped["ExamSession"] = relationship(
        "ExamSession",
        back_populates="answers",
    )

    question: Mapped["Question"] = relationship(
        "Question",
    )

    def __repr__(self) -> str:
        """String representation of ExamAnswer."""
        return (
            f"<ExamAnswer(id={self.id}, exam_session_id={self.exam_session_id}, "
            f"question_id={self.question_id}, is_correct={self.is_correct})>"
        )


class ExamReport(Base):
    """
    Generated report after exam completion with detailed analysis.

    Contains overall score, domain breakdowns, and personalized
    recommendations for further study.
    """

    __tablename__ = "exam_reports"

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

    # Overall score as a percentage (0-100)
    score_percentage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    # Domain breakdown stored as JSONB
    # Format: {"domain_name": {"correct": X, "total": Y, "percentage": Z}, ...}
    domain_breakdown: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
    )

    # Task breakdown for detailed analysis (optional)
    # Format: {"task_id": {"correct": X, "total": Y}, ...}
    task_breakdown: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Personalized recommendations based on performance
    # Stored as array of recommendation strings
    recommendations: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
    )

    # Areas of strength (domains/tasks performed well)
    strengths: Mapped[list[str]] = mapped_column(
        JSONB,
        nullable=False,
    )

    # Areas needing improvement (domains/tasks performed poorly)
    weaknesses: Mapped[list[str]] = mapped_column(
        JSONB,
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
        back_populates="report",
    )

    def __repr__(self) -> str:
        """String representation of ExamReport."""
        return (
            f"<ExamReport(id={self.id}, exam_session_id={self.exam_session_id}, "
            f"score={self.score_percentage:.1f}%)>"
        )
