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
from app.models.exam import ExamReport, ExamSession
from app.models.progress import FlashcardProgress, QuestionProgress
from app.models.session import StudySession
from app.models.user import User
from app.schemas.collaboration import (
    ChallengeCreate,
    ChallengeResponse,
    DiscussionCreate,
    DiscussionResponse,
    GroupMemberResponse,
    JoinGroupRequest,
    JoinGroupResponse,
    LeaderboardEntry,
    LeaderboardResponse,
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


@router.get("/my-groups", response_model=list[StudyGroupListResponse])
async def list_my_groups(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> list[StudyGroupListResponse]:
    """
    List study groups the current user is a member of.

    Returns groups the user has joined, with member counts.
    Used for fetching user's groups for challenge notifications.
    """
    from datetime import datetime

    user = get_or_create_user(db, x_anonymous_id)

    # Query groups where user is a member, with member counts
    stmt = (
        select(
            StudyGroup.id,
            StudyGroup.name,
            StudyGroup.description,
            StudyGroup.invite_code,
            StudyGroup.created_at,
            func.count(StudyGroupMember.id).label("member_count"),
        )
        .join(StudyGroupMember, StudyGroup.id == StudyGroupMember.group_id)
        .where(StudyGroupMember.user_id == user.id)
        .group_by(StudyGroup.id)
        .order_by(StudyGroup.created_at.desc())
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


@router.get("/challenge-notifications")
async def get_challenge_notifications(
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
) -> dict[str, int]:
    """
    Get challenge notification counts for the current user.

    Returns counts of active challenges, new challenges this week,
    and expiring challenges across all user's groups.
    Used for displaying notification badges in the UI.
    """
    from datetime import datetime, timedelta

    user = get_or_create_user(db, x_anonymous_id)

    # Get user's group IDs
    group_ids_stmt = (
        select(StudyGroupMember.group_id)
        .where(StudyGroupMember.user_id == user.id)
    )
    group_ids_result = db.execute(group_ids_stmt).scalars().all()

    if not group_ids_result:
        return {
            "active_count": 0,
            "new_this_week": 0,
            "expiring_soon": 0,
        }

    group_ids = list(group_ids_result)

    now = datetime.utcnow()
    one_week_ago = now - timedelta(days=7)
    two_days_from_now = now + timedelta(days=2)

    # Count active challenges
    active_count_stmt = (
        select(func.count(Challenge.id))
        .where(Challenge.group_id.in_(group_ids))
        .where(Challenge.start_date <= now)
        .where(Challenge.end_date >= now)
    )
    active_count = db.execute(active_count_stmt).scalar() or 0

    # Count new challenges this week
    new_this_week_stmt = (
        select(func.count(Challenge.id))
        .where(Challenge.group_id.in_(group_ids))
        .where(Challenge.created_at >= one_week_ago)
    )
    new_this_week = db.execute(new_this_week_stmt).scalar() or 0

    # Count challenges expiring soon (within 2 days)
    expiring_soon_stmt = (
        select(func.count(Challenge.id))
        .where(Challenge.group_id.in_(group_ids))
        .where(Challenge.end_date >= now)
        .where(Challenge.end_date <= two_days_from_now)
    )
    expiring_soon = db.execute(expiring_soon_stmt).scalar() or 0

    return {
        "active_count": active_count,
        "new_this_week": new_this_week,
        "expiring_soon": expiring_soon,
    }


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


# Leaderboard Endpoints


def calculate_study_streak(db: Session, user_id: str) -> int:
    """Calculate current study streak in consecutive days."""
    from datetime import date, timedelta

    sessions = db.execute(
        select(StudySession.started_at)
        .where(StudySession.user_id == user_id)
        .order_by(StudySession.started_at.desc())
    ).scalars().all()

    if not sessions:
        return 0

    # Get unique study dates
    study_dates = {session.date() for session in sessions}

    today = date.today()
    current_streak = 0

    # Check if studying today or yesterday to start streak
    if sessions[0].date() == today:
        current_streak = 1
        check_date = today - timedelta(days=1)
    elif sessions[0].date() == today - timedelta(days=1):
        current_streak = 1
        check_date = today - timedelta(days=1)
    else:
        return 0

    # Count consecutive days backward
    while check_date in study_dates:
        current_streak += 1
        check_date -= timedelta(days=1)

    return current_streak


def get_user_exam_score(db: Session, user_id: str) -> float:
    """Get user's best exam score as percentage."""
    # Get best completed exam score
    best_exam = db.execute(
        select(ExamReport)
        .join(ExamSession, ExamReport.exam_session_id == ExamSession.id)
        .where(ExamSession.user_id == user_id)
        .where(ExamSession.status == "completed")
        .order_by(ExamReport.score_percentage.desc())
        .limit(1)
    ).scalar_one_or_none()

    return best_exam.score_percentage if best_exam else 0.0


def get_user_flashcard_mastery(db: Session, user_id: str) -> int:
    """Count mastered flashcards (ease_factor >= 2.5 and repetitions >= 3)."""
    mastered_count = db.execute(
        select(func.count(FlashcardProgress.id))
        .where(FlashcardProgress.user_id == user_id)
        .where(FlashcardProgress.ease_factor >= 2.5)
        .where(FlashcardProgress.repetitions >= 3)
    ).scalar()

    return mastered_count or 0


def get_user_study_time(db: Session, user_id: str) -> int:
    """Get total study time in minutes."""
    total_seconds = db.execute(
        select(func.coalesce(func.sum(StudySession.duration_seconds), 0))
        .where(StudySession.user_id == user_id)
    ).scalar()

    return (total_seconds or 0) // 60  # Convert to minutes


@router.get("/{group_id}/leaderboard", response_model=LeaderboardResponse)
async def get_group_leaderboard(
    group_id: int,
    db: Annotated[Session, Depends(get_db)],
    x_anonymous_id: Annotated[str, Header(alias="X-Anonymous-Id")],
    sort_by: Annotated[str, Query(description="Sort by: exam_score, study_streak, mastery, or study_time")] = "exam_score",
) -> LeaderboardResponse:
    """
    Get leaderboard for a study group.

    Ranks members by various metrics:
    - exam_score: Best completed exam score percentage
    - study_streak: Current consecutive days of studying
    - mastery: Number of mastered flashcards (ef >= 2.5, reps >= 3)
    - study_time: Total study time in minutes

    User must be a member of the group to view the leaderboard.
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
            detail="You must be a member of this group to view the leaderboard",
        )

    # Validate sort_by parameter
    valid_sort_fields = {"exam_score", "study_streak", "mastery", "study_time"}
    if sort_by not in valid_sort_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid sort_by field. Must be one of: {', '.join(valid_sort_fields)}",
        )

    # Get all members with user info
    stmt = (
        select(StudyGroupMember, User)
        .join(User, StudyGroupMember.user_id == User.id)
        .where(StudyGroupMember.group_id == group_id)
    )

    results = db.execute(stmt).all()

    leaderboard_entries = []
    current_user_rank = None

    for member, user_info in results:
        # Calculate metrics for each member
        exam_score = get_user_exam_score(db, str(user_info.id))
        study_streak = calculate_study_streak(db, str(user_info.id))
        mastery = get_user_flashcard_mastery(db, str(user_info.id))
        study_time = get_user_study_time(db, str(user_info.id))

        entry = LeaderboardEntry(
            rank=0,  # Will be set after sorting
            user_id=user_info.id,
            display_name=user_info.display_name,
            role=member.role,
            exam_score=exam_score,
            study_streak=study_streak,
            mastery=mastery,
            study_time_minutes=study_time,
        )
        leaderboard_entries.append(entry)

    # Sort by specified field (descending)
    if sort_by == "exam_score":
        leaderboard_entries.sort(key=lambda x: x.exam_score, reverse=True)
    elif sort_by == "study_streak":
        leaderboard_entries.sort(key=lambda x: x.study_streak, reverse=True)
    elif sort_by == "mastery":
        leaderboard_entries.sort(key=lambda x: x.mastery, reverse=True)
    elif sort_by == "study_time":
        leaderboard_entries.sort(key=lambda x: x.study_time_minutes, reverse=True)

    # Assign ranks
    for idx, entry in enumerate(leaderboard_entries, start=1):
        entry.rank = idx
        # Track current user's rank
        if entry.user_id == user.id:
            current_user_rank = idx

    return LeaderboardResponse(
        group_id=group.id,
        group_name=group.name,
        sorted_by=sort_by,
        entries=leaderboard_entries,
        current_user_rank=current_user_rank,
    )
