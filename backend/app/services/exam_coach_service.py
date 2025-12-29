"""
Exam Coach Service for real-time behavioral analysis and coaching.

This service provides:
- Real-time behavioral pattern detection (rushing, dwelling, panic, guessing)
- Coaching interventions based on user behavior
- Engagement and focus scoring
- Time pressure analysis
- Post-exam "game tape" behavioral replay
"""

import uuid
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.exam import ExamAnswer, ExamSession
from app.models.exam_behavior import (
    BehaviorPattern,
    CoachingMessage,
    CoachingSeverity,
    ExamBehaviorProfile,
)

# PMP Exam timing constants
TOTAL_QUESTIONS = 185
EXAM_DURATION_MINUTES = 240
TARGET_TIME_PER_QUESTION = (EXAM_DURATION_MINUTES * 60) / TOTAL_QUESTIONS  # ~78 seconds

# Behavior detection thresholds
RUSHING_THRESHOLD_SECONDS = 30  # Answered in less than 30 seconds
DWELLING_THRESHOLD_SECONDS = 180  # Spent more than 3 minutes
RAPID_ANSWER_COUNT = 3  # Consecutive rapid answers triggers detection
LONG_PAUSE_THRESHOLD_SECONDS = 300  # 5 minutes of inactivity

# Engagement score parameters
ENGAGEMENT_NORMAL_MIN = 45  # Minimum time for "normal" answering (seconds)
ENGAGEMENT_NORMAL_MAX = 150  # Maximum time for "normal" answering (seconds)

# Focus score parameters
FOCUS_PENALTY_PER_REVISIT = 5
FOCUS_PENALTY_PER_SKIP = 3
FOCUS_BONUS_STREAK = 2


@dataclass
class CoachingAlert:
    """Real-time coaching alert for the frontend."""

    pattern: str
    severity: str
    title: str
    message: str
    suggested_action: str | None = None
    question_index: int | None = None


@dataclass
class BehaviorMetrics:
    """Current behavior metrics for a session."""

    current_pattern: str
    engagement_score: float
    focus_score: float
    pace_trajectory: str
    time_remaining_minutes: int
    questions_completed: int
    avg_time_per_question: float


@dataclass
class GameTapeEvent:
    """Single event in the post-exam behavioral replay."""

    event_type: str  # "answer", "flag", "revisit", "skip", "coaching"
    question_index: int
    timestamp: str
    time_spent_seconds: int
    pattern_detected: str | None = None
    coaching_message: str | None = None
    domain_name: str | None = None
    is_correct: bool | None = None


class ExamCoachService:
    """
    Service for analyzing exam behavior and providing real-time coaching.

    Detects behavioral patterns that may indicate:
    - Rushing (answering too quickly, potentially guessing)
    - Dwelling (spending too much time on single questions)
    - Panic (rapid answering followed by long pauses)
    - Guessing (inconsistent timing patterns)
    - Flagging sprees (uncertainty patterns)
    """

    def __init__(self, db: Session):
        """
        Initialize the exam coach service.

        Args:
            db: Database session
        """
        self.db = db

    def create_behavior_profile(self, session: ExamSession) -> ExamBehaviorProfile:
        """
        Create a new behavior profile for an exam session.

        Args:
            session: Exam session to create profile for

        Returns:
            Created ExamBehaviorProfile
        """
        profile = ExamBehaviorProfile(
            exam_session_id=session.id,
            user_id=session.user_id,
            current_pattern=BehaviorPattern.NORMAL.value,
        )

        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)

        return profile

    def get_or_create_profile(self, session: ExamSession) -> ExamBehaviorProfile:
        """
        Get existing behavior profile or create new one.

        Args:
            session: Exam session

        Returns:
            ExamBehaviorProfile for the session
        """
        profile = (
            self.db.query(ExamBehaviorProfile)
            .filter(ExamBehaviorProfile.exam_session_id == session.id)
            .first()
        )

        if not profile:
            profile = self.create_behavior_profile(session)

        return profile

    def record_answer_behavior(
        self,
        session: ExamSession,
        question_index: int,
        time_spent_seconds: int,
        is_flagged: bool,
        is_revisit: bool = False,
    ) -> tuple[ExamBehaviorProfile, list[CoachingAlert]]:
        """
        Record behavior for an answer and detect patterns.

        Args:
            session: Exam session
            question_index: Index of question answered
            time_spent_seconds: Time spent on this question
            is_flagged: Whether user flagged the question
            is_revisit: Whether this is a revisit to a previous question

        Returns:
            Tuple of (updated profile, list of coaching alerts)
        """
        profile = self.get_or_create_profile(session)
        alerts: list[CoachingAlert] = []

        # Get all answers for this session to analyze patterns
        answers = (
            self.db.query(ExamAnswer)
            .filter(ExamAnswer.exam_session_id == session.id)
            .order_by(ExamAnswer.created_at)
            .all()
        )

        # Update timing metrics
        if answers:
            times = [a.time_spent_seconds for a in answers if a.time_spent_seconds > 0]
            if times:
                profile.avg_time_per_question = sum(times) / len(times)
                profile.fastest_question_seconds = min(times)
                profile.slowest_question_seconds = max(times)

        # Update flagging behavior
        profile.total_flags = sum(1 for a in answers if a.is_flagged)
        if is_flagged:
            profile.consecutive_flags += 1
            profile.max_consecutive_flags = max(
                profile.max_consecutive_flags, profile.consecutive_flags
            )
        else:
            profile.consecutive_flags = 0

        # Update navigation behavior
        if is_revisit:
            profile.question_revisits += 1

        # Detect patterns
        detected_pattern, pattern_alerts = self._detect_patterns(
            profile, answers, time_spent_seconds, is_flagged
        )
        alerts.extend(pattern_alerts)

        # Update pattern history if changed
        if detected_pattern != profile.current_pattern:
            # Record the previous pattern
            if profile.pattern_history:
                last_pattern = profile.pattern_history[-1]
                if last_pattern.get("pattern") == profile.current_pattern:
                    last_pattern["end_q"] = question_index
                    last_pattern["duration_sec"] = (
                        last_pattern.get("duration_sec", 0) + time_spent_seconds
                    )

            # Start new pattern
            profile.pattern_history.append(
                {
                    "pattern": detected_pattern,
                    "start_q": question_index,
                    "end_q": question_index,
                    "duration_sec": time_spent_seconds,
                }
            )

            profile.current_pattern = detected_pattern

        # Update scores
        profile.engagement_score = self._calculate_engagement_score(profile, answers)
        profile.focus_score = self._calculate_focus_score(profile, answers)

        # Update pace trajectory
        profile.pace_trajectory = self._calculate_pace_trajectory(session, answers)

        # Check for coaching opportunities
        coaching_alerts = self._generate_coaching_alerts(
            profile, session, question_index, answers
        )
        alerts.extend(coaching_alerts)

        # Record coaching history
        for alert in alerts:
            profile.coaching_history.append(
                {
                    "question": question_index,
                    "severity": alert.severity,
                    "message": alert.message,
                    "title": alert.title,
                    "timestamp": datetime.utcnow().isoformat(),
                }
            )

        self.db.commit()
        self.db.refresh(profile)

        return profile, alerts

    def _detect_patterns(
        self,
        profile: ExamBehaviorProfile,
        answers: list[ExamAnswer],
        time_spent_seconds: int,
        is_flagged: bool,
    ) -> tuple[str, list[CoachingAlert]]:
        """
        Detect behavioral patterns based on current and historical data.

        Args:
            profile: Current behavior profile
            answers: All answers so far
            time_spent_seconds: Time spent on latest answer
            is_flagged: Whether latest answer was flagged

        Returns:
            Tuple of (detected pattern, list of immediate alerts)
        """
        alerts: list[CoachingAlert] = []
        detected = BehaviorPattern.NORMAL.value

        # Check for rushing (very fast answering)
        if time_spent_seconds < RUSHING_THRESHOLD_SECONDS:
            profile.rapid_answer_count += 1
            if profile.rapid_answer_count >= RAPID_ANSWER_COUNT:
                detected = BehaviorPattern.RUSHING.value
                alerts.append(
                    CoachingAlert(
                        pattern=BehaviorPattern.RUSHING.value,
                        severity=CoachingSeverity.WARNING.value,
                        title="You're rushing",
                        message=f"You've answered {RAPID_ANSWER_COUNT} questions in under "
                        f"{RUSHING_THRESHOLD_SECONDS} seconds each. Slow down and read carefully.",
                        suggested_action="Take a deep breath. Read each question twice before answering.",
                    )
                )
        else:
            profile.rapid_answer_count = 0

        # Check for dwelling (too long on single question)
        if time_spent_seconds > DWELLING_THRESHOLD_SECONDS:
            detected = BehaviorPattern.DWELLING.value
            alerts.append(
                CoachingAlert(
                    pattern=BehaviorPattern.DWELLING.value,
                    severity=CoachingSeverity.SUGGESTION.value,
                    title="Time check",
                    message=f"You've spent {time_spent_seconds // 60} minutes on this question. "
                    "Consider flagging it and moving on.",
                    suggested_action="Make your best guess, flag it, and come back if time permits.",
                )
            )
            profile.long_pause_count += 1
        else:
            if time_spent_seconds > LONG_PAUSE_THRESHOLD_SECONDS:
                profile.long_pause_count += 1

        # Check for panic (rapid answers followed by long pauses)
        if profile.rapid_answer_count >= 2 and profile.long_pause_count >= 1:
            detected = BehaviorPattern.PANIC.value
            alerts.append(
                CoachingAlert(
                    pattern=BehaviorPattern.PANIC.value,
                    severity=CoachingSeverity.URGENT.value,
                    title="Panic detected",
                    message="Your answering pattern suggests anxiety. Let's reset your pace.",
                    suggested_action="Close your eyes for 10 seconds. Take 3 deep breaths. Then continue at a steady pace.",
                )
            )

        # Check for flagging spree (uncertainty pattern)
        if profile.consecutive_flags >= 4:
            detected = BehaviorPattern.FLAGGING_SPREE.value
            alerts.append(
                CoachingAlert(
                    pattern=BehaviorPattern.FLAGGING_SPREE.value,
                    severity=CoachingSeverity.INFO.value,
                    title="Many flags",
                    message=f"You've flagged {profile.consecutive_flags} questions in a row. "
                    "This suggests uncertainty about this domain.",
                    suggested_action="Trust your preparation. Make your best answer and move forward.",
                )
            )

        # Check for revisit loop (going back to many questions)
        if profile.question_revisits > 5:
            detected = BehaviorPattern.REVISIT_LOOP.value
            if profile.question_revisits == 6:  # Only alert once
                alerts.append(
                    CoachingAlert(
                        pattern=BehaviorPattern.REVISIT_LOOP.value,
                        severity=CoachingSeverity.SUGGESTION.value,
                        title="Revisit loop",
                        message="You're revisiting many questions. This can waste time.",
                        suggested_action="Focus on moving forward. Only revisit questions you're truly uncertain about.",
                    )
                )

        # Check for skipping (not answering)
        recent_answers = answers[-5:] if len(answers) >= 5 else answers
        if recent_answers:
            skipped_count = sum(1 for a in recent_answers if not a.selected_answer)
            if skipped_count >= 3:
                detected = BehaviorPattern.SKIPPING.value
                profile.skips_count += 1

        return detected, alerts

    def _calculate_engagement_score(
        self, profile: ExamBehaviorProfile, answers: list[ExamAnswer]
    ) -> float:
        """
        Calculate engagement score (0-100) based on answering consistency.

        High engagement: Consistent timing within normal range
        Low engagement: Rushing or dwelling patterns
        """
        if not answers:
            return 100.0

        times = [a.time_spent_seconds for a in answers if a.time_spent_seconds > 0]
        if not times:
            return 100.0

        # Calculate percentage of answers in "normal" time range
        normal_count = sum(
            1
            for t in times
            if ENGAGEMENT_NORMAL_MIN <= t <= ENGAGEMENT_NORMAL_MAX
        )

        engagement = (normal_count / len(times)) * 100

        # Apply penalties for extreme behaviors
        rushing_count = sum(1 for t in times if t < RUSHING_THRESHOLD_SECONDS)
        dwelling_count = sum(1 for t in times if t > DWELLING_THRESHOLD_SECONDS)

        engagement -= rushing_count * 5  # -5 points per rushed answer
        engagement -= dwelling_count * 3  # -3 points per dwelled answer

        return max(0.0, min(100.0, engagement))

    def _calculate_focus_score(
        self, profile: ExamBehaviorProfile, answers: list[ExamAnswer]
    ) -> float:
        """
        Calculate focus score (0-100) based on navigation patterns.

        High focus: Linear progression, minimal revisits
        Low focus: Many revisits, skips, and flagging
        """
        base_score = 100.0

        # Penalty for revisits
        base_score -= profile.question_revisits * FOCUS_PENALTY_PER_REVISIT

        # Penalty for skips
        base_score -= profile.skips_count * FOCUS_PENALTY_PER_SKIP

        # Penalty for excessive flagging
        if profile.max_consecutive_flags > 3:
            base_score -= (profile.max_consecutive_flags - 3) * 2

        # Bonus for linear progress (low revisits relative to progress)
        if len(answers) > 10 and profile.question_revisits < len(answers) * 0.1:
            base_score += FOCUS_BONUS_STREAK

        return max(0.0, min(100.0, base_score))

    def _calculate_pace_trajectory(
        self, session: ExamSession, answers: list[ExamAnswer]
    ) -> str:
        """
        Calculate pace trajectory based on time remaining vs questions completed.

        Returns: "ahead", "on_track", "behind", "critical"
        """
        from datetime import timedelta

        total_duration = timedelta(minutes=EXAM_DURATION_MINUTES)
        elapsed = datetime.now(session.start_time.tzinfo) - session.start_time
        remaining = total_duration - elapsed

        if remaining.total_seconds() <= 0:
            return "critical"

        questions_done = len(answers)
        questions_remaining = session.questions_count - questions_done

        if questions_remaining == 0:
            return "on_track"

        # Calculate if we're ahead or behind
        time_per_remaining = remaining.total_seconds() / questions_remaining
        target = TARGET_TIME_PER_QUESTION

        if time_per_remaining > target * 1.5:
            return "critical"
        elif time_per_remaining > target * 1.2:
            return "behind"
        elif time_per_remaining < target * 0.7:
            return "ahead"
        else:
            return "on_track"

    def _generate_coaching_alerts(
        self,
        profile: ExamBehaviorProfile,
        session: ExamSession,
        question_index: int,
        answers: list[ExamAnswer],
    ) -> list[CoachingAlert]:
        """
        Generate proactive coaching alerts based on session state.

        Args:
            profile: Behavior profile
            session: Exam session
            question_index: Current question index
            answers: All answers so far

        Returns:
            List of coaching alerts
        """
        alerts: list[CoachingAlert] = []

        # Check time pressure at halfway point
        questions_done = len(answers)
        if questions_done == session.questions_count // 2 and not profile.time_remaining_at_half:
            from datetime import timedelta

            total_duration = timedelta(minutes=EXAM_DURATION_MINUTES)
            elapsed = datetime.now(session.start_time.tzinfo) - session.start_time
            remaining_seconds = (total_duration - elapsed).total_seconds()

            profile.time_remaining_at_half = int(remaining_seconds)
            profile.questions_completed_at_half = questions_done

            # Should have 50% time left for 50% questions
            expected_remaining = (EXAM_DURATION_MINUTES * 60) / 2
            if remaining_seconds < expected_remaining * 0.8:
                alerts.append(
                    CoachingAlert(
                        pattern="time_pressure",
                        severity=CoachingSeverity.WARNING.value,
                        title="Behind schedule",
                        message=f"You've used more than half your time to complete half the exam. "
                        f"You have {int(remaining_seconds // 60)} minutes left.",
                        suggested_action="Increase your pace. Flag difficult questions and move on quickly.",
                    )
                )

        # Check for critical time pressure
        if questions_done > session.questions_count * 0.75:
            from datetime import timedelta

            total_duration = timedelta(minutes=EXAM_DURATION_MINUTES)
            elapsed = datetime.now(session.start_time.tzinfo) - session.start_time
            remaining = (total_duration - elapsed).total_seconds()

            questions_remaining = session.questions_count - questions_done
            if questions_remaining > 0:
                time_per_question = remaining / questions_remaining

                if time_per_question < 30:  # Less than 30 seconds per question
                    alerts.append(
                        CoachingAlert(
                            pattern="critical_time",
                            severity=CoachingSeverity.URGENT.value,
                            title="Critical: Low time",
                            message=f"You have {int(remaining // 60)} minutes for "
                            f"{questions_remaining} questions.",
                            suggested_action="Answer quickly. Flag uncertain questions. "
                            "Better to answer all questions than leave blanks.",
                        )
                    )

        # Engagement coaching
        if profile.engagement_score < 60:
            alerts.append(
                CoachingAlert(
                    pattern="low_engagement",
                    severity=CoachingSeverity.SUGGESTION.value,
                    title="Focus check",
                    message="Your engagement is dropping. Maintain steady pacing.",
                    suggested_action="Take 3 seconds to breathe before each question.",
                )
            )

        # Focus coaching
        if profile.focus_score < 60:
            alerts.append(
                CoachingAlert(
                    pattern="low_focus",
                    severity=CoachingSeverity.INFO.value,
                    title="Stay focused",
                    message="Try to minimize revisiting questions.",
                    suggested_action="Trust your first instinct. Make a decision and move forward.",
                )
            )

        return alerts

    def get_current_metrics(
        self, session: ExamSession
    ) -> BehaviorMetrics | None:
        """
        Get current behavior metrics for a session.

        Args:
            session: Exam session

        Returns:
            BehaviorMetrics or None if no profile
        """
        profile = self.get_or_create_profile(session)

        from datetime import timedelta

        total_duration = timedelta(minutes=EXAM_DURATION_MINUTES)
        elapsed = datetime.now(session.start_time.tzinfo) - session.start_time
        remaining = max(0, int((total_duration - elapsed).total_seconds()))

        answers = (
            self.db.query(ExamAnswer)
            .filter(ExamAnswer.exam_session_id == session.id)
            .all()
        )

        return BehaviorMetrics(
            current_pattern=profile.current_pattern,
            engagement_score=profile.engagement_score,
            focus_score=profile.focus_score,
            pace_trajectory=profile.pace_trajectory,
            time_remaining_minutes=remaining // 60,
            questions_completed=len(answers),
            avg_time_per_question=profile.avg_time_per_question,
        )

    def generate_game_tape(
        self, session: ExamSession
    ) -> list[GameTapeEvent]:
        """
        Generate post-exam "game tape" behavioral replay.

        Creates a chronological list of all behaviors, coaching events,
        and patterns detected during the exam.

        Args:
            session: Completed exam session

        Returns:
            List of GameTapeEvent objects
        """
        profile = self.get_or_create_profile(session)
        events: list[GameTapeEvent] = []

        # Get all answers in order
        answers = (
            self.db.query(ExamAnswer)
            .filter(ExamAnswer.exam_session_id == session.id)
            .order_by(ExamAnswer.question_index)
            .all()
        )

        from app.models.question import Question
        from app.models.task import Task
        from app.models.domain import Domain

        for answer in answers:
            # Get question metadata
            question = self.db.get(Question, answer.question_id)
            domain_name = None
            if question:
                task = self.db.get(Task, question.task_id)
                if task:
                    domain = self.db.get(Domain, task.domain_id)
                    domain_name = domain.name if domain else None

            # Determine pattern for this answer
            pattern = None
            if answer.time_spent_seconds < RUSHING_THRESHOLD_SECONDS:
                pattern = BehaviorPattern.RUSHING.value
            elif answer.time_spent_seconds > DWELLING_THRESHOLD_SECONDS:
                pattern = BehaviorPattern.DWELLING.value

            events.append(
                GameTapeEvent(
                    event_type="answer",
                    question_index=answer.question_index,
                    timestamp=answer.created_at.isoformat(),
                    time_spent_seconds=answer.time_spent_seconds,
                    pattern_detected=pattern,
                    domain_name=domain_name,
                    is_correct=answer.is_correct,
                )
            )

            # Add flag event
            if answer.is_flagged:
                events.append(
                    GameTapeEvent(
                        event_type="flag",
                        question_index=answer.question_index,
                        timestamp=answer.created_at.isoformat(),
                        time_spent_seconds=answer.time_spent_seconds,
                        domain_name=domain_name,
                    )
                )

        # Add coaching events from history
        for coaching_event in profile.coaching_history:
            events.append(
                GameTapeEvent(
                    event_type="coaching",
                    question_index=coaching_event.get("question", 0),
                    timestamp=coaching_event.get("timestamp", ""),
                    time_spent_seconds=0,
                    coaching_message=coaching_event.get("message", ""),
                )
            )

        # Sort by timestamp
        events.sort(key=lambda e: e.timestamp)

        return events

    def get_behavior_summary(self, session: ExamSession) -> dict:
        """
        Get behavioral summary for an exam session.

        Args:
            session: Exam session

        Returns:
            Dictionary with behavioral insights
        """
        profile = self.get_or_create_profile(session)
        metrics = self.get_current_metrics(session)

        return {
            "overall_pattern": profile.current_pattern,
            "engagement_score": profile.engagement_score,
            "focus_score": profile.focus_score,
            "pace_trajectory": profile.pace_trajectory,
            "total_flags": profile.total_flags,
            "max_consecutive_flags": profile.max_consecutive_flags,
            "question_revisits": profile.question_revisits,
            "avg_time_per_question": profile.avg_time_per_question,
            "fastest_question": profile.fastest_question_seconds,
            "slowest_question": profile.slowest_question_seconds,
            "coaching_interventions": len(profile.coaching_history),
            "pattern_history": profile.pattern_history,
            "current_metrics": {
                "time_remaining_minutes": metrics.time_remaining_minutes if metrics else 0,
                "questions_completed": metrics.questions_completed if metrics else 0,
            },
        }


def create_exam_coach_service(db: Session) -> ExamCoachService:
    """
    Factory function to create an ExamCoachService instance.

    Args:
        db: Database session

    Returns:
        Configured ExamCoachService instance
    """
    return ExamCoachService(db)
