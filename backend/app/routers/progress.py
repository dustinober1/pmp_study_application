"""Progress API routes for tracking user study progress."""

from datetime import date, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Domain
from app.models.flashcard import Flashcard
from app.models.progress import FlashcardProgress, QuestionProgress
from app.models.question import Question
from app.models.session import StudySession
from app.models.task import Task
from app.models.user import User
from app.schemas.progress import (
    DomainDetailedProgressResponse,
    DomainProgressSummary,
    OverallProgressSummary,
    ProgressSummaryResponse,
    TaskProgressSummary,
)

router = APIRouter(prefix="/api/progress", tags=["progress"])


MASTERY_EASE_FACTOR_THRESHOLD = 2.5


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


def calculate_streak(db: Session, user_id: UUID) -> tuple[int, datetime | None]:
    """Calculate current study streak and get last study date."""
    sessions = db.execute(
        select(StudySession.started_at)
        .where(StudySession.user_id == user_id)
        .order_by(StudySession.started_at.desc())
    ).scalars().all()

    if not sessions:
        return 0, None

    last_study_date = sessions[0]

    study_dates = set()
    for session in sessions:
        study_dates.add(session.date())

    today = date.today()
    current_streak = 0

    if last_study_date.date() == today:
        current_streak = 1
        check_date = today - timedelta(days=1)
    elif last_study_date.date() == today - timedelta(days=1):
        current_streak = 1
        check_date = today - timedelta(days=1)
    else:
        return 0, last_study_date

    while check_date in study_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    return current_streak, last_study_date


def get_domain_progress(
    db: Session, user_id: UUID, domain: Domain
) -> DomainProgressSummary:
    """Calculate progress summary for a specific domain."""
    task_ids = [task.id for task in domain.tasks]

    if not task_ids:
        return DomainProgressSummary(
            domain_id=domain.id,
            domain_name=domain.name,
            domain_weight=domain.weight,
        )

    total_flashcards = db.execute(
        select(func.count(Flashcard.id)).where(Flashcard.task_id.in_(task_ids))
    ).scalar() or 0

    total_questions = db.execute(
        select(func.count(Question.id)).where(Question.task_id.in_(task_ids))
    ).scalar() or 0

    flashcard_ids_in_domain = db.execute(
        select(Flashcard.id).where(Flashcard.task_id.in_(task_ids))
    ).scalars().all()

    question_ids_in_domain = db.execute(
        select(Question.id).where(Question.task_id.in_(task_ids))
    ).scalars().all()

    reviewed_flashcards = 0
    mastered_flashcards = 0
    total_flashcard_reviews = 0
    correct_flashcard_reviews = 0

    if flashcard_ids_in_domain:
        flashcard_progress = db.execute(
            select(FlashcardProgress)
            .where(FlashcardProgress.user_id == user_id)
            .where(FlashcardProgress.flashcard_id.in_(flashcard_ids_in_domain))
        ).scalars().all()

        reviewed_flashcards = len(flashcard_progress)
        for fp in flashcard_progress:
            if fp.ease_factor >= MASTERY_EASE_FACTOR_THRESHOLD and fp.repetitions >= 3:
                mastered_flashcards += 1
            total_flashcard_reviews += fp.review_count
            correct_flashcard_reviews += fp.correct_count

    attempted_questions = 0
    correct_questions = 0
    total_question_attempts = 0
    correct_question_attempts = 0

    if question_ids_in_domain:
        question_progress = db.execute(
            select(QuestionProgress)
            .where(QuestionProgress.user_id == user_id)
            .where(QuestionProgress.question_id.in_(question_ids_in_domain))
        ).scalars().all()

        attempted_questions = len(question_progress)
        for qp in question_progress:
            if qp.correct_count > 0:
                correct_questions += 1
            total_question_attempts += qp.attempt_count
            correct_question_attempts += qp.correct_count

    flashcard_accuracy = (
        (correct_flashcard_reviews / total_flashcard_reviews * 100)
        if total_flashcard_reviews > 0
        else 0.0
    )
    question_accuracy = (
        (correct_question_attempts / total_question_attempts * 100)
        if total_question_attempts > 0
        else 0.0
    )

    return DomainProgressSummary(
        domain_id=domain.id,
        domain_name=domain.name,
        domain_weight=domain.weight,
        total_flashcards=total_flashcards,
        reviewed_flashcards=reviewed_flashcards,
        mastered_flashcards=mastered_flashcards,
        total_questions=total_questions,
        attempted_questions=attempted_questions,
        correct_questions=correct_questions,
        flashcard_accuracy=round(flashcard_accuracy, 1),
        question_accuracy=round(question_accuracy, 1),
    )


def get_task_progress(
    db: Session, user_id: UUID, task: Task
) -> TaskProgressSummary:
    """Calculate progress summary for a specific task."""
    total_flashcards = db.execute(
        select(func.count(Flashcard.id)).where(Flashcard.task_id == task.id)
    ).scalar() or 0

    total_questions = db.execute(
        select(func.count(Question.id)).where(Question.task_id == task.id)
    ).scalar() or 0

    flashcard_ids_in_task = db.execute(
        select(Flashcard.id).where(Flashcard.task_id == task.id)
    ).scalars().all()

    question_ids_in_task = db.execute(
        select(Question.id).where(Question.task_id == task.id)
    ).scalars().all()

    reviewed_flashcards = 0
    mastered_flashcards = 0
    total_flashcard_reviews = 0
    correct_flashcard_reviews = 0

    if flashcard_ids_in_task:
        flashcard_progress = db.execute(
            select(FlashcardProgress)
            .where(FlashcardProgress.user_id == user_id)
            .where(FlashcardProgress.flashcard_id.in_(flashcard_ids_in_task))
        ).scalars().all()

        reviewed_flashcards = len(flashcard_progress)
        for fp in flashcard_progress:
            if fp.ease_factor >= MASTERY_EASE_FACTOR_THRESHOLD and fp.repetitions >= 3:
                mastered_flashcards += 1
            total_flashcard_reviews += fp.review_count
            correct_flashcard_reviews += fp.correct_count

    attempted_questions = 0
    correct_questions = 0
    total_question_attempts = 0
    correct_question_attempts = 0

    if question_ids_in_task:
        question_progress = db.execute(
            select(QuestionProgress)
            .where(QuestionProgress.user_id == user_id)
            .where(QuestionProgress.question_id.in_(question_ids_in_task))
        ).scalars().all()

        attempted_questions = len(question_progress)
        for qp in question_progress:
            if qp.correct_count > 0:
                correct_questions += 1
            total_question_attempts += qp.attempt_count
            correct_question_attempts += qp.correct_count

    flashcard_accuracy = (
        (correct_flashcard_reviews / total_flashcard_reviews * 100)
        if total_flashcard_reviews > 0
        else 0.0
    )
    question_accuracy = (
        (correct_question_attempts / total_question_attempts * 100)
        if total_question_attempts > 0
        else 0.0
    )

    return TaskProgressSummary(
        task_id=task.id,
        task_name=task.name,
        total_flashcards=total_flashcards,
        reviewed_flashcards=reviewed_flashcards,
        mastered_flashcards=mastered_flashcards,
        total_questions=total_questions,
        attempted_questions=attempted_questions,
        correct_questions=correct_questions,
        flashcard_accuracy=round(flashcard_accuracy, 1),
        question_accuracy=round(question_accuracy, 1),
    )


@router.get("/summary", response_model=ProgressSummaryResponse)
async def get_progress_summary(
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> ProgressSummaryResponse:
    """
    Get overall progress summary for the user.

    Returns overall statistics and progress breakdown by domain.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    domains = db.execute(
        select(Domain).order_by(Domain.order)
    ).scalars().all()

    domain_summaries = []
    overall_total_flashcards = 0
    overall_reviewed_flashcards = 0
    overall_mastered_flashcards = 0
    overall_total_questions = 0
    overall_attempted_questions = 0
    overall_correct_questions = 0

    for domain in domains:
        domain_summary = get_domain_progress(db, user.id, domain)
        domain_summaries.append(domain_summary)

        overall_total_flashcards += domain_summary.total_flashcards
        overall_reviewed_flashcards += domain_summary.reviewed_flashcards
        overall_mastered_flashcards += domain_summary.mastered_flashcards
        overall_total_questions += domain_summary.total_questions
        overall_attempted_questions += domain_summary.attempted_questions
        overall_correct_questions += domain_summary.correct_questions

    sessions_result = db.execute(
        select(
            func.count(StudySession.id),
            func.coalesce(func.sum(StudySession.duration_seconds), 0),
        )
        .where(StudySession.user_id == user.id)
    ).one()

    total_sessions = sessions_result[0] or 0
    total_study_time = sessions_result[1] or 0

    all_flashcard_progress = db.execute(
        select(FlashcardProgress).where(FlashcardProgress.user_id == user.id)
    ).scalars().all()

    total_reviews = sum(fp.review_count for fp in all_flashcard_progress)
    correct_reviews = sum(fp.correct_count for fp in all_flashcard_progress)
    overall_flashcard_accuracy = (
        (correct_reviews / total_reviews * 100) if total_reviews > 0 else 0.0
    )

    all_question_progress = db.execute(
        select(QuestionProgress).where(QuestionProgress.user_id == user.id)
    ).scalars().all()

    total_attempts = sum(qp.attempt_count for qp in all_question_progress)
    correct_attempts = sum(qp.correct_count for qp in all_question_progress)
    overall_question_accuracy = (
        (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0.0
    )

    streak_days, last_study_date = calculate_streak(db, user.id)

    overall_summary = OverallProgressSummary(
        total_flashcards=overall_total_flashcards,
        reviewed_flashcards=overall_reviewed_flashcards,
        mastered_flashcards=overall_mastered_flashcards,
        total_questions=overall_total_questions,
        attempted_questions=overall_attempted_questions,
        correct_questions=overall_correct_questions,
        total_study_time_seconds=total_study_time,
        total_sessions=total_sessions,
        flashcard_accuracy=round(overall_flashcard_accuracy, 1),
        question_accuracy=round(overall_question_accuracy, 1),
        streak_days=streak_days,
        last_study_date=last_study_date,
    )

    return ProgressSummaryResponse(
        overall=overall_summary,
        by_domain=domain_summaries,
    )


@router.get("/domain/{domain_id}", response_model=DomainDetailedProgressResponse)
async def get_domain_progress_detail(
    domain_id: int,
    x_anonymous_id: str = Header(..., alias="X-Anonymous-ID"),
    db: Session = Depends(get_db),
) -> DomainDetailedProgressResponse:
    """
    Get detailed progress for a specific domain.

    Returns domain summary and progress breakdown by task.
    """
    user = await get_or_create_user(db, x_anonymous_id)

    domain = db.execute(
        select(Domain).where(Domain.id == domain_id)
    ).scalar_one_or_none()

    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")

    domain_summary = get_domain_progress(db, user.id, domain)

    tasks = db.execute(
        select(Task).where(Task.domain_id == domain_id).order_by(Task.order)
    ).scalars().all()

    task_summaries = [get_task_progress(db, user.id, task) for task in tasks]

    return DomainDetailedProgressResponse(
        domain=domain_summary,
        by_task=task_summaries,
    )
