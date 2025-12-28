"""Pydantic schemas for Task model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.schemas.domain import DomainResponse


class TaskBase(BaseModel):
    """Base schema for Task with shared attributes."""

    name: str = Field(..., min_length=1, max_length=200, description="Task name")
    description: str | None = Field(None, description="Detailed task description")
    order: int = Field(default=0, ge=0, description="Display order within domain")


class TaskCreate(TaskBase):
    """Schema for creating a new Task."""

    domain_id: int = Field(..., gt=0, description="ID of parent domain")


class TaskUpdate(BaseModel):
    """Schema for updating an existing Task. All fields optional."""

    name: str | None = Field(None, min_length=1, max_length=200, description="Task name")
    description: str | None = Field(None, description="Detailed task description")
    order: int | None = Field(None, ge=0, description="Display order within domain")
    domain_id: int | None = Field(None, gt=0, description="ID of parent domain")


class TaskResponse(TaskBase):
    """Schema for Task response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Task ID")
    domain_id: int = Field(..., description="ID of parent domain")


class TaskWithDomainResponse(TaskResponse):
    """Schema for Task response including parent domain info."""

    domain: DomainResponse = Field(..., description="Parent domain")
