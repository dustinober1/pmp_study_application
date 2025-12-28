"""Pydantic schemas for progress tracking and summaries."""

from datetime import datetime

from pydantic import BaseModel, Field


class DomainProgressSummary(BaseModel):
    """Progress summary for a single domain."""

    domain_id: int = Field(..., description="Domain ID")
    domain_name: str = Field(..., description="Domain name")
    domain_weight: float = Field(..., description="Domain weight in exam")
    total_flashcards: int = Field(default=0, description="Total flashcards in domain")
    reviewed_flashcards: int = Field(default=0, description="Flashcards reviewed at least once")
    mastered_flashcards: int = Field(default=0, description="Flashcards with high ease factor")
    total_questions: int = Field(default=0, description="Total questions in domain")
    attempted_questions: int = Field(default=0, description="Questions attempted at least once")
    correct_questions: int = Field(default=0, description="Questions answered correctly")
    flashcard_accuracy: float = Field(
        default=0.0, description="Percentage of correct flashcard reviews"
    )
    question_accuracy: float = Field(
        default=0.0, description="Percentage of correct question answers"
    )


class OverallProgressSummary(BaseModel):
    """Overall progress summary across all domains."""

    total_flashcards: int = Field(default=0, description="Total flashcards")
    reviewed_flashcards: int = Field(default=0, description="Flashcards reviewed")
    mastered_flashcards: int = Field(default=0, description="Flashcards mastered")
    total_questions: int = Field(default=0, description="Total questions")
    attempted_questions: int = Field(default=0, description="Questions attempted")
    correct_questions: int = Field(default=0, description="Questions answered correctly")
    total_study_time_seconds: int = Field(default=0, description="Total study time in seconds")
    total_sessions: int = Field(default=0, description="Total study sessions")
    flashcard_accuracy: float = Field(
        default=0.0, description="Overall flashcard accuracy"
    )
    question_accuracy: float = Field(
        default=0.0, description="Overall question accuracy"
    )
    streak_days: int = Field(default=0, description="Current study streak in days")
    last_study_date: datetime | None = Field(None, description="Last study date")


class ProgressSummaryResponse(BaseModel):
    """Complete progress summary response for GET /api/progress/summary."""

    overall: OverallProgressSummary = Field(..., description="Overall progress summary")
    by_domain: list[DomainProgressSummary] = Field(
        default_factory=list, description="Progress breakdown by domain"
    )


class FlashcardsDueResponse(BaseModel):
    """Response for flashcards due for review."""

    count: int = Field(..., description="Number of flashcards due for review")
    flashcard_ids: list[int] = Field(
        default_factory=list, description="IDs of flashcards due for review"
    )


class StudyStreakResponse(BaseModel):
    """Response for study streak information."""

    current_streak: int = Field(default=0, description="Current streak in days")
    longest_streak: int = Field(default=0, description="Longest streak achieved")
    last_study_date: datetime | None = Field(None, description="Last study date")
    study_dates: list[datetime] = Field(
        default_factory=list, description="Recent study dates for calendar display"
    )
