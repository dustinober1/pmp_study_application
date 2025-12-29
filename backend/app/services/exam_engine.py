"""
Exam Engine Service for PMP 2026 exam simulation.

This service handles:
- Question selection based on PMP 2026 domain distribution (33%, 41%, 26%)
- Exam session management
- Score calculation
- Domain and task performance breakdown
"""

import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta
from itertools import islice
from random import Random, shuffle
from typing import Literal

from sqlalchemy.orm import Session

from app.models.domain import Domain
from app.models.exam import ExamAnswer, ExamReport, ExamSession, ExamStatus
from app.models.question import Question
from app.models.task import Task


# PMP 2026 Domain Weights
PMP_DOMAIN_WEIGHTS: dict[str, float] = {
    "People": 0.33,
    "Process": 0.41,
    "Business Environment": 0.26,
}

# PMP 2026 Exam Configuration
TOTAL_QUESTIONS = 185  # Total questions in PMP exam
SCORED_QUESTIONS = 175  # Number of scored questions (10 are pre-test)
EXAM_DURATION_MINUTES = 240  # 4 hours


@dataclass
class ExamConfig:
    """Configuration for generating an exam."""

    total_questions: int = TOTAL_QUESTIONS
    exam_duration_minutes: int = EXAM_DURATION_MINUTES
    scored_questions: int = SCORED_QUESTIONS
    domain_weights: dict[str, float] | None = None

    def __post_init__(self):
        if self.domain_weights is None:
            self.domain_weights = PMP_DOMAIN_WEIGHTS.copy()


@dataclass
class QuestionSelection:
    """Represents a selected question with metadata."""

    question: Question
    domain_name: str
    task_name: str
    question_index: int


@dataclass
class DomainPerformance:
    """Represents a user's performance in a specific domain."""

    domain_name: str
    accuracy: float
    total_attempts: int
    avg_response_time: float | None = None


DIFFICULTY_ORDER: dict[str, int] = {
    "easy": 0,
    "medium": 1,
    "hard": 2,
}


def question_difficulty_key(question: Question) -> int:
    """Get difficulty key for sorting questions."""
    difficulty = question.difficulty or "medium"
    return DIFFICULTY_ORDER.get(difficulty.lower(), 1)


@dataclass
class ExamResult:
    """Result of exam completion."""

    session: ExamSession
    score_percentage: float
    passed: bool
    domain_breakdown: dict[str, dict]
    task_breakdown: dict[int, dict]
    time_spent_seconds: int
    time_expired: bool


class ExamEngine:
    """
    Engine for generating and managing PMP exam simulations.

    Handles question selection according to PMP 2026 domain distribution
    percentages and calculates performance reports.
    """

    def __init__(self, db: Session, config: ExamConfig | None = None):
        """
        Initialize the exam engine.

        Args:
            db: Database session
            config: Optional exam configuration
        """
        self.db = db
        self.config = config or ExamConfig()
        self._domains_cache: dict[int, Domain] | None = None
        self._tasks_cache: dict[int, Task] | None = None

    @property
    def domains(self) -> dict[int, Domain]:
        """Get domains cached by ID."""
        if self._domains_cache is None:
            domains = self.db.query(Domain).order_by(Domain.id).all()
            self._domains_cache = {d.id: d for d in domains}
        return self._domains_cache

    @property
    def tasks(self) -> dict[int, Task]:
        """Get tasks cached by ID."""
        if self._tasks_cache is None:
            tasks = self.db.query(Task).order_by(Task.id).all()
            self._tasks_cache = {t.id: t for t in tasks}
        return self._tasks_cache

    def get_user_domain_performance(self, user_id: uuid.UUID) -> dict[str, DomainPerformance]:
        """
        Get user's historical performance by domain.

        Aggregates data from prior exam sessions and question progress
        to calculate accuracy and response time per domain.

        Args:
            user_id: User ID to get performance for

        Returns:
            Dictionary mapping domain names to DomainPerformance objects
        """
        from app.models.exam import ExamAnswer as EA
        from app.models.exam import ExamSession as ES
        from app.models.progress import QuestionProgress as QP

        performance: dict[str, DomainPerformance] = {}

        # Initialize with zero performance for all domains
        for domain in self.domains.values():
            performance[domain.name] = DomainPerformance(
                domain_name=domain.name,
                accuracy=0.0,
                total_attempts=0,
                avg_response_time=None,
            )

        # Get completed exam sessions
        exam_sessions = (
            self.db.query(ES)
            .filter(
                ES.user_id == user_id,
                ES.status == ExamStatus.COMPLETED.value,
            )
            .all()
        )

        # Aggregate exam performance by domain
        for session in exam_sessions:
            answers = (
                self.db.query(EA)
                .filter(EA.exam_session_id == session.id)
                .all()
            )

            for answer in answers:
                question = self.db.get(Question, answer.question_id)
                if not question:
                    continue

                task = self.tasks.get(question.task_id)
                if not task:
                    continue

                domain = self.domains.get(task.domain_id)
                if not domain:
                    continue

                domain_name = domain.name
                perf = performance[domain_name]
                perf.total_attempts += 1
                if answer.is_correct:
                    perf.accuracy = (
                        (perf.accuracy * (perf.total_attempts - 1) + 1.0)
                        / perf.total_attempts
                    )
                else:
                    perf.accuracy = (
                        perf.accuracy * (perf.total_attempts - 1)
                    ) / perf.total_attempts

                # Track response time
                if answer.time_spent_seconds and answer.time_spent_seconds > 0:
                    if perf.avg_response_time is None:
                        perf.avg_response_time = float(answer.time_spent_seconds)
                    else:
                        perf.avg_response_time = (
                            perf.avg_response_time * 0.9
                            + float(answer.time_spent_seconds) * 0.1
                        )

        # Also consider question progress (practice questions)
        question_progress_entries = (
            self.db.query(QP).filter(QP.user_id == user_id).all()
        )

        for qp in question_progress_entries:
            question = self.db.get(Question, qp.question_id)
            if not question:
                continue

            task = self.tasks.get(question.task_id)
            if not task:
                continue

            domain = self.domains.get(task.domain_id)
            if not domain:
                continue

            domain_name = domain.name
            perf = performance[domain_name]

            # Weight question progress less than exam performance
            weight = 0.3
            exam_weight = 1.0 - weight

            if perf.total_attempts == 0:
                perf.accuracy = qp.correct_count / qp.attempt_count if qp.attempt_count > 0 else 0.0
            else:
                qp_accuracy = qp.correct_count / qp.attempt_count if qp.attempt_count > 0 else 0.0
                perf.accuracy = perf.accuracy * exam_weight + qp_accuracy * weight

            perf.total_attempts += qp.attempt_count

            if qp.last_response_time_seconds:
                if perf.avg_response_time is None:
                    perf.avg_response_time = qp.last_response_time_seconds
                else:
                    perf.avg_response_time = (
                        perf.avg_response_time * 0.9 + qp.last_response_time_seconds * 0.1
                    )

        return performance

    def calculate_adaptive_domain_weights(
        self,
        user_id: uuid.UUID,
    ) -> dict[str, float]:
        """
        Calculate adaptive domain weights based on user's prior performance.

        Increases weight for weak domains (more questions to practice)
        and slightly decreases for strong domains.

        Adjustment rules:
        - Accuracy < 60%: Increase weight by 30%
        - Accuracy 60-75%: Increase weight by 15%
        - Accuracy 75-85%: No adjustment
        - Accuracy > 85%: Decrease weight by 10%

        Args:
            user_id: User ID to calculate weights for

        Returns:
            Adjusted domain weights dictionary
        """
        performance = self.get_user_domain_performance(user_id)

        adaptive_weights = self.config.domain_weights.copy()
        total_adjustment = 0.0

        # Calculate adjustments
        adjustments: dict[str, float] = {}
        for domain_name, weight in self.config.domain_weights.items():
            perf = performance.get(domain_name)
            if not perf or perf.total_attempts < 5:
                # Not enough data - use default weight
                adjustments[domain_name] = 0.0
                continue

            accuracy = perf.accuracy

            if accuracy < 0.60:
                # Weak domain - increase significantly
                adjustment = 0.30
            elif accuracy < 0.75:
                # Below average - increase moderately
                adjustment = 0.15
            elif accuracy < 0.85:
                # Adequate - no adjustment
                adjustment = 0.0
            else:
                # Strong domain - decrease slightly
                adjustment = -0.10

            adjustments[domain_name] = adjustment
            adaptive_weights[domain_name] = weight * (1 + adjustment)
            total_adjustment += adjustment

        # Normalize to ensure weights sum to 1
        total_weight = sum(adaptive_weights.values())
        if total_weight != 1.0:
            for domain_name in adaptive_weights:
                adaptive_weights[domain_name] /= total_weight

        return adaptive_weights

    def get_domain_questions(self, domain_name: str) -> list[Question]:
        """
        Get all available questions for a specific domain.

        Args:
            domain_name: Name of the domain

        Returns:
            List of questions in the domain
        """
        domain = self.db.query(Domain).filter(Domain.name == domain_name).first()
        if not domain:
            return []

        task_ids = [t.id for t in domain.tasks]
        return (
            self.db.query(Question)
            .filter(Question.task_id.in_(task_ids))
            .order_by(Question.id)
            .all()
        )

    def calculate_domain_distribution(self, total_questions: int) -> dict[str, int]:
        """
        Calculate number of questions per domain based on PMP weights.

        Args:
            total_questions: Total number of questions in exam

        Returns:
            Dictionary mapping domain names to question counts
        """
        distribution: dict[str, int] = {}
        allocated = 0

        # Calculate questions for each domain
        for domain_name, weight in self.config.domain_weights.items():
            count = int(total_questions * weight)
            distribution[domain_name] = count
            allocated += count

        # Distribute remaining questions to domain with highest weight
        # (Process domain at 41%)
        remaining = total_questions - allocated
        if remaining > 0:
            # Find domain with highest weight
            max_weight_domain = max(
                self.config.domain_weights.items(),
                key=lambda x: x[1],
            )[0]
            distribution[max_weight_domain] += remaining

        return distribution

    def select_questions_for_domain(
        self,
        domain_name: str,
        count: int,
        random_seed: int | None = None,
        user_id: uuid.UUID | None = None,
        difficulty_preference: Literal["easier", "mixed", "harder"] = "mixed",
    ) -> list[Question]:
        """
        Select questions for a specific domain with optional adaptive difficulty.

        Args:
            domain_name: Name of the domain
            count: Number of questions to select
            random_seed: Optional seed for reproducibility
            user_id: Optional user ID for adaptive difficulty selection
            difficulty_preference: Difficulty level preference
                - "easier": Select more easy/medium questions for weak domains
                - "mixed": Balanced selection (default)
                - "harder": Select more medium/hard questions for strong domains

        Returns:
            List of selected questions
        """
        questions = self.get_domain_questions(domain_name)

        if len(questions) < count:
            raise ValueError(
                f"Not enough questions in {domain_name} domain. "
                f"Available: {len(questions)}, Required: {count}"
            )

        selected: list[Question] = []

        # Determine difficulty distribution based on preference
        if difficulty_preference == "easier":
            # Focus on easier questions: 50% easy, 40% medium, 10% hard
            distribution = {"easy": 0.5, "medium": 0.4, "hard": 0.1}
        elif difficulty_preference == "harder":
            # Focus on harder questions: 10% easy, 40% medium, 50% hard
            distribution = {"easy": 0.1, "medium": 0.4, "hard": 0.5}
        else:
            # Mixed: 25% easy, 50% medium, 25% hard
            distribution = {"easy": 0.25, "medium": 0.5, "hard": 0.25}

        # Group questions by difficulty
        by_difficulty: dict[str, list[Question]] = {
            "easy": [],
            "medium": [],
            "hard": [],
        }

        for q in questions:
            diff = (q.difficulty or "medium").lower()
            if diff not in by_difficulty:
                diff = "medium"
            by_difficulty[diff].append(q)

        # If no difficulty data, fall back to random selection
        if all(len(v) == 0 for v in by_difficulty.values()):
            rng = Random(random_seed) if random_seed is not None else Random()
            shuffled = questions.copy()
            shuffle(shuffled, random=rng.random)
            return shuffled[:count]

        # Select questions based on distribution
        rng = Random(random_seed) if random_seed is not None else Random()

        for difficulty, weight in distribution.items():
            target_count = int(count * weight)

            available = by_difficulty[difficulty]
            if len(available) < target_count:
                # Not enough questions of this difficulty, take what we have
                to_select = len(available)
            else:
                to_select = target_count

            # Randomly select from this difficulty level
            shuffled = available.copy()
            shuffle(shuffled, random=rng.random)
            selected.extend(shuffled[:to_select])

        # If we still need more questions, fill randomly from remaining
        if len(selected) < count:
            selected_ids = {q.id for q in selected}
            remaining = [q for q in questions if q.id not in selected_ids]
            shuffle(remaining, random=rng.random)
            needed = count - len(selected)
            selected.extend(remaining[:needed])

        # If we have too many, trim randomly
        elif len(selected) > count:
            shuffle(selected, random=rng.random)
            selected = selected[:count]

        return selected

    def generate_exam_questions(
        self,
        random_seed: int | None = None,
        user_id: uuid.UUID | None = None,
        adaptive_difficulty: bool = True,
    ) -> list[QuestionSelection]:
        """
        Generate a complete set of exam questions with proper domain distribution.

        Args:
            random_seed: Optional seed for reproducibility
            user_id: Optional user ID for adaptive difficulty
            adaptive_difficulty: Whether to use adaptive difficulty adjustment

        Returns:
            List of QuestionSelection objects with domain and task metadata
        """
        # Use adaptive domain weights if user_id provided and adaptive enabled
        if adaptive_difficulty and user_id:
            domain_weights = self.calculate_adaptive_domain_weights(user_id)
            # Temporarily override config weights
            original_weights = self.config.domain_weights
            self.config.domain_weights = domain_weights

        distribution = self.calculate_domain_distribution(self.config.total_questions)

        # Restore original weights if we temporarily overrode them
        if adaptive_difficulty and user_id:
            self.config.domain_weights = original_weights

        selected_questions: list[QuestionSelection] = []
        question_index = 0

        # Get user performance for difficulty adjustment
        user_performance = None
        if adaptive_difficulty and user_id:
            user_performance = self.get_user_domain_performance(user_id)

        for domain_name, count in distribution.items():
            # Determine difficulty preference based on user performance
            difficulty_pref: Literal["easier", "mixed", "harder"] = "mixed"
            if user_performance and domain_name in user_performance:
                perf = user_performance[domain_name]
                if perf.total_attempts >= 5:
                    if perf.accuracy < 0.65:
                        difficulty_pref = "easier"
                    elif perf.accuracy > 0.85:
                        difficulty_pref = "harder"

            questions = self.select_questions_for_domain(
                domain_name,
                count,
                random_seed,
                user_id=user_id,
                difficulty_preference=difficulty_pref,
            )

            for question in questions:
                task = self.tasks[question.task_id]
                domain = self.domains[task.domain_id]

                selection = QuestionSelection(
                    question=question,
                    domain_name=domain.name,
                    task_name=task.name,
                    question_index=question_index,
                )
                selected_questions.append(selection)
                question_index += 1

        # Shuffle final question order (questions should be mixed across domains)
        rng = Random(random_seed) if random_seed is not None else Random()
        final_questions = selected_questions.copy()
        shuffle(final_questions, random=rng.random)

        # Reassign indices after shuffle
        for idx, selection in enumerate(final_questions):
            selection.question_index = idx

        return final_questions

    def create_exam_session(
        self,
        user_id: uuid.UUID,
        random_seed: int | None = None,
        adaptive_difficulty: bool = True,
    ) -> ExamSession:
        """
        Create a new exam session with generated questions.

        Args:
            user_id: User ID taking the exam
            random_seed: Optional seed for reproducibility
            adaptive_difficulty: Whether to use adaptive difficulty adjustment

        Returns:
            Created ExamSession
        """
        questions = self.generate_exam_questions(
            random_seed=random_seed,
            user_id=user_id,
            adaptive_difficulty=adaptive_difficulty,
        )

        session = ExamSession(
            user_id=user_id,
            questions_count=len(questions),
            current_question_index=0,
            status=ExamStatus.IN_PROGRESS.value,
        )

        self.db.add(session)
        self.db.flush()

        # Create ExamAnswer records for each question
        for selection in questions:
            answer = ExamAnswer(
                exam_session_id=session.id,
                question_id=selection.question.id,
                question_index=selection.question_index,
                selected_answer="",  # Empty initially
                is_correct=False,
                time_spent_seconds=0,
                is_flagged=False,
            )
            self.db.add(answer)

        self.db.commit()
        self.db.refresh(session)

        return session

    def get_remaining_time(self, session: ExamSession) -> timedelta:
        """
        Calculate remaining time for an exam session.

        Args:
            session: Exam session to check

        Returns:
            Remaining time (zero if expired)
        """
        elapsed = datetime.now(session.start_time.tzinfo) - session.start_time
        total_duration = timedelta(minutes=self.config.exam_duration_minutes)
        remaining = total_duration - elapsed

        if remaining.total_seconds() < 0:
            remaining = timedelta()

        return remaining

    def is_time_expired(self, session: ExamSession) -> bool:
        """
        Check if an exam session has expired.

        Args:
            session: Exam session to check

        Returns:
            True if time has expired
        """
        return self.get_remaining_time(session) == timedelta()

    def submit_answer(
        self,
        session: ExamSession,
        question_id: int,
        selected_answer: str,
        time_spent_seconds: int,
        is_flagged: bool = False,
    ) -> ExamAnswer:
        """
        Submit an answer for a question in the exam.

        Args:
            session: Exam session
            question_id: Question being answered
            selected_answer: User's selected answer (A, B, C, D)
            time_spent_seconds: Time spent on this question
            is_flagged: Whether user flagged for review

        Returns:
            Created or updated ExamAnswer
        """
        # Get the question to check correctness
        question = self.db.get(Question, question_id)
        if not question:
            raise ValueError(f"Question {question_id} not found")

        is_correct = selected_answer.upper() == question.correct_answer.upper()

        # Find existing answer or create new one
        answer = (
            self.db.query(ExamAnswer)
            .filter(
                ExamAnswer.exam_session_id == session.id,
                ExamAnswer.question_id == question_id,
            )
            .first()
        )

        # Check if this is a revisit (answer already exists)
        is_revisit = answer is not None and answer.selected_answer != ""

        if answer:
            answer.selected_answer = selected_answer.upper()
            answer.is_correct = is_correct
            answer.time_spent_seconds = time_spent_seconds
            answer.is_flagged = is_flagged
        else:
            answer = ExamAnswer(
                exam_session_id=session.id,
                question_id=question_id,
                question_index=0,  # Will be set correctly on session completion
                selected_answer=selected_answer.upper(),
                is_correct=is_correct,
                time_spent_seconds=time_spent_seconds,
                is_flagged=is_flagged,
            )
            self.db.add(answer)

        # Update session progress
        answered_count = (
            self.db.query(ExamAnswer)
            .filter(
                ExamAnswer.exam_session_id == session.id,
                ExamAnswer.selected_answer != "",
            )
            .count()
        )
        session.current_question_index = answered_count

        # Track behavior for exam coach (if answer was newly created or revisited)
        if is_revisit or answer.selected_answer:
            from app.services.exam_coach_service import create_exam_coach_service
            coach_service = create_exam_coach_service(self.db)

            # Get question index from the answer
            question_index = answer.question_index

            # Record behavior and get coaching alerts
            try:
                coach_service.record_answer_behavior(
                    session=session,
                    question_index=question_index,
                    time_spent_seconds=time_spent_seconds,
                    is_flagged=is_flagged,
                    is_revisit=is_revisit,
                )
            except Exception:
                # Don't fail answer submission if behavior tracking fails
                pass

        self.db.commit()
        self.db.refresh(answer)

        return answer

    def complete_exam_session(self, session: ExamSession) -> ExamResult:
        """
        Complete an exam session and generate results.

        Args:
            session: Exam session to complete

        Returns:
            ExamResult with score and breakdowns
        """
        # Check if time expired
        time_expired = self.is_time_expired(session)
        session.time_expired = time_expired

        # Set end time and calculate total time
        session.end_time = datetime.now(session.start_time.tzinfo)
        if session.end_time and session.start_time:
            session.total_time_seconds = int(
                (session.end_time - session.start_time).total_seconds()
            )

        # Calculate scores
        answers = (
            self.db.query(ExamAnswer)
            .filter(ExamAnswer.exam_session_id == session.id)
            .all()
        )

        correct_count = sum(1 for a in answers if a.is_correct)
        session.correct_count = correct_count
        session.status = ExamStatus.COMPLETED.value

        # Calculate domain and task breakdowns
        domain_breakdown = self._calculate_domain_breakdown(answers)
        task_breakdown = self._calculate_task_breakdown(answers)

        # Calculate overall score percentage
        score_percentage = (
            (correct_count / session.questions_count * 100)
            if session.questions_count > 0
            else 0.0
        )

        # PMP passing score is generally considered "above target" in most domains
        # Using a conservative 65% threshold
        passing_threshold = 65.0
        passed = score_percentage >= passing_threshold

        # Generate exam report
        self._generate_exam_report(
            session=session,
            score_percentage=score_percentage,
            domain_breakdown=domain_breakdown,
            task_breakdown=task_breakdown,
            passed=passed,
        )

        self.db.commit()
        self.db.refresh(session)

        return ExamResult(
            session=session,
            score_percentage=score_percentage,
            passed=passed,
            domain_breakdown=domain_breakdown,
            task_breakdown=task_breakdown,
            time_spent_seconds=session.total_time_seconds,
            time_expired=time_expired,
        )

    def _calculate_domain_breakdown(
        self, answers: list[ExamAnswer]
    ) -> dict[str, dict]:
        """
        Calculate performance breakdown by domain with time tracking.

        Returns detailed breakdown including:
        - Correct count and percentage
        - Total questions in domain
        - Total time spent on domain
        - Average time per question in domain
        """
        breakdown: dict[str, dict] = {}

        for answer in answers:
            question = self.db.get(Question, answer.question_id)
            if not question:
                continue

            task = self.tasks.get(question.task_id)
            if not task:
                continue

            domain = self.domains.get(task.domain_id)
            if not domain:
                continue

            domain_name = domain.name
            if domain_name not in breakdown:
                breakdown[domain_name] = {
                    "correct": 0,
                    "total": 0,
                    "time_spent_seconds": 0,
                    "task_ids": set(),
                }

            breakdown[domain_name]["total"] += 1
            breakdown[domain_name]["time_spent_seconds"] += answer.time_spent_seconds or 0
            breakdown[domain_name]["task_ids"].add(question.task_id)
            if answer.is_correct:
                breakdown[domain_name]["correct"] += 1

        # Calculate percentages and averages
        for domain_name in breakdown:
            correct = breakdown[domain_name]["correct"]
            total = breakdown[domain_name]["total"]
            time_spent = breakdown[domain_name]["time_spent_seconds"]

            breakdown[domain_name]["percentage"] = (
                (correct / total * 100) if total > 0 else 0.0
            )
            breakdown[domain_name]["average_time_per_question"] = (
                (time_spent / total) if total > 0 else 0.0
            )
            # Convert set to list for JSON serialization
            breakdown[domain_name]["task_ids"] = list(breakdown[domain_name]["task_ids"])
            # Add weight for reference
            breakdown[domain_name]["weight"] = PMP_DOMAIN_WEIGHTS.get(domain_name, 0.0)

        return breakdown

    def _calculate_task_breakdown(self, answers: list[ExamAnswer]) -> dict[int, dict]:
        """
        Calculate performance breakdown by task with time tracking.

        Returns detailed breakdown including:
        - Correct count and percentage
        - Total questions per task
        - Total time spent on task
        - Average time per question in task
        """
        breakdown: dict[int, dict] = {}

        for answer in answers:
            question = self.db.get(Question, answer.question_id)
            if not question:
                continue

            task_id = question.task_id
            if task_id not in breakdown:
                task = self.tasks.get(task_id)
                domain = self.domains.get(task.domain_id) if task else None
                breakdown[task_id] = {
                    "correct": 0,
                    "total": 0,
                    "time_spent_seconds": 0,
                    "task_name": task.name if task else "",
                    "domain_name": domain.name if domain else "",
                }

            breakdown[task_id]["total"] += 1
            breakdown[task_id]["time_spent_seconds"] += answer.time_spent_seconds or 0
            if answer.is_correct:
                breakdown[task_id]["correct"] += 1

        # Calculate percentages and averages
        for task_id in breakdown:
            correct = breakdown[task_id]["correct"]
            total = breakdown[task_id]["total"]
            time_spent = breakdown[task_id]["time_spent_seconds"]

            breakdown[task_id]["percentage"] = (
                (correct / total * 100) if total > 0 else 0.0
            )
            breakdown[task_id]["average_time_per_question"] = (
                (time_spent / total) if total > 0 else 0.0
            )

        return breakdown

    def _generate_exam_report(
        self,
        session: ExamSession,
        score_percentage: float,
        domain_breakdown: dict[str, dict],
        task_breakdown: dict[int, dict],
        passed: bool,
    ) -> ExamReport:
        """
        Generate comprehensive exam report with personalized recommendations.

        Recommendations are based on:
        - Overall score vs passing threshold
        - Domain-level performance
        - Task-level weaknesses
        - Time management analysis
        - Question completion rate
        """
        # Analyze strengths and weaknesses
        strengths: list[str] = []
        weaknesses: list[str] = []

        # Domain-level strength/weakness analysis
        strong_domains = []
        moderate_domains = []
        weak_domains = []

        for domain_name, stats in domain_breakdown.items():
            percentage = stats["percentage"]
            if percentage >= 75:
                strong_domains.append(f"{domain_name} ({percentage:.1f}%)")
            elif percentage >= 60:
                moderate_domains.append(f"{domain_name} ({percentage:.1f}%)")
            else:
                weak_domains.append(f"{domain_name} ({percentage:.1f}%)")

        if strong_domains:
            strengths.append(f"Strong domains: {', '.join(strong_domains)}")

        if weak_domains:
            weaknesses.append(f"Weak domains: {', '.join(weak_domains)}")

        # Add moderate domains to strengths if overall passed
        if passed and moderate_domains:
            strengths.append(f"Adequate performance: {', '.join(moderate_domains)}")

        # Task-level weakness analysis
        weak_tasks = []
        for task_id, stats in task_breakdown.items():
            if stats["total"] >= 2 and stats["percentage"] < 60:
                weak_tasks.append(
                    f"{stats['task_name']} ({stats['domain_name']}) - {stats['percentage']:.1f}%"
                )

        if weak_tasks:
            weaknesses.append(f"Weak tasks: {'; '.join(weak_tasks[:5])}")

        # Generate comprehensive recommendations
        recommendations = self._generate_recommendations(
            session=session,
            score_percentage=score_percentage,
            passed=passed,
            domain_breakdown=domain_breakdown,
            task_breakdown=task_breakdown,
        )

        # Create report
        report = ExamReport(
            exam_session_id=session.id,
            score_percentage=score_percentage,
            domain_breakdown=domain_breakdown,
            task_breakdown=task_breakdown,
            recommendations=recommendations,
            strengths=strengths,
            weaknesses=weaknesses,
        )

        self.db.add(report)
        return report

    def _generate_recommendations(
        self,
        session: ExamSession,
        score_percentage: float,
        passed: bool,
        domain_breakdown: dict[str, dict],
        task_breakdown: dict[int, dict],
    ) -> list[str]:
        """
        Generate personalized study recommendations based on exam performance.

        Analyzes:
        - Score vs passing threshold
        - Domain performance patterns
        - Task-level weaknesses
        - Time management
        - Question completion
        """
        recommendations: list[str] = []

        # Overall score recommendations
        passing_threshold = 65.0
        if not passed:
            gap = passing_threshold - score_percentage
            recommendations.append(
                f"Your score is {gap:.1f}% below the passing threshold of {passing_threshold}%. "
                "Focus additional study time on reviewing weak areas and practice more exam questions."
            )
        else:
            margin = score_percentage - passing_threshold
            recommendations.append(
                f"Congratulations! You passed with a {margin:.1f}% margin above the threshold. "
                "Continue practicing to maintain and improve your performance."
            )

        # Domain-specific recommendations
        critical_domains = [
            (name, stats)
            for name, stats in domain_breakdown.items()
            if stats["percentage"] < 60 and stats["total"] >= 5
        ]

        for domain_name, stats in critical_domains:
            recommendations.append(
                f"Critical: Review {domain_name} domain fundamentals. "
                f"Your accuracy ({stats['percentage']:.1f}%) is significantly below target. "
                f"Focus on understanding key concepts and practicing scenario-based questions."
            )

        # Task-level recommendations for weakest tasks
        weak_tasks_sorted = sorted(
            [
                (task_id, stats)
                for task_id, stats in task_breakdown.items()
                if stats["total"] >= 2
            ],
            key=lambda x: x[1]["percentage"],
        )[:4]

        for task_id, stats in weak_tasks_sorted:
            if stats["percentage"] < 65:
                recommendations.append(
                    f"Focus on '{stats['task_name']}' task within {stats['domain_name']} domain. "
                    f"Current accuracy: {stats['percentage']:.1f}%. Review flashcards and practice questions for this task."
                )

        # Time management analysis
        target_time_per_question = (EXAM_DURATION_MINUTES * 60) / TOTAL_QUESTIONS  # ~78 seconds
        avg_time_per_question = (
            session.total_time_seconds / session.questions_count
            if session.questions_count > 0
            else 0
        )

        if avg_time_per_question > target_time_per_question * 1.3:
            recommendations.append(
                f"Time management needed: Your average time per question was "
                f"{avg_time_per_question:.0f} seconds, which is above the target of "
                f"{target_time_per_question:.0f} seconds. Practice flagging difficult questions "
                "and return to them later. Don't spend more than 2 minutes on any single question."
            )
        elif avg_time_per_question < target_time_per_question * 0.6:
            recommendations.append(
                f"You're moving quickly (avg {avg_time_per_question:.0f} seconds per question). "
                "Ensure you're reading questions thoroughly and considering all options before answering."
            )

        # Per-domain time analysis
        for domain_name, stats in domain_breakdown.items():
            avg_domain_time = stats.get("average_time_per_question", 0)
            if avg_domain_time > target_time_per_question * 1.5 and stats["total"] >= 5:
                recommendations.append(
                    f"You spent significant time on {domain_name} questions "
                    f"(avg {avg_domain_time:.0f} seconds). Consider reviewing this domain "
                    "to improve familiarity and reduce time needed per question."
                )

        # Completion rate recommendations
        completion_rate = (
            session.correct_count / session.questions_count
            if session.questions_count > 0
            else 0
        )
        if completion_rate < 0.9 and not session.time_expired:
            recommendations.append(
                f"You completed {completion_rate * 100:.1f}% of questions. "
                "Practice taking full-length timed exams to build endurance and ensure completion."
            )

        if session.time_expired:
            recommendations.append(
                "Time expired during the exam. Prioritize time management strategies: "
                "flag difficult questions, maintain steady pace, and ensure you attempt all questions."
            )

        # Practice recommendations based on weak areas
        if weak_tasks_sorted:
            weak_domains = set(stats["domain_name"] for _, stats in weak_tasks_sorted[:2])
            if weak_domains:
                recommendations.append(
                    f"Priority study domains: {', '.join(weak_domains)}. "
                    "Use domain-filtered practice sessions to focus your study time effectively."
                )

        return recommendations

    def get_exam_session_questions(self, session: ExamSession) -> list[dict]:
        """
        Get all questions for an exam session with answer status.

        Args:
            session: Exam session

        Returns:
            List of question dictionaries with metadata
        """
        answers = (
            self.db.query(ExamAnswer)
            .filter(ExamAnswer.exam_session_id == session.id)
            .order_by(ExamAnswer.question_index)
            .all()
        )

        result = []
        for answer in answers:
            question = self.db.get(Question, answer.question_id)
            if not question:
                continue

            task = self.tasks.get(question.task_id)
            domain = self.domains.get(task.domain_id) if task else None

            result.append(
                {
                    "question_index": answer.question_index,
                    "question_id": question.id,
                    "question_text": question.question_text,
                    "option_a": question.option_a,
                    "option_b": question.option_b,
                    "option_c": question.option_c,
                    "option_d": question.option_d,
                    "selected_answer": answer.selected_answer,
                    "is_correct": answer.is_correct,
                    "is_flagged": answer.is_flagged,
                    "time_spent_seconds": answer.time_spent_seconds,
                    "domain_name": domain.name if domain else None,
                    "task_name": task.name if task else None,
                }
            )

        return result


def create_exam_engine(
    db: Session,
    config: ExamConfig | None = None,
) -> ExamEngine:
    """
    Factory function to create an ExamEngine instance.

    Args:
        db: Database session
        config: Optional exam configuration

    Returns:
        Configured ExamEngine instance
    """
    return ExamEngine(db, config)
