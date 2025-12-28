"""Analytics models for user learning insights and recommendations."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.domain import Domain
    from app.models.task import Task
    from app.models.user import User


class UserAnalytics(Base):
    """
    User analytics model for tracking learning performance metrics.

    Stores aggregated statistics about user performance across domains,
    including accuracy rates, response times, and strong/weak domain identification.
    """

    __tablename__ = "user_analytics"

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

    # Overall performance metrics
    total_questions_answered: Mapped[int] = mapped_column(
        Integer, nullable=False, default=0
    )

    overall_accuracy: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )

    avg_response_time: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )  # Average response time in seconds

    # Domain-level performance stored as JSON
    # Format: [{"domain_id": 1, "accuracy": 0.85, "count": 100}, ...]
    strong_domains: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )

    weak_domains: Mapped[dict | None] = mapped_column(
        JSONB, nullable=True
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    last_updated: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="analytics",
    )

    recommendations: Mapped[list["LearningRecommendation"]] = relationship(
        "LearningRecommendation",
        back_populates="user_analytics",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<UserAnalytics(id={self.id}, user_id={self.user_id}, "
            f"accuracy={self.overall_accuracy:.2%})>"
        )


class LearningRecommendation(Base):
    """
    Learning recommendation model for personalized study suggestions.

    Stores recommendations for users to improve weak areas or reinforce
    strong domains based on their performance analytics.
    """

    __tablename__ = "learning_recommendations"

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

    # The analytics record that generated this recommendation
    user_analytics_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("user_analytics.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Target of the recommendation (optional - may be general advice)
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

    # Recommendation details
    recommendation_type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )
    # Types: "focus_weak_domain", "review_task", "practice_more", "reinforce_strength"

    priority: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
    )  # Higher = more urgent

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    user_analytics: Mapped["UserAnalytics"] = relationship(
        "UserAnalytics",
        back_populates="recommendations",
    )

    domain: Mapped["Domain | None"] = relationship(
        "Domain",
    )

    task: Mapped["Task | None"] = relationship(
        "Task",
    )

    def __repr__(self) -> str:
        return (
            f"<LearningRecommendation(id={self.id}, type='{self.recommendation_type}', "
            f"priority={self.priority})>"
        )
