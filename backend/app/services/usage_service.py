"""Usage tracking service for PMP 2026 Study Application.

This service provides methods to track and query user usage for tier limits.
It handles daily and monthly limits for flashcards, questions, and exams.
"""

from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from enum import Enum

from sqlalchemy import select, and_
from sqlalchemy.orm import Session

from app.models.subscription import UsageTracking
from app.models.user import Tier, User


class LimitPeriod(str, Enum):
    """Period for limit tracking."""

    DAILY = "daily"
    MONTHLY = "monthly"


class ResourceType(str, Enum):
    """Types of resources that can be limited."""

    FLASHCARD = "flashcard"
    QUESTION = "question"
    MINI_EXAM = "mini_exam"
    FULL_EXAM = "full_exam"


@dataclass
class UsageStats:
    """Usage statistics for a user."""

    user_id: str
    tier: Tier
    period: LimitPeriod

    # Current usage counts
    flashcards_viewed: int
    questions_answered: int
    mini_exams_taken: int
    full_exams_taken: int

    # Limits
    flashcard_limit: int
    question_limit: int
    mini_exam_limit: int
    full_exam_limit: int

    # Remaining counts
    flashcards_remaining: int | None
    questions_remaining: int | None
    mini_exams_remaining: int | None
    full_exams_remaining: int | None

    # Reset time
    reset_at: datetime | None


class UsageService:
    """
    Service for tracking and querying user usage.

    Provides methods to:
    - Get current usage statistics
    - Check if a user can perform an action
    - Record usage for actions
    - Get usage history
    """

    # Tier limits configuration
    TIER_LIMITS = {
        Tier.PUBLIC: {
            "flashcards_per_day": 50,
            "questions_per_day": 30,
            "mini_exams_per_day": 1,
            "mini_exams_per_month": 1,
            "full_exams_per_day": 0,
            "full_exams_per_month": 0,
        },
        Tier.FREE: {
            "flashcards_per_day": -1,  # Unlimited
            "questions_per_day": -1,
            "mini_exams_per_day": -1,
            "mini_exams_per_month": 2,
            "full_exams_per_day": 0,
            "full_exams_per_month": 0,
        },
        Tier.PREMIUM: {
            "flashcards_per_day": -1,
            "questions_per_day": -1,
            "mini_exams_per_day": -1,
            "mini_exams_per_month": -1,
            "full_exams_per_day": -1,
            "full_exams_per_month": -1,
        },
    }

    def __init__(self, db: Session):
        """Initialize the usage service with a database session."""
        self.db = db

    def _get_today_start(self) -> datetime:
        """Get the start of today in UTC."""
        return datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    def _get_month_start(self) -> datetime:
        """Get the start of the current month in UTC."""
        now = datetime.now(timezone.utc)
        return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    def _get_period_limits(self, tier: Tier, period: LimitPeriod) -> dict[str, int]:
        """Get limits for a tier and period."""
        tier_limits = self.TIER_LIMITS.get(tier, self.TIER_LIMITS[Tier.PUBLIC])

        if period == LimitPeriod.DAILY:
            return {
                "flashcard": tier_limits["flashcards_per_day"],
                "question": tier_limits["questions_per_day"],
                "mini_exam": tier_limits["mini_exams_per_day"],
                "full_exam": tier_limits["full_exams_per_day"],
            }
        else:  # MONTHLY
            return {
                "flashcard": -1,  # No monthly limits for flashcards/questions
                "question": -1,
                "mini_exam": tier_limits["mini_exams_per_month"],
                "full_exam": tier_limits["full_exams_per_month"],
            }

    def _get_usage_for_period(
        self, user_id: str, period_start: datetime
    ) -> UsageTracking | None:
        """Get usage tracking record for a specific period."""
        stmt = select(UsageTracking).where(
            and_(
                UsageTracking.user_id == user_id,
                UsageTracking.tracking_date >= period_start,
            )
        )
        return self.db.execute(stmt).scalar_one_or_none()

    def get_usage_stats(
        self, user: User, period: LimitPeriod = LimitPeriod.DAILY
    ) -> UsageStats:
        """
        Get current usage statistics for a user.

        Args:
            user: User to get stats for
            period: Period to get stats for (daily or monthly)

        Returns:
            UsageStats with current usage, limits, and remaining counts
        """
        # Get period start and reset time
        if period == LimitPeriod.DAILY:
            period_start = self._get_today_start()
            reset_at = period_start + timedelta(days=1)
        else:
            period_start = self._get_month_start()
            # Next month
            if period_start.month == 12:
                reset_at = period_start.replace(year=period_start.year + 1, month=1)
            else:
                reset_at = period_start.replace(month=period_start.month + 1)

        # Get limits for this tier and period
        limits = self._get_period_limits(user.tier, period)

        # Get usage tracking record
        usage = self._get_usage_for_period(str(user.id), period_start)

        # Initialize usage counts
        flashcards_viewed = 0
        questions_answered = 0
        mini_exams_taken = 0
        full_exams_taken = 0

        if usage:
            flashcards_viewed = usage.flashcards_viewed
            questions_answered = usage.questions_answered
            mini_exams_taken = usage.mini_exams_taken
            full_exams_taken = usage.full_exams_taken

        # Calculate remaining
        def calc_remaining(used: int, limit: int) -> int | None:
            if limit == -1:
                return None  # Unlimited
            return max(0, limit - used)

        return UsageStats(
            user_id=str(user.id),
            tier=user.tier,
            period=period,
            flashcards_viewed=flashcards_viewed,
            questions_answered=questions_answered,
            mini_exams_taken=mini_exams_taken,
            full_exams_taken=full_exams_taken,
            flashcard_limit=limits["flashcard"],
            question_limit=limits["question"],
            mini_exam_limit=limits["mini_exam"],
            full_exam_limit=limits["full_exam"],
            flashcards_remaining=calc_remaining(flashcards_viewed, limits["flashcard"]),
            questions_remaining=calc_remaining(questions_answered, limits["question"]),
            mini_exams_remaining=calc_remaining(mini_exams_taken, limits["mini_exam"]),
            full_exams_remaining=calc_remaining(full_exams_taken, limits["full_exam"]),
            reset_at=reset_at,
        )

    def can_perform_action(
        self, user: User, resource_type: ResourceType, period: LimitPeriod = LimitPeriod.DAILY
    ) -> tuple[bool, int | None, datetime | None]:
        """
        Check if a user can perform an action.

        Args:
            user: User to check
            resource_type: Type of resource to access
            period: Period to check (daily or monthly)

        Returns:
            Tuple of (allowed, remaining, reset_at)
        """
        stats = self.get_usage_stats(user, period)

        if resource_type == ResourceType.FLASHCARD:
            limit = stats.flashcard_limit
            remaining = stats.flashcards_remaining
        elif resource_type == ResourceType.QUESTION:
            limit = stats.question_limit
            remaining = stats.questions_remaining
        elif resource_type == ResourceType.MINI_EXAM:
            limit = stats.mini_exam_limit
            remaining = stats.mini_exams_remaining
        else:  # FULL_EXAM
            limit = stats.full_exam_limit
            remaining = stats.full_exams_remaining

        if limit == 0:
            return False, 0, stats.reset_at
        if limit == -1:
            return True, None, None

        return remaining is not None and remaining > 0, remaining, stats.reset_at

    def record_usage(
        self, user: User, resource_type: ResourceType, period: LimitPeriod = LimitPeriod.DAILY
    ) -> UsageTracking:
        """
        Record usage for a user action.

        Args:
            user: User to record usage for
            resource_type: Type of resource being accessed
            period: Period to record for (daily or monthly)

        Returns:
            The created or updated UsageTracking record
        """
        period_start = self._get_today_start() if period == LimitPeriod.DAILY else self._get_month_start()

        # Get or create usage tracking record
        usage = self._get_usage_for_period(str(user.id), period_start)

        if usage is None:
            from app.models.subscription import UsageTracking as UsageModel

            usage = UsageModel(
                user_id=user.id,
                tracking_date=period_start,
            )
            self.db.add(usage)

        # Increment the appropriate counter
        if resource_type == ResourceType.FLASHCARD:
            usage.flashcards_viewed += 1
        elif resource_type == ResourceType.QUESTION:
            usage.questions_answered += 1
        elif resource_type == ResourceType.MINI_EXAM:
            usage.mini_exams_taken += 1
        elif resource_type == ResourceType.FULL_EXAM:
            usage.full_exams_taken += 1

        self.db.commit()
        self.db.refresh(usage)

        return usage

    def get_usage_history(
        self, user: User, days: int = 30
    ) -> list[UsageTracking]:
        """
        Get usage history for a user.

        Args:
            user: User to get history for
            days: Number of days of history to retrieve

        Returns:
            List of UsageTracking records
        """
        start_date = self._get_today_start() - timedelta(days=days)

        stmt = select(UsageTracking).where(
            and_(
                UsageTracking.user_id == user.id,
                UsageTracking.tracking_date >= start_date,
            )
        ).order_by(UsageTracking.tracking_date.desc())

        return list(self.db.execute(stmt).scalars().all())

    def reset_daily_usage(self, user: User) -> None:
        """
        Reset daily usage for a user.
        Useful for testing or manual resets.

        Args:
            user: User to reset usage for
        """
        today = self._get_today_start()

        stmt = select(UsageTracking).where(
            and_(
                UsageTracking.user_id == user.id,
                UsageTracking.tracking_date >= today,
            )
        )

        usage = self.db.execute(stmt).scalar_one_or_none()

        if usage:
            usage.flashcards_viewed = 0
            usage.questions_answered = 0
            usage.mini_exams_taken = 0
            usage.full_exams_taken = 0
            self.db.commit()


def create_usage_service(db: Session) -> UsageService:
    """Factory function to create a UsageService instance."""
    return UsageService(db)
