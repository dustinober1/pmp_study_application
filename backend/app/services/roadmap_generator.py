"""
Roadmap Generator Service for PMP Study App.

Provides intelligent study roadmap generation that adapts weekly based on:
- Target exam date
- Available study time
- Current progress and performance
- Domain weights from PMP 2026 ECO
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    Domain,
    Flashcard,
    FlashcardProgress,
    Question,
    QuestionProgress,
    RoadmapStatus,
    RoadmapMilestone,
    MilestoneStatus,
    StudyRoadmap,
    Task,
    UserAnalytics,
)


# PMP 2026 ECO domain weights for content allocation
DOMAIN_WEIGHTS = {
    1: 0.33,  # People
    2: 0.41,  # Process
    3: 0.26,  # Business Environment
}

# Study intensity levels (hours per week needed)
STUDY_INTENSITY = {
    "intensive": 20,  # 4 weeks to complete
    "moderate": 10,   # 8 weeks to complete
    "relaxed": 5,     # 16 weeks to complete
}


class RoadmapGenerator:
    """
    Generates and adapts personalized study roadmaps.

    Algorithm:
    1. Calculate total weeks until exam
    2. Determine study intensity based on weekly hours
    3. Allocate domains across weeks based on PMP weights
    4. Create weekly milestones with daily study plans
    5. Adjust based on user's weak domains (from analytics)
    """

    def __init__(self, db: Session) -> None:
        """Initialize the roadmap generator with a database session."""
        self.db = db

    def create_roadmap(
        self,
        user_id: uuid.UUID,
        exam_date: datetime,
        weekly_study_hours: int = 10,
        study_days_per_week: int = 5,
    ) -> StudyRoadmap:
        """
        Create a new study roadmap for a user.

        Args:
            user_id: User UUID
            exam_date: Target exam date
            weekly_study_hours: Hours available per week for study
            study_days_per_week: Days per week available for study

        Returns:
            Created StudyRoadmap with milestones
        """
        # Archive existing active roadmaps
        self._archive_existing_roadmaps(user_id)

        # Create the roadmap
        roadmap = StudyRoadmap(
            user_id=str(user_id),
            exam_date=exam_date,
            weekly_study_hours=weekly_study_hours,
            study_days_per_week=study_days_per_week,
            status=RoadmapStatus.ACTIVE,
        )
        self.db.add(roadmap)
        self.db.flush()

        # Generate milestones
        milestones = self._generate_milestones(roadmap, user_id)
        roadmap.milestones = milestones
        roadmap.total_milestones = len(milestones)

        # Generate AI recommendations
        self._generate_recommendations(roadmap, user_id)

        self.db.commit()
        self.db.refresh(roadmap)

        return roadmap

    def adapt_roadmap(self, roadmap_id: int, user_id: uuid.UUID) -> StudyRoadmap:
        """
        Adapt an existing roadmap based on current progress.

        Re-analyzes performance and adjusts remaining milestones:
        - Allocates more time to weak domains
        - Adjusts daily plans based on completion rates
        - Updates recommendations

        Args:
            roadmap_id: Roadmap ID to adapt
            user_id: User UUID

        Returns:
            Updated roadmap
        """
        roadmap = self.db.get(StudyRoadmap, roadmap_id)
        if not roadmap or roadmap.user_id != str(user_id):
            raise ValueError("Roadmap not found")

        # Update progress counts
        self._update_roadmap_progress(roadmap)

        # Adapt remaining milestones
        pending_milestones = [
            m for m in roadmap.milestones if m.status == MilestoneStatus.PENDING
        ]

        if pending_milestones:
            self._adapt_remaining_milestones(roadmap, pending_milestones, user_id)

        # Update recommendations
        self._generate_recommendations(roadmap, user_id)
        roadmap.last_adapted_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(roadmap)

        return roadmap

    def get_daily_plan(
        self, roadmap_id: int, date: datetime
    ) -> dict[str, Any] | None:
        """
        Get the daily study plan for a specific date.

        Args:
            roadmap_id: Roadmap ID
            date: Date to get plan for

        Returns:
            Daily plan dict or None if no milestone covers this date
        """
        roadmap = self.db.get(StudyRoadmap, roadmap_id)
        if not roadmap:
            return None

        # Find milestone that covers this date
        target_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
        for milestone in roadmap.milestones:
            scheduled = milestone.scheduled_date.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            target = milestone.target_date.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
            if scheduled <= target_date <= target:
                daily_plans = json.loads(milestone.daily_plan or "{}")
                day_name = date.strftime("%A").lower()
                return daily_plans.get(day_name)

        return None

    def update_milestone_progress(
        self,
        milestone_id: int,
        user_id: uuid.UUID,
        flashcards_completed: int | None = None,
        questions_completed: int | None = None,
        mark_complete: bool = False,
    ) -> RoadmapMilestone:
        """
        Update progress for a milestone.

        Args:
            milestone_id: Milestone ID
            user_id: User UUID
            flashcards_completed: Number of flashcards completed
            questions_completed: Number of questions completed
            mark_complete: Whether to mark milestone as complete

        Returns:
            Updated milestone
        """
        milestone = self.db.execute(
            select(RoadmapMilestone)
            .join(StudyRoadmap, RoadmapMilestone.roadmap_id == StudyRoadmap.id)
            .where(RoadmapMilestone.id == milestone_id)
            .where(StudyRoadmap.user_id == str(user_id))
        ).scalar_one_or_none()

        if not milestone:
            raise ValueError("Milestone not found")

        if flashcards_completed is not None:
            milestone.flashcards_completed = flashcards_completed

        if questions_completed is not None:
            milestone.questions_completed = questions_completed

        if mark_complete:
            milestone.status = MilestoneStatus.COMPLETED
            milestone.completed_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(milestone)

        # Update roadmap progress
        self._update_roadmap_progress(milestone.roadmap)

        return milestone

    def _archive_existing_roadmaps(self, user_id: uuid.UUID) -> None:
        """Archive any existing active roadmaps for the user."""
        active_roadmaps = self.db.execute(
            select(StudyRoadmap)
            .where(StudyRoadmap.user_id == str(user_id))
            .where(StudyRoadmap.status == RoadmapStatus.ACTIVE)
        ).scalars().all()

        for roadmap in active_roadmaps:
            roadmap.status = RoadmapStatus.ARCHIVED

        self.db.flush()

    def _generate_milestones(
        self, roadmap: StudyRoadmap, user_id: uuid.UUID
    ) -> list[RoadmapMilestone]:
        """Generate milestones for the roadmap."""
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        exam_date = roadmap.exam_date.replace(hour=23, minute=59, second=59)

        # Calculate available weeks
        total_days = (exam_date - today).days
        total_weeks = max(1, total_days // 7)

        # Get domains ordered by weight
        domains = self.db.execute(
            select(Domain).order_by(Domain.order)
        ).scalars().all()

        # Calculate weak domains for emphasis
        weak_domain_ids = self._get_weak_domain_ids(user_id)

        # Generate weekly milestones
        milestones = []
        week_number = 1

        current_date = today + timedelta(days=1)  # Start tomorrow
        remaining_days = total_days

        for week in range(total_weeks):
            if remaining_days <= 0:
                break

            # Determine which domains to focus on this week
            week_domains = self._allocate_domains_for_week(
                domains, week, total_weeks, weak_domain_ids
            )

            # Create milestone
            days_in_week = min(7, remaining_days)
            target_date = current_date + timedelta(days=days_in_week - 1)

            milestone = RoadmapMilestone(
                roadmap_id=roadmap.id,
                title=f"Week {week_number}: {self._get_week_title(week_domains)}",
                description=self._get_week_description(week_domains, week, total_weeks),
                week_number=week_number,
                scheduled_date=current_date,
                target_date=target_date,
                domain_ids=json.dumps([d.id for d in week_domains]),
                daily_plan=json.dumps(self._generate_daily_plan(
                    week_domains,
                    roadmap.weekly_study_hours,
                    roadmap.study_days_per_week,
                    days_in_week,
                )),
                completion_criteria=json.dumps(self._get_completion_criteria(
                    week_domains, days_in_week
                )),
                status=MilestoneStatus.PENDING,
            )
            milestones.append(milestone)

            # Move to next week
            current_date = target_date + timedelta(days=1)
            remaining_days -= days_in_week
            week_number += 1

        # Add final review week if time permits
        if remaining_days >= 3:
            milestone = RoadmapMilestone(
                roadmap_id=roadmap.id,
                title=f"Week {week_number}: Final Review",
                description="Comprehensive review of all domains before exam day.",
                week_number=week_number,
                scheduled_date=current_date,
                target_date=exam_date,
                domain_ids=json.dumps([d.id for d in domains]),
                daily_plan=json.dumps(self._generate_review_daily_plan(
                    roadmap.weekly_study_hours,
                    roadmap.study_days_per_week,
                    remaining_days,
                )),
                completion_criteria=json.dumps({
                    "practice_exam": True,
                    "review_weak_areas": True,
                }),
                status=MilestoneStatus.PENDING,
            )
            milestones.append(milestone)

        return milestones

    def _allocate_domains_for_week(
        self,
        domains: list[Domain],
        week: int,
        total_weeks: int,
        weak_domain_ids: list[int],
    ) -> list[Domain]:
        """Allocate domains to study for a specific week."""
        # Simple allocation: rotate through domains, giving more time to weak ones
        if week < len(weak_domain_ids):
            # First weeks focus on weak domains
            weak_domain = next((d for d in domains if d.id in weak_domain_ids), None)
            if weak_domain:
                return [weak_domain]

        # Rotate through domains based on weight
        domain_week = week % len(domains)
        return [domains[domain_week]]

    def _get_week_title(self, domains: list[Domain]) -> str:
        """Get title for a week based on domains."""
        if len(domains) == 1:
            return domains[0].name
        return ", ".join(d.name for d in domains)

    def _get_week_description(
        self, domains: list[Domain], week: int, total_weeks: int
    ) -> str:
        """Get description for a week milestone."""
        domain_names = ", ".join(d.name for d in domains)
        if week == 0:
            return f"Introduction to {domain_names}. Start with foundational concepts."
        elif week == total_weeks - 1:
            return f"Final review of {domain_names} before exam."
        else:
            return f"Deep dive into {domain_names}."

    def _generate_daily_plan(
        self,
        domains: list[Domain],
        weekly_hours: int,
        study_days: int,
        days_in_week: int,
    ) -> dict[str, dict[str, Any]]:
        """Generate daily study plans for a week."""
        daily_hours = (weekly_hours / study_days) if study_days > 0 else 2

        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        plans = {}

        for i, day in enumerate(day_names[:days_in_week]):
            if i >= study_days:
                plans[day] = {"type": "rest", "activity": "Rest day"}
            else:
                domain = domains[i % len(domains)] if domains else None
                plans[day] = {
                    "type": "study",
                    "hours": daily_hours,
                    "domain": domain.name if domain else "Review",
                    "activities": [
                        {"type": "flashcards", "count": int(daily_hours * 5)},
                        {"type": "questions", "count": int(daily_hours * 3)},
                        {"type": "review", "duration_minutes": 15},
                    ],
                }

        return plans

    def _generate_review_daily_plan(
        self, weekly_hours: int, study_days: int, days_in_week: int
    ) -> dict[str, dict[str, Any]]:
        """Generate daily plan for final review week."""
        daily_hours = (weekly_hours / study_days) if study_days > 0 else 2

        day_names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        plans = {}

        for i, day in enumerate(day_names[:days_in_week]):
            plans[day] = {
                "type": "review",
                "hours": daily_hours,
                "activities": [
                    {"type": "practice_exam", "full": i == 0},
                    {"type": "weak_areas", "duration_minutes": int(daily_hours * 30)},
                    {"type": "formula_review", "duration_minutes": 15},
                ],
            }

        return plans

    def _get_completion_criteria(
        self, domains: list[Domain], days_in_week: int
    ) -> dict[str, Any]:
        """Get completion criteria for a milestone."""
        # Estimate counts based on days and domain
        total_flashcards = sum(
            self.db.execute(
                select(func.count(Flashcard.id))
                .join(Task, Flashcard.task_id == Task.id)
                .where(Task.domain_id == d.id)
            ).scalar() or 0
            for d in domains
        )

        total_questions = sum(
            self.db.execute(
                select(func.count(Question.id))
                .join(Task, Question.task_id == Task.id)
                .where(Task.domain_id == d.id)
            ).scalar() or 0
            for d in domains
        )

        # Target 30% of available content per week
        return {
            "flashcards": max(10, int(total_flashcards * 0.3)),
            "questions": max(5, int(total_questions * 0.3)),
            "min_score": 0.7,
        }

    def _get_weak_domain_ids(self, user_id: uuid.UUID) -> list[int]:
        """Get list of weak domain IDs for the user."""
        analytics = self.db.execute(
            select(UserAnalytics).where(UserAnalytics.user_id == str(user_id))
        ).scalar_one_or_none()

        if analytics and analytics.weak_domains:
            return [d["domain_id"] for d in analytics.weak_domains]

        return []

    def _generate_recommendations(
        self, roadmap: StudyRoadmap, user_id: uuid.UUID
    ) -> None:
        """Generate AI recommendations for the roadmap."""
        weak_domain_ids = self._get_weak_domain_ids(user_id)

        if weak_domain_ids:
            weak_domains = self.db.execute(
                select(Domain).where(Domain.id.in_(weak_domain_ids))
            ).scalars().all()

            roadmap.focus_areas = json.dumps(weak_domain_ids)
            roadmap.recommendations = json.dumps({
                "focus_domains": [d.name for d in weak_domains],
                "extra_time": "Spend 20% more time on marked focus areas",
                "practice": "Prioritize practice questions in weak domains",
                "review": "Schedule review sessions for difficult concepts",
            })
        else:
            roadmap.focus_areas = None
            roadmap.recommendations = json.dumps({
                "balanced": "Maintain balanced study across all domains",
                "practice": "Regular practice questions in each domain",
                "review": "Weekly review of all covered topics",
            })

    def _adapt_remaining_milestones(
        self,
        roadmap: StudyRoadmap,
        milestones: list[RoadmapMilestone],
        user_id: uuid.UUID,
    ) -> None:
        """Admit remaining milestones based on current progress."""
        weak_domain_ids = self._get_weak_domain_ids(user_id)

        for milestone in milestones:
            domain_ids = json.loads(milestone.domain_ids or "[]")

            # If milestone covers a weak domain, add more practice
            if any(did in weak_domain_ids for did in domain_ids):
                daily_plan = json.loads(milestone.daily_plan or "{}")
                for day, plan in daily_plan.items():
                    if plan.get("type") == "study":
                        for activity in plan.get("activities", []):
                            if activity["type"] in ["flashcards", "questions"]:
                                activity["count"] = int(activity["count"] * 1.2)

                milestone.daily_plan = json.dumps(daily_plan)

    def _update_roadmap_progress(self, roadmap: StudyRoadmap) -> None:
        """Update roadmap progress counters."""
        completed = sum(
            1 for m in roadmap.milestones if m.status == MilestoneStatus.COMPLETED
        )
        roadmap.completed_milestones = completed

        # Mark roadmap as completed if all milestones are done
        if completed >= roadmap.total_milestones:
            roadmap.status = RoadmapStatus.COMPLETED


# Convenience functions for external use

def generate_roadmap(
    db: Session,
    user_id: uuid.UUID,
    exam_date: datetime,
    weekly_study_hours: int = 10,
    study_days_per_week: int = 5,
) -> StudyRoadmap:
    """Generate a new study roadmap."""
    generator = RoadmapGenerator(db)
    return generator.create_roadmap(user_id, exam_date, weekly_study_hours, study_days_per_week)


def get_user_roadmap(db: Session, user_id: uuid.UUID) -> StudyRoadmap | None:
    """Get the active roadmap for a user."""
    return db.execute(
        select(StudyRoadmap)
        .where(StudyRoadmap.user_id == str(user_id))
        .where(StudyRoadmap.status == RoadmapStatus.ACTIVE)
        .order_by(StudyRoadmap.created_at.desc())
    ).scalar_one_or_none()


def get_roadmap_with_milestones(
    db: Session, roadmap_id: int, user_id: uuid.UUID
) -> dict[str, Any]:
    """Get a roadmap with all milestones as a dict."""
    roadmap = db.execute(
        select(StudyRoadmap)
        .where(StudyRoadmap.id == roadmap_id)
        .where(StudyRoadmap.user_id == str(user_id))
    ).scalar_one_or_none()

    if not roadmap:
        return None

    return {
        "id": roadmap.id,
        "user_id": roadmap.user_id,
        "exam_date": roadmap.exam_date.isoformat(),
        "weekly_study_hours": roadmap.weekly_study_hours,
        "study_days_per_week": roadmap.study_days_per_week,
        "status": roadmap.status,
        "focus_areas": json.loads(roadmap.focus_areas) if roadmap.focus_areas else None,
        "recommendations": json.loads(roadmap.recommendations) if roadmap.recommendations else None,
        "total_milestones": roadmap.total_milestones,
        "completed_milestones": roadmap.completed_milestones,
        "created_at": roadmap.created_at.isoformat(),
        "updated_at": roadmap.updated_at.isoformat(),
        "last_adapted_at": roadmap.last_adapted_at.isoformat() if roadmap.last_adapted_at else None,
        "milestones": [
            {
                "id": m.id,
                "title": m.title,
                "description": m.description,
                "week_number": m.week_number,
                "scheduled_date": m.scheduled_date.isoformat(),
                "target_date": m.target_date.isoformat(),
                "domain_ids": json.loads(m.domain_ids) if m.domain_ids else [],
                "daily_plan": json.loads(m.daily_plan) if m.daily_plan else {},
                "completion_criteria": json.loads(m.completion_criteria) if m.completion_criteria else {},
                "status": m.status,
                "flashcards_completed": m.flashcards_completed,
                "questions_completed": m.questions_completed,
                "quiz_score": m.quiz_score,
                "completed_at": m.completed_at.isoformat() if m.completed_at else None,
            }
            for m in roadmap.milestones
        ],
    }
