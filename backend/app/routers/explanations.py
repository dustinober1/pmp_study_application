"""Explanation API routes for adaptive learning feature."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services.adaptive_explanation import (
    AdaptiveExplanationEngine,
    get_explanation_for_content,
    get_user_style_analytics,
)

router = APIRouter(prefix="/api/explanations", tags=["explanations"])


def get_or_create_user(db: Session, anonymous_id: str) -> User:
    """Get existing user or create a new anonymous user."""
    user = db.execute(
        select(User).where(User.anonymous_id == anonymous_id)
    ).scalar_one_or_none()

    if not user:
        user = User(anonymous_id=anonymous_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.get("/{content_type}/{content_id}")
async def get_explanation(
    content_type: str,
    content_id: int,
    db: Annotated[Session, Depends(get_db)],
    style: Annotated[
        str | None, Query(description="Preferred explanation style override")] = None,
    x_anonymous_id: Annotated[
        str | None, Header(description="Browser-generated anonymous user ID")
    ] = None,
) -> dict:
    """
    Get an adaptive explanation for content.

    - **content_type**: Type of content ('question' or 'flashcard')
    - **content_id**: ID of the question or flashcard
    - **style**: Optional style override (simple, technical, analogy, visual, story)

    Returns a personalized explanation based on user learning preferences.
    The explanation style adapts based on:
    - User's preferred style (if set)
    - User's expertise level
    - Historical engagement with different styles

    The response includes:
    - explanation: The explanation text
    - style: The style used
    - alternative_styles: Other available styles
    - is_personalized: Whether this was based on user preferences
    """
    if not x_anonymous_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Anonymous-Id header is required",
        )

    # Validate content_type
    if content_type not in ("question", "flashcard"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="content_type must be 'question' or 'flashcard'",
        )

    # Get user
    user = get_or_create_user(db, x_anonymous_id)

    # Get explanation
    engine = AdaptiveExplanationEngine(db)
    result = engine.get_explanation(
        user_id=user.id,
        content_type=content_type,
        content_id=content_id,
        preferred_style=style,
    )

    return result


@router.post("/{content_type}/{content_id}/rate")
async def rate_explanation(
    content_type: str,
    content_id: int,
    was_helpful: bool,
    style: str,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[
        str | None, Header(description="Browser-generated anonymous user ID")
    ] = None,
    time_spent_seconds: Annotated[
        int | None, Query(description="Time spent reading the explanation")]
    = None,
) -> dict:
    """
    Rate an explanation for adaptive learning.

    - **content_type**: Type of content ('question' or 'flashcard')
    - **content_id**: ID of the question or flashcard
    - **style**: The explanation style being rated
    - **was_helpful**: Whether the user found the explanation helpful
    - **time_spent_seconds**: Optional time spent reading

    This feedback helps the system learn which explanation styles
    work best for each user.
    """
    if not x_anonymous_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Anonymous-Id header is required",
        )

    if content_type not in ("question", "flashcard"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="content_type must be 'question' or 'flashcard'",
        )

    # Get user
    user = get_or_create_user(db, x_anonymous_id)

    # Rate explanation
    engine = AdaptiveExplanationEngine(db)
    result = engine.rate_explanation(
        user_id=user.id,
        content_type=content_type,
        content_id=content_id,
        style=style,
        was_helpful=was_helpful,
        time_spent_seconds=time_spent_seconds,
    )

    return result


@router.post("/{content_type}/{content_id}/performance")
async def record_performance(
    content_type: str,
    content_id: int,
    was_correct: bool,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[
        str | None, Header(description="Browser-generated anonymous user ID")
    ] = None,
) -> dict:
    """
    Record subsequent performance after viewing an explanation.

    - **content_type**: Type of content ('question' or 'flashcard')
    - **content_id**: ID of the question or flashcard
    - **was_correct**: Whether the user answered correctly after the explanation

    This helps the system learn which explanations lead to better outcomes.
    """
    if not x_anonymous_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Anonymous-Id header is required",
        )

    if content_type not in ("question", "flashcard"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="content_type must be 'question' or 'flashcard'",
        )

    # Get user
    user = get_or_create_user(db, x_anonymous_id)

    # Record performance
    engine = AdaptiveExplanationEngine(db)
    engine.record_subsequent_performance(
        user_id=user.id,
        content_type=content_type,
        content_id=content_id,
        was_correct=was_correct,
    )

    return {"message": "Performance recorded"}


@router.get("/preferences/me")
async def get_my_preferences(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[
        str | None, Header(description="Browser-generated anonymous user ID")
    ] = None,
) -> dict:
    """
    Get current user's learning preferences.

    Returns the user's explanation style preferences and
    effectiveness scores for different styles.
    """
    if not x_anonymous_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Anonymous-Id header is required",
        )

    # Get user
    user = get_or_create_user(db, x_anonymous_id)

    # Get preferences
    engine = AdaptiveExplanationEngine(db)
    return engine.get_user_preferences(user.id)


@router.put("/preferences/me")
async def update_my_preferences(
    preferred_style: Annotated[
        str | None, Query(description="Preferred explanation style")]
    = None,
    expertise_level: Annotated[
        str | None, Query(description="Expertise level (beginner, intermediate, advanced)")]
    = None,
    preferred_modalities: Annotated[
        list[str] | None, Query(description="Preferred learning modalities")]
    = None,
    prefers_detailed: Annotated[
        bool | None, Query(description="Prefer detailed explanations")]
    = None,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[
        str | None, Header(description="Browser-generated anonymous user ID")
    ] = None,
) -> dict:
    """
    Update current user's learning preferences.

    - **preferred_style**: Preferred explanation style (simple, technical, analogy, visual, story)
    - **expertise_level**: User's expertise level (beginner, intermediate, advanced)
    - **preferred_modalities**: List of preferred learning modalities (visual, text, analogy)
    - **prefers_detailed**: Whether user prefers detailed vs concise explanations
    """
    if not x_anonymous_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Anonymous-Id header is required",
        )

    # Get user
    user = get_or_create_user(db, x_anonymous_id)

    # Update preferences
    engine = AdaptiveExplanationEngine(db)
    return engine.update_user_preferences(
        user_id=user.id,
        preferred_style=preferred_style,
        expertise_level=expertise_level,
        preferred_modalities=preferred_modalities,
        prefers_detailed=prefers_detailed,
    )


@router.get("/analytics/my-styles")
async def get_my_style_analytics(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[
        str | None, Header(description="Browser-generated anonymous user ID")
    ] = None,
) -> dict:
    """
    Get analytics about which explanation styles work best for the user.

    Returns breakdown of:
    - Total explanations viewed
    - Views and helpfulness rate per style
    - Most helpful style based on ratings
    """
    if not x_anonymous_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Anonymous-Id header is required",
        )

    # Get user
    user = get_or_create_user(db, x_anonymous_id)

    # Get analytics
    return get_user_style_analytics(db, user.id)
