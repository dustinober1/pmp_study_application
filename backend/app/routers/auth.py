"""
Authentication API routes for anonymous, register, and login endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_password_hash, verify_password
from app.database import get_db
from app.models.user import User
from app.schemas.auth import (
    AnonymousAuthRequest,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post(
    "/anonymous",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Create or authenticate anonymous user",
    description="Creates a new anonymous user or returns existing user if anonymous_id exists. "
    "Returns JWT token for subsequent authenticated requests.",
)
async def anonymous_auth(
    request: AnonymousAuthRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Create or authenticate an anonymous user.

    If the anonymous_id already exists, return that user.
    Otherwise, create a new anonymous user.
    Returns a JWT token for authentication.
    """
    # Check if user already exists
    user = db.query(User).filter(User.anonymous_id == request.anonymous_id).first()

    if not user:
        # Create new anonymous user
        user = User(anonymous_id=request.anonymous_id)
        db.add(user)
        db.commit()
        db.refresh(user)

    # Generate JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "anonymous_id": user.anonymous_id}
    )

    return AuthResponse(
        user_id=user.id,
        anonymous_id=user.anonymous_id,
        email=user.email,
        display_name=user.display_name,
        is_registered=user.email is not None,
        access_token=access_token,
        token_type="bearer",
    )


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register anonymous user with email and password",
    description="Upgrades an anonymous user to a registered user while preserving all progress. "
    "Requires an existing anonymous_id, email, and password.",
)
async def register(
    request: RegisterRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Register an anonymous user with email and password.

    Upgrades the anonymous user to a registered user while preserving
    all their existing progress (flashcards, questions, sessions).
    """
    # Find the anonymous user
    user = db.query(User).filter(User.anonymous_id == request.anonymous_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Anonymous user not found. Please create an anonymous session first.",
        )

    # Check if user is already registered
    if user.email is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already registered.",
        )

    # Check if email is already in use
    existing_email = db.query(User).filter(User.email == request.email).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email address is already registered.",
        )

    # Update user with registration info
    user.email = request.email
    user.password_hash = get_password_hash(request.password)
    if request.display_name:
        user.display_name = request.display_name

    db.commit()
    db.refresh(user)

    # Generate new JWT token with updated info
    access_token = create_access_token(
        data={"sub": str(user.id), "anonymous_id": user.anonymous_id, "email": user.email}
    )

    return AuthResponse(
        user_id=user.id,
        anonymous_id=user.anonymous_id,
        email=user.email,
        display_name=user.display_name,
        is_registered=True,
        access_token=access_token,
        token_type="bearer",
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    status_code=status.HTTP_200_OK,
    summary="Login with email and password",
    description="Authenticate a registered user with email and password. Returns JWT token.",
)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    """
    Login with email and password.

    Returns JWT token and user info for registered users.
    """
    # Find user by email
    user = db.query(User).filter(User.email == request.email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not user.password_hash or not verify_password(request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate JWT token
    access_token = create_access_token(
        data={"sub": str(user.id), "anonymous_id": user.anonymous_id, "email": user.email}
    )

    return AuthResponse(
        user_id=user.id,
        anonymous_id=user.anonymous_id,
        email=user.email,
        display_name=user.display_name,
        is_registered=True,
        access_token=access_token,
        token_type="bearer",
    )
