"""Domain model for PMP 2026 ECO domains."""

from typing import TYPE_CHECKING

from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.task import Task


class Domain(Base):
    """
    Represents a PMP 2026 ECO Domain.

    The PMP exam has 3 domains:
    - People (33% weight)
    - Process (41% weight)
    - Business Environment (26% weight)
    """

    __tablename__ = "domains"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    weight: Mapped[float] = mapped_column(Float, nullable=False)
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    # Relationships
    tasks: Mapped[list["Task"]] = relationship(
        "Task", back_populates="domain", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Domain(id={self.id}, name='{self.name}', weight={self.weight})>"
