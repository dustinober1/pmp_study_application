"""
Adaptive Learning Engine for PMP Study App.

Provides:
- Spaced repetition optimization using SM-2 algorithm
- Analytics calculation for response time tracking and accuracy analysis
- Domain strength identification
- Personalized study recommendations based on weak areas
"""

import uuid
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import UUID as SQLUUID
from sqlalchemy.orm import Session

from app.models import (
    Domain,
    Flashcard,
    FlashcardProgress,
    LearningRecommendation,
    Question,
    QuestionProgress,
    Task,
    UserAnalytics,
)


def calculate_user_analytics(db: Session, user_id: uuid.UUID) -> UserAnalytics:
    """
    Calculate and update user analytics based on question progress.

    Computes:
    - Overall accuracy rate
    - Average response time
    - Per-domain accuracy and response times
    - Identifies strong and weak domains

    Args:
        db: Database session
        user_id: User UUID

    Returns:
        Updated UserAnalytics record
    """
    # Get or create UserAnalytics record
    analytics = db.execute(
        select(UserAnalytics).where(UserAnalytics.user_id == user_id)
    ).scalar_one_or_none()

    if not analytics:
        analytics = UserAnalytics(user_id=user_id)
        db.add(analytics)
        db.flush()

    # Get all question progress for this user
    user_progress = db.execute(
        select(QuestionProgress).where(QuestionProgress.user_id == user_id)
    ).scalars().all()

    if not user_progress:
        # No progress yet, return default analytics
        analytics.total_questions_answered = 0
        analytics.overall_accuracy = 0.0
        analytics.avg_response_time = None
        analytics.strong_domains = None
        analytics.weak_domains = None
        db.commit()
        db.refresh(analytics)
        return analytics

    # Calculate overall metrics
    total_attempts = sum(p.attempt_count for p in user_progress)
    total_correct = sum(p.correct_count for p in user_progress)
    overall_accuracy = total_correct / total_attempts if total_attempts > 0 else 0.0

    # Calculate average response time (only from attempts with recorded time)
    response_times = [
        p.last_response_time_seconds
        for p in user_progress
        if p.last_response_time_seconds is not None
    ]
    avg_response_time = (
        sum(response_times) / len(response_times) if response_times else None
    )

    # Calculate per-domain metrics
    domain_metrics = _calculate_domain_metrics(db, user_id, user_progress)

    # Identify strong and weak domains
    strong_domains, weak_domains = _identify_domain_strengths(domain_metrics)

    # Update analytics record
    analytics.total_questions_answered = len(user_progress)
    analytics.overall_accuracy = overall_accuracy
    analytics.avg_response_time = avg_response_time
    analytics.strong_domains = strong_domains
    analytics.weak_domains = weak_domains

    db.commit()
    db.refresh(analytics)

    return analytics


def _calculate_domain_metrics(
    db: Session, user_id: uuid.UUID, user_progress: list[QuestionProgress]
) -> dict[int, dict[str, Any]]:
    """
    Calculate metrics per domain.

    Returns dict with domain_id as key and metrics dict as value.
    Metrics include: accuracy, count, avg_response_time, task_breakdown
    """
    domain_metrics = defaultdict(lambda: {
        "correct": 0,
        "total": 0,
        "response_times": [],
        "tasks": defaultdict(lambda: {"correct": 0, "total": 0, "response_times": []})
    })

    # Get question IDs from progress
    question_ids = [p.question_id for p in user_progress]

    # Fetch questions with their tasks
    questions = db.execute(
        select(Question).where(Question.id.in_(question_ids))
    ).scalars().all()

    # Map question_id to (domain_id, task_id)
    question_to_domain_task = {}
    for q in questions:
        # Get task to find domain_id
        task = db.execute(
            select(Task).where(Task.id == q.task_id)
        ).scalar_one_or_none()
        if task:
            question_to_domain_task[q.id] = (task.domain_id, q.task_id)

    # Aggregate metrics by domain and task
    for progress in user_progress:
        q_id = progress.question_id
        if q_id not in question_to_domain_task:
            continue

        domain_id, task_id = question_to_domain_task[q_id]

        # Domain level aggregation
        domain_metrics[domain_id]["total"] += progress.attempt_count
        domain_metrics[domain_id]["correct"] += progress.correct_count

        if progress.last_response_time_seconds is not None:
            domain_metrics[domain_id]["response_times"].append(
                progress.last_response_time_seconds
            )

        # Task level aggregation
        domain_metrics[domain_id]["tasks"][task_id]["total"] += progress.attempt_count
        domain_metrics[domain_id]["tasks"][task_id]["correct"] += progress.correct_count

        if progress.last_response_time_seconds is not None:
            domain_metrics[domain_id]["tasks"][task_id]["response_times"].append(
                progress.last_response_time_seconds
            )

    # Calculate derived metrics
    result = {}
    for domain_id, metrics in domain_metrics.items():
        total = metrics["total"]
        correct = metrics["correct"]
        response_times = metrics["response_times"]

        result[domain_id] = {
            "domain_id": domain_id,
            "accuracy": correct / total if total > 0 else 0.0,
            "count": total,
            "avg_response_time": (
                sum(response_times) / len(response_times) if response_times else None
            ),
            "task_breakdown": {}
        }

        # Calculate task level metrics
        for task_id, task_metrics in metrics["tasks"].items():
            task_total = task_metrics["total"]
            task_correct = task_metrics["correct"]
            task_response_times = task_metrics["response_times"]

            result[domain_id]["task_breakdown"][task_id] = {
                "task_id": task_id,
                "accuracy": task_correct / task_total if task_total > 0 else 0.0,
                "count": task_total,
                "avg_response_time": (
                    sum(task_response_times) / len(task_response_times)
                    if task_response_times else None
                )
            }

    return result


def _identify_domain_strengths(
    domain_metrics: dict[int, dict[str, Any]]
) -> tuple[list[dict[str, Any]] | None, list[dict[str, Any]] | None]:
    """
    Identify strong and weak domains based on accuracy and question count.

    Strong domains: accuracy >= 70% and at least 5 questions attempted
    Weak domains: accuracy < 50% and at least 3 questions attempted

    Returns:
        Tuple of (strong_domains list, weak_domains list)
    """
    strong = []
    weak = []

    for domain_id, metrics in domain_metrics.items():
        accuracy = metrics["accuracy"]
        count = metrics["count"]
        avg_response_time = metrics["avg_response_time"]

        domain_entry = {
            "domain_id": domain_id,
            "accuracy": accuracy,
            "count": count,
            "avg_response_time": avg_response_time,
        }

        if count >= 5 and accuracy >= 0.70:
            strong.append(domain_entry)
        elif count >= 3 and accuracy < 0.50:
            weak.append(domain_entry)

    # Sort by accuracy (descending for strong, ascending for weak)
    strong.sort(key=lambda x: x["accuracy"], reverse=True)
    weak.sort(key=lambda x: x["accuracy"])

    return strong if strong else None, weak if weak else None


def get_domain_performance_summary(
    db: Session, user_id: uuid.UUID
) -> list[dict[str, Any]]:
    """
    Get performance summary for all domains.

    Returns a list of domain performance metrics including:
    - domain_id, domain_name
    - accuracy, question_count
    - avg_response_time
    - strong/weak classification

    Args:
        db: Database session
        user_id: User UUID

    Returns:
        List of domain performance summaries
    """
    # Get analytics to identify strengths/weaknesses
    analytics = db.execute(
        select(UserAnalytics).where(UserAnalytics.user_id == user_id)
    ).scalar_one_or_none()

    if not analytics:
        return []

    strong_domains = analytics.strong_domains or []
    weak_domains = analytics.weak_domains or []

    # Get all domains
    domains = db.execute(
        select(Domain).order_by(Domain.order)
    ).scalars().all()

    result = []
    for domain in domains:
        # Find metrics from strong/weak domains
        strong_entry = next(
            (d for d in strong_domains if d["domain_id"] == domain.id), None
        )
        weak_entry = next(
            (d for d in weak_domains if d["domain_id"] == domain.id), None
        )

        metrics = strong_entry or weak_entry

        result.append({
            "domain_id": domain.id,
            "domain_name": domain.name,
            "weight": domain.weight,
            "accuracy": metrics["accuracy"] if metrics else None,
            "question_count": metrics["count"] if metrics else 0,
            "avg_response_time": metrics["avg_response_time"] if metrics else None,
            "classification": (
                "strong" if strong_entry else "weak" if weak_entry else "neutral"
            )
        })

    return result


def get_task_performance_summary(
    db: Session, user_id: uuid.UUID, domain_id: int | None = None
) -> list[dict[str, Any]]:
    """
    Get performance summary for tasks, optionally filtered by domain.

    Args:
        db: Database session
        user_id: User UUID
        domain_id: Optional domain filter

    Returns:
        List of task performance summaries
    """
    # Get all question progress for this user
    user_progress_subq = select(QuestionProgress).where(
        QuestionProgress.user_id == user_id
    )

    # Build query with task and domain info
    query = (
        select(
            Task.id.label("task_id"),
            Task.name.label("task_name"),
            Task.domain_id.label("domain_id"),
            func.sum(QuestionProgress.attempt_count).label("total_attempts"),
            func.sum(QuestionProgress.correct_count).label("total_correct"),
            func.avg(QuestionProgress.last_response_time_seconds).label("avg_response_time"),
        )
        .join(Question, QuestionProgress.question_id == Question.id)
        .join(Task, Question.task_id == Task.id)
        .where(QuestionProgress.user_id == user_id)
        .group_by(Task.id, Task.name, Task.domain_id)
    )

    if domain_id is not None:
        query = query.where(Task.domain_id == domain_id)

    results = db.execute(query).all()

    task_summaries = []
    for row in results:
        total_attempts = row.total_attempts or 0
        total_correct = row.total_correct or 0
        accuracy = total_correct / total_attempts if total_attempts > 0 else 0.0

        task_summaries.append({
            "task_id": row.task_id,
            "task_name": row.task_name,
            "domain_id": row.domain_id,
            "accuracy": accuracy,
            "question_count": total_attempts,
            "avg_response_time": float(row.avg_response_time) if row.avg_response_time else None,
        })

    return task_summaries


# ========================
# SM-2 Spaced Repetition Algorithm
# ========================

def calculate_sm2_next_review(
    quality: int,
    previous_interval: int = 0,
    previous_ease_factor: float = 2.5,
    previous_repetitions: int = 0,
) -> tuple[int, float, int]:
    """
    Calculate next review parameters using SuperMemo SM-2 algorithm.

    Args:
        quality: Quality rating (0-5) where:
            5 - perfect response
            4 - correct response after a hesitation
            3 - correct response recalled with serious difficulty
            2 - incorrect response; where the correct one seemed easy to recall
            1 - incorrect response; the correct one remembered
            0 - complete blackout
        previous_interval: Previous interval in days
        previous_ease_factor: Previous ease factor (starts at 2.5)
        previous_repetitions: Number of successful repetitions

    Returns:
        Tuple of (interval_days, ease_factor, repetitions)

    SM-2 Algorithm:
        - If quality < 3: reset repetitions to 0, interval to 1
        - ease_factor = max(1.3, previous_ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)))
        - If repetitions == 0: interval = 1
        - If repetitions == 1: interval = 6
        - If repetitions > 1: interval = previous_interval * ease_factor
    """
    # Calculate new ease factor
    ease_factor = previous_ease_factor + (
        0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    )
    ease_factor = max(1.3, ease_factor)

    # Reset on poor quality
    if quality < 3:
        repetitions = 0
        interval = 1
    else:
        repetitions = previous_repetitions + 1

        # Calculate interval based on repetitions
        if repetitions == 0:
            interval = 1
        elif repetitions == 1:
            interval = 6
        else:
            interval = int(previous_interval * ease_factor)

    return interval, ease_factor, repetitions


def get_due_flashcards(
    db: Session, user_id: uuid.UUID, limit: int = 20
) -> list[dict[str, Any]]:
    """
    Get flashcards due for review based on SM-2 scheduling.

    Prioritizes:
    1. Overdue cards (next_review_at < now)
    2. New cards (no review history)
    3. Due cards sorted by next_review_at

    Args:
        db: Database session
        user_id: User UUID
        limit: Maximum number of flashcards to return

    Returns:
        List of flashcards with progress info
    """
    now = datetime.utcnow()

    # Get cards with progress data
    flashcard_progress = (
        db.query(FlashcardProgress, Flashcard, Task, Domain)
        .join(Flashcard, FlashcardProgress.flashcard_id == Flashcard.id)
        .join(Task, Flashcard.task_id == Task.id)
        .join(Domain, Task.domain_id == Domain.id)
        .filter(FlashcardProgress.user_id == user_id)
        .filter(
            (FlashcardProgress.next_review_at.is_(None))
            | (FlashcardProgress.next_review_at <= now)
        )
        .order_by(FlashcardProgress.next_review_at.asc().nullsfirst())
        .limit(limit)
        .all()
    )

    results = [
        {
            "flashcard_id": fp.flashcard_id,
            "flashcard_front": flashcard.front,
            "flashcard_back": flashcard.back,
            "task_id": task.id,
            "task_name": task.name,
            "domain_id": domain.id,
            "domain_name": domain.name,
            "ease_factor": fp.ease_factor,
            "interval": fp.interval,
            "repetitions": fp.repetitions,
            "review_count": fp.review_count,
            "last_reviewed_at": fp.last_reviewed_at.isoformat()
            if fp.last_reviewed_at
            else None,
            "next_review_at": fp.next_review_at.isoformat()
            if fp.next_review_at
            else None,
        }
        for fp, flashcard, task, domain in flashcard_progress
    ]

    return results


# ========================
# Study Recommendations
# ========================

# Performance thresholds
WEAK_THRESHOLD = 0.60  # Below 60% is considered weak
STRONG_THRESHOLD = 0.80  # Above 80% is considered strong
MIN_ATTEMPTS_THRESHOLD = 5  # Minimum attempts before analyzing


def generate_study_recommendations(
    db: Session, user_id: uuid.UUID
) -> list[dict[str, Any]]:
    """
    Generate personalized study recommendations based on weak areas.

    Creates recommendations for:
    1. Focusing on weak domains (highest priority)
    2. Reviewing specific weak tasks
    3. Practicing more questions in weak areas
    4. Reinforcing strong domains (lower priority)

    Args:
        db: Database session
        user_id: User UUID

    Returns:
        List of recommendation dictionaries
    """
    # Update analytics first
    analytics = calculate_user_analytics(db, user_id)

    # Clear old recommendations for this user
    old_recommendations = db.execute(
        select(LearningRecommendation).where(
            LearningRecommendation.user_id == user_id
        )
    ).scalars().all()

    for old_rec in old_recommendations:
        db.delete(old_rec)

    db.flush()

    recommendations = []
    priority = 100

    # Get weak and strong domains from analytics
    weak_domains = analytics.weak_domains or []
    strong_domains = analytics.strong_domains or []

    # Recommendations for weak domains (highest priority)
    for domain in weak_domains:
        domain_id = domain["domain_id"]
        domain_name_result = db.execute(
            select(Domain.name).where(Domain.id == domain_id)
        ).scalar_one_or_none()

        domain_name = domain_name_result or f"Domain {domain_id}"

        # Focus on weak domain recommendation
        rec = LearningRecommendation(
            user_id=user_id,
            user_analytics_id=analytics.id,
            domain_id=domain_id,
            task_id=None,
            recommendation_type="focus_weak_domain",
            priority=priority,
            reason=f"Your accuracy in {domain_name} is {domain['accuracy']:.1%}. "
            f"Focus additional study time here to improve.",
        )
        recommendations.append(rec)
        priority -= 10

        # Find weak tasks within this domain
        task_summaries = get_task_performance_summary(db, user_id, domain_id)
        weak_tasks = [
            t
            for t in task_summaries
            if t["accuracy"] < STRONG_THRESHOLD and t["question_count"] >= 3
        ]

        # Sort by accuracy (lowest first)
        weak_tasks.sort(key=lambda x: x["accuracy"])

        for task in weak_tasks[:3]:  # Top 3 weakest tasks
            rec = LearningRecommendation(
                user_id=user_id,
                user_analytics_id=analytics.id,
                domain_id=task["domain_id"],
                task_id=task["task_id"],
                recommendation_type="review_task",
                priority=priority,
                reason=f"Review task '{task['task_name']}' in {domain_name}. "
                f"Current accuracy: {task['accuracy']:.1%}.",
            )
            recommendations.append(rec)
            priority -= 5

    # Recommendations for strong domains (reinforcement)
    for domain in strong_domains:
        domain_id = domain["domain_id"]
        domain_name_result = db.execute(
            select(Domain.name).where(Domain.id == domain_id)
        ).scalar_one_or_none()

        domain_name = domain_name_result or f"Domain {domain_id}"

        rec = LearningRecommendation(
            user_id=user_id,
            user_analytics_id=analytics.id,
            domain_id=domain_id,
            task_id=None,
            recommendation_type="reinforce_strength",
            priority=priority - 20,
            reason=f"Great performance in {domain_name} ({domain['accuracy']:.1%})! "
            f"Continue practicing to maintain this strength.",
        )
        recommendations.append(rec)
        priority -= 5

    # General practice recommendation if low overall attempts
    if analytics.total_questions_answered < 50:
        rec = LearningRecommendation(
            user_id=user_id,
            user_analytics_id=analytics.id,
            domain_id=None,
            task_id=None,
            recommendation_type="practice_more",
            priority=50,
            reason=f"You've completed {analytics.total_questions_answered} questions. "
            f"Aim for at least 200+ practice questions to build a solid foundation.",
        )
        recommendations.append(rec)

    db.add_all(recommendations)
    db.commit()

    for rec in recommendations:
        db.refresh(rec)

    return [
        {
            "id": str(rec.id),
            "type": rec.recommendation_type,
            "priority": rec.priority,
            "reason": rec.reason,
            "domain_id": rec.domain_id,
            "task_id": rec.task_id,
            "created_at": rec.created_at.isoformat(),
        }
        for rec in recommendations
    ]


def get_recommended_content(
    db: Session, user_id: uuid.UUID, content_type: str = "question", limit: int = 10
) -> list[dict[str, Any]]:
    """
    Get recommended study content based on weak areas.

    Args:
        db: Database session
        user_id: User UUID
        content_type: Type of content ("question" or "flashcard")
        limit: Maximum number of items to return

    Returns:
        List of recommended items with domain/task context
    """
    analytics = db.execute(
        select(UserAnalytics).where(UserAnalytics.user_id == user_id)
    ).scalar_one_or_none()

    if not analytics or not analytics.weak_domains:
        # If no weak domains, return balanced content across all domains
        all_domain_ids = [d.id for d in db.execute(select(Domain.id)).scalars().all()]
        weak_domain_ids = all_domain_ids
    else:
        weak_domain_ids = [d["domain_id"] for d in analytics.weak_domains]

    if content_type == "flashcard":
        items = (
            db.query(
                Flashcard.id,
                Flashcard.front,
                Flashcard.back,
                Task.id.label("task_id"),
                Task.name.label("task_name"),
                Domain.id.label("domain_id"),
                Domain.name.label("domain_name"),
            )
            .join(Task, Flashcard.task_id == Task.id)
            .join(Domain, Task.domain_id == Domain.id)
            .filter(Domain.id.in_(weak_domain_ids))
            .order_by(func.random())
            .limit(limit)
            .all()
        )

        return [
            {
                "id": item.id,
                "front": item.front,
                "back": item.back,
                "task_id": item.task_id,
                "task_name": item.task_name,
                "domain_id": item.domain_id,
                "domain_name": item.domain_name,
                "content_type": "flashcard",
            }
            for item in items
        ]

    else:  # questions
        items = (
            db.query(
                Question.id,
                Question.question_text,
                Question.option_a,
                Question.option_b,
                Question.option_c,
                Question.option_d,
                Question.correct_answer,
                Question.explanation,
                Question.difficulty,
                Task.id.label("task_id"),
                Task.name.label("task_name"),
                Domain.id.label("domain_id"),
                Domain.name.label("domain_name"),
            )
            .join(Task, Question.task_id == Task.id)
            .join(Domain, Task.domain_id == Domain.id)
            .filter(Domain.id.in_(weak_domain_ids))
            .order_by(func.random())
            .limit(limit)
            .all()
        )

        return [
            {
                "id": item.id,
                "question_text": item.question_text,
                "option_a": item.option_a,
                "option_b": item.option_b,
                "option_c": item.option_c,
                "option_d": item.option_d,
                "correct_answer": item.correct_answer,
                "explanation": item.explanation,
                "difficulty": item.difficulty,
                "task_id": item.task_id,
                "task_name": item.task_name,
                "domain_id": item.domain_id,
                "domain_name": item.domain_name,
                "content_type": "question",
            }
            for item in items
        ]


# ========================
# Adaptive Engine Class
# ========================

class AdaptiveEngine:
    """
    Adaptive learning engine for personalized study recommendations.

    Analyzes user performance across domains and tasks to provide
    data-driven study suggestions using spaced repetition algorithms.
    """

    # PMP 2026 ECO domain weights
    DOMAIN_WEIGHTS = {
        "People": 0.33,
        "Process": 0.41,
        "Business Environment": 0.26,
    }

    def __init__(self, db: Session) -> None:
        """Initialize the adaptive engine with a database session."""
        self.db = db

    def analyze_performance(self, user_id: uuid.UUID) -> dict[str, Any]:
        """
        Analyze user performance across domains and tasks.

        Args:
            user_id: User UUID

        Returns:
            Dictionary containing performance metrics
        """
        analytics = calculate_user_analytics(self.db, user_id)

        return {
            "overall_accuracy": analytics.overall_accuracy,
            "total_questions_answered": analytics.total_questions_answered,
            "avg_response_time": analytics.avg_response_time,
            "strong_domains": analytics.strong_domains,
            "weak_domains": analytics.weak_domains,
            "domain_performance": get_domain_performance_summary(self.db, user_id),
            "task_performance": get_task_performance_summary(self.db, user_id),
        }

    def get_recommendations(self, user_id: uuid.UUID) -> list[dict[str, Any]]:
        """
        Get personalized study recommendations.

        Args:
            user_id: User UUID

        Returns:
            List of recommendation dictionaries
        """
        return generate_study_recommendations(self.db, user_id)

    def get_due_flashcards(self, user_id: uuid.UUID, limit: int = 20) -> list[dict[str, Any]]:
        """
        Get flashcards due for review.

        Args:
            user_id: User UUID
            limit: Maximum number of flashcards

        Returns:
            List of due flashcards
        """
        return get_due_flashcards(self.db, user_id, limit)

    def get_recommended_questions(
        self, user_id: uuid.UUID, limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        Get recommended practice questions based on weak areas.

        Args:
            user_id: User UUID
            limit: Maximum number of questions

        Returns:
            List of recommended questions
        """
        return get_recommended_content(self.db, user_id, "question", limit)

    def get_recommended_flashcards(
        self, user_id: uuid.UUID, limit: int = 10
    ) -> list[dict[str, Any]]:
        """
        Get recommended flashcards based on weak areas.

        Args:
            user_id: User UUID
            limit: Maximum number of flashcards

        Returns:
            List of recommended flashcards
        """
        return get_recommended_content(self.db, user_id, "flashcard", limit)

