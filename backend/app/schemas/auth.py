"""Pydantic schemas for authentication endpoints."""

from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class AnonymousAuthRequest(BaseModel):
    """Request schema for creating/authenticating an anonymous user."""

    anonymous_id: str = Field(
        ...,
        min_length=36,
        max_length=36,
        description="Browser-generated UUID for anonymous user",
        examples=["550e8400-e29b-41d4-a716-446655440000"],
    )


class RegisterRequest(BaseModel):
    """Request schema for registering an anonymous user with email and password."""

    anonymous_id: str = Field(
        ...,
        min_length=36,
        max_length=36,
        description="Existing anonymous user ID to upgrade",
    )
    email: EmailStr = Field(..., description="Email address for registration")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (min 8 characters)",
    )
    display_name: str | None = Field(
        None,
        max_length=100,
        description="Optional display name",
    )


class LoginRequest(BaseModel):
    """Request schema for logging in with email and password."""

    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., description="Account password")


class TokenResponse(BaseModel):
    """Response schema containing JWT access token."""

    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class AuthResponse(BaseModel):
    """Response schema for authentication endpoints."""

    model_config = ConfigDict(from_attributes=True)

    user_id: UUID = Field(..., description="User UUID")
    anonymous_id: str = Field(..., description="Browser anonymous ID")
    email: EmailStr | None = Field(None, description="Registered email if any")
    display_name: str | None = Field(None, description="Display name")
    is_registered: bool = Field(..., description="Whether user has registered with email")
    access_token: str = Field(..., description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
