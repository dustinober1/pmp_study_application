"""Micro-learning flashcard API routes for PMP 2026 Study Application."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.micro_learning import MicroFlashcard, MicroProgress, QuickSession, StudyQueue
from app.models.user import User
from app.services.micro_scheduler import MicroLearningScheduler

router = APIRouter(prefix="/api/micro", tags=["micro-learning"])


def get_or_create_user(db: Session, anonymous_id: str) -> User:
    """Get existing user by anonymous_id or create a new one."""
    from sqlalchemy import select

    stmt = select(User).where(User.anonymous_id == anonymous_id)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        user = User(anonymous_id=anonymous_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


@router.get("/queue")
async def get_study_queue(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    context: Annotated[str | None, Query(description="Filter by context: commute, break, waiting, general")] = None,
    limit: Annotated[int, Query(ge=1, le=50, description="Max queue size")] = 20,
) -> dict:
    """
    Get user's current study queue for micro-learning.

    Returns micro flashcards ordered by priority score.
    Optionally filter by context (commute, break, waiting, general).
    """
    user = get_or_create_user(db, x_anonymous_id)
    scheduler = MicroLearningScheduler(db)

    # Rebuild queue if empty
    existing_queue = db.execute(
        select(StudyQueue).where(
            StudyQueue.user_id == user.id,
            StudyQueue.is_active == True,
        )
    ).scalars().first()

    if not existing_queue:
        scheduler.rebuild_user_queue(user.id, context, limit)

    queue = scheduler.get_user_queue(user.id, context, limit)

    return {
        "user_id": str(user.id),
        "context": context or "general",
        "queue_size": len(queue),
        "queue": queue,
    }


@router.post("/queue/rebuild")
async def rebuild_queue(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    context: Annotated[str | None, Query(description="Filter by context")] = None,
    limit: Annotated[int, Query(ge=10, le=100, description="Max queue size")] = 50,
) -> dict:
    """
    Rebuild user's study queue with updated priority scores.

    Clears existing queue and regenerates based on current progress,
    weak areas, and due cards.
    """
    user = get_or_create_user(db, x_anonymous_id)
    scheduler = MicroLearningScheduler(db)

    queue = scheduler.rebuild_user_queue(user.id, context, limit)

    return {
        "user_id": str(user.id),
        "context": context or "general",
        "queue_size": len(queue),
        "message": "Queue rebuilt successfully",
    }


@router.get("/due")
async def get_due_cards(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    context: Annotated[str | None, Query(description="Filter by context")] = None,
    limit: Annotated[int, Query(ge=1, le=20, description="Max results")] = 10,
) -> dict:
    """
    Get micro cards due for review.

    Returns cards that are scheduled for review now (SM-2 scheduling).
    If no due cards, returns new cards from the queue.
    """
    user = get_or_create_user(db, x_anonymous_id)
    scheduler = MicroLearningScheduler(db)

    due_cards = scheduler.get_due_micro_cards(user.id, context, limit)

    return {
        "user_id": str(user.id),
        "due_count": len(due_cards),
        "cards": due_cards,
    }


@router.get("/stats")
async def get_micro_stats(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> dict:
    """
    Get micro-learning statistics for the user.

    Returns:
    - Total reviews
    - Overall accuracy
    - Unique cards learned
    - Context-specific accuracy
    - Recent session stats
    """
    user = get_or_create_user(db, x_anonymous_id)
    scheduler = MicroLearningScheduler(db)

    stats = scheduler.get_micro_stats(user.id)

    return {
        "user_id": str(user.id),
        **stats,
    }


@router.post("/sessions/start")
async def start_quick_session(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    context: Annotated[str, Query(description="Session context: commute, break, waiting, general")] = "general",
    mode: Annotated[str, Query(description="Session mode: cards, time, adaptive")] = "cards",
    target: Annotated[int, Query(ge=1, le=20, description="Card count or time in seconds")] = 5,
) -> dict:
    """
    Start a new quick micro-learning session.

    Creates a 2-minute session with specified parameters:
    - mode='cards': Target is number of cards (default: 5)
    - mode='time': Target is time in seconds (default: 120)
    - mode='adaptive': Adaptive based on performance
    """
    user = get_or_create_user(db, x_anonymous_id)
    scheduler = MicroLearningScheduler(db)

    # Rebuild queue if needed
    existing_queue = db.execute(
        select(StudyQueue).where(
            StudyQueue.user_id == user.id,
            StudyQueue.is_active == True,
        )
    ).scalars().first()

    if not existing_queue:
        scheduler.rebuild_user_queue(user.id, context, 50)

    session = scheduler.create_quick_session(user.id, context, mode, target)

    return {
        "session_id": str(session.id),
        "context": session.context,
        "mode": session.mode,
        "target": session.target,
        "cards_count": len(session.cards_presented_list),
        "started_at": session.started_at.isoformat(),
    }


@router.post("/sessions/{session_id}/review")
async def submit_micro_review(
    session_id: str,
    micro_flashcard_id: int,
    quality: int,
    context: Annotated[str, Query(description="Review context")] = "general",
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> dict:
    """
    Submit a micro flashcard review within a session.

    Quality ratings (0-5):
    - 0: Complete blackout
    - 1: Incorrect, but recognized
    - 2: Incorrect, seemed easy
    - 3: Correct with difficulty
    - 4: Correct after hesitation
    - 5: Perfect recall
    """
    user = get_or_create_user(db, x_anonymous_id)
    scheduler = MicroLearningScheduler(db)

    progress = scheduler.submit_micro_review(
        user_id=user.id,
        micro_flashcard_id=micro_flashcard_id,
        quality=quality,
        context=context,
    )

    return {
        "micro_flashcard_id": micro_flashcard_id,
        "quality": quality,
        "ease_factor": progress.micro_ease_factor,
        "interval": progress.micro_interval,
        "repetitions": progress.micro_repetitions,
        "next_review_at": progress.next_review_at.isoformat()
        if progress.next_review_at
        else None,
    }


@router.post("/sessions/{session_id}/end")
async def end_quick_session(
    session_id: str,
    cards_completed: Annotated[int, Query(ge=0, description="Number of cards completed")] = 0,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> dict:
    """
    End a quick session and record final metrics.

    Marks session as completed and records duration and completion stats.
    """
    import uuid

    user = get_or_create_user(db, x_anonymous_id)

    # Verify session belongs to user
    session = db.execute(
        select(QuickSession).where(
            QuickSession.id == uuid.UUID(session_id),
            QuickSession.user_id == user.id,
        )
    ).scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session {session_id} not found",
        )

    scheduler = MicroLearningScheduler(db)
    updated_session = scheduler.end_quick_session(session.id, cards_completed)

    return {
        "session_id": str(updated_session.id),
        "is_completed": updated_session.is_completed,
        "duration_seconds": updated_session.duration_seconds,
        "cards_completed": updated_session.cards_completed,
        "cards_presented": len(updated_session.cards_presented_list),
        "completion_rate": cards_completed / len(updated_session.cards_presented_list)
        if updated_session.cards_presented_list
        else 0,
    }


@router.get("/sessions/active")
async def get_active_session(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> dict:
    """Get user's currently active quick session (if any)."""
    import uuid

    user = get_or_create_user(db, x_anonymous_id)

    session = db.execute(
        select(QuickSession).where(
            QuickSession.user_id == user.id,
            QuickSession.is_completed == False,
        ).order_by(QuickSession.started_at.desc())
    ).scalar_one_or_none()

    if not session:
        return {"active_session": None}

    # Get micro flashcard details for cards in session
    cards_in_session = db.execute(
        select(MicroFlashcard)
        .where(MicroFlashcard.id.in_(session.cards_presented_list))
        .options(joinedload(MicroFlashcard.source_flashcard))
    ).scalars().all()

    return {
        "active_session": {
            "session_id": str(session.id),
            "context": session.context,
            "mode": session.mode,
            "target": session.target,
            "started_at": session.started_at.isoformat(),
            "cards": [
                {
                    "id": card.id,
                    "micro_front": card.micro_front,
                    "micro_back": card.micro_back,
                    "estimated_seconds": card.estimated_seconds,
                }
                for card in cards_in_session
            ],
        }
    }


@router.get("/sessions/history")
async def get_session_history(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    limit: Annotated[int, Query(ge=1, le=50, description="Max results")] = 10,
) -> dict:
    """Get user's completed quick session history."""
    import uuid

    user = get_or_create_user(db, x_anonymous_id)

    sessions = db.execute(
        select(QuickSession)
        .where(
            QuickSession.user_id == user.id,
            QuickSession.is_completed == True,
        )
        .order_by(QuickSession.started_at.desc())
        .limit(limit)
    ).scalars().all()

    return {
        "total_sessions": len(sessions),
        "sessions": [
            {
                "session_id": str(s.id),
                "context": s.context,
                "mode": s.mode,
                "target": s.target,
                "cards_completed": s.cards_completed,
                "duration_seconds": s.duration_seconds,
                "started_at": s.started_at.isoformat(),
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            }
            for s in sessions
        ],
    }


@router.get("/flashcards/{micro_id}")
async def get_micro_flashcard(
    micro_id: int,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")] = None,
) -> dict:
    """Get a single micro flashcard by ID."""
    micro = db.execute(
        select(MicroFlashcard)
        .options(joinedload(MicroFlashcard.source_flashcard))
        .where(MicroFlashcard.id == micro_id)
    ).scalar_one_or_none()

    if not micro:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Micro flashcard {micro_id} not found",
        )

    response = {
        "id": micro.id,
        "micro_front": micro.micro_front,
        "micro_back": micro.micro_back,
        "audio_script": micro.audio_script or micro.micro_back,
        "context_tags": micro.context_tags.split(","),
        "estimated_seconds": micro.estimated_seconds,
        "priority": micro.priority,
        "source_flashcard_id": micro.source_flashcard_id,
    }

    # Add progress if user provided
    if x_anonymous_id:
        user = get_or_create_user(db, x_anonymous_id)
        progress = db.execute(
            select(MicroProgress).where(
                MicroProgress.user_id == user.id,
                MicroProgress.micro_flashcard_id == micro_id,
            )
        ).scalar_one_or_none()

        if progress:
            response["progress"] = {
                "ease_factor": progress.micro_ease_factor,
                "interval": progress.micro_interval,
                "repetitions": progress.micro_repetitions,
                "review_count": progress.review_count,
                "last_quality": progress.last_quality,
                "next_review_at": progress.next_review_at.isoformat()
                if progress.next_review_at
                else None,
            }

    return response
