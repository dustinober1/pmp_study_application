"""Explanation models for adaptive learning feature."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.question import Question
    from app.models.flashcard import Flashcard


class ExplanationStyle(str, Enum):
    """Different explanation styles for adaptive learning."""

    SIMPLE = "simple"  # Plain language, beginner-friendly
    TECHNICAL = "technical"  # PMBOK terminology, formal
    ANALOGY = "analogy"  # Real-world comparisons
    VISUAL = "visual"  # Diagrams, structured formats
    STORY = "story"  # Narrative approach


class ContentType(str, Enum):
    """Types of content that can have explanations."""

    QUESTION = "question"
    FLASHCARD = "flashcard"


class ExplanationTemplate(Base):
    """
    Template for storing different explanation styles of content.

    Each question or flashcard can have multiple explanation templates
    with different styles to accommodate various learning preferences.
    """

    __tablename__ = "explanation_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Content reference (either question or flashcard)
    content_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )  # 'question' or 'flashcard'

    content_id: Mapped[int] = mapped_column(
        Integer, nullable=False, index=True
    )  # Question.id or Flashcard.id

    # Explanation style
    style: Mapped[ExplanationStyle] = mapped_column(
        String(20), nullable=False, index=True
    )

    # The explanation content
    explanation: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional metadata about the explanation
    explanation_metadata: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )  # e.g., {"analogy_type": "cooking", "visual_type": "flowchart"}

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<ExplanationTemplate(id={self.id}, style={self.style}, content_type={self.content_type}, content_id={self.content_id})>"


class ExplanationHistory(Base):
    """
    History of explanations shown to users for adaptive learning.

    Tracks which explanation styles were shown and user engagement
    to improve future explanation selection.
    """

    __tablename__ = "explanation_history"

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

    # Content reference
    content_type: Mapped[str] = mapped_column(
        String(20), nullable=False, index=True
    )

    content_id: Mapped[int] = mapped_column(
        Integer, nullable=False, index=True
    )

    # The explanation style that was shown
    style_shown: Mapped[ExplanationStyle] = mapped_column(
        String(20), nullable=False
    )

    # User engagement metrics
    was_helpful: Mapped[bool | None] = mapped_column(
        # User rated if explanation was helpful
        # nullable if not rated
    )

    time_spent_seconds: Mapped[int | None] = mapped_column(
        # How long user spent viewing the explanation
    )

    did_reread: Mapped[bool] = mapped_column(
        # Whether user viewed the explanation again
        default=False,
        nullable=False,
    )

    # Subsequent performance (did they get similar questions right?)
    subsequent_performance_correct: Mapped[bool | None] = mapped_column(
    )

    # Timestamps
    viewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="explanation_history")

    def __repr__(self) -> str:
        return f"<ExplanationHistory(id={self.id}, user_id={self.user_id}, style={self.style_shown}, content_type={self.content_type})>"


class UserLearningPreference(Base):
    """
    User preferences for learning and explanation styles.

    Tracks which explanation styles work best for each user
    to provide personalized adaptive explanations.
    """

    __tablename__ = "user_learning_preferences"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    # Preferred explanation style (can be null - system will learn)
    preferred_style: Mapped[ExplanationStyle | None] = mapped_column(
        String(20), nullable=True
    )

    # Expertise level (affects complexity of explanations)
    expertise_level: Mapped[str] = mapped_column(
        String(20), default="beginner", nullable=False
    )  # beginner, intermediate, advanced

    # Style effectiveness scores (learned from engagement)
    style_effectiveness: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )  # {"simple": 0.8, "technical": 0.6, ...}

    # Learning modality preferences
    preferred_modalities: Mapped[list | None] = mapped_column(
        JSONB, nullable=True
    )  # ["visual", "text", "analogy"]

    # Content complexity preference
    prefers_detailed: Mapped[bool] = mapped_column(
        # Whether user prefers detailed vs concise explanations
        default=True,
        nullable=False,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
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
        back_populates="learning_preferences",
        uselist=False,
    )

    def __repr__(self) -> str:
        return f"<UserLearningPreference(id={self.id}, user_id={self.user_id}, preferred_style={self.preferred_style})>"
