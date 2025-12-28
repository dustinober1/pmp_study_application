"""
Invite code generation service for study groups.

Provides secure, unique 8-character invite codes with optional expiration.
"""

import secrets
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.models.collaboration import StudyGroup


class InviteCodeGenerationError(Exception):
    """Raised when invite code generation fails after multiple attempts."""

    pass


class InviteCodeExpiredError(Exception):
    """Raised when attempting to use an expired invite code."""

    pass


class InviteCodeNotFoundError(Exception):
    """Raised when an invite code is not found in the database."""

    pass


class InviteService:
    """
    Service for generating and validating invite codes.

    Generates 8-character alphanumeric codes in uppercase,
    ensuring uniqueness across all study groups.
    """

    # Character set for invite codes (excluding confusing characters like O, 0, I, l)
    CHAR_SET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

    # Maximum attempts to generate a unique code
    MAX_GENERATION_ATTEMPTS = 10

    @classmethod
    def generate_code(cls, length: int = 8) -> str:
        """
        Generate a random invite code.

        Args:
            length: Length of the code (default: 8)

        Returns:
            Uppercase alphanumeric string
        """
        return "".join(secrets.choice(cls.CHAR_SET) for _ in range(length))

    @classmethod
    def generate_unique_code(cls, db: Session, max_attempts: int | None = None) -> str:
        """
        Generate a unique invite code that doesn't conflict with existing codes.

        Args:
            db: Database session for checking existing codes
            max_attempts: Maximum attempts to generate a unique code
                         (defaults to MAX_GENERATION_ATTEMPTS)

        Returns:
            Unique 8-character invite code

        Raises:
            InviteCodeGenerationError: If unable to generate a unique code
        """
        if max_attempts is None:
            max_attempts = cls.MAX_GENERATION_ATTEMPTS

        for _ in range(max_attempts):
            code = cls.generate_code()

            # Check if code already exists
            existing = db.query(StudyGroup).filter(
                StudyGroup.invite_code == code
            ).first()

            if existing is None:
                return code

        raise InviteCodeGenerationError(
            f"Failed to generate unique code after {max_attempts} attempts"
        )

    @classmethod
    def generate_code_for_group(cls, db: Session, group: StudyGroup) -> str:
        """
        Generate and assign a unique invite code to a study group.

        Args:
            db: Database session
            group: StudyGroup instance to assign code to

        Returns:
            The generated invite code
        """
        code = cls.generate_unique_code(db)
        group.invite_code = code
        db.add(group)
        db.commit()
        db.refresh(group)
        return code

    @classmethod
    def get_group_by_code(
        cls, db: Session, code: str, check_expiration: bool = False
    ) -> StudyGroup:
        """
        Retrieve a study group by its invite code.

        Args:
            db: Database session
            code: Invite code to look up
            check_expiration: Whether to check if the code/group is expired

        Returns:
            StudyGroup with the matching invite code

        Raises:
            InviteCodeNotFoundError: If code is not found
            InviteCodeExpiredError: If code is expired (when check_expiration=True)
        """
        group = db.query(StudyGroup).filter(
            StudyGroup.invite_code == code.upper()
        ).first()

        if group is None:
            raise InviteCodeNotFoundError(f"Invite code '{code}' not found")

        if check_expiration:
            # Check if group has an expiration and if it has passed
            # This would need an expiration field on the StudyGroup model
            # For now, this is a placeholder for future functionality
            pass

        return group

    @classmethod
    def regenerate_code(cls, db: Session, group: StudyGroup) -> str:
        """
        Generate a new invite code for an existing study group.

        Useful if the old code was compromised or needs to be changed.

        Args:
            db: Database session
            group: StudyGroup to regenerate code for

        Returns:
            New unique invite code
        """
        return cls.generate_code_for_group(db, group)

    @classmethod
    def is_valid_code(cls, db: Session, code: str) -> bool:
        """
        Check if an invite code is valid (exists in the database).

        Args:
            db: Database session
            code: Invite code to validate

        Returns:
            True if code exists, False otherwise
        """
        try:
            cls.get_group_by_code(db, code)
            return True
        except InviteCodeNotFoundError:
            return False
