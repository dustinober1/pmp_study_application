"""Collaboration models for study groups, discussions, and challenges."""

import secrets
import uuid
from datetime import datetime
from enum import Enum
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class GroupRole(str, Enum):
    """Roles for study group members."""

    ADMIN = "admin"
    MEMBER = "member"
    MODERATOR = "moderator"


class StudyGroup(Base):
    """
    Study group for collaborative PMP exam preparation.

    Groups have unique invite codes for sharing and joining.
    Created by a user who becomes the first admin member.
    """

    __tablename__ = "study_groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Unique 8-character invite code for group joining
    invite_code: Mapped[str] = mapped_column(
        String(8), unique=True, index=True, nullable=False
    )

    # User who created the group
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    created_by: Mapped["User"] = relationship(
        "User",
        foreign_keys=[created_by_id],
        back_populates="created_groups",
    )

    members: Mapped[list["StudyGroupMember"]] = relationship(
        "StudyGroupMember",
        back_populates="group",
        cascade="all, delete-orphan",
    )

    discussions: Mapped[list["Discussion"]] = relationship(
        "Discussion",
        back_populates="group",
        cascade="all, delete-orphan",
    )

    challenges: Mapped[list["Challenge"]] = relationship(
        "Challenge",
        back_populates="group",
        cascade="all, delete-orphan",
    )

    def __init__(self, **kwargs):
        """Generate invite code on creation if not provided."""
        super().__init__(**kwargs)
        if not self.invite_code:
            self.invite_code = secrets.token_urlsafe(6)[:8].upper()

    def __repr__(self) -> str:
        return f"<StudyGroup(id={self.id}, name='{self.name}', invite_code='{self.invite_code}')>"


class StudyGroupMember(Base):
    """
    Junction table for study group membership with roles.

    Tracks which users belong to which groups and their role within the group.
    """

    __tablename__ = "study_group_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("study_groups.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[str] = mapped_column(
        String(20),
        default=GroupRole.MEMBER.value,
        nullable=False,
    )

    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    group: Mapped["StudyGroup"] = relationship(
        "StudyGroup",
        back_populates="members",
    )

    user: Mapped["User"] = relationship(
        "User",
        back_populates="group_memberships",
    )

    def __repr__(self) -> str:
        return f"<StudyGroupMember(group_id={self.group_id}, user_id={self.user_id}, role='{self.role}')>"


class Discussion(Base):
    """
    Discussion thread within a study group.

    Users can create discussion topics for collaborative learning,
    asking questions, and sharing PMP exam insights.
    """

    __tablename__ = "discussions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("study_groups.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)

    content: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    group: Mapped["StudyGroup"] = relationship(
        "StudyGroup",
        back_populates="discussions",
    )

    author: Mapped["User"] = relationship(
        "User",
        back_populates="discussions",
    )

    def __repr__(self) -> str:
        return f"<Discussion(id={self.id}, title='{self.title[:30]}...', group_id={self.group_id})>"


class Challenge(Base):
    """
    Challenge or competition within a study group.

    Challenges can be created to motivate group members with specific goals,
    timeframes, and leaderboards for competitive study.
    """

    __tablename__ = "challenges"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    group_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("study_groups.id", ondelete="CASCADE"),
        nullable=False,
    )

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    start_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    end_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # User who created the challenge
    created_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    # Relationships
    group: Mapped["StudyGroup"] = relationship(
        "StudyGroup",
        back_populates="challenges",
    )

    created_by: Mapped["User"] = relationship(
        "User",
        back_populates="created_challenges",
    )

    def __repr__(self) -> str:
        return f"<Challenge(id={self.id}, name='{self.name}', group_id={self.group_id})>"
