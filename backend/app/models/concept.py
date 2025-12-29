"""Concept models for PMP 2026 knowledge graph.

Concepts represent key PMP topics that can be tagged on flashcards and questions.
Relationships between concepts create a knowledge graph for visual exploration.
"""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, func, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.flashcard import Flashcard
    from app.models.question import Question


class ConceptTag(Base):
    """
    Represents a key PMP concept/topic in the knowledge graph.

    Concepts are fundamental ideas, processes, or techniques in project management.
    They can be linked to flashcards and questions for knowledge mapping.
    """

    __tablename__ = "concept_tags"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # e.g., "Process", "Technique", "Knowledge Area", "Tool"
    domain_focus: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )  # Primary domain: "People", "Process", "Business Environment"
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relationships - many to many with flashcards and questions
    flashcards: Mapped[list["Flashcard"]] = relationship(
        "Flashcard",
        secondary="flashcard_concepts",
        back_populates="concepts",
    )
    questions: Mapped[list["Question"]] = relationship(
        "Question",
        secondary="question_concepts",
        back_populates="concepts",
    )

    # Relationships - outgoing and incoming concept relationships
    outgoing_relationships: Mapped[list["ConceptRelationship"]] = relationship(
        "ConceptRelationship",
        foreign_keys="ConceptRelationship.source_concept_id",
        back_populates="source_concept",
        cascade="all, delete-orphan",
    )
    incoming_relationships: Mapped[list["ConceptRelationship"]] = relationship(
        "ConceptRelationship",
        foreign_keys="ConceptRelationship.target_concept_id",
        back_populates="target_concept",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<ConceptTag(id={self.id}, name='{self.name}', category='{self.category}')>"


class ConceptRelationship(Base):
    """
    Represents a relationship between two concepts in the knowledge graph.

    Relationships define how concepts connect:
    - "prerequisite": Source must be understood before target
    - "related": Concepts are associated
    - "part_of": Source is a component of target
    - "enables": Source helps achieve target
    - "contradicts": Concepts conflict
    """

    __tablename__ = "concept_relationships"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_concept_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("concept_tags.id", ondelete="CASCADE"), nullable=False
    )
    target_concept_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("concept_tags.id", ondelete="CASCADE"), nullable=False
    )
    relationship_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # prerequisite, related, part_of, enables, contradicts
    strength: Mapped[float] = mapped_column(
        Integer, nullable=False, default=1.0
    )  # 0.0 to 1.0, indicates connection strength
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    source_concept: Mapped["ConceptTag"] = relationship(
        "ConceptTag",
        foreign_keys=[source_concept_id],
        back_populates="outgoing_relationships",
    )
    target_concept: Mapped["ConceptTag"] = relationship(
        "ConceptTag",
        foreign_keys=[target_concept_id],
        back_populates="incoming_relationships",
    )

    # Ensure no duplicate relationships in same direction
    __table_args__ = (
        UniqueConstraint(
            "source_concept_id",
            "target_concept_id",
            "relationship_type",
            name="uq_concept_relationship",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ConceptRelationship(id={self.id}, "
            f"source={self.source_concept_id}, target={self.target_concept_id}, "
            f"type='{self.relationship_type}')>"
        )


# Junction tables for many-to-many relationships

class FlashcardConcept(Base):
    """Junction table linking Flashcards to ConceptTags."""

    __tablename__ = "flashcard_concepts"

    flashcard_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("flashcards.id", ondelete="CASCADE"), primary_key=True
    )
    concept_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("concept_tags.id", ondelete="CASCADE"), primary_key=True
    )

    def __repr__(self) -> str:
        return f"<FlashcardConcept(flashcard_id={self.flashcard_id}, concept_id={self.concept_id})>"


class QuestionConcept(Base):
    """Junction table linking Questions to ConceptTags."""

    __tablename__ = "question_concepts"

    question_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("questions.id", ondelete="CASCADE"), primary_key=True
    )
    concept_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("concept_tags.id", ondelete="CASCADE"), primary_key=True
    )

    def __repr__(self) -> str:
        return f"<QuestionConcept(question_id={self.question_id}, concept_id={self.concept_id})>"
