"""Flashcard model for PMP 2026 study flashcards."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.concept import ConceptTag
    from app.models.task import Task


class Flashcard(Base):
    """
    Represents a study flashcard linked to a PMP 2026 ECO Task.

    Flashcards have a front (question/prompt) and back (answer/explanation).
    Progress is tracked separately in FlashcardProgress for SM-2 spaced repetition.
    """

    __tablename__ = "flashcards"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False
    )
    front: Mapped[str] = mapped_column(Text, nullable=False)
    back: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships
    task: Mapped["Task"] = relationship("Task", back_populates="flashcards")
    concepts: Mapped[list["ConceptTag"]] = relationship(
        "ConceptTag",
        secondary="flashcard_concepts",
        back_populates="flashcards",
    )

    def __repr__(self) -> str:
        return f"<Flashcard(id={self.id}, front='{self.front[:30]}...', task_id={self.task_id})>"
