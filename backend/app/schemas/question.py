"""Pydantic schemas for Question and QuestionProgress models."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

if TYPE_CHECKING:
    from app.schemas.task import TaskResponse


class DifficultyLevel(str, Enum):
    """Question difficulty levels."""

    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class AnswerChoice(str, Enum):
    """Valid answer choices for multiple-choice questions."""

    A = "A"
    B = "B"
    C = "C"
    D = "D"


class QuestionBase(BaseModel):
    """Base schema for Question with shared attributes."""

    question_text: str = Field(..., min_length=1, description="Question text")
    option_a: str = Field(..., min_length=1, description="Option A")
    option_b: str = Field(..., min_length=1, description="Option B")
    option_c: str = Field(..., min_length=1, description="Option C")
    option_d: str = Field(..., min_length=1, description="Option D")
    correct_answer: str = Field(
        ...,
        min_length=1,
        max_length=1,
        description="Correct answer (A, B, C, or D)",
    )
    explanation: str = Field(..., min_length=1, description="Explanation of correct answer")
    difficulty: str | None = Field(
        None,
        description="Difficulty level (easy, medium, hard)",
    )

    @field_validator("correct_answer")
    @classmethod
    def validate_correct_answer(cls, v: str) -> str:
        """Validate that correct_answer is A, B, C, or D."""
        if v.upper() not in ["A", "B", "C", "D"]:
            raise ValueError("correct_answer must be A, B, C, or D")
        return v.upper()

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str | None) -> str | None:
        """Validate difficulty level if provided."""
        if v is not None and v.lower() not in ["easy", "medium", "hard"]:
            raise ValueError("difficulty must be easy, medium, or hard")
        return v.lower() if v else None


class QuestionCreate(QuestionBase):
    """Schema for creating a new Question."""

    task_id: int = Field(..., gt=0, description="ID of associated task")


class QuestionUpdate(BaseModel):
    """Schema for updating an existing Question. All fields optional."""

    question_text: str | None = Field(None, min_length=1, description="Question text")
    option_a: str | None = Field(None, min_length=1, description="Option A")
    option_b: str | None = Field(None, min_length=1, description="Option B")
    option_c: str | None = Field(None, min_length=1, description="Option C")
    option_d: str | None = Field(None, min_length=1, description="Option D")
    correct_answer: str | None = Field(None, description="Correct answer (A, B, C, or D)")
    explanation: str | None = Field(None, min_length=1, description="Explanation")
    difficulty: str | None = Field(None, description="Difficulty level")
    task_id: int | None = Field(None, gt=0, description="ID of associated task")

    @field_validator("correct_answer")
    @classmethod
    def validate_correct_answer(cls, v: str | None) -> str | None:
        """Validate that correct_answer is A, B, C, or D if provided."""
        if v is not None and v.upper() not in ["A", "B", "C", "D"]:
            raise ValueError("correct_answer must be A, B, C, or D")
        return v.upper() if v else None

    @field_validator("difficulty")
    @classmethod
    def validate_difficulty(cls, v: str | None) -> str | None:
        """Validate difficulty level if provided."""
        if v is not None and v.lower() not in ["easy", "medium", "hard"]:
            raise ValueError("difficulty must be easy, medium, or hard")
        return v.lower() if v else None


class QuestionResponse(QuestionBase):
    """Schema for Question response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Question ID")
    task_id: int = Field(..., description="ID of associated task")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class QuestionWithTaskResponse(QuestionResponse):
    """Schema for Question response including task info."""

    task: TaskResponse = Field(..., description="Associated task")


# Question Answer Schemas


class QuestionAnswerRequest(BaseModel):
    """Schema for submitting an answer to a question."""

    answer: str = Field(
        ...,
        min_length=1,
        max_length=1,
        description="User's answer (A, B, C, or D)",
    )

    @field_validator("answer")
    @classmethod
    def validate_answer(cls, v: str) -> str:
        """Validate that answer is A, B, C, or D."""
        if v.upper() not in ["A", "B", "C", "D"]:
            raise ValueError("answer must be A, B, C, or D")
        return v.upper()


class QuestionAnswerResponse(BaseModel):
    """Schema for question answer submission response."""

    question_id: int = Field(..., description="Question ID that was answered")
    user_answer: str = Field(..., description="User's submitted answer")
    correct_answer: str = Field(..., description="The correct answer")
    is_correct: bool = Field(..., description="Whether the answer was correct")
    explanation: str = Field(..., description="Explanation of the correct answer")
    message: str = Field(default="Answer recorded successfully")


# Question Progress Schemas


class QuestionProgressResponse(BaseModel):
    """Schema for QuestionProgress response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Progress record UUID")
    user_id: UUID = Field(..., description="User UUID")
    question_id: UUID = Field(..., description="Question UUID")
    attempt_count: int = Field(default=0, description="Total attempts on this question")
    correct_count: int = Field(default=0, description="Number of correct answers")
    last_answer: str | None = Field(None, description="Last answer given")
    last_correct: bool | None = Field(None, description="Was last answer correct")
    last_attempted_at: datetime | None = Field(None, description="Last attempt date")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class QuestionWithProgressResponse(QuestionResponse):
    """Schema for Question with user's progress included."""

    progress: QuestionProgressResponse | None = Field(
        None, description="User's progress on this question"
    )
