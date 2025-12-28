"""API routes for domains and tasks."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models.domain import Domain
from app.models.task import Task
from app.schemas.domain import DomainResponse, DomainWithTasksResponse
from app.schemas.task import TaskResponse

router = APIRouter(prefix="/api/domains", tags=["domains"])


@router.get("", response_model=list[DomainWithTasksResponse])
def get_domains(db: Session = Depends(get_db)) -> list[Domain]:
    """
    Get all domains with their tasks.

    Returns a list of all PMP 2026 ECO domains, each including
    their associated tasks ordered by display order.
    """
    stmt = (
        select(Domain)
        .options(selectinload(Domain.tasks))
        .order_by(Domain.order)
    )
    domains = db.execute(stmt).scalars().all()

    # Sort tasks within each domain by order
    for domain in domains:
        domain.tasks = sorted(domain.tasks, key=lambda t: t.order)

    return list(domains)


@router.get("/{domain_id}", response_model=DomainWithTasksResponse)
def get_domain(domain_id: int, db: Session = Depends(get_db)) -> Domain:
    """
    Get a specific domain by ID with its tasks.

    Args:
        domain_id: The ID of the domain to retrieve

    Returns:
        The domain with its associated tasks

    Raises:
        HTTPException: 404 if domain not found
    """
    stmt = (
        select(Domain)
        .options(selectinload(Domain.tasks))
        .where(Domain.id == domain_id)
    )
    domain = db.execute(stmt).scalar_one_or_none()

    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Domain with id {domain_id} not found",
        )

    # Sort tasks by order
    domain.tasks = sorted(domain.tasks, key=lambda t: t.order)

    return domain


@router.get("/{domain_id}/tasks", response_model=list[TaskResponse])
def get_domain_tasks(domain_id: int, db: Session = Depends(get_db)) -> list[Task]:
    """
    Get all tasks for a specific domain.

    Args:
        domain_id: The ID of the domain whose tasks to retrieve

    Returns:
        List of tasks belonging to the domain, ordered by display order

    Raises:
        HTTPException: 404 if domain not found
    """
    # First verify the domain exists
    domain = db.get(Domain, domain_id)
    if not domain:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Domain with id {domain_id} not found",
        )

    stmt = (
        select(Task)
        .where(Task.domain_id == domain_id)
        .order_by(Task.order)
    )
    tasks = db.execute(stmt).scalars().all()

    return list(tasks)
