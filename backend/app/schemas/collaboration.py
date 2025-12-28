"""Pydantic schemas for Collaboration models (StudyGroup, Discussion, Challenge)."""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    pass


# Study Group Schemas


class StudyGroupBase(BaseModel):
    """Base schema for StudyGroup with shared attributes."""

    name: str = Field(..., min_length=1, max_length=100, description="Study group name")
    description: str | None = Field(None, description="Group description/purpose")


class StudyGroupCreate(StudyGroupBase):
    """Schema for creating a new StudyGroup."""

    pass


class StudyGroupResponse(StudyGroupBase):
    """Schema for StudyGroup response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Study group ID")
    invite_code: str = Field(..., description="Unique 8-character invite code")
    created_by_id: UUID = Field(..., description="UUID of group creator")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class StudyGroupListResponse(BaseModel):
    """Schema for listing study groups with member count."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Study group ID")
    name: str = Field(..., description="Study group name")
    description: str | None = Field(None, description="Group description")
    invite_code: str = Field(..., description="Unique invite code")
    member_count: int = Field(..., description="Number of members in group")
    created_at: datetime = Field(..., description="Creation timestamp")


class JoinGroupRequest(BaseModel):
    """Schema for joining a study group via invite code."""

    invite_code: str = Field(..., min_length=1, description="Invite code for the group")


class JoinGroupResponse(BaseModel):
    """Schema for response after joining a group."""

    message: str = Field(..., description="Success message")
    group_id: int = Field(..., description="ID of the joined group")
    group_name: str = Field(..., description="Name of the joined group")


# Study Group Member Schemas


class GroupMemberResponse(BaseModel):
    """Schema for study group member information."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID = Field(..., description="User UUID")
    display_name: str | None = Field(None, description="User's display name")
    role: str = Field(..., description="Member role (admin, moderator, member)")
    joined_at: datetime = Field(..., description="When the user joined the group")


# Discussion Schemas


class DiscussionBase(BaseModel):
    """Base schema for Discussion with shared attributes."""

    title: str = Field(..., min_length=1, max_length=200, description="Discussion title")
    content: str = Field(..., min_length=1, description="Discussion content")


class DiscussionCreate(DiscussionBase):
    """Schema for creating a new Discussion."""

    pass


class DiscussionResponse(DiscussionBase):
    """Schema for Discussion response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Discussion ID")
    group_id: int = Field(..., description="Study group ID")
    user_id: UUID = Field(..., description="UUID of discussion author")
    author_name: str | None = Field(None, description="Display name of author")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


# Challenge Schemas


class ChallengeBase(BaseModel):
    """Base schema for Challenge with shared attributes."""

    name: str = Field(..., min_length=1, max_length=100, description="Challenge name")
    description: str | None = Field(None, description="Challenge description")
    start_date: datetime = Field(..., description="Challenge start date/time")
    end_date: datetime = Field(..., description="Challenge end date/time")


class ChallengeCreate(ChallengeBase):
    """Schema for creating a new Challenge."""

    pass


class ChallengeResponse(ChallengeBase):
    """Schema for Challenge response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Challenge ID")
    group_id: int = Field(..., description="Study group ID")
    created_by_id: UUID = Field(..., description="UUID of challenge creator")
    created_by_name: str | None = Field(None, description="Display name of creator")
    created_at: datetime = Field(..., description="Creation timestamp")


# Leaderboard Schemas


class LeaderboardEntry(BaseModel):
    """Schema for a single entry in the group leaderboard."""

    model_config = ConfigDict(from_attributes=True)

    rank: int = Field(..., description="Leaderboard rank (1-based)")
    user_id: UUID = Field(..., description="User UUID")
    display_name: str | None = Field(None, description="User's display name")
    role: str = Field(..., description="Member role in the group")
    exam_score: float = Field(..., description="Best exam score percentage (0-100)")
    study_streak: int = Field(..., description="Current study streak in days")
    mastery: int = Field(..., description="Number of mastered flashcards")
    study_time_minutes: int = Field(..., description="Total study time in minutes")


class LeaderboardResponse(BaseModel):
    """Schema for group leaderboard response."""

    model_config = ConfigDict(from_attributes=True)

    group_id: int = Field(..., description="Study group ID")
    group_name: str = Field(..., description="Study group name")
    sorted_by: str = Field(
        ...,
        description="Sort field used (exam_score, study_streak, mastery, or study_time)",
    )
    entries: list[LeaderboardEntry] = Field(..., description="Leaderboard entries sorted by rank")
    current_user_rank: int | None = Field(
        None,
        description="Current user's rank in the leaderboard (null if user is not a member)",
    )
