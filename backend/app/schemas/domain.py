"""Pydantic schemas for Domain model."""

from __future__ import annotations

from typing import TYPE_CHECKING

from pydantic import BaseModel, ConfigDict, Field

if TYPE_CHECKING:
    from app.schemas.task import TaskResponse


class DomainBase(BaseModel):
    """Base schema for Domain with shared attributes."""

    name: str = Field(..., min_length=1, max_length=100, description="Domain name")
    description: str | None = Field(None, max_length=500, description="Domain description")
    weight: float = Field(..., ge=0, le=100, description="Domain weight percentage in exam")
    order: int = Field(default=0, ge=0, description="Display order")


class DomainCreate(DomainBase):
    """Schema for creating a new Domain."""

    pass


class DomainUpdate(BaseModel):
    """Schema for updating an existing Domain. All fields optional."""

    name: str | None = Field(None, min_length=1, max_length=100, description="Domain name")
    description: str | None = Field(None, max_length=500, description="Domain description")
    weight: float | None = Field(None, ge=0, le=100, description="Domain weight percentage")
    order: int | None = Field(None, ge=0, description="Display order")


class DomainResponse(DomainBase):
    """Schema for Domain response (read operations)."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Domain ID")


class DomainWithTasksResponse(DomainResponse):
    """Schema for Domain response including nested tasks."""

    tasks: list[TaskResponse] = Field(default_factory=list, description="Tasks in this domain")
