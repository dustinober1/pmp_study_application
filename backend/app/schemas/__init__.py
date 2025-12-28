"""Pydantic schemas for API request/response models."""

from app.schemas.domain import (
    DomainBase,
    DomainCreate,
    DomainResponse,
    DomainUpdate,
    DomainWithTasksResponse,
)
from app.schemas.flashcard import (
    FlashcardBase,
    FlashcardCreate,
    FlashcardProgressResponse,
    FlashcardResponse,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
    FlashcardUpdate,
    FlashcardWithProgressResponse,
    FlashcardWithTaskResponse,
)
from app.schemas.progress import (
    DomainProgressSummary,
    FlashcardsDueResponse,
    OverallProgressSummary,
    ProgressSummaryResponse,
    StudyStreakResponse,
)
from app.schemas.question import (
    AnswerChoice,
    DifficultyLevel,
    QuestionAnswerRequest,
    QuestionAnswerResponse,
    QuestionBase,
    QuestionCreate,
    QuestionProgressResponse,
    QuestionResponse,
    QuestionUpdate,
    QuestionWithProgressResponse,
    QuestionWithTaskResponse,
)
from app.schemas.session import (
    SessionType,
    StudySessionBase,
    StudySessionCreate,
    StudySessionEnd,
    StudySessionResponse,
    StudySessionSummary,
    StudySessionUpdate,
)
from app.schemas.task import (
    TaskBase,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
    TaskWithDomainResponse,
)
from app.schemas.user import (
    UserBase,
    UserCreate,
    UserRegister,
    UserResponse,
    UserSummary,
    UserUpdate,
)
from app.schemas.auth import (
    AnonymousAuthRequest,
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
)

__all__ = [
    # Domain schemas
    "DomainBase",
    "DomainCreate",
    "DomainUpdate",
    "DomainResponse",
    "DomainWithTasksResponse",
    # Task schemas
    "TaskBase",
    "TaskCreate",
    "TaskUpdate",
    "TaskResponse",
    "TaskWithDomainResponse",
    # User schemas
    "UserBase",
    "UserCreate",
    "UserRegister",
    "UserUpdate",
    "UserResponse",
    "UserSummary",
    # Flashcard schemas
    "FlashcardBase",
    "FlashcardCreate",
    "FlashcardUpdate",
    "FlashcardResponse",
    "FlashcardWithTaskResponse",
    "FlashcardReviewRequest",
    "FlashcardReviewResponse",
    "FlashcardProgressResponse",
    "FlashcardWithProgressResponse",
    # Question schemas
    "DifficultyLevel",
    "AnswerChoice",
    "QuestionBase",
    "QuestionCreate",
    "QuestionUpdate",
    "QuestionResponse",
    "QuestionWithTaskResponse",
    "QuestionAnswerRequest",
    "QuestionAnswerResponse",
    "QuestionProgressResponse",
    "QuestionWithProgressResponse",
    # Session schemas
    "SessionType",
    "StudySessionBase",
    "StudySessionCreate",
    "StudySessionEnd",
    "StudySessionUpdate",
    "StudySessionResponse",
    "StudySessionSummary",
    # Progress schemas
    "DomainProgressSummary",
    "OverallProgressSummary",
    "ProgressSummaryResponse",
    "FlashcardsDueResponse",
    "StudyStreakResponse",
    # Auth schemas
    "AnonymousAuthRequest",
    "AuthResponse",
    "LoginRequest",
    "RegisterRequest",
    "TokenResponse",
]
