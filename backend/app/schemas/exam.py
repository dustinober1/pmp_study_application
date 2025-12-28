"""Pydantic schemas for Exam models (ExamSession, ExamAnswer, ExamReport)."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

if TYPE_CHECKING:
    pass


class ExamStatus(str, Enum):
    """Status of an exam session."""

    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


# Exam Session Schemas


class ExamSessionCreate(BaseModel):
    """Schema for creating a new exam session."""

    exam_duration_minutes: int | None = Field(
        None,
        ge=30,
        le=300,
        description="Custom exam duration in minutes (default: 240 for PMP)",
    )
    total_questions: int | None = Field(
        None,
        ge=10,
        le=200,
        description="Number of questions (default: 185 for PMP)",
    )
    adaptive_difficulty: bool = Field(
        default=True,
        description="Enable adaptive difficulty based on prior performance",
    )


class ExamSessionResponse(BaseModel):
    """Schema for exam session response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Exam session UUID")
    user_id: UUID = Field(..., description="User UUID")
    status: str = Field(..., description="Exam status")
    start_time: datetime = Field(..., description="Exam start time")
    end_time: datetime | None = Field(None, description="Exam end time")
    total_time_seconds: int = Field(default=0, description="Total time spent in seconds")
    questions_count: int = Field(..., description="Number of questions")
    correct_count: int = Field(default=0, description="Correct answers count")
    current_question_index: int = Field(default=0, description="Current question index")
    time_expired: bool = Field(default=False, description="Whether time expired")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ExamSessionDetailResponse(ExamSessionResponse):
    """Schema for exam session detail with remaining time."""

    remaining_time_seconds: int = Field(..., description="Remaining time in seconds")
    answered_count: int = Field(..., description="Number of answered questions")
    flagged_count: int = Field(..., description="Number of flagged questions")


# Exam Answer Schemas


class ExamAnswerSubmit(BaseModel):
    """Schema for submitting an exam answer."""

    question_id: int = Field(..., gt=0, description="Question ID")
    selected_answer: str = Field(
        ...,
        min_length=1,
        max_length=1,
        description="Selected answer (A, B, C, or D)",
    )
    time_spent_seconds: int = Field(
        default=0,
        ge=0,
        le=600,
        description="Time spent on this question in seconds",
    )
    is_flagged: bool = Field(
        default=False,
        description="Whether to flag this question for review",
    )

    @field_validator("selected_answer")
    @classmethod
    def validate_answer(cls, v: str) -> str:
        """Validate that selected_answer is A, B, C, or D."""
        if v.upper() not in ["A", "B", "C", "D"]:
            raise ValueError("selected_answer must be A, B, C, or D")
        return v.upper()


class ExamAnswerResponse(BaseModel):
    """Schema for exam answer submission response."""

    id: UUID = Field(..., description="Answer record UUID")
    exam_session_id: UUID = Field(..., description="Exam session UUID")
    question_id: int = Field(..., description="Question ID")
    question_index: int = Field(..., description="Question index in exam")
    selected_answer: str = Field(..., description="Selected answer")
    is_correct: bool = Field(..., description="Whether answer was correct")
    time_spent_seconds: int = Field(..., description="Time spent in seconds")
    is_flagged: bool = Field(..., description="Whether flagged for review")
    created_at: datetime = Field(..., description="Creation timestamp")


class ExamQuestionItem(BaseModel):
    """Schema for a question in an exam session."""

    question_index: int = Field(..., description="Question index")
    question_id: int = Field(..., description="Question ID")
    question_text: str = Field(..., description="Question text")
    option_a: str = Field(..., description="Option A")
    option_b: str = Field(..., description="Option B")
    option_c: str = Field(..., description="Option C")
    option_d: str = Field(..., description="Option D")
    selected_answer: str | None = Field(None, description="User's selected answer")
    is_correct: bool | None = Field(None, description="Whether answer was correct")
    is_flagged: bool = Field(default=False, description="Whether flagged for review")
    time_spent_seconds: int = Field(default=0, description="Time spent in seconds")
    domain_name: str | None = Field(None, description="Domain name")
    task_name: str | None = Field(None, description="Task name")


class ExamQuestionsResponse(BaseModel):
    """Schema for exam session questions list."""

    exam_session_id: UUID = Field(..., description="Exam session UUID")
    questions: list[ExamQuestionItem] = Field(..., description="List of questions")


# Exam Completion Schemas


class ExamSessionSubmit(BaseModel):
    """Schema for submitting/completing an exam session."""

    force_complete: bool = Field(
        default=False,
        description="Force complete even if not all questions answered",
    )


class ExamResultResponse(BaseModel):
    """Schema for exam completion result."""

    exam_session_id: UUID = Field(..., description="Exam session UUID")
    score_percentage: float = Field(..., description="Overall score percentage")
    passed: bool = Field(..., description="Whether exam was passed")
    domain_breakdown: dict[str, dict] = Field(
        ...,
        description="Performance breakdown by domain",
    )
    task_breakdown: dict[int, dict] = Field(
        ...,
        description="Performance breakdown by task",
    )
    time_spent_seconds: int = Field(..., description="Total time spent in seconds")
    time_expired: bool = Field(..., description="Whether time expired")
    questions_count: int = Field(..., description="Total questions")
    correct_count: int = Field(..., description="Correct answers")


# Exam Report Schemas


class ExamReportResponse(BaseModel):
    """Schema for exam report response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Report UUID")
    exam_session_id: UUID = Field(..., description="Associated exam session UUID")
    score_percentage: float = Field(..., description="Overall score percentage")
    domain_breakdown: dict[str, dict] = Field(
        ...,
        description="Domain performance breakdown",
    )
    task_breakdown: dict[int, dict] | None = Field(
        None,
        description="Task performance breakdown",
    )
    recommendations: list[str] = Field(..., description="Study recommendations")
    strengths: list[str] = Field(..., description="Areas of strength")
    weaknesses: list[str] = Field(..., description="Areas needing improvement")
    created_at: datetime = Field(..., description="Report creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class ExamSessionWithReportResponse(ExamSessionResponse):
    """Schema for exam session including report."""

    report: ExamReportResponse | None = Field(None, description="Exam report")


# Resume Schemas


class ExamResumeResponse(BaseModel):
    """Schema for resuming an exam session."""

    session: ExamSessionDetailResponse = Field(..., description="Exam session details")
    questions: list[ExamQuestionItem] = Field(..., description="Exam questions")
    current_question: ExamQuestionItem | None = Field(
        None,
        description="Current question to resume from",
    )
