"""Pydantic schemas for Flashcard and FlashcardProgress models."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.schemas.task import TaskResponse


class FlashcardBase(BaseModel):
    """Base schema for Flashcard with shared attributes."""

    front: str = Field(..., min_length=1, description="Front side of flashcard (question/prompt)")
    back: str = Field(..., min_length=1, description="Back side of flashcard (answer/explanation)")


class FlashcardCreate(FlashcardBase):
    """Schema for creating a new Flashcard."""

    task_id: int = Field(..., gt=0, description="ID of associated task")


class FlashcardUpdate(BaseModel):
    """Schema for updating an existing Flashcard. All fields optional."""

    front: str | None = Field(None, min_length=1, description="Front side of flashcard")
    back: str | None = Field(None, min_length=1, description="Back side of flashcard")
    task_id: int | None = Field(None, gt=0, description="ID of associated task")


class FlashcardResponse(FlashcardBase):
    """Schema for Flashcard response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Flashcard ID")
    task_id: int = Field(..., description="ID of associated task")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class FlashcardWithTaskResponse(FlashcardResponse):
    """Schema for Flashcard response including task info."""

    task: TaskResponse = Field(..., description="Associated task")


# SM-2 Spaced Repetition Progress Schemas


class FlashcardProgressBase(BaseModel):
    """Base schema for FlashcardProgress."""

    ease_factor: float = Field(
        default=2.5,
        ge=1.3,
        le=2.5,
        description="SM-2 ease factor (1.3-2.5)",
    )
    interval: int = Field(default=0, ge=0, description="Days until next review")
    repetitions: int = Field(default=0, ge=0, description="Number of successful repetitions")


class FlashcardReviewRequest(BaseModel):
    """Schema for submitting a flashcard review."""

    quality: int = Field(
        ...,
        ge=0,
        le=5,
        description="SM-2 quality rating (0-2 = failed, 3-5 = success)",
    )


class FlashcardProgressResponse(FlashcardProgressBase):
    """Schema for FlashcardProgress response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Progress record UUID")
    user_id: UUID = Field(..., description="User UUID")
    flashcard_id: int = Field(..., description="Flashcard ID")
    next_review_at: datetime | None = Field(None, description="Next scheduled review date")
    last_reviewed_at: datetime | None = Field(None, description="Last review date")
    review_count: int = Field(default=0, description="Total number of reviews")
    correct_count: int = Field(default=0, description="Count of correct responses")
    last_quality: int | None = Field(None, description="Last quality rating (0-5)")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class FlashcardReviewResponse(BaseModel):
    """Schema for flashcard review submission response."""

    flashcard_id: int = Field(..., description="Flashcard ID that was reviewed")
    quality: int = Field(..., description="Quality rating submitted")
    ease_factor: float = Field(..., description="Updated ease factor")
    interval: int = Field(..., description="New interval in days")
    next_review_at: datetime = Field(..., description="Next scheduled review date")
    message: str = Field(default="Review recorded successfully")


class FlashcardWithProgressResponse(FlashcardResponse):
    """Schema for Flashcard with user's progress included."""

    progress: FlashcardProgressResponse | None = Field(
        None, description="User's progress on this flashcard"
    )
