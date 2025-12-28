"""Question API routes for practice test functionality."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models import Domain, Question, QuestionProgress, Task, User
from app.schemas.question import (
    QuestionAnswerRequest,
    QuestionAnswerResponse,
    QuestionResponse,
)

router = APIRouter(prefix="/api/questions", tags=["questions"])


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


@router.get("", response_model=list[QuestionResponse])
async def get_questions(
    db: Annotated[Session, Depends(get_db)],
    domain: Annotated[int | None, Query(description="Filter by domain ID")] = None,
    task: Annotated[int | None, Query(description="Filter by task ID")] = None,
    difficulty: Annotated[
        str | None, Query(description="Filter by difficulty (easy, medium, hard)")
    ] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Number of questions to return")] = 50,
    offset: Annotated[int, Query(ge=0, description="Number of questions to skip")] = 0,
) -> list[QuestionResponse]:
    """
    Get practice questions with optional filters.

    - **domain**: Filter questions by domain ID
    - **task**: Filter questions by task ID (more specific than domain)
    - **difficulty**: Filter by difficulty level (easy, medium, hard)
    - **limit**: Maximum number of questions to return (default 50, max 100)
    - **offset**: Number of questions to skip for pagination
    """
    query = select(Question).options(joinedload(Question.task))

    # Apply filters
    if task:
        # Task filter is more specific, use it directly
        query = query.where(Question.task_id == task)
    elif domain:
        # Filter by domain via task relationship
        query = query.join(Task).where(Task.domain_id == domain)

    if difficulty:
        difficulty_lower = difficulty.lower()
        if difficulty_lower not in ["easy", "medium", "hard"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="difficulty must be 'easy', 'medium', or 'hard'",
            )
        query = query.where(Question.difficulty == difficulty_lower)

    # Apply ordering, pagination
    query = query.order_by(Question.id).offset(offset).limit(limit)

    result = db.execute(query)
    questions = result.scalars().all()

    return [QuestionResponse.model_validate(q) for q in questions]


@router.get("/{question_id}", response_model=QuestionResponse)
async def get_question(
    question_id: int,
    db: Annotated[Session, Depends(get_db)],
) -> QuestionResponse:
    """
    Get a single question by ID.
    """
    question = db.execute(
        select(Question).where(Question.id == question_id)
    ).scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )

    return QuestionResponse.model_validate(question)


@router.post("/{question_id}/answer", response_model=QuestionAnswerResponse)
async def submit_answer(
    question_id: int,
    answer_request: QuestionAnswerRequest,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[
        str | None, Header(description="Browser-generated anonymous user ID")
    ] = None,
) -> QuestionAnswerResponse:
    """
    Submit an answer to a practice question.

    - **question_id**: The ID of the question being answered
    - **answer**: The user's answer (A, B, C, or D)

    Returns immediate feedback with the correct answer and explanation.
    If X-Anonymous-Id header is provided, tracks the user's progress.
    """
    # Get the question
    question = db.execute(
        select(Question).where(Question.id == question_id)
    ).scalar_one_or_none()

    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question with ID {question_id} not found",
        )

    user_answer = answer_request.answer.upper()
    is_correct = user_answer == question.correct_answer

    # Track progress if user is identified
    # Note: Progress tracking requires QuestionProgress model to be fixed
    # (question_id type mismatch: model uses UUID but Question.id is Integer)
    if x_anonymous_id:
        try:
            user = get_or_create_user(db, x_anonymous_id)

            # Get or create progress record
            progress = db.execute(
                select(QuestionProgress).where(
                    QuestionProgress.user_id == user.id,
                    QuestionProgress.question_id == question_id,
                )
            ).scalar_one_or_none()

            if progress:
                # Update existing progress
                progress.attempt_count += 1
                if is_correct:
                    progress.correct_count += 1
                progress.last_answer = user_answer
                progress.last_correct = is_correct
                progress.last_attempted_at = datetime.now(timezone.utc)
                progress.last_response_time_seconds = answer_request.response_time_seconds
            else:
                # Create new progress record
                progress = QuestionProgress(
                    user_id=user.id,
                    question_id=question_id,
                    attempt_count=1,
                    correct_count=1 if is_correct else 0,
                    last_answer=user_answer,
                    last_correct=is_correct,
                    last_attempted_at=datetime.now(timezone.utc),
                    last_response_time_seconds=answer_request.response_time_seconds,
                )
                db.add(progress)

            db.commit()

            # Trigger analytics recalculation after progress update
            from app.services.adaptive_engine import calculate_user_analytics
            try:
                calculate_user_analytics(db, user.id)
            except Exception:
                # Analytics calculation should not block the response
                pass
        except Exception:
            # Progress tracking failed, but answer submission should still succeed
            db.rollback()

    return QuestionAnswerResponse(
        question_id=question_id,
        user_answer=user_answer,
        correct_answer=question.correct_answer,
        is_correct=is_correct,
        explanation=question.explanation,
        message="Correct!" if is_correct else "Incorrect. Review the explanation.",
    )
