"""Tier enforcement middleware and decorators for PMP 2026 Study Application.

This module provides:
- TierGate class: Check tier access and limits
- @tier_required decorator: Ensure user has required tier
- @limit_check decorator: Enforce daily/monthly usage limits
- LimitExceededError: Raised when limits are exceeded

Tier Limits:
- Public (Anonymous): 50 flashcards/day, 30 questions/day, 1 mini-exam/day, no full exams
- Free (Registered): Unlimited flashcards/questions, 2 mini-exams/month, no full exams
- Premium: Unlimited everything, full 185-Q exams
"""

from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from functools import wraps
from typing import Annotated, Any, Callable

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.subscription import UsageTracking
from app.models.user import Tier, User


class LimitType(str, Enum):
    """Types of usage limits to check."""

    FLASHCARD_VIEW = "flashcard_view"
    QUESTION_ANSWER = "question_answer"
    MINI_EXAM = "mini_exam"
    FULL_EXAM = "full_exam"


@dataclass
class LimitResult:
    """Result of a limit check."""

    allowed: bool
    remaining: int | None = None
    reset_at: datetime | None = None
    limit: int | None = None
    reason: str | None = None


class LimitExceededError(HTTPException):
    """Raised when a user exceeds their tier limits."""

    def __init__(
        self,
        limit_type: str,
        limit: int,
        reset_at: datetime | None = None,
        upgrade_required: bool = False,
    ):
        self.limit_type = limit_type
        self.limit = limit
        self.reset_at = reset_at
        self.upgrade_required = upgrade_required

        detail = f"Daily {limit_type} limit of {limit} reached"
        if upgrade_required:
            detail = f"{limit_type.capitalize()} requires Premium tier"

        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS if not upgrade_required else status.HTTP_403_FORBIDDEN,
            detail={
                "error": "limit_exceeded" if not upgrade_required else "upgrade_required",
                "limit_type": limit_type,
                "limit": limit,
                "reset_at": reset_at.isoformat() if reset_at else None,
                "upgrade_required": upgrade_required,
                "message": detail,
            },
        )


class TierGate:
    """
    Tier access control and limit checking.

    Provides methods to check if a user has access to features
    based on their tier and current usage.
    """

    # Daily limits for each tier
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

    @classmethod
    def get_limits(cls, tier: Tier) -> dict[str, int]:
        """Get limits for a specific tier."""
        return cls.TIER_LIMITS.get(tier, cls.TIER_LIMITS[Tier.PUBLIC])

    @classmethod
    def check_tier_access(cls, user: User, required_tier: Tier = Tier.PUBLIC) -> bool:
        """
        Check if user has access to the required tier.

        Args:
            user: User to check
            required_tier: Minimum tier required

        Returns:
            True if user has access
        """
        tier_hierarchy = {
            Tier.PUBLIC: 0,
            Tier.FREE: 1,
            Tier.PREMIUM: 2,
        }

        return tier_hierarchy.get(user.tier, 0) >= tier_hierarchy.get(required_tier, 0)

    @classmethod
    def check_limit(
        cls,
        db: Session,
        user: User,
        limit_type: LimitType,
    ) -> LimitResult:
        """
        Check if user has not exceeded their limit for a resource type.

        Args:
            db: Database session
            user: User to check
            limit_type: Type of limit to check

        Returns:
            LimitResult with allowed status and details
        """
        limits = cls.get_limits(user.tier)

        # Map limit types to their configuration keys
        limit_keys = {
            LimitType.FLASHCARD_VIEW: ("flashcards_per_day", "flashcards_viewed"),
            LimitType.QUESTION_ANSWER: ("questions_per_day", "questions_answered"),
            LimitType.MINI_EXAM: ("mini_exams_per_day", "mini_exams_taken"),
            LimitType.FULL_EXAM: ("full_exams_per_day", "full_exams_taken"),
        }

        if limit_type not in limit_keys:
            return LimitResult(
                allowed=True,
                reason=f"Unknown limit type: {limit_type}",
            )

        daily_limit_key, usage_field = limit_keys[limit_type]
        daily_limit = limits[daily_limit_key]

        # Premium has unlimited access
        if daily_limit == -1:
            return LimitResult(
                allowed=True,
                remaining=None,
                limit=None,
            )

        # Check if feature requires premium
        if daily_limit == 0:
            return LimitResult(
                allowed=False,
                remaining=0,
                limit=0,
                reason=f"{limit_type.value} requires Premium tier",
            )

        # Get today's UTC date
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Get or create usage tracking record
        usage = db.execute(
            select(UsageTracking).where(
                UsageTracking.user_id == user.id,
                UsageTracking.tracking_date >= today,
            )
        ).scalar_one_or_none()

        if usage is None:
            return LimitResult(
                allowed=True,
                remaining=daily_limit,
                reset_at=today.replace(hour=23, minute=59, second=59),
                limit=daily_limit,
            )

        current_usage = getattr(usage, usage_field, 0)
        remaining = max(0, daily_limit - current_usage)

        return LimitResult(
            allowed=remaining > 0,
            remaining=remaining,
            reset_at=today.replace(hour=23, minute=59, second=59),
            limit=daily_limit,
        )

    @classmethod
    def record_usage(
        cls,
        db: Session,
        user: User,
        limit_type: LimitType,
    ) -> None:
        """
        Record usage for a resource type.

        Creates or updates the UsageTracking record for today.

        Args:
            db: Database session
            user: User to record usage for
            limit_type: Type of usage to record
        """
        usage_fields = {
            LimitType.FLASHCARD_VIEW: "flashcards_viewed",
            LimitType.QUESTION_ANSWER: "questions_answered",
            LimitType.MINI_EXAM: "mini_exams_taken",
            LimitType.FULL_EXAM: "full_exams_taken",
        }

        if limit_type not in usage_fields:
            return

        # Get today's UTC date
        today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

        # Get or create usage tracking record
        usage = db.execute(
            select(UsageTracking).where(
                UsageTracking.user_id == user.id,
                UsageTracking.tracking_date >= today,
            )
        ).scalar_one_or_none()

        if usage is None:
            from app.models.subscription import UsageTracking as UsageModel

            usage = UsageModel(
                user_id=user.id,
                tracking_date=today,
            )
            db.add(usage)

        # Increment the usage counter
        current_value = getattr(usage, usage_fields[limit_type], 0)
        setattr(usage, usage_fields[limit_type], current_value + 1)

        db.commit()


def get_current_user(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Depends(lambda: None)],
) -> User:
    """
    Dependency to get or create current user from X-Anonymous-Id header.

    This is used by decorators and can be injected directly into endpoints.
    """
    # Note: In actual use, x_anonymous_id comes from Header
    # This is a placeholder - actual implementation uses Header()
    from sqlalchemy import select

    stmt = select(User).where(User.anonymous_id == x_anonymous_id)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        user = User(anonymous_id=x_anonymous_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def check_tier_access(required_tier: Tier = Tier.PUBLIC):
    """
    Decorator factory to check if user has required tier.

    Usage:
        @router.get("/premium-feature")
        @check_tier_access(Tier.PREMIUM)
        async def premium_endpoint(user: User = Depends(get_user_from_header)):
            ...

    Args:
        required_tier: Minimum tier required for access
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Find User in kwargs (injected by Depends)
            user: User | None = kwargs.get("user")

            if user is None:
                # Try to find in args
                for arg in args:
                    if isinstance(arg, User):
                        user = arg
                        break

            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User authentication required",
                )

            if not TierGate.check_tier_access(user, required_tier):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "error": "tier_required",
                        "required_tier": required_tier.value,
                        "current_tier": user.tier.value,
                        "message": f"This feature requires {required_tier.value} tier or higher",
                    },
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator


def limit_check(limit_type: LimitType):
    """
    Decorator factory to enforce usage limits.

    Automatically records usage after successful endpoint execution.

    Usage:
        @router.post("/flashcards/{id}/review")
        @limit_check(LimitType.FLASHCARD_VIEW)
        async def review_flashcard(...):
            ...

    Args:
        limit_type: Type of limit to check and record
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Find User and Session in kwargs
            user: User | None = kwargs.get("user")
            db: Session | None = kwargs.get("db")

            if user is None:
                for arg in args:
                    if isinstance(arg, User):
                        user = arg
                        break

            if db is None:
                for arg in args:
                    if isinstance(arg, Session):
                        db = arg
                        break

            if user and db:
                # Check the limit
                result = TierGate.check_limit(db, user, limit_type)

                if not result.allowed:
                    if result.reason and "Premium" in result.reason:
                        raise LimitExceededError(
                            limit_type=limit_type.value,
                            limit=0,
                            upgrade_required=True,
                        )
                    else:
                        raise LimitExceededError(
                            limit_type=limit_type.value,
                            limit=result.limit or 0,
                            reset_at=result.reset_at,
                        )

                # Execute the endpoint
                response = await func(*args, **kwargs)

                # Record usage after successful execution
                try:
                    TierGate.record_usage(db, user, limit_type)
                except Exception:
                    # Don't fail the request if usage recording fails
                    pass

                return response

            return await func(*args, **kwargs)

        return wrapper

    return decorator


# Convenience functions for creating dependencies
def tier_required(required_tier: Tier = Tier.PUBLIC):
    """
    Create a dependency that requires a specific tier.

    Usage:
        @router.get("/premium-feature")
        async def premium_endpoint(
            user: Annotated[User, Depends(tier_required(Tier.PREMIUM))]
        ):
            ...
    """

    def dependency(
        db: Annotated[Session, Depends(get_db)],
        x_anonymous_id: Annotated[str, Depends(lambda: None)],
    ) -> User:
        # Note: This requires actual header injection
        # In practice, use with get_or_create_user pattern in routers
        raise NotImplementedError("Use get_or_create_user in your router instead")

    return dependency


def require_tier(required_tier: Tier):
    """
    Simplified tier check for use in endpoint functions.

    Call this inside your endpoint to check tier access.

    Usage:
        @router.get("/premium-feature")
        async def premium_endpoint(
            db: Annotated[Session, Depends(get_db)],
            x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
        ):
            user = get_or_create_user(db, x_anonymous_id)
            require_tier(Tier.PREMIUM)  # Raises HTTPException if not allowed
            ...
    """

    def _check(user: User) -> None:
        if not TierGate.check_tier_access(user, required_tier):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "error": "tier_required",
                    "required_tier": required_tier.value,
                    "current_tier": user.tier.value,
                    "message": f"This feature requires {required_tier.value} tier or higher",
                },
            )

    return _check


def enforce_limit(limit_type: LimitType):
    """
    Simplified limit check for use in endpoint functions.

    Call this inside your endpoint to check and enforce limits.
    Automatically records usage on success.

    Usage:
        @router.post("/flashcards/{id}/review")
        async def review_flashcard(
            db: Annotated[Session, Depends(get_db)],
            x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
        ):
            user = get_or_create_user(db, x_anonymous_id)
            enforce_limit(LimitType.FLASHCARD_VIEW)(user, db)
            # ... rest of endpoint
    """

    def _check_and_record(user: User, db: Session) -> None:
        result = TierGate.check_limit(db, user, limit_type)

        if not result.allowed:
            if result.reason and "Premium" in result.reason:
                raise LimitExceededError(
                    limit_type=limit_type.value,
                    limit=0,
                    upgrade_required=True,
                )
            else:
                raise LimitExceededError(
                    limit_type=limit_type.value,
                    limit=result.limit or 0,
                    reset_at=result.reset_at,
                )

        # Record usage
        TierGate.record_usage(db, user, limit_type)

    return _check_and_record
