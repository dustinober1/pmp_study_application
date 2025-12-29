"""Pydantic schemas for User model."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.user import Tier


class UserBase(BaseModel):
    """Base schema for User with shared attributes."""

    anonymous_id: str = Field(
        ...,
        min_length=36,
        max_length=36,
        description="Browser-generated UUID for anonymous users",
    )
    email: EmailStr | None = Field(None, description="Optional email for registered users")
    display_name: str | None = Field(
        None, max_length=100, description="Optional display name"
    )
    tier: Tier = Field(Tier.PUBLIC, description="User tier level")


class UserCreate(BaseModel):
    """Schema for creating a new User (anonymous)."""

    anonymous_id: str = Field(
        ...,
        min_length=36,
        max_length=36,
        description="Browser-generated UUID for anonymous users",
    )


class UserRegister(BaseModel):
    """Schema for registering an anonymous user with email."""

    email: EmailStr = Field(..., description="Email address for registration")
    display_name: str | None = Field(
        None, max_length=100, description="Optional display name"
    )


class UserUpdate(BaseModel):
    """Schema for updating user profile. All fields optional."""

    email: EmailStr | None = Field(None, description="Email address")
    display_name: str | None = Field(None, max_length=100, description="Display name")


class UserResponse(BaseModel):
    """Schema for User response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="User UUID")
    anonymous_id: str = Field(..., description="Browser-generated anonymous ID")
    email: EmailStr | None = Field(None, description="Registered email if any")
    display_name: str | None = Field(None, description="Display name")
    tier: Tier = Field(..., description="User tier level")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")


class UserSummary(BaseModel):
    """Minimal user info for embedding in other responses."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID = Field(..., description="User UUID")
    display_name: str | None = Field(None, description="Display name")
