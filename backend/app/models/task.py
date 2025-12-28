"""Task model for PMP 2026 ECO tasks."""

from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.domain import Domain
    from app.models.flashcard import Flashcard
    from app.models.question import Question


class Task(Base):
    """
    Represents a PMP 2026 ECO Task within a Domain.

    Each domain contains multiple tasks (26 total across all domains).
    Tasks are the building blocks for organizing flashcards and questions.
    """

    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    domain_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("domains.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    domain: Mapped["Domain"] = relationship("Domain", back_populates="tasks")
    flashcards: Mapped[list["Flashcard"]] = relationship(
        "Flashcard", back_populates="task", cascade="all, delete-orphan"
    )
    questions: Mapped[list["Question"]] = relationship(
        "Question", back_populates="task", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Task(id={self.id}, name='{self.name[:30]}...', domain_id={self.domain_id})>"
