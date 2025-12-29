"""Subscription and usage tracking models for monetization."""

import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class SubscriptionStatus(str, Enum):
    """Status of a subscription."""

    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PENDING = "pending"


class SubscriptionPeriod(str, Enum):
    """Subscription billing period."""

    MONTHLY = "monthly"
    YEARLY = "yearly"


class Subscription(Base):
    """
    Subscription model for tracking premium user subscriptions.

    Integrates with PayPal for payment processing.
    """

    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="cascade"),
        nullable=False,
        index=True,
    )

    # PayPal subscription ID
    paypal_subscription_id: Mapped[str | None] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=True,
    )

    # PayPal plan ID
    paypal_plan_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    status: Mapped[SubscriptionStatus] = mapped_column(
        String(20),
        default=SubscriptionStatus.PENDING,
        nullable=False,
        index=True,
    )

    period: Mapped[SubscriptionPeriod] = mapped_column(
        String(10),
        nullable=False,
    )

    # Pricing in USD
    amount: Mapped[float] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )

    # Subscription period
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

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

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="subscriptions",
    )

    def __repr__(self) -> str:
        """String representation of Subscription."""
        return f"<Subscription(id={self.id}, user_id={self.user_id}, status={self.status}, period={self.period})>"


class UsageTracking(Base):
    """
    Track daily usage limits for public/free tier users.

    Resets daily at midnight UTC.
    """

    __tablename__ = "usage_tracking"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="cascade"),
        nullable=False,
        index=True,
    )

    # Date for tracking (UTC date)
    tracking_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )

    # Flashcard usage
    flashcards_viewed: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    # Questions answered
    questions_answered: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    # Mini-exams taken (25 questions each)
    mini_exams_taken: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

    # Full exams taken (185 questions)
    full_exams_taken: Mapped[int] = mapped_column(
        default=0,
        nullable=False,
    )

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

    # Relationship
    user: Mapped["User"] = relationship(
        "User",
        back_populates="usage_tracking",
    )

    def __repr__(self) -> str:
        """String representation of UsageTracking."""
        return f"<UsageTracking(id={self.id}, user_id={self.user_id}, date={self.tracking_date})>"
