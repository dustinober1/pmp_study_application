"""
Micro-Learning Scheduler for 2-minute flashcard sessions.

Provides:
- Queue management for micro-learning sessions
- Dynamic priority scoring based on performance and context
- Session generation for different contexts (commute, break, waiting)
- SM-2 algorithm adapted for micro-sessions
"""

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models import (
    Domain,
    Flashcard,
    FlashcardProgress,
    MicroFlashcard,
    MicroProgress,
    QuickSession,
    StudyQueue,
    Task,
    User,
    UserAnalytics,
)


class MicroLearningScheduler:
    """
    Scheduler for micro-learning flashcard sessions.

    Manages study queues, generates quick sessions, and tracks
    micro-learning progress with adapted SM-2 algorithm.
    """

    # Priority weights for queue scoring
    OVERDUE_WEIGHT = 100.0
    WEAK_AREA_WEIGHT = 50.0
    PRIORITY_WEIGHT = 10.0
    FRESHNESS_WEIGHT = 5.0

    # Session configurations
    DEFAULT_CARDS_PER_SESSION = 5
    DEFAULT_TIME_SECONDS = 120  # 2 minutes

    # Context types
    CONTEXT_COMMUTE = "commute"
    CONTEXT_BREAK = "break"
    CONTEXT_WAITING = "waiting"
    CONTEXT_GENERAL = "general"

    def __init__(self, db: Session) -> None:
        """Initialize the scheduler with a database session."""
        self.db = db

    def ensure_micro_flashcards_exist(self) -> int:
        """
        Ensure micro flashcards exist for all regular flashcards.

        Creates simplified micro versions of flashcards that don't have one.
        This is a data generation utility for on-demand micro card creation.

        Returns:
            Number of new micro flashcards created.
        """
        # Get flashcards that don't have a micro version
        existing_micro_ids = self.db.execute(
            select(MicroFlashcard.source_flashcard_id)
        ).scalars().all()

        # Get flashcards without micro versions
        new_flashcards = self.db.execute(
            select(Flashcard).where(Flashcard.id.not_in(existing_micro_ids))
        ).scalars().all()

        created_count = 0
        for flashcard in new_flashcards:
            # Create simplified micro version
            micro_card = MicroFlashcard(
                source_flashcard_id=flashcard.id,
                micro_front=self._simplify_front(flashcard.front),
                micro_back=self._simplify_back(flashcard.back),
                audio_script=None,  # Will use micro_back for TTS
                context_tags=self._generate_context_tags(flashcard),
                priority=self._calculate_priority(flashcard),
                estimated_seconds=self._estimate_time(flashcard),
            )
            self.db.add(micro_card)
            created_count += 1

        if created_count > 0:
            self.db.commit()

        return created_count

    def _simplify_front(self, front: str) -> str:
        """Simplify flashcard front to max 200 characters."""
        # Remove excessive whitespace
        simplified = " ".join(front.split())
        # Truncate if needed
        if len(simplified) > 200:
            simplified = simplified[:197] + "..."
        return simplified

    def _simplify_back(self, back: str) -> str:
        """Simplify flashcard back to max 500 characters."""
        # Remove excessive whitespace
        simplified = " ".join(back.split())
        # Truncate if needed
        if len(simplified) > 500:
            simplified = simplified[:497] + "..."
        return simplified

    def _generate_context_tags(self, flashcard: Flashcard) -> str:
        """Generate context tags based on flashcard content."""
        # Default tags for all cards
        tags = ["break", "waiting"]

        # Commute tag for simpler cards (under 100 chars on front)
        if len(flashcard.front) < 100:
            tags.append("commute")

        return ",".join(tags)

    def _calculate_priority(self, flashcard: Flashcard) -> int:
        """Calculate initial priority (1-10) for micro flashcard."""
        # Base priority
        priority = 5

        # Higher priority for People domain (critical for PMP)
        task = self.db.execute(
            select(Task).where(Task.id == flashcard.task_id)
        ).scalar_one_or_none()

        if task:
            domain = self.db.execute(
                select(Domain).where(Domain.id == task.domain_id)
            ).scalar_one_or_none()

            if domain and "People" in domain.name:
                priority += 2

        return min(10, max(1, priority))

    def _estimate_time(self, flashcard: Flashcard) -> int:
        """Estimate time in seconds to review this card."""
        # Base time
        base_time = 30

        # Add time for longer content
        content_length = len(flashcard.front) + len(flashcard.back)
        if content_length > 500:
            base_time += 15
        elif content_length > 300:
            base_time += 10

        return base_time

    def rebuild_user_queue(
        self,
        user_id: uuid.UUID,
        context: str | None = None,
        limit: int = 50
    ) -> list[StudyQueue]:
        """
        Rebuild user's study queue with updated priority scores.

        Args:
            user_id: User UUID
            context: Optional context filter (commute, break, waiting)
            limit: Maximum queue size

        Returns:
            List of StudyQueue entries ordered by priority
        """
        # Clear existing queue
        self.db.execute(
            delete(StudyQueue).where(StudyQueue.user_id == user_id)
        )
        self.db.flush()

        # Ensure micro flashcards exist
        self.ensure_micro_flashcards_exist()

        # Get all micro flashcards with their source data
        micro_cards = self.db.execute(
            select(MicroFlashcard, Flashcard, Task, Domain)
            .join(Flashcard, MicroFlashcard.source_flashcard_id == Flashcard.id)
            .join(Task, Flashcard.task_id == Task.id)
            .join(Domain, Task.domain_id == Domain.id)
            .where(MicroFlashcard.is_active == True)
        ).all()

        # Get user's flashcard progress for scoring
        progress_records = self.db.execute(
            select(FlashcardProgress).where(
                FlashcardProgress.user_id == user_id,
                FlashcardProgress.flashcard_id.in_([mf.source_flashcard_id for mf, _, _, _ in micro_cards])
            )
        ).scalars().all()

        progress_map = {p.flashcard_id: p for p in progress_records}

        # Get user analytics for weak area identification
        analytics = self.db.execute(
            select(UserAnalytics).where(UserAnalytics.user_id == user_id)
        ).scalar_one_or_none()

        weak_domains = set()
        if analytics and analytics.weak_domains:
            weak_domains = {d["domain_id"] for d in analytics.weak_domains}

        now = datetime.now(timezone.utc)
        queue_entries = []

        for micro_card, flashcard, task, domain in micro_cards:
            # Filter by context if specified
            if context:
                card_contexts = micro_card.context_tags.split(",")
                if context not in card_contexts:
                    continue

            # Calculate priority score
            score = self._calculate_queue_score(
                micro_card=micro_card,
                progress=progress_map.get(flashcard.id),
                weak_domains=weak_domains,
                now=now,
            )

            # Determine recommended context
            recommended_context = self._determine_context(micro_card)

            entry = StudyQueue(
                user_id=user_id,
                micro_flashcard_id=micro_card.id,
                position=len(queue_entries) + 1,
                recommended_context=recommended_context,
                priority_score=score,
                is_active=True,
            )
            queue_entries.append(entry)

        # Sort by priority score (highest first) and limit
        queue_entries.sort(key=lambda x: x.priority_score, reverse=True)
        queue_entries = queue_entries[:limit]

        # Reassign positions
        for i, entry in enumerate(queue_entries):
            entry.position = i + 1

        # Bulk insert
        self.db.add_all(queue_entries)
        self.db.commit()

        for entry in queue_entries:
            self.db.refresh(entry)

        return queue_entries

    def _calculate_queue_score(
        self,
        micro_card: MicroFlashcard,
        progress: FlashcardProgress | None,
        weak_domains: set[int],
        now: datetime,
    ) -> float:
        """
        Calculate priority score for queue position.

        Higher score = higher priority in queue.
        """
        score = 0.0

        # Overdue bonus (cards due for review)
        if progress and progress.next_review_at:
            if progress.next_review_at <= now:
                days_overdue = (now - progress.next_review_at).days
                score += self.OVERDUE_WEIGHT + (days_overdue * 10)

        # Weak area bonus
        source_flashcard = micro_card.source_flashcard
        if source_flashcard:
            task = self.db.execute(
                select(Task).where(Task.id == source_flashcard.task_id)
            ).scalar_one_or_none()

            if task and task.domain_id in weak_domains:
                score += self.WEAK_AREA_WEIGHT

        # Priority weight from card
        score += micro_card.priority * self.PRIORITY_WEIGHT

        # Freshness bonus (new cards get a small boost)
        if not progress or progress.review_count == 0:
            score += self.FRESHNESS_WEIGHT

        return score

    def _determine_context(self, micro_card: MicroFlashcard) -> str:
        """Determine the best context for this micro card."""
        contexts = micro_card.context_tags.split(",")

        # Prefer more specific contexts
        if self.CONTEXT_COMMUTE in contexts:
            return self.CONTEXT_COMMUTE
        elif self.CONTEXT_BREAK in contexts:
            return self.CONTEXT_BREAK
        elif self.CONTEXT_WAITING in contexts:
            return self.CONTEXT_WAITING

        return self.CONTEXT_GENERAL

    def get_user_queue(
        self,
        user_id: uuid.UUID,
        context: str | None = None,
        limit: int = 20
    ) -> list[dict[str, Any]]:
        """
        Get user's current study queue.

        Args:
            user_id: User UUID
            context: Optional context filter
            limit: Maximum results

        Returns:
            List of micro flashcards in queue with metadata
        """
        query = (
            select(StudyQueue, MicroFlashcard, Flashcard)
            .join(MicroFlashcard, StudyQueue.micro_flashcard_id == MicroFlashcard.id)
            .join(Flashcard, MicroFlashcard.source_flashcard_id == Flashcard.id)
            .where(
                StudyQueue.user_id == user_id,
                StudyQueue.is_active == True,
            )
        )

        if context:
            query = query.where(StudyQueue.recommended_context == context)

        query = query.order_by(StudyQueue.position).limit(limit)

        results = self.db.execute(query).all()

        return [
            {
                "queue_id": str(queue.id),
                "position": queue.position,
                "recommended_context": queue.recommended_context,
                "priority_score": queue.priority_score,
                "micro_flashcard": {
                    "id": micro.id,
                    "micro_front": micro.micro_front,
                    "micro_back": micro.micro_back,
                    "audio_script": micro.audio_script,
                    "estimated_seconds": micro.estimated_seconds,
                    "priority": micro.priority,
                },
                "source_flashcard_id": flashcard.id,
            }
            for queue, micro, flashcard in results
        ]

    def create_quick_session(
        self,
        user_id: uuid.UUID,
        context: str = CONTEXT_GENERAL,
        mode: str = "cards",
        target: int = DEFAULT_CARDS_PER_SESSION,
    ) -> QuickSession:
        """
        Create a new quick micro-learning session.

        Args:
            user_id: User UUID
            context: Session context (commute, break, waiting, general)
            mode: Session mode (cards, time, adaptive)
            target: Target value (card count or seconds)

        Returns:
            Created QuickSession
        """
        # Get queue entries for this context
        queue_entries = self.db.execute(
            select(StudyQueue)
            .where(
                StudyQueue.user_id == user_id,
                StudyQueue.is_active == True,
            )
            .order_by(StudyQueue.position)
            .limit(target)
        ).scalars().all()

        session = QuickSession(
            user_id=user_id,
            context=context,
            mode=mode,
            target=target,
            cards_presented_list=[q.micro_flashcard_id for q in queue_entries],
        )

        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)

        return session

    def submit_micro_review(
        self,
        user_id: uuid.UUID,
        micro_flashcard_id: int,
        quality: int,
        context: str = CONTEXT_GENERAL,
    ) -> MicroProgress:
        """
        Submit a micro flashcard review with adapted SM-2 algorithm.

        Micro sessions use more aggressive scheduling since they're
        shorter and more frequent.

        Args:
            user_id: User UUID
            micro_flashcard_id: Micro flashcard ID
            quality: Quality rating (0-5)
            context: Context of the review

        Returns:
            Updated or created MicroProgress
        """
        # Get or create micro progress
        progress = self.db.execute(
            select(MicroProgress).where(
                MicroProgress.user_id == user_id,
                MicroProgress.micro_flashcard_id == micro_flashcard_id,
            )
        ).scalar_one_or_none()

        if not progress:
            progress = MicroProgress(
                user_id=user_id,
                micro_flashcard_id=micro_flashcard_id,
                micro_ease_factor=2.5,
                micro_interval=0,
                micro_repetitions=0,
                review_count=0,
                correct_count=0,
            )
            self.db.add(progress)
            self.db.flush()

        # Calculate new SM-2 values (adapted for micro sessions)
        new_ef, new_interval, new_repetitions = self._calculate_micro_sm2(
            quality=quality,
            ease_factor=progress.micro_ease_factor,
            interval=progress.micro_interval,
            repetitions=progress.micro_repetitions,
        )

        # Update progress
        progress.micro_ease_factor = new_ef
        progress.micro_interval = new_interval
        progress.micro_repetitions = new_repetitions
        progress.last_quality = quality
        progress.last_reviewed_at = datetime.now(timezone.utc)

        # More aggressive scheduling for micro sessions (hours instead of days)
        if quality < 3:
            progress.next_review_at = datetime.now(timezone.utc) + timedelta(hours=1)
        else:
            # Convert days to hours for micro scheduling
            hours_until = new_interval * 24
            progress.next_review_at = datetime.now(timezone.utc) + timedelta(hours=hours_until)

        progress.review_count += 1

        # Update context accuracy
        context_acc = progress.context_accuracy_dict
        if context not in context_acc:
            context_acc[context] = {"correct": 0, "total": 0}

        context_acc[context]["total"] += 1
        if quality >= 3:
            progress.correct_count += 1
            context_acc[context]["correct"] += 1

        progress.context_accuracy_dict = context_acc

        self.db.commit()
        self.db.refresh(progress)

        return progress

    def _calculate_micro_sm2(
        self,
        quality: int,
        ease_factor: float,
        interval: int,
        repetitions: int,
    ) -> tuple[float, int, int]:
        """
        Calculate SM-2 values adapted for micro-learning sessions.

        Uses more aggressive intervals since micro sessions are
        shorter and more frequent than regular study sessions.
        """
        # Calculate new ease factor
        new_ef = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        new_ef = max(1.3, min(2.5, new_ef))

        if quality < 3:
            new_repetitions = 0
            new_interval = 1  # 1 day = 24 hours
        else:
            new_repetitions = repetitions + 1

            if new_repetitions == 1:
                new_interval = 1  # 1 day
            elif new_repetitions == 2:
                new_interval = 3  # 3 days (more aggressive than standard SM-2)
            else:
                new_interval = max(1, round(interval * new_ef * 0.8))  # 20% more aggressive

        return new_ef, new_interval, new_repetitions

    def end_quick_session(
        self,
        session_id: uuid.UUID,
        cards_completed: int,
    ) -> QuickSession:
        """
        End a quick session and record final metrics.

        Args:
            session_id: Quick session UUID
            cards_completed: Number of cards successfully completed

        Returns:
            Updated QuickSession
        """
        session = self.db.execute(
            select(QuickSession).where(QuickSession.id == session_id)
        ).scalar_one_or_none()

        if not session:
            raise ValueError(f"QuickSession {session_id} not found")

        session.ended_at = datetime.now(timezone.utc)
        session.duration_seconds = int(
            (session.ended_at - session.started_at).total_seconds()
        )
        session.cards_completed = cards_completed
        session.is_completed = True

        self.db.commit()
        self.db.refresh(session)

        return session

    def get_micro_stats(
        self,
        user_id: uuid.UUID,
    ) -> dict[str, Any]:
        """
        Get micro-learning statistics for a user.

        Returns:
            Dictionary with micro-learning stats
        """
        # Get user's micro progress
        progress_records = self.db.execute(
            select(MicroProgress).where(MicroProgress.user_id == user_id)
        ).scalars().all()

        # Get recent quick sessions
        recent_sessions = self.db.execute(
            select(QuickSession)
            .where(QuickSession.user_id == user_id)
            .where(QuickSession.is_completed == True)
            .order_by(QuickSession.started_at.desc())
            .limit(10)
        ).scalars().all()

        # Calculate stats
        total_reviews = sum(p.review_count for p in progress_records)
        total_correct = sum(p.correct_count for p in progress_records)
        overall_accuracy = total_correct / total_reviews if total_reviews > 0 else 0.0

        # Context breakdown
        context_breakdown = {}
        for p in progress_records:
            for context, stats in p.context_accuracy_dict.items():
                if context not in context_breakdown:
                    context_breakdown[context] = {"correct": 0, "total": 0}
                context_breakdown[context]["correct"] += stats["correct"]
                context_breakdown[context]["total"] += stats["total"]

        # Calculate context accuracies
        context_accuracy = {}
        for context, stats in context_breakdown.items():
            if stats["total"] > 0:
                context_accuracy[context] = stats["correct"] / stats["total"]

        # Session stats
        total_sessions = len(recent_sessions)
        avg_completion = (
            sum(s.cards_completed for s in recent_sessions) / total_sessions
            if total_sessions > 0
            else 0
        )
        avg_duration = (
            sum(s.duration_seconds or 0 for s in recent_sessions) / total_sessions
            if total_sessions > 0
            else 0
        )

        return {
            "total_reviews": total_reviews,
            "overall_accuracy": overall_accuracy,
            "unique_cards_learned": len(progress_records),
            "context_accuracy": context_accuracy,
            "recent_sessions": {
                "total": total_sessions,
                "avg_cards_completed": avg_completion,
                "avg_duration_seconds": avg_duration,
            },
        }

    def get_due_micro_cards(
        self,
        user_id: uuid.UUID,
        context: str | None = None,
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        """
        Get micro cards due for review.

        Args:
            user_id: User UUID
            context: Optional context filter
            limit: Maximum results

        Returns:
            List of due micro cards
        """
        now = datetime.now(timezone.utc)

        # Get micro progress records that are due
        due_progress = self.db.execute(
            select(MicroProgress)
            .where(
                MicroProgress.user_id == user_id,
                MicroProgress.next_review_at <= now,
            )
        ).scalars().all()

        if not due_progress:
            # No due cards, get new cards from queue
            return self.get_user_queue(user_id, context, limit)

        due_micro_ids = [p.micro_flashcard_id for p in due_progress]

        # Get micro flashcard details
        query = (
            select(MicroFlashcard, MicroProgress, Flashcard)
            .join(MicroProgress, MicroFlashcard.id == MicroProgress.micro_flashcard_id)
            .join(Flashcard, MicroFlashcard.source_flashcard_id == Flashcard.id)
            .where(MicroFlashcard.id.in_(due_micro_ids))
            .where(MicroFlashcard.is_active == True)
        )

        if context:
            # Filter by context tags
            query = query.where(MicroFlashcard.context_tags.contains(context))

        query = query.order_by(MicroProgress.next_review_at).limit(limit)

        results = self.db.execute(query).all()

        return [
            {
                "micro_flashcard_id": micro.id,
                "micro_front": micro.micro_front,
                "micro_back": micro.micro_back,
                "audio_script": micro.audio_script,
                "estimated_seconds": micro.estimated_seconds,
                "progress": {
                    "ease_factor": progress.micro_ease_factor,
                    "interval": progress.micro_interval,
                    "repetitions": progress.micro_repetitions,
                    "last_quality": progress.last_quality,
                    "next_review_at": progress.next_review_at.isoformat()
                    if progress.next_review_at
                    else None,
                },
                "source_flashcard_id": flashcard.id,
            }
            for micro, progress, flashcard in results
        ]
