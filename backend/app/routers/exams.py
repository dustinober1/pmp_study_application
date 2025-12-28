"""Exam API routes for PMP 2026 Study Application."""

from datetime import datetime, timezone, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.exam import ExamAnswer, ExamReport, ExamSession, ExamStatus
from app.models.question import Question
from app.models.user import User
from app.schemas.exam import (
    ExamAnswerResponse,
    ExamAnswerSubmit,
    ExamQuestionItem,
    ExamQuestionsResponse,
    ExamReportResponse,
    ExamResumeResponse,
    ExamResultResponse,
    ExamSessionCreate,
    ExamSessionDetailResponse,
    ExamSessionResponse,
    ExamSessionSubmit,
    ExamSessionWithReportResponse,
)
from app.services.exam_engine import EXAM_DURATION_MINUTES, TOTAL_QUESTIONS, ExamEngine, create_exam_engine

router = APIRouter(prefix="/api/exams", tags=["exams"])


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


@router.post("/sessions", response_model=ExamSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_exam_session(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    config: ExamSessionCreate | None = None,
) -> ExamSessionResponse:
    """
    Create a new exam session.

    Generates a full PMP exam with proper domain distribution:
    - People: 33%
    - Process: 41%
    - Business Environment: 26%

    The exam is created with 185 questions (default PMP) over 240 minutes.
    Questions are pre-selected and stored in ExamAnswer records.

    Adaptive difficulty adjusts question selection based on prior performance:
    - Weak domains get easier questions and more weight
    - Strong domains get harder questions and less weight
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Check if user has an in-progress session
    existing_stmt = select(ExamSession).where(
        ExamSession.user_id == user.id,
        ExamSession.status == ExamStatus.IN_PROGRESS.value,
    )
    existing_session = db.execute(existing_stmt).scalar_one_or_none()

    if existing_session:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You already have an exam in progress. Complete or abandon it before starting a new one.",
        )

    # Create exam engine with custom config if provided
    engine = create_exam_engine(db)

    # Get adaptive difficulty setting (default True)
    adaptive_difficulty = config.adaptive_difficulty if config else True

    # Create the exam session with generated questions
    session = engine.create_exam_session(
        user_id=user.id,
        adaptive_difficulty=adaptive_difficulty,
    )

    db.refresh(session)

    return ExamSessionResponse(
        id=session.id,
        user_id=session.user_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
        total_time_seconds=session.total_time_seconds,
        questions_count=session.questions_count,
        correct_count=session.correct_count,
        current_question_index=session.current_question_index,
        time_expired=session.time_expired,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.post("/sessions/{session_id}/start", response_model=ExamSessionDetailResponse)
async def start_exam_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> ExamSessionDetailResponse:
    """
    Start an exam session.

    Validates that the session belongs to the user and is in progress.
    Returns session details with remaining time and progress.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Get the session
    stmt = select(ExamSession).where(ExamSession.id == session_id)
    session = db.execute(stmt).scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam session {session_id} not found",
        )

    # Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this exam session",
        )

    # Check status
    if session.status != ExamStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exam session is {session.status}, cannot start",
        )

    # Get remaining time
    engine = create_exam_engine(db)
    remaining = engine.get_remaining_time(session)

    # Get answered and flagged counts
    answered_stmt = select(ExamAnswer).where(
        ExamAnswer.exam_session_id == session_id,
        ExamAnswer.selected_answer != "",
    )
    answered_count = len(db.execute(answered_stmt).scalars().all())

    flagged_stmt = select(ExamAnswer).where(
        ExamAnswer.exam_session_id == session_id,
        ExamAnswer.is_flagged == True,
    )
    flagged_count = len(db.execute(flagged_stmt).scalars().all())

    return ExamSessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
        total_time_seconds=session.total_time_seconds,
        questions_count=session.questions_count,
        correct_count=session.correct_count,
        current_question_index=session.current_question_index,
        time_expired=session.time_expired,
        remaining_time_seconds=int(remaining.total_seconds()),
        answered_count=answered_count,
        flagged_count=flagged_count,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )


@router.post("/sessions/{session_id}/answers", response_model=ExamAnswerResponse)
async def submit_exam_answer(
    session_id: UUID,
    answer: ExamAnswerSubmit,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> ExamAnswerResponse:
    """
    Submit an answer for a question in the exam.

    Records the user's answer, correctness, time spent, and flag status.
    Updates the session's progress (current_question_index).
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Get the session
    stmt = select(ExamSession).where(ExamSession.id == session_id)
    session = db.execute(stmt).scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam session {session_id} not found",
        )

    # Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this exam session",
        )

    # Check status
    if session.status != ExamStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exam session is {session.status}, cannot submit answers",
        )

    # Check if time expired
    engine = create_exam_engine(db)
    if engine.is_time_expired(session):
        # Auto-complete expired session
        engine.complete_exam_session(session)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Exam time has expired. Session has been auto-completed.",
        )

    # Submit the answer using the exam engine
    exam_answer = engine.submit_answer(
        session=session,
        question_id=answer.question_id,
        selected_answer=answer.selected_answer,
        time_spent_seconds=answer.time_spent_seconds,
        is_flagged=answer.is_flagged,
    )

    return ExamAnswerResponse(
        id=exam_answer.id,
        exam_session_id=exam_answer.exam_session_id,
        question_id=exam_answer.question_id,
        question_index=exam_answer.question_index,
        selected_answer=exam_answer.selected_answer,
        is_correct=exam_answer.is_correct,
        time_spent_seconds=exam_answer.time_spent_seconds,
        is_flagged=exam_answer.is_flagged,
        created_at=exam_answer.created_at,
    )


@router.post("/sessions/{session_id}/submit", response_model=ExamResultResponse)
async def submit_exam_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    submit_data: ExamSessionSubmit = ExamSessionSubmit(),
) -> ExamResultResponse:
    """
    Complete an exam session and generate results.

    Calculates final score, domain breakdowns, and generates a report
    with personalized recommendations.

    If force_complete is True, allows completing even if not all questions are answered.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Get the session
    stmt = select(ExamSession).options(joinedload(ExamSession.answers)).where(ExamSession.id == session_id)
    session = db.execute(stmt).scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam session {session_id} not found",
        )

    # Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this exam session",
        )

    # Check status
    if session.status != ExamStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Exam session is {session.status}, cannot submit",
        )

    # Check if all questions are answered (unless force_complete)
    answered_count = sum(1 for a in session.answers if a.selected_answer != "")
    if answered_count < session.questions_count and not submit_data.force_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {answered_count}/{session.questions_count} questions answered. "
            f"Use force_complete=true to submit anyway.",
        )

    # Complete the exam using the engine
    engine = create_exam_engine(db)
    result = engine.complete_exam_session(session)

    return ExamResultResponse(
        exam_session_id=result.session.id,
        score_percentage=result.score_percentage,
        passed=result.passed,
        domain_breakdown=result.domain_breakdown,
        task_breakdown=result.task_breakdown,
        time_spent_seconds=result.time_spent_seconds,
        time_expired=result.time_expired,
        questions_count=result.session.questions_count,
        correct_count=result.session.correct_count,
    )


@router.get("/sessions/{session_id}", response_model=ExamSessionWithReportResponse)
async def get_exam_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> ExamSessionWithReportResponse:
    """
    Get an exam session by ID.

    Returns session details and the exam report if the exam is completed.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Get the session with report
    stmt = (
        select(ExamSession)
        .options(joinedload(ExamSession.report))
        .where(ExamSession.id == session_id)
    )
    session = db.execute(stmt).scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam session {session_id} not found",
        )

    # Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this exam session",
        )

    # Build response
    report_response = None
    if session.report:
        report_response = ExamReportResponse(
            id=session.report.id,
            exam_session_id=session.report.exam_session_id,
            score_percentage=session.report.score_percentage,
            domain_breakdown=session.report.domain_breakdown,
            task_breakdown=session.report.task_breakdown,
            recommendations=session.report.recommendations,
            strengths=session.report.strengths,
            weaknesses=session.report.weaknesses,
            created_at=session.report.created_at,
            updated_at=session.report.updated_at,
        )

    return ExamSessionWithReportResponse(
        id=session.id,
        user_id=session.user_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
        total_time_seconds=session.total_time_seconds,
        questions_count=session.questions_count,
        correct_count=session.correct_count,
        current_question_index=session.current_question_index,
        time_expired=session.time_expired,
        created_at=session.created_at,
        updated_at=session.updated_at,
        report=report_response,
    )


@router.get("/sessions/{session_id}/questions", response_model=ExamQuestionsResponse)
async def get_exam_session_questions(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> ExamQuestionsResponse:
    """
    Get all questions for an exam session.

    Returns the list of questions with answer status, flag status,
    and time spent for each question.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Get the session
    stmt = select(ExamSession).where(ExamSession.id == session_id)
    session = db.execute(stmt).scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam session {session_id} not found",
        )

    # Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this exam session",
        )

    # Get questions from exam engine
    engine = create_exam_engine(db)
    questions_data = engine.get_exam_session_questions(session)

    # Convert to schema format
    question_items = [
        ExamQuestionItem(
            question_index=q["question_index"],
            question_id=q["question_id"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            selected_answer=q.get("selected_answer") or None,
            is_correct=q.get("is_correct"),
            is_flagged=q["is_flagged"],
            time_spent_seconds=q["time_spent_seconds"],
            domain_name=q.get("domain_name"),
            task_name=q.get("task_name"),
        )
        for q in questions_data
    ]

    return ExamQuestionsResponse(
        exam_session_id=session_id,
        questions=question_items,
    )


@router.get("/sessions/{session_id}/resume", response_model=ExamResumeResponse)
async def resume_exam_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> ExamResumeResponse:
    """
    Resume an in-progress exam session.

    Returns the session details, all questions, and identifies the current
    question to resume from (first unanswered or flagged question).

    For completed sessions, returns the session without a current question.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Get the session
    stmt = select(ExamSession).where(ExamSession.id == session_id)
    session = db.execute(stmt).scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam session {session_id} not found",
        )

    # Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this exam session",
        )

    # Check if time expired
    engine = create_exam_engine(db)
    if session.status == ExamStatus.IN_PROGRESS.value and engine.is_time_expired(session):
        # Auto-complete expired session
        engine.complete_exam_session(session)
        db.refresh(session)

    # Get remaining time
    remaining = timedelta() if session.status != ExamStatus.IN_PROGRESS.value else engine.get_remaining_time(session)

    # Get answered and flagged counts
    answers_stmt = select(ExamAnswer).where(
        ExamAnswer.exam_session_id == session_id,
    )
    answers = list(db.execute(answers_stmt).scalars().all())
    answered_count = sum(1 for a in answers if a.selected_answer != "")
    flagged_count = sum(1 for a in answers if a.is_flagged)

    # Build session response
    session_response = ExamSessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        status=session.status,
        start_time=session.start_time,
        end_time=session.end_time,
        total_time_seconds=session.total_time_seconds,
        questions_count=session.questions_count,
        correct_count=session.correct_count,
        current_question_index=session.current_question_index,
        time_expired=session.time_expired,
        remaining_time_seconds=int(remaining.total_seconds()),
        answered_count=answered_count,
        flagged_count=flagged_count,
        created_at=session.created_at,
        updated_at=session.updated_at,
    )

    # Get questions
    questions_data = engine.get_exam_session_questions(session)
    question_items = [
        ExamQuestionItem(
            question_index=q["question_index"],
            question_id=q["question_id"],
            question_text=q["question_text"],
            option_a=q["option_a"],
            option_b=q["option_b"],
            option_c=q["option_c"],
            option_d=q["option_d"],
            selected_answer=q.get("selected_answer") or None,
            is_correct=q.get("is_correct"),
            is_flagged=q["is_flagged"],
            time_spent_seconds=q["time_spent_seconds"],
            domain_name=q.get("domain_name"),
            task_name=q.get("task_name"),
        )
        for q in questions_data
    ]

    # Find current question (first unanswered or flagged)
    current_question = None
    if session.status == ExamStatus.IN_PROGRESS.value:
        for q in question_items:
            if q.selected_answer is None or q.is_flagged:
                current_question = q
                break

    return ExamResumeResponse(
        session=session_response,
        questions=question_items,
        current_question=current_question,
    )


@router.get("/sessions", response_model=list[ExamSessionResponse])
async def list_exam_sessions(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    status_filter: Annotated[
        str | None,
        Query(description="Filter by status (in_progress, completed, abandoned)"),
    ] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 10,
    offset: Annotated[int, Query(ge=0)] = 0,
) -> list[ExamSessionResponse]:
    """
    List exam sessions for the current user.

    Supports filtering by status and pagination.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Build query
    stmt = select(ExamSession).where(ExamSession.user_id == user.id)

    if status_filter:
        if status_filter not in [ExamStatus.IN_PROGRESS.value, ExamStatus.COMPLETED.value, ExamStatus.ABANDONED.value]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid status filter: {status_filter}",
            )
        stmt = stmt.where(ExamSession.status == status_filter)

    stmt = stmt.order_by(ExamSession.created_at.desc()).offset(offset).limit(limit)

    sessions = db.execute(stmt).scalars().all()

    return [
        ExamSessionResponse(
            id=s.id,
            user_id=s.user_id,
            status=s.status,
            start_time=s.start_time,
            end_time=s.end_time,
            total_time_seconds=s.total_time_seconds,
            questions_count=s.questions_count,
            correct_count=s.correct_count,
            current_question_index=s.current_question_index,
            time_expired=s.time_expired,
            created_at=s.created_at,
            updated_at=s.updated_at,
        )
        for s in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def abandon_exam_session(
    session_id: UUID,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> None:
    """
    Abandon an in-progress exam session.

    Marks the session as abandoned. This cannot be undone.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Get the session
    stmt = select(ExamSession).where(ExamSession.id == session_id)
    session = db.execute(stmt).scalar_one_or_none()

    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Exam session {session_id} not found",
        )

    # Verify ownership
    if session.user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this exam session",
        )

    # Only allow abandoning in-progress sessions
    if session.status != ExamStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot abandon a {session.status} session",
        )

    # Mark as abandoned
    session.status = ExamStatus.ABANDONED.value
    session.end_time = datetime.now(timezone.utc)
    db.commit()

    return None
