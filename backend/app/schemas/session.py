"""Pydantic schemas for StudySession model."""

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class SessionType(str, Enum):
    """Type of study session."""

    FLASHCARD = "flashcard"
    PRACTICE_TEST = "practice_test"
    MIXED = "mixed"


class StudySessionBase(BaseModel):
    """Base schema for StudySession with shared attributes."""

    session_type: SessionType = Field(
        default=SessionType.MIXED,
        description="Type of study session (flashcard, practice_test, mixed)",
    )
    domain_id: int | None = Field(None, gt=0, description="Optional domain focus for session")
    task_id: int | None = Field(None, gt=0, description="Optional task focus for session")


class StudySessionCreate(StudySessionBase):
    """Schema for creating/starting a new StudySession."""

    pass


class StudySessionEnd(BaseModel):
    """Schema for ending a study session."""

    pass


class StudySessionUpdate(BaseModel):
    """Schema for updating study session metrics during session."""

    flashcards_reviewed: int | None = Field(None, ge=0, description="Flashcards reviewed")
    flashcards_correct: int | None = Field(None, ge=0, description="Flashcards answered correctly")
    questions_answered: int | None = Field(None, ge=0, description="Questions answered")
    questions_correct: int | None = Field(None, ge=0, description="Questions answered correctly")


class StudySessionResponse(StudySessionBase):
    """Schema for StudySession response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Session UUID")
    user_id: UUID = Field(..., description="User UUID")
    started_at: datetime = Field(..., description="Session start time")
    ended_at: datetime | None = Field(None, description="Session end time")
    duration_seconds: int | None = Field(None, description="Session duration in seconds")
    flashcards_reviewed: int = Field(default=0, description="Total flashcards reviewed")
    flashcards_correct: int = Field(default=0, description="Flashcards answered correctly")
    questions_answered: int = Field(default=0, description="Total questions answered")
    questions_correct: int = Field(default=0, description="Questions answered correctly")
    created_at: datetime = Field(..., description="Record creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class StudySessionSummary(BaseModel):
    """Summary of a study session for listing."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="Session UUID")
    session_type: SessionType = Field(..., description="Type of session")
    started_at: datetime = Field(..., description="Session start time")
    ended_at: datetime | None = Field(None, description="Session end time")
    duration_seconds: int | None = Field(None, description="Session duration")
    flashcards_reviewed: int = Field(default=0, description="Flashcards reviewed")
    questions_answered: int = Field(default=0, description="Questions answered")
