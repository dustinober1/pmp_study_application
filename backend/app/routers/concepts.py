"""Concept Graph API routes for PMP 2026 knowledge graph explorer."""

from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.auth import decode_access_token
from app.database import get_db
from app.models.user import User
from app.services.concept_graph_builder import ConceptGraphBuilder

router = APIRouter(prefix="/api/concepts", tags=["concepts"])


async def get_optional_user(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> User | None:
    """
    Get authenticated user from JWT token if provided.

    Returns None if no token or invalid token - concepts are viewable by all,
    but user progress data enhances the graph with mastery levels.
    """
    if not authorization:
        return None

    try:
        # Extract Bearer token
        scheme, _, token = authorization.partition(" ")
        if scheme.lower() != "bearer":
            return None

        # Decode token
        payload = decode_access_token(token)
        if not payload:
            return None

        user_id = payload.get("sub")
        if not user_id:
            return None

        # Get user from database
        user = db.execute(
            select(User).where(User.id == UUID(user_id))
        ).scalar_one_or_none()

        return user

    except Exception:
        return None


@router.get("")
def list_concepts(
    domain: str | None = Query(None, description="Filter by domain (People, Process, Business Environment)"),
    category: str | None = Query(None, description="Filter by category (Process, Technique, Tool, etc.)"),
    search: str | None = Query(None, description="Search by name or description"),
    db: Session = Depends(get_db),
) -> dict:
    """
    List all concepts with optional filtering.

    Returns a list of PMP concepts with metadata about related content.
    """
    from app.models import ConceptTag
    from sqlalchemy import select

    query = select(ConceptTag)

    if domain:
        query = query.where(ConceptTag.domain_focus == domain)
    if category:
        query = query.where(ConceptTag.category == category)
    if search:
        query = query.where(
            (ConceptTag.name.ilike(f"%{search}%"))
            | (ConceptTag.description.ilike(f"%{search}%"))
        )

    concepts = db.execute(query.order_by(ConceptTag.name)).scalars().all()

    return {
        "concepts": [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "category": c.category,
                "domain": c.domain_focus,
                "flashcard_count": len(c.flashcards),
                "question_count": len(c.questions),
            }
            for c in concepts
        ],
        "count": len(concepts),
    }


@router.get("/graph")
def get_graph(
    domain: str | None = Query(None, description="Filter by domain"),
    min_strength: float = Query(0.3, ge=0.0, le=1.0, description="Minimum relationship strength"),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get the full concept knowledge graph.

    Returns nodes (concepts) and links (relationships) for visualization.
    Includes user mastery levels if authenticated.
    """
    builder = ConceptGraphBuilder(db)
    user_id = user.id if user else None

    graph = builder.get_full_graph(
        user_id=user_id,
        domain_filter=domain,
        min_strength=min_strength,
    )

    return graph


@router.get("/categories")
def get_categories(db: Session = Depends(get_db)) -> dict:
    """
    Get all concept categories.

    Returns list of unique categories for filtering.
    """
    from app.models import ConceptTag
    from sqlalchemy import func, select

    categories = db.execute(
        select(ConceptTag.category, func.count(ConceptTag.id))
        .group_by(ConceptTag.category)
        .order_by(ConceptTag.category)
    ).all()

    return {
        "categories": [
            {"name": cat, "concept_count": count}
            for cat, count in categories
            if cat  # Filter out None
        ]
    }


@router.get("/domains")
def get_concept_domains(db: Session = Depends(get_db)) -> dict:
    """
    Get all domains that have concepts.

    Returns list of domains with concept counts.
    """
    from app.models import ConceptTag
    from sqlalchemy import func, select

    domains = db.execute(
        select(ConceptTag.domain_focus, func.count(ConceptTag.id))
        .group_by(ConceptTag.domain_focus)
        .order_by(ConceptTag.domain_focus)
    ).all()

    return {
        "domains": [
            {"name": domain, "concept_count": count}
            for domain, count in domains
            if domain  # Filter out None
        ]
    }


@router.get("/{concept_id}")
def get_concept_details(
    concept_id: int,
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get detailed information about a specific concept.

    Includes related concepts, flashcards, questions, and user mastery data.
    """
    builder = ConceptGraphBuilder(db)
    user_id = user.id if user else None

    details = builder.get_concept_details(concept_id, user_id)

    if "error" in details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=details["error"],
        )

    return details


@router.get("/{concept_id}/subgraph")
def get_concept_subgraph(
    concept_id: int,
    max_depth: int = Query(2, ge=1, le=3, description="Max depth of relationships"),
    user: User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get a subgraph centered on a specific concept.

    Returns nodes and links within the specified depth from the center concept.
    Useful for exploring related concepts in the knowledge graph.
    """
    builder = ConceptGraphBuilder(db)
    user_id = user.id if user else None

    subgraph = builder.get_subgraph(
        center_concept_id=concept_id,
        max_depth=max_depth,
        user_id=user_id,
    )

    if "error" in subgraph:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=subgraph["error"],
        )

    return subgraph


@router.get("/{concept_id}/path")
def get_learning_path(
    concept_id: int,
    target_concept_id: int = Query(..., description="Target concept ID"),
    db: Session = Depends(get_db),
) -> dict:
    """
    Find a learning path between two concepts.

    Uses prerequisite relationships to find the shortest learning path.
    """
    builder = ConceptGraphBuilder(db)

    path = builder.get_learning_path(
        start_concept_id=concept_id,
        end_concept_id=target_concept_id,
    )

    if "error" in path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=path["error"],
        )

    return path


@router.get("/{concept_id}/flashcards")
def get_concept_flashcards(
    concept_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get flashcards tagged with this concept.

    Returns flashcards for studying the specific concept.
    """
    from app.models import ConceptTag, Flashcard, Task, Domain
    from sqlalchemy import select

    concept = db.execute(
        select(ConceptTag).where(ConceptTag.id == concept_id)
    ).scalar_one_or_none()

    if not concept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept with id {concept_id} not found",
        )

    # Get flashcards with task and domain info
    flashcards_query = (
        select(Flashcard, Task, Domain)
        .join(Task, Flashcard.task_id == Task.id)
        .join(Domain, Task.domain_id == Domain.id)
        .where(Flashcard.id.in_([f.id for f in concept.flashcards]))
        .offset(offset)
        .limit(limit)
    )

    results = db.execute(flashcards_query).all()

    return {
        "concept_id": concept_id,
        "concept_name": concept.name,
        "flashcards": [
            {
                "id": f.id,
                "front": f.front,
                "back": f.back,
                "task_id": task.id,
                "task_name": task.name,
                "domain_id": domain.id,
                "domain_name": domain.name,
            }
            for f, task, domain in results
        ],
        "total_count": len(concept.flashcards),
        "limit": limit,
        "offset": offset,
    }


@router.get("/{concept_id}/questions")
def get_concept_questions(
    concept_id: int,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
) -> dict:
    """
    Get practice questions tagged with this concept.

    Returns questions for testing knowledge of the specific concept.
    """
    from app.models import ConceptTag, Question, Task, Domain
    from sqlalchemy import select

    concept = db.execute(
        select(ConceptTag).where(ConceptTag.id == concept_id)
    ).scalar_one_or_none()

    if not concept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Concept with id {concept_id} not found",
        )

    # Get questions with task and domain info
    questions_query = (
        select(Question, Task, Domain)
        .join(Task, Question.task_id == Task.id)
        .join(Domain, Task.domain_id == Domain.id)
        .where(Question.id.in_([q.id for q in concept.questions]))
        .offset(offset)
        .limit(limit)
    )

    results = db.execute(questions_query).all()

    return {
        "concept_id": concept_id,
        "concept_name": concept.name,
        "questions": [
            {
                "id": q.id,
                "question_text": q.question_text,
                "option_a": q.option_a,
                "option_b": q.option_b,
                "option_c": q.option_c,
                "option_d": q.option_d,
                "difficulty": q.difficulty,
                "task_id": task.id,
                "task_name": task.name,
                "domain_id": domain.id,
                "domain_name": domain.name,
            }
            for q, task, domain in results
        ],
        "total_count": len(concept.questions),
        "limit": limit,
        "offset": offset,
    }


@router.get("/search/{query}")
def search_concepts(
    query: str,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
) -> dict:
    """
    Search for concepts by name or description.

    Returns concepts matching the search query.
    """
    builder = ConceptGraphBuilder(db)

    results = builder.search_concepts(query, limit)

    return {
        "query": query,
        "results": results,
        "count": len(results),
    }
