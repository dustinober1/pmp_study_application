"""
Analytics and Adaptive Learning API routes.

Provides endpoints for:
- User analytics summary (performance metrics, strengths/weaknesses)
- Personalized study recommendations
- Forcing recalculation of analytics and recommendations
"""

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.analytics import LearningRecommendation, UserAnalytics
from app.models.user import User
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    DomainPerformanceSummary,
    LearningRecommendationItem,
    RecalculateResponse,
    RecommendationsResponse,
    TaskPerformanceMetric,
    UserAnalyticsSummary,
)
from app.services.adaptive_engine import (
    AdaptiveEngine,
    calculate_user_analytics,
    generate_study_recommendations,
    get_domain_performance_summary,
    get_task_performance_summary,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def get_or_create_user(db: Session, anonymous_id: str) -> User:
    """Get existing user or create new one based on anonymous_id."""
    user = db.execute(
        select(User).where(User.anonymous_id == anonymous_id)
    ).scalar_one_or_none()

    if not user:
        user = User(anonymous_id=anonymous_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.get("/summary", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> AnalyticsSummaryResponse:
    """
    Get user's learning analytics summary.

    Returns overall performance metrics including:
    - Overall accuracy and response time
    - Strong and weak domain identification
    - Per-domain and per-task performance breakdown
    """
    user = await get_or_create_user(db, x_anonymous_id)

    # Get or create user analytics
    analytics = db.execute(
        select(UserAnalytics).where(UserAnalytics.user_id == user.id)
    ).scalar_one_or_none()

    if not analytics:
        # Create initial analytics for new user
        analytics = calculate_user_analytics(db, user.id)

    # Get detailed performance summaries
    domain_performance = get_domain_performance_summary(db, user.id)
    task_performance = get_task_performance_summary(db, user.id)

    # Build domain performance summaries
    domain_summaries = [
        DomainPerformanceSummary(
            domain_id=d["domain_id"],
            domain_name=d["domain_name"],
            weight=d["weight"],
            accuracy=d.get("accuracy"),
            question_count=d.get("question_count", 0),
            avg_response_time=d.get("avg_response_time"),
            classification=d["classification"],
        )
        for d in domain_performance
    ]

    # Build task performance summaries
    task_summaries = [
        TaskPerformanceMetric(
            task_id=t["task_id"],
            task_name=t["task_name"],
            domain_id=t["domain_id"],
            accuracy=t["accuracy"],
            question_count=t["question_count"],
            avg_response_time=t.get("avg_response_time"),
        )
        for t in task_performance
    ]

    # Build user analytics summary
    analytics_summary = UserAnalyticsSummary(
        user_id=str(user.id),
        total_questions_answered=analytics.total_questions_answered,
        overall_accuracy=analytics.overall_accuracy,
        avg_response_time=analytics.avg_response_time,
        strong_domains=analytics.strong_domains,
        weak_domains=analytics.weak_domains,
        last_updated=analytics.last_updated,
    )

    return AnalyticsSummaryResponse(
        analytics=analytics_summary,
        domain_performance=domain_summaries,
        task_performance=task_summaries,
    )


@router.get("/recommendations", response_model=RecommendationsResponse)
async def get_recommendations(
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> RecommendationsResponse:
    """
    Get personalized study recommendations.

    Returns recommendations for improving weak areas and reinforcing
    strong domains based on user's performance analytics.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    # Get existing recommendations
    recommendations = db.execute(
        select(LearningRecommendation)
        .where(LearningRecommendation.user_id == user.id)
        .order_by(LearningRecommendation.priority.desc())
    ).scalars().all()

    # If no recommendations exist, generate them
    if not recommendations:
        recommendations_data = generate_study_recommendations(db, user.id)
    else:
        recommendations_data = [
            {
                "id": str(rec.id),
                "type": rec.recommendation_type,
                "priority": rec.priority,
                "reason": rec.reason,
                "domain_id": rec.domain_id,
                "task_id": rec.task_id,
                "created_at": rec.created_at,
            }
            for rec in recommendations
        ]

    return RecommendationsResponse(
        recommendations=[
            LearningRecommendationItem(
                id=r["id"],
                type=r["type"],
                priority=r["priority"],
                reason=r["reason"],
                domain_id=r.get("domain_id"),
                task_id=r.get("task_id"),
                created_at=r["created_at"],
            )
            for r in recommendations_data
        ]
    )


@router.post("/recalculate", response_model=RecalculateResponse)
async def recalculate_analytics(
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> RecalculateResponse:
    """
    Force recalculation of user analytics and regenerate recommendations.

    This endpoint triggers a full recalculation of:
    - Overall and per-domain accuracy metrics
    - Response time statistics
    - Strong/weak domain identification
    - Personalized study recommendations

    Use this to refresh analytics after significant study activity.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    # Recalculate analytics
    analytics = calculate_user_analytics(db, user.id)

    # Generate new recommendations
    recommendations_data = generate_study_recommendations(db, user.id)

    return RecalculateResponse(
        message="Analytics recalculated successfully",
        analytics_updated=True,
        recommendations_generated=len(recommendations_data),
    )


@router.get("/due-flashcards")
async def get_due_flashcards_endpoint(
    limit: int = 20,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get flashcards due for review based on SM-2 spaced repetition.

    Returns flashcards that are due for review prioritized by:
    1. Overdue cards
    2. New cards
    3. Cards due soonest
    """
    user = await get_or_create_user(db, x_anonymous_id)

    engine = AdaptiveEngine(db)
    due_flashcards = engine.get_due_flashcards(user.id, limit)

    return {
        "count": len(due_flashcards),
        "flashcards": due_flashcards,
    }


@router.get("/recommended/questions")
async def get_recommended_questions_endpoint(
    limit: int = 10,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get recommended practice questions based on weak areas.

    Returns questions prioritized from domains/tasks where the user
    has the lowest performance.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    engine = AdaptiveEngine(db)
    questions = engine.get_recommended_questions(user.id, limit)

    return {
        "count": len(questions),
        "questions": questions,
    }


@router.get("/recommended/flashcards")
async def get_recommended_flashcards_endpoint(
    limit: int = 10,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get recommended flashcards for study based on weak areas.

    Returns flashcards prioritized from domains/tasks where the user
    has the lowest performance.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    engine = AdaptiveEngine(db)
    flashcards = engine.get_recommended_flashcards(user.id, limit)

    return {
        "count": len(flashcards),
        "flashcards": flashcards,
    }
