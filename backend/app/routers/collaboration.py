"""Collaboration API routes for study groups, discussions, and challenges."""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.collaboration import (
    Challenge,
    Discussion,
    GroupRole,
    StudyGroup,
    StudyGroupMember,
)
from app.models.user import User
from app.schemas.collaboration import (
    ChallengeCreate,
    ChallengeResponse,
    DiscussionCreate,
    DiscussionResponse,
    GroupMemberResponse,
    JoinGroupRequest,
    JoinGroupResponse,
    StudyGroupCreate,
    StudyGroupListResponse,
    StudyGroupResponse,
)
from app.services.invite_service import (
    InviteCodeExpiredError,
    InviteCodeNotFoundError,
    InviteService,
)

router = APIRouter(prefix="/api/groups", tags=["collaboration"])


def get_or_create_user(db: Session, anonymous_id: str) -> User:
    """Get existing user by anonymous_id or create a new one."""
    stmt = select(User).where(User.anonymous_id == anonymous_id)
    user = db.execute(stmt).scalar_one_or_none()

    if user is None:
        user = User(anonymous_id=anonymous_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    return user


def get_group_membership(
    db: Session, group_id: int, user_id: str
) -> StudyGroupMember | None:
    """Get a user's membership in a specific group."""
    stmt = select(StudyGroupMember).where(
        StudyGroupMember.group_id == group_id,
        StudyGroupMember.user_id == user_id,
    )
    return db.execute(stmt).scalar_one_or_none()


# Study Group Endpoints


@router.post("", response_model=StudyGroupResponse, status_code=status.HTTP_201_CREATED)
async def create_study_group(
    group_data: StudyGroupCreate,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> StudyGroupResponse:
    """
    Create a new study group.

    The creating user automatically becomes the first admin member.
    A unique invite code is generated for sharing the group.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Create the study group
    group = StudyGroup(
        name=group_data.name,
        description=group_data.description,
        created_by_id=user.id,
    )

    db.add(group)
    db.commit()
    db.refresh(group)

    # Add creator as admin member
    member = StudyGroupMember(
        group_id=group.id,
        user_id=user.id,
        role=GroupRole.ADMIN.value,
    )
    db.add(member)
    db.commit()

    return StudyGroupResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        invite_code=group.invite_code,
        created_by_id=group.created_by_id,
        created_at=group.created_at,
        updated_at=group.updated_at,
    )


@router.get("", response_model=list[StudyGroupListResponse])
async def list_study_groups(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str | None, Header(alias="X-Anonymous-Id")] = None,
    limit: Annotated[int, Query(ge=1, le=100, description="Max results")] = 50,
    offset: Annotated[int, Query(ge=0, description="Offset for pagination")] = 0,
) -> list[StudyGroupListResponse]:
    """
    List study groups with member counts.

    Returns all groups with pagination support.
    If user is authenticated, their memberships are included.
    """
    # Query groups with member counts
    stmt = (
        select(
            StudyGroup.id,
            StudyGroup.name,
            StudyGroup.description,
            StudyGroup.invite_code,
            StudyGroup.created_at,
            func.count(StudyGroupMember.id).label("member_count"),
        )
        .outerjoin(StudyGroupMember, StudyGroup.id == StudyGroupMember.group_id)
        .group_by(StudyGroup.id)
        .order_by(StudyGroup.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    results = db.execute(stmt).all()

    return [
        StudyGroupListResponse(
            id=row.id,
            name=row.name,
            description=row.description,
            invite_code=row.invite_code,
            member_count=row.member_count,
            created_at=row.created_at,
        )
        for row in results
    ]


@router.post("/{group_id}/join", response_model=JoinGroupResponse)
async def join_study_group(
    group_id: int,
    join_data: JoinGroupRequest,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> JoinGroupResponse:
    """
    Join a study group using an invite code.

    The invite code must match the group's code.
    Users can only join a group once.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Verify group exists
    group_stmt = select(StudyGroup).where(StudyGroup.id == group_id)
    group = db.execute(group_stmt).scalar_one_or_none()

    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study group with id {group_id} not found",
        )

    # Verify invite code matches
    if group.invite_code.upper() != join_data.invite_code.upper():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid invite code for this group",
        )

    # Check if already a member
    existing_membership = get_group_membership(db, group_id, str(user.id))
    if existing_membership:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this group",
        )

    # Add as member
    member = StudyGroupMember(
        group_id=group.id,
        user_id=user.id,
        role=GroupRole.MEMBER.value,
    )
    db.add(member)
    db.commit()

    return JoinGroupResponse(
        message="Successfully joined the study group",
        group_id=group.id,
        group_name=group.name,
    )


@router.get("/{group_id}/members", response_model=list[GroupMemberResponse])
async def list_group_members(
    group_id: int,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> list[GroupMemberResponse]:
    """
    List all members of a study group.

    User must be a member of the group to view members.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Verify group exists
    group_stmt = select(StudyGroup).where(StudyGroup.id == group_id)
    group = db.execute(group_stmt).scalar_one_or_none()

    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study group with id {group_id} not found",
        )

    # Verify user is a member
    membership = get_group_membership(db, group_id, str(user.id))
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this group to view members",
        )

    # Get all members with user info
    stmt = (
        select(StudyGroupMember, User)
        .join(User, StudyGroupMember.user_id == User.id)
        .where(StudyGroupMember.group_id == group_id)
        .order_by(StudyGroupMember.joined_at)
    )

    results = db.execute(stmt).all()

    return [
        GroupMemberResponse(
            user_id=member.user_id,
            display_name=user.display_name,
            role=member.role,
            joined_at=member.joined_at,
        )
        for member, user in results
    ]


# Discussion Endpoints


@router.post(
    "/{group_id}/discussions",
    response_model=DiscussionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_discussion(
    group_id: int,
    discussion_data: DiscussionCreate,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> DiscussionResponse:
    """
    Create a new discussion thread in a study group.

    User must be a member of the group to create discussions.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Verify group exists
    group_stmt = select(StudyGroup).where(StudyGroup.id == group_id)
    group = db.execute(group_stmt).scalar_one_or_none()

    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study group with id {group_id} not found",
        )

    # Verify user is a member
    membership = get_group_membership(db, group_id, str(user.id))
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this group to create discussions",
        )

    # Create discussion
    discussion = Discussion(
        group_id=group.id,
        user_id=user.id,
        title=discussion_data.title,
        content=discussion_data.content,
    )

    db.add(discussion)
    db.commit()
    db.refresh(discussion)

    return DiscussionResponse(
        id=discussion.id,
        group_id=discussion.group_id,
        user_id=discussion.user_id,
        author_name=user.display_name,
        title=discussion.title,
        content=discussion.content,
        created_at=discussion.created_at,
        updated_at=discussion.updated_at,
    )


@router.get("/{group_id}/discussions", response_model=list[DiscussionResponse])
async def list_discussions(
    group_id: int,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    limit: Annotated[int, Query(ge=1, le=100, description="Max results")] = 50,
    offset: Annotated[int, Query(ge=0, description="Offset for pagination")] = 0,
) -> list[DiscussionResponse]:
    """
    List all discussions in a study group.

    User must be a member of the group to view discussions.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Verify group exists
    group_stmt = select(StudyGroup).where(StudyGroup.id == group_id)
    group = db.execute(group_stmt).scalar_one_or_none()

    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study group with id {group_id} not found",
        )

    # Verify user is a member
    membership = get_group_membership(db, group_id, str(user.id))
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this group to view discussions",
        )

    # Get discussions with author info
    stmt = (
        select(Discussion, User)
        .join(User, Discussion.user_id == User.id)
        .where(Discussion.group_id == group_id)
        .order_by(Discussion.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    results = db.execute(stmt).all()

    return [
        DiscussionResponse(
            id=discussion.id,
            group_id=discussion.group_id,
            user_id=discussion.user_id,
            author_name=user.display_name,
            title=discussion.title,
            content=discussion.content,
            created_at=discussion.created_at,
            updated_at=discussion.updated_at,
        )
        for discussion, user in results
    ]


# Challenge Endpoints


@router.post(
    "/{group_id}/challenges",
    response_model=ChallengeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_challenge(
    group_id: int,
    challenge_data: ChallengeCreate,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> ChallengeResponse:
    """
    Create a new challenge in a study group.

    User must be a member of the group to create challenges.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Verify group exists
    group_stmt = select(StudyGroup).where(StudyGroup.id == group_id)
    group = db.execute(group_stmt).scalar_one_or_none()

    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study group with id {group_id} not found",
        )

    # Verify user is a member
    membership = get_group_membership(db, group_id, str(user.id))
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this group to create challenges",
        )

    # Validate dates
    if challenge_data.end_date <= challenge_data.start_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="End date must be after start date",
        )

    # Create challenge
    challenge = Challenge(
        group_id=group.id,
        created_by_id=user.id,
        name=challenge_data.name,
        description=challenge_data.description,
        start_date=challenge_data.start_date,
        end_date=challenge_data.end_date,
    )

    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return ChallengeResponse(
        id=challenge.id,
        group_id=challenge.group_id,
        created_by_id=challenge.created_by_id,
        created_by_name=user.display_name,
        name=challenge.name,
        description=challenge.description,
        start_date=challenge.start_date,
        end_date=challenge.end_date,
        created_at=challenge.created_at,
    )


@router.get("/{group_id}/challenges", response_model=list[ChallengeResponse])
async def list_challenges(
    group_id: int,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    limit: Annotated[int, Query(ge=1, le=100, description="Max results")] = 50,
    offset: Annotated[int, Query(ge=0, description="Offset for pagination")] = 0,
) -> list[ChallengeResponse]:
    """
    List all challenges in a study group.

    User must be a member of the group to view challenges.
    """
    user = get_or_create_user(db, x_anonymous_id)

    # Verify group exists
    group_stmt = select(StudyGroup).where(StudyGroup.id == group_id)
    group = db.execute(group_stmt).scalar_one_or_none()

    if group is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Study group with id {group_id} not found",
        )

    # Verify user is a member
    membership = get_group_membership(db, group_id, str(user.id))
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a member of this group to view challenges",
        )

    # Get challenges with creator info
    stmt = (
        select(Challenge, User)
        .join(User, Challenge.created_by_id == User.id)
        .where(Challenge.group_id == group_id)
        .order_by(Challenge.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    results = db.execute(stmt).all()

    return [
        ChallengeResponse(
            id=challenge.id,
            group_id=challenge.group_id,
            created_by_id=challenge.created_by_id,
            created_by_name=user.display_name,
            name=challenge.name,
            description=challenge.description,
            start_date=challenge.start_date,
            end_date=challenge.end_date,
            created_at=challenge.created_at,
        )
        for challenge, user in results
    ]
