"""
Study Roadmap API routes.

Provides endpoints for:
- Creating personalized study roadmaps
- Getting user's active roadmap with milestones
- Getting daily study plans
- Updating milestone progress
- Adapting roadmap based on performance
"""

from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.roadmap import MilestoneStatus, RoadmapStatus, StudyRoadmap
from app.models.user import User
from app.services.roadmap_generator import (
    RoadmapGenerator,
    get_roadmap_with_milestones,
    get_user_roadmap,
)

router = APIRouter(prefix="/api/roadmap", tags=["roadmap"])


# ========================
# Pydantic Schemas
# ========================


class CreateRoadmapRequest(BaseModel):
    """Request schema for creating a new roadmap."""

    exam_date: datetime = Field(..., description="Target exam date")
    weekly_study_hours: int = Field(
        default=10, ge=1, le=40, description="Hours available for study per week"
    )
    study_days_per_week: int = Field(
        default=5, ge=1, le=7, description="Days available for study per week"
    )


class DailyPlanActivity(BaseModel):
    """An activity in the daily plan."""

    type: str
    count: int | None = None
    duration_minutes: int | None = None
    full: bool | None = None


class DailyPlan(BaseModel):
    """Daily study plan."""

    type: str
    hours: float | None = None
    domain: str | None = None
    activities: list[DailyPlanActivity] | None = None


class MilestoneResponse(BaseModel):
    """Response schema for a milestone."""

    id: int
    title: str
    description: str | None
    week_number: int
    scheduled_date: str
    target_date: str
    domain_ids: list[int]
    daily_plan: dict[str, DailyPlan]
    completion_criteria: dict[str, Any]
    status: str
    flashcards_completed: int
    questions_completed: int
    quiz_score: float | None
    completed_at: str | None


class RoadmapResponse(BaseModel):
    """Response schema for a study roadmap."""

    id: int
    user_id: str
    exam_date: str
    weekly_study_hours: int
    study_days_per_week: int
    status: str
    focus_areas: list[int] | None
    recommendations: dict[str, Any] | None
    total_milestones: int
    completed_milestones: int
    created_at: str
    updated_at: str
    last_adapted_at: str | None
    milestones: list[MilestoneResponse]


class UpdateMilestoneRequest(BaseModel):
    """Request schema for updating milestone progress."""

    flashcards_completed: int | None = None
    questions_completed: int | None = None
    mark_complete: bool = False


class DailyPlanResponse(BaseModel):
    """Response schema for daily plan."""

    date: str
    plan: DailyPlan | None


class AdaptRoadmapResponse(BaseModel):
    """Response schema for roadmap adaptation."""

    message: str
    roadmap_id: int
    adapted: bool


# ========================
# Helper Functions
# ========================


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


# ========================
# API Endpoints
# ========================


@router.post("/create", response_model=RoadmapResponse)
async def create_roadmap(
    request: CreateRoadmapRequest,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> RoadmapResponse:
    """
    Create a new personalized study roadmap.

    Generates a complete study plan with weekly milestones based on:
    - Target exam date
    - Available study time
    - User's current weak domains

    The roadmap adapts the curriculum across weeks following PMP 2026 ECO
    domain weights.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    generator = RoadmapGenerator(db)
    roadmap = generator.create_roadmap(
        user_id=user.id,
        exam_date=request.exam_date,
        weekly_study_hours=request.weekly_study_hours,
        study_days_per_week=request.study_days_per_week,
    )

    roadmap_data = get_roadmap_with_milestones(db, roadmap.id, user.id)
    return RoadmapResponse(**roadmap_data)


@router.get("/active", response_model=RoadmapResponse)
async def get_active_roadmap(
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> RoadmapResponse:
    """
    Get the user's active study roadmap.

    Returns the complete roadmap with all milestones including:
    - Weekly study plans
    - Daily breakdown
    - Progress tracking
    - AI-generated recommendations
    """
    user = await get_or_create_user(db, x_anonymous_id)

    roadmap = get_user_roadmap(db, user.id)

    if not roadmap:
        raise HTTPException(
            status_code=404,
            detail="No active roadmap found. Create one first.",
        )

    roadmap_data = get_roadmap_with_milestones(db, roadmap.id, user.id)
    return RoadmapResponse(**roadmap_data)


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(
    roadmap_id: int,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> RoadmapResponse:
    """
    Get a specific roadmap by ID.

    Returns the complete roadmap with all milestones.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    roadmap = db.execute(
        select(StudyRoadmap)
        .where(StudyRoadmap.id == roadmap_id)
        .where(StudyRoadmap.user_id == str(user.id))
    ).scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    roadmap_data = get_roadmap_with_milestones(db, roadmap_id, user.id)
    return RoadmapResponse(**roadmap_data)


@router.get("/{roadmap_id}/daily/{date}", response_model=DailyPlanResponse)
async def get_daily_plan_endpoint(
    roadmap_id: int,
    date: str,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> DailyPlanResponse:
    """
    Get the daily study plan for a specific date.

    Returns the planned activities for the given date including:
    - Study hours
    - Focus domains
    - Flashcard and question targets
    """
    user = await get_or_create_user(db, x_anonymous_id)

    # Verify roadmap ownership
    roadmap = db.execute(
        select(StudyRoadmap)
        .where(StudyRoadmap.id == roadmap_id)
        .where(StudyRoadmap.user_id == str(user.id))
    ).scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    try:
        target_date = datetime.fromisoformat(date.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    generator = RoadmapGenerator(db)
    plan = generator.get_daily_plan(roadmap_id, target_date)

    return DailyPlanResponse(
        date=date,
        plan=DailyPlan(**plan) if plan else None,
    )


@router.put("/{roadmap_id}/milestones/{milestone_id}")
async def update_milestone(
    roadmap_id: int,
    milestone_id: int,
    request: UpdateMilestoneRequest,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> MilestoneResponse:
    """
    Update progress for a specific milestone.

    Use this to track completed flashcards and questions for a milestone.
    Can also mark the milestone as complete.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    # Verify roadmap ownership
    roadmap = db.execute(
        select(StudyRoadmap)
        .where(StudyRoadmap.id == roadmap_id)
        .where(StudyRoadmap.user_id == str(user.id))
    ).scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    generator = RoadmapGenerator(db)
    milestone = generator.update_milestone_progress(
        milestone_id=milestone_id,
        user_id=user.id,
        flashcards_completed=request.flashcards_completed,
        questions_completed=request.questions_completed,
        mark_complete=request.mark_complete,
    )

    return MilestoneResponse(
        id=milestone.id,
        title=milestone.title,
        description=milestone.description,
        week_number=milestone.week_number,
        scheduled_date=milestone.scheduled_date.isoformat(),
        target_date=milestone.target_date.isoformat(),
        domain_ids=eval(milestone.domain_ids) if milestone.domain_ids else [],
        daily_plan=eval(milestone.daily_plan) if milestone.daily_plan else {},
        completion_criteria=eval(milestone.completion_criteria) if milestone.completion_criteria else {},
        status=milestone.status,
        flashcards_completed=milestone.flashcards_completed,
        questions_completed=milestone.questions_completed,
        quiz_score=milestone.quiz_score,
        completed_at=milestone.completed_at.isoformat() if milestone.completed_at else None,
    )


@router.post("/{roadmap_id}/adapt", response_model=AdaptRoadmapResponse)
async def adapt_roadmap(
    roadmap_id: int,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> AdaptRoadmapResponse:
    """
    Adapt the roadmap based on current progress.

    Re-analyzes user performance and adjusts remaining milestones:
    - Allocates more time to weak domains
    - Adjusts daily plans based on completion rates
    - Updates AI recommendations

    Call this after completing major milestones or when
    performance has changed significantly.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    # Verify roadmap ownership
    roadmap = db.execute(
        select(StudyRoadmap)
        .where(StudyRoadmap.id == roadmap_id)
        .where(StudyRoadmap.user_id == str(user.id))
    ).scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    generator = RoadmapGenerator(db)
    adapted_roadmap = generator.adapt_roadmap(roadmap_id, user.id)

    return AdaptRoadmapResponse(
        message="Roadmap adapted successfully based on current progress",
        roadmap_id=adapted_roadmap.id,
        adapted=True,
    )


@router.delete("/{roadmap_id}")
async def delete_roadmap(
    roadmap_id: int,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    """
    Delete or archive a roadmap.

    Soft-deletes by archiving the roadmap rather than removing it.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    roadmap = db.execute(
        select(StudyRoadmap)
        .where(StudyRoadmap.id == roadmap_id)
        .where(StudyRoadmap.user_id == str(user.id))
    ).scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    # Archive instead of delete
    roadmap.status = RoadmapStatus.ARCHIVED
    db.commit()

    return {"message": "Roadmap archived successfully"}
