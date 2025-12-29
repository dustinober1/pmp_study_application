"""Flashcard API routes for PMP 2026 Study Application."""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.middleware.tier_middleware import LimitType, enforce_limit, TierGate
from app.models.flashcard import Flashcard
from app.models.progress import FlashcardProgress
from app.models.task import Task
from app.models.user import User
from app.schemas.flashcard import (
    FlashcardReviewRequest,
    FlashcardReviewResponse,
    FlashcardWithProgressResponse,
)

router = APIRouter(prefix="/api/flashcards", tags=["flashcards"])


def get_or_create_user(db: Session, anonymous_id: str) -> User:
    """Get existing user by anonymous_id or create a new one."""
    stmt = select(User).where(User.anonymous_id == anonymous_id)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        user = User(anonymous_id=anonymous_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def calculate_sm2(
    quality: int,
    ease_factor: float,
    interval: int,
    repetitions: int,
) -> tuple[float, int, int]:
    """
    Calculate the next review interval using the SM-2 algorithm.

    SM-2 Algorithm:
    - Quality ratings: 0-5 (0-2 = failed, 3-5 = success)
    - Ease factor (EF) adjustment based on quality
    - EF range: 1.3 to 2.5 (starts at 2.5)
    - After a failure (quality < 3), repetitions reset to 0

    Args:
        quality: Quality of response (0-5)
        ease_factor: Current ease factor
        interval: Current interval in days
        repetitions: Number of successful repetitions

    Returns:
        Tuple of (new_ease_factor, new_interval, new_repetitions)
    """
    # Calculate new ease factor using SM-2 formula
    # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    new_ef = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))

    # Clamp ease factor between 1.3 and 2.5
    new_ef = max(1.3, min(2.5, new_ef))

    if quality < 3:
        # Failed response - reset repetitions and start over
        new_repetitions = 0
        new_interval = 1
    else:
        # Successful response
        new_repetitions = repetitions + 1

        if new_repetitions == 1:
            new_interval = 1
        elif new_repetitions == 2:
            new_interval = 6
        else:
            # After second repetition: interval = previous_interval * EF
            new_interval = round(interval * new_ef)

    return new_ef, new_interval, new_repetitions


@router.get("/due/count")
async def get_due_flashcards_count(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    domain: Annotated[int | None, Query(description="Filter by domain ID")] = None,
) -> dict:
    """Get count of flashcards due for review."""
    user = get_or_create_user(db, x_anonymous_id)
    now = datetime.now(timezone.utc)

    # Build query for due flashcards
    stmt = (
        select(FlashcardProgress)
        .where(
            FlashcardProgress.user_id == user.id,
            FlashcardProgress.next_review_at <= now,
        )
    )

    if domain is not None:
        stmt = (
            stmt
            .join(Flashcard, FlashcardProgress.flashcard_id == Flashcard.id)
            .join(Task, Flashcard.task_id == Task.id)
            .where(Task.domain_id == domain)
        )

    due_records = db.execute(stmt).scalars().all()

    return {
        "count": len(due_records),
        "flashcard_ids": [r.flashcard_id for r in due_records],
    }


@router.get("", response_model=list[FlashcardWithProgressResponse])
async def get_flashcards(
    db: Annotated[Session, Depends(get_db)],
    domain: Annotated[int | None, Query(description="Filter by domain ID")] = None,
    task: Annotated[int | None, Query(description="Filter by task ID")] = None,
    x_anonymous_id: Annotated[str | None, Header(alias="X-Anonymous-Id")] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Max results")] = 50,
    offset: Annotated[int, Query(ge=0, description="Offset for pagination")] = 0,
) -> list[FlashcardWithProgressResponse]:
    """
    Get flashcards with optional domain/task filtering.

    Filters:
    - domain: Filter by domain ID
    - task: Filter by task ID (takes precedence over domain filter)

    Returns flashcards with user's progress if X-Anonymous-Id header is provided.
    """
    # Build the query
    stmt = select(Flashcard).options(joinedload(Flashcard.task).joinedload(Task.domain))

    if task is not None:
        # Filter by specific task
        stmt = stmt.where(Flashcard.task_id == task)
    elif domain is not None:
        # Filter by domain - need to join through Task
        stmt = stmt.join(Flashcard.task).where(Task.domain_id == domain)

    # Add ordering, offset, and limit
    stmt = stmt.order_by(Flashcard.id).offset(offset).limit(limit)

    flashcards = db.execute(stmt).scalars().unique().all()

    # Get user's progress if anonymous_id provided
    progress_map: dict[int, FlashcardProgress] = {}
    if x_anonymous_id:
        user = get_or_create_user(db, x_anonymous_id)

        flashcard_ids = [f.id for f in flashcards]
        if flashcard_ids:
            progress_stmt = select(FlashcardProgress).where(
                FlashcardProgress.user_id == user.id,
                FlashcardProgress.flashcard_id.in_(flashcard_ids),
            )
            progress_records = db.execute(progress_stmt).scalars().all()
            progress_map = {p.flashcard_id: p for p in progress_records}

    # Build response
    result = []
    for flashcard in flashcards:
        progress = progress_map.get(flashcard.id)
        result.append(
            FlashcardWithProgressResponse(
                id=flashcard.id,
                task_id=flashcard.task_id,
                front=flashcard.front,
                back=flashcard.back,
                created_at=flashcard.created_at,
                updated_at=flashcard.updated_at,
                progress=progress,
            )
        )

    return result


@router.get("/{flashcard_id}", response_model=FlashcardWithProgressResponse)
async def get_flashcard(
    flashcard_id: int,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str | None, Header(alias="X-Anonymous-Id")] = None,
) -> FlashcardWithProgressResponse:
    """Get a single flashcard by ID with optional user progress."""
    stmt = select(Flashcard).where(Flashcard.id == flashcard_id)
    flashcard = db.execute(stmt).scalar_one_or_none()

    if flashcard is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard with id {flashcard_id} not found",
        )

    # Get user's progress if anonymous_id provided
    progress = None
    if x_anonymous_id:
        user = get_or_create_user(db, x_anonymous_id)
        progress_stmt = select(FlashcardProgress).where(
            FlashcardProgress.user_id == user.id,
            FlashcardProgress.flashcard_id == flashcard_id,
        )
        progress = db.execute(progress_stmt).scalar_one_or_none()

    return FlashcardWithProgressResponse(
        id=flashcard.id,
        task_id=flashcard.task_id,
        front=flashcard.front,
        back=flashcard.back,
        created_at=flashcard.created_at,
        updated_at=flashcard.updated_at,
        progress=progress,
    )


@router.post("/{flashcard_id}/review", response_model=FlashcardReviewResponse)
async def submit_flashcard_review(
    flashcard_id: int,
    review: FlashcardReviewRequest,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> FlashcardReviewResponse:
    """
    Submit a flashcard review using the SM-2 spaced repetition algorithm.

    Quality ratings:
    - 0: Complete blackout, no recall
    - 1: Incorrect, but recognized answer when shown
    - 2: Incorrect, but answer seemed easy to recall
    - 3: Correct with serious difficulty
    - 4: Correct after hesitation
    - 5: Perfect recall

    Quality < 3 is considered a failure and resets the repetition count.

    Tier limits:
    - Public: 50 flashcards/day
    - Free: Unlimited flashcards
    - Premium: Unlimited flashcards
    """
    # Verify flashcard exists
    flashcard_stmt = select(Flashcard).where(Flashcard.id == flashcard_id)
    flashcard = db.execute(flashcard_stmt).scalar_one_or_none()

    if flashcard is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Flashcard with id {flashcard_id} not found",
        )

    # Get or create user
    user = get_or_create_user(db, x_anonymous_id)

    # Enforce tier limit for flashcard views
    enforce_limit(LimitType.FLASHCARD_VIEW)(user, db)

    # Get or create progress record
    progress_stmt = select(FlashcardProgress).where(
        FlashcardProgress.user_id == user.id,
        FlashcardProgress.flashcard_id == flashcard_id,
    )
    progress = db.execute(progress_stmt).scalar_one_or_none()

    if progress is None:
        # Create new progress record with default SM-2 values
        progress = FlashcardProgress(
            user_id=user.id,
            flashcard_id=flashcard_id,
            ease_factor=2.5,
            interval=0,
            repetitions=0,
            review_count=0,
            correct_count=0,
        )
        db.add(progress)

    # Calculate new SM-2 values
    new_ef, new_interval, new_repetitions = calculate_sm2(
        quality=review.quality,
        ease_factor=progress.ease_factor,
        interval=progress.interval,
        repetitions=progress.repetitions,
    )

    # Update progress record
    progress.ease_factor = new_ef
    progress.interval = new_interval
    progress.repetitions = new_repetitions
    progress.last_quality = review.quality
    progress.last_reviewed_at = datetime.now(timezone.utc)
    progress.next_review_at = datetime.now(timezone.utc) + timedelta(days=new_interval)
    progress.review_count += 1

    # Count correct responses (quality >= 3)
    if review.quality >= 3:
        progress.correct_count += 1

    db.commit()
    db.refresh(progress)

    # Trigger analytics recalculation after progress update
    from app.services.adaptive_engine import calculate_user_analytics
    try:
        calculate_user_analytics(db, user.id)
    except Exception:
        # Analytics calculation should not block the response
        pass

    return FlashcardReviewResponse(
        flashcard_id=flashcard_id,
        quality=review.quality,
        ease_factor=progress.ease_factor,
        interval=progress.interval,
        next_review_at=progress.next_review_at,
        message="Review recorded successfully",
    )
