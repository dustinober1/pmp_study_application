"""Study Roadmap models for personalized curriculum planning."""

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MilestoneStatus(str, Enum):
    """Status of a roadmap milestone."""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    SKIPPED = "skipped"


class RoadmapStatus(str, Enum):
    """Status of the overall roadmap."""

    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    ARCHIVED = "archived"


if TYPE_CHECKING:
    from app.models.user import User


class StudyRoadmap(Base):
    """
    AI-generated personalized study roadmap for a user.

    Roadmaps are created based on exam date, available study time,
    and current progress. They adapt weekly based on performance.
    """

    __tablename__ = "study_roadmaps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Target exam date
    exam_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    # Study preferences
    weekly_study_hours: Mapped[int] = mapped_column(
        Integer, nullable=False, default=10
    )
    study_days_per_week: Mapped[int] = mapped_column(
        Integer, nullable=False, default=5
    )

    # Roadmap status and configuration
    status: Mapped[RoadmapStatus] = mapped_column(
        String(20), default=RoadmapStatus.ACTIVE, nullable=False, index=True
    )

    # AI-generated notes and recommendations
    focus_areas: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON array of domain/task IDs to focus on
    recommendations: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON with AI recommendations

    # Progress tracking
    total_milestones: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    completed_milestones: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

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
    last_adapted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", backref="roadmaps")
    milestones: Mapped[list["RoadmapMilestone"]] = relationship(
        "RoadmapMilestone",
        back_populates="roadmap",
        cascade="all, delete-orphan",
        order_by="RoadmapMilestone.scheduled_date",
    )

    def __repr__(self) -> str:
        return f"<StudyRoadmap(id={self.id}, user_id={self.user_id}, exam_date={self.exam_date}, status={self.status})>"


class RoadmapMilestone(Base):
    """
    A milestone in the study roadmap.

    Milestones represent weekly or bi-weekly goals covering specific
    domains/tasks. They include daily study plans and completion criteria.
    """

    __tablename__ = "roadmap_milestones"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    roadmap_id: Mapped[int] = mapped_column(
        ForeignKey("study_roadmaps.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Milestone details
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Scheduling
    week_number: Mapped[int] = mapped_column(Integer, nullable=False)  # Week 1, 2, 3...
    scheduled_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )  # Start date of this milestone
    target_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )  # Target completion date

    # Content coverage (JSON array of domain IDs)
    domain_ids: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # e.g., "[1,2]" or "[1]"

    # Daily study plan (JSON object with day: plan)
    daily_plan: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON: {"monday": "...", "tuesday": "..."}

    # Completion criteria (JSON)
    completion_criteria: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON: {"flashcards": 50, "questions": 20, "min_score": 0.7}

    # Status
    status: Mapped[MilestoneStatus] = mapped_column(
        String(20), default=MilestoneStatus.PENDING, nullable=False, index=True
    )

    # Progress tracking
    flashcards_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    questions_completed: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    quiz_score: Mapped[float | None] = mapped_column(
        Integer, nullable=True
    )  # Average quiz score for this milestone

    # Timestamps
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
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
    roadmap: Mapped["StudyRoadmap"] = relationship(
        "StudyRoadmap", back_populates="milestones"
    )

    def __repr__(self) -> str:
        return f"<RoadmapMilestone(id={self.id}, title='{self.title}', week={self.week_number}, status={self.status})>"
