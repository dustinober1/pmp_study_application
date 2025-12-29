"""
Concept Graph Builder Service for PMP 2026 Study App.

Builds and manages the knowledge graph of PMP concepts and their relationships.
Provides graph data for visualization in the ConceptGraphExplorer component.
"""

import json
import uuid
from collections import defaultdict
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    ConceptRelationship,
    ConceptTag,
    Domain,
    Flashcard,
    FlashcardProgress,
    Question,
    QuestionProgress,
    Task,
)


class ConceptGraphBuilder:
    """
    Service for building and querying the PMP concept knowledge graph.

    The knowledge graph represents relationships between PMP concepts
    for visual exploration and learning path recommendations.
    """

    # Relationship type definitions with descriptions
    RELATIONSHIP_TYPES = {
        "prerequisite": "Must be understood before",
        "related": "Related concept",
        "part_of": "Is a component of",
        "enables": "Helps achieve",
        "contradicts": "Conflicts with",
    }

    # Concept categories for organization
    CONCEPT_CATEGORIES = [
        "Process",
        "Technique",
        "Tool",
        "Knowledge Area",
        "Document",
        "Role",
        "Methodology",
    ]

    def __init__(self, db: Session) -> None:
        """Initialize the graph builder with a database session."""
        self.db = db

    def get_full_graph(
        self,
        user_id: uuid.UUID | None = None,
        domain_filter: str | None = None,
        min_strength: float = 0.3,
    ) -> dict[str, Any]:
        """
        Build the full concept knowledge graph.

        Args:
            db: Database session
            user_id: Optional user ID for progress-based highlighting
            domain_filter: Optional domain filter ("People", "Process", "Business Environment")
            min_strength: Minimum relationship strength to include

        Returns:
            Dictionary with nodes (concepts) and links (relationships)
        """
        # Get all concepts
        query = select(ConceptTag)
        if domain_filter:
            query = query.where(ConceptTag.domain_focus == domain_filter)

        concepts = self.db.execute(query).scalars().all()

        # Build nodes list
        nodes = []
        concept_mastery = {} if user_id else None

        if user_id:
            concept_mastery = self._calculate_concept_mastery(user_id)

        for concept in concepts:
            # Count related content
            flashcard_count = len(concept.flashcards)
            question_count = len(concept.questions)

            # Get mastery level if user provided
            mastery_level = concept_mastery.get(concept.id, 0.0) if concept_mastery else 0.0

            nodes.append({
                "id": concept.id,
                "name": concept.name,
                "description": concept.description,
                "category": concept.category,
                "domain": concept.domain_focus,
                "flashcard_count": flashcard_count,
                "question_count": question_count,
                "mastery_level": mastery_level,
                "group": self._get_category_group(concept.category),
            })

        # Get relationships
        relationships = self.db.execute(
            select(ConceptRelationship).where(
                ConceptRelationship.strength >= min_strength
            )
        ).scalars().all()

        # Build links list
        links = []
        for rel in relationships:
            # Apply domain filter if specified
            if domain_filter:
                source = next((n for n in nodes if n["id"] == rel.source_concept_id), None)
                target = next((n for n in nodes if n["id"] == rel.target_concept_id), None)
                if not source or not target:
                    continue

            links.append({
                "source": rel.source_concept_id,
                "target": rel.target_concept_id,
                "type": rel.relationship_type,
                "strength": rel.strength,
                "description": rel.description,
            })

        return {
            "nodes": nodes,
            "links": links,
            "relationship_types": self.RELATIONSHIP_TYPES,
            "categories": self.CONCEPT_CATEGORIES,
        }

    def get_subgraph(
        self,
        center_concept_id: int,
        max_depth: int = 2,
        user_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """
        Build a subgraph centered on a specific concept.

        Args:
            db: Database session
            center_concept_id: ID of the center concept
            max_depth: Maximum depth of relationships to include
            user_id: Optional user ID for mastery highlighting

        Returns:
            Dictionary with nodes and links for the subgraph
        """
        # Get center concept
        center = self.db.execute(
            select(ConceptTag).where(ConceptTag.id == center_concept_id)
        ).scalar_one_or_none()

        if not center:
            return {"nodes": [], "links": [], "error": "Concept not found"}

        # Build adjacency list for breadth-first traversal
        adj = self._build_adjacency_list()

        # BFS to find all concepts within max_depth
        visited = set()
        queue = [(center_concept_id, 0)]
        concept_ids = set()

        while queue:
            current_id, depth = queue.pop(0)

            if current_id in visited or depth > max_depth:
                continue

            visited.add(current_id)
            concept_ids.add(current_id)

            # Add neighbors
            for neighbor_id, rel_data in adj.get(current_id, []):
                if neighbor_id not in visited:
                    queue.append((neighbor_id, depth + 1))

        # Get all concepts in the subgraph
        concepts = self.db.execute(
            select(ConceptTag).where(ConceptTag.id.in_(concept_ids))
        ).scalars().all()

        # Build nodes
        concept_mastery = {}
        if user_id:
            concept_mastery = self._calculate_concept_mastery(user_id)

        nodes = []
        for concept in concepts:
            mastery_level = concept_mastery.get(concept.id, 0.0) if concept_mastery else 0.0
            is_center = concept.id == center_concept_id

            nodes.append({
                "id": concept.id,
                "name": concept.name,
                "description": concept.description,
                "category": concept.category,
                "domain": concept.domain_focus,
                "flashcard_count": len(concept.flashcards),
                "question_count": len(concept.questions),
                "mastery_level": mastery_level,
                "is_center": is_center,
                "depth": self._calculate_depth(concept.id, center_concept_id, adj, max_depth),
                "group": self._get_category_group(concept.category),
            })

        # Build links for concepts in the subgraph
        links = []
        for source_id in concept_ids:
            for target_id, rel in adj.get(source_id, []):
                if target_id in concept_ids:
                    links.append({
                        "source": source_id,
                        "target": target_id,
                        "type": rel["type"],
                        "strength": rel["strength"],
                        "description": rel.get("description"),
                    })

        return {
            "nodes": nodes,
            "links": links,
            "center_concept": {
                "id": center.id,
                "name": center.name,
                "description": center.description,
            },
            "relationship_types": self.RELATIONSHIP_TYPES,
        }

    def get_concept_details(
        self,
        concept_id: int,
        user_id: uuid.UUID | None = None,
    ) -> dict[str, Any]:
        """
        Get detailed information about a concept.

        Args:
            db: Database session
            concept_id: ID of the concept
            user_id: Optional user ID for progress data

        Returns:
            Dictionary with concept details
        """
        concept = self.db.execute(
            select(ConceptTag).where(ConceptTag.id == concept_id)
        ).scalar_one_or_none()

        if not concept:
            return {"error": "Concept not found"}

        # Get related concepts
        outgoing = self.db.execute(
            select(ConceptRelationship).where(
                ConceptRelationship.source_concept_id == concept_id
            )
        ).scalars().all()

        incoming = self.db.execute(
            select(ConceptRelationship).where(
                ConceptRelationship.target_concept_id == concept_id
            )
        ).scalars().all()

        # Get related flashcards and questions
        flashcards = concept.flashcards[:5]  # Limit to 5 for preview
        questions = concept.questions[:5]

        # Calculate mastery if user provided
        mastery = None
        if user_id:
            mastery = self._calculate_single_concept_mastery(concept_id, user_id)

        return {
            "id": concept.id,
            "name": concept.name,
            "description": concept.description,
            "category": concept.category,
            "domain_focus": concept.domain_focus,
            "created_at": concept.created_at.isoformat(),
            "flashcard_count": len(concept.flashcards),
            "question_count": len(concept.questions),
            "mastery": mastery,
            "outgoing_relationships": [
                {
                    "target_id": r.target_concept_id,
                    "target_name": r.target_concept.name if r.target_concept else None,
                    "type": r.relationship_type,
                    "strength": r.strength,
                    "description": r.description,
                }
                for r in outgoing
            ],
            "incoming_relationships": [
                {
                    "source_id": r.source_concept_id,
                    "source_name": r.source_concept.name if r.source_concept else None,
                    "type": r.relationship_type,
                    "strength": r.strength,
                    "description": r.description,
                }
                for r in incoming
            ],
            "related_flashcards": [
                {
                    "id": f.id,
                    "front": f.front,
                    "back": f.back,
                    "task_id": f.task_id,
                }
                for f in flashcards
            ],
            "related_questions": [
                {
                    "id": q.id,
                    "question_text": q.question_text[:100] + "..."
                    if len(q.question_text) > 100
                    else q.question_text,
                    "task_id": q.task_id,
                }
                for q in questions
            ],
        }

    def get_learning_path(
        self,
        start_concept_id: int,
        end_concept_id: int,
    ) -> dict[str, Any]:
        """
        Find a learning path between two concepts.

        Uses BFS to find shortest path through prerequisite relationships.

        Args:
            db: Database session
            start_concept_id: Starting concept ID
            end_concept_id: Target concept ID

        Returns:
            Dictionary with path information
        """
        # Build adjacency list for prerequisite relationships
        adj = defaultdict(list)
        relationships = self.db.execute(
            select(ConceptRelationship).where(
                ConceptRelationship.relationship_type == "prerequisite"
            )
        ).scalars().all()

        for rel in relationships:
            # Add bidirectional edges for pathfinding
            adj[rel.source_concept_id].append((rel.target_concept_id, rel))
            adj[rel.target_concept_id].append((rel.source_concept_id, rel))

        # BFS to find path
        from collections import deque

        queue = deque([(start_concept_id, [])])
        visited = set()

        while queue:
            current_id, path = queue.popleft()

            if current_id == end_concept_id:
                # Found target - build full path
                full_path = path + [current_id]

                # Get concept names
                concept_ids = full_path
                concepts = self.db.execute(
                    select(ConceptTag).where(ConceptTag.id.in_(concept_ids))
                ).scalars().all()

                concept_map = {c.id: c.name for c in concepts}

                return {
                    "path": [
                        {"concept_id": cid, "concept_name": concept_map.get(cid, f"Concept {cid}")}
                        for cid in full_path
                    ],
                    "length": len(full_path) - 1,
                }

            if current_id in visited:
                continue

            visited.add(current_id)

            for neighbor_id, rel in adj.get(current_id, []):
                if neighbor_id not in visited:
                    queue.append((neighbor_id, path + [current_id]))

        return {"error": "No path found between concepts"}

    def get_concepts_by_domain(self, domain: str) -> list[dict[str, Any]]:
        """
        Get all concepts for a specific domain.

        Args:
            db: Database session
            domain: Domain name ("People", "Process", "Business Environment")

        Returns:
            List of concepts in the domain
        """
        concepts = self.db.execute(
            select(ConceptTag).where(ConceptTag.domain_focus == domain)
        ).scalars().all()

        return [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "category": c.category,
                "flashcard_count": len(c.flashcards),
                "question_count": len(c.questions),
            }
            for c in concepts
        ]

    def get_concepts_by_category(self, category: str) -> list[dict[str, Any]]:
        """
        Get all concepts for a specific category.

        Args:
            db: Database session
            category: Category name ("Process", "Technique", "Tool", etc.)

        Returns:
            List of concepts in the category
        """
        concepts = self.db.execute(
            select(ConceptTag).where(ConceptTag.category == category)
        ).scalars().all()

        return [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "domain": c.domain_focus,
                "flashcard_count": len(c.flashcards),
                "question_count": len(c.questions),
            }
            for c in concepts
        ]

    def search_concepts(self, query: str, limit: int = 10) -> list[dict[str, Any]]:
        """
        Search for concepts by name or description.

        Args:
            db: Database session
            query: Search query
            limit: Maximum results

        Returns:
            List of matching concepts
        """
        concepts = self.db.execute(
            select(ConceptTag).where(
                (ConceptTag.name.ilike(f"%{query}%"))
                | (ConceptTag.description.ilike(f"%{query}%"))
            )
            .limit(limit)
        ).scalars().all()

        return [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "category": c.category,
                "domain": c.domain_focus,
            }
            for c in concepts
        ]

    # ========================
    # Private Helper Methods
    # ========================

    def _build_adjacency_list(self) -> dict[int, list[tuple[int, dict[str, Any]]]]:
        """Build adjacency list representation of the graph."""
        adj = defaultdict(list)

        relationships = self.db.execute(select(ConceptRelationship)).scalars().all()

        for rel in relationships:
            adj[rel.source_concept_id].append(
                (rel.target_concept_id, {
                    "type": rel.relationship_type,
                    "strength": rel.strength,
                    "description": rel.description,
                })
            )

        return dict(adj)

    def _calculate_concept_mastery(self, user_id: uuid.UUID) -> dict[int, float]:
        """
        Calculate mastery level for each concept based on user progress.

        Mastery is weighted average of accuracy on related flashcards and questions.

        Returns:
            Dictionary mapping concept_id to mastery level (0.0 to 1.0)
        """
        # Get all flashcard progress for user
        flashcard_progress = self.db.execute(
            select(FlashcardProgress, Flashcard)
            .join(Flashcard, FlashcardProgress.flashcard_id == Flashcard.id)
            .where(FlashcardProgress.user_id == user_id)
        ).all()

        # Get all question progress for user
        question_progress = self.db.execute(
            select(QuestionProgress, Question)
            .join(Question, QuestionProgress.question_id == Question.id)
            .where(QuestionProgress.user_id == user_id)
        ).all()

        # Aggregate progress by concept
        concept_data = defaultdict(lambda: {"correct": 0, "total": 0})

        # Process flashcard progress
        for fp, flashcard in flashcard_progress:
            for concept in flashcard.concepts:
                # Use SM-2 repetition success as proxy
                success_rate = min(1.0, fp.repetitions / 10) if fp.repetitions else 0
                concept_data[concept.id]["correct"] += success_rate
                concept_data[concept.id]["total"] += 1

        # Process question progress
        for qp, question in question_progress:
            for concept in question.concepts:
                if qp.attempt_count > 0:
                    accuracy = qp.correct_count / qp.attempt_count
                    concept_data[concept.id]["correct"] += accuracy
                    concept_data[concept.id]["total"] += 1

        # Calculate mastery levels
        mastery = {}
        for concept_id, data in concept_data.items():
            if data["total"] > 0:
                mastery[concept_id] = min(1.0, data["correct"] / data["total"])

        return mastery

    def _calculate_single_concept_mastery(
        self, concept_id: int, user_id: uuid.UUID
    ) -> dict[str, Any]:
        """Calculate detailed mastery for a single concept."""
        concept = self.db.execute(
            select(ConceptTag).where(ConceptTag.id == concept_id)
        ).scalar_one_or_none()

        if not concept:
            return {"level": 0.0, "flashcard_count": 0, "question_count": 0}

        # Get progress on related flashcards
        flashcard_progress_data = []
        for flashcard in concept.flashcards:
            progress = self.db.execute(
                select(FlashcardProgress).where(
                    (FlashcardProgress.flashcard_id == flashcard.id)
                    & (FlashcardProgress.user_id == user_id)
                )
            ).scalar_one_or_none()

            if progress:
                flashcard_progress_data.append({
                    "flashcard_id": flashcard.id,
                    "repetitions": progress.repetitions,
                    "ease_factor": progress.ease_factor,
                })

        # Get progress on related questions
        question_progress_data = []
        for question in concept.questions:
            progress = self.db.execute(
                select(QuestionProgress).where(
                    (QuestionProgress.question_id == question.id)
                    & (QuestionProgress.user_id == user_id)
                )
            ).scalar_one_or_none()

            if progress:
                question_progress_data.append({
                    "question_id": question.id,
                    "accuracy": progress.correct_count / progress.attempt_count
                    if progress.attempt_count > 0
                    else 0,
                    "attempts": progress.attempt_count,
                })

        # Calculate overall mastery
        total_items = len(concept.flashcards) + len(concept.questions)
        if total_items == 0:
            return {"level": 0.0, "flashcard_count": 0, "question_count": 0}

        # Simple mastery based on items attempted
        mastery = min(
            1.0,
            (len(flashcard_progress_data) + len(question_progress_data))
            / max(1, total_items),
        )

        return {
            "level": mastery,
            "flashcard_count": len(concept.flashcards),
            "question_count": len(concept.questions),
            "flashcards_reviewed": len(flashcard_progress_data),
            "questions_attempted": len(question_progress_data),
        }

    def _calculate_depth(
        self,
        concept_id: int,
        center_id: int,
        adj: dict[int, list],
        max_depth: int,
    ) -> int:
        """Calculate depth of a concept from center using BFS."""
        if concept_id == center_id:
            return 0

        queue = [(center_id, 0)]
        visited = {center_id}

        while queue:
            current, depth = queue.pop(0)

            if current == concept_id:
                return depth

            if depth >= max_depth:
                continue

            for neighbor, _ in adj.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append((neighbor, depth + 1))

        return max_depth

    def _get_category_group(self, category: str | None) -> int:
        """Map category to numeric group for visualization."""
        if not category:
            return 0
        try:
            return self.CONCEPT_CATEGORIES.index(category)
        except ValueError:
            return len(self.CONCEPT_CATEGORIES)
