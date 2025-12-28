"""Models package - exports all SQLAlchemy models."""

from app.models.analytics import LearningRecommendation, UserAnalytics
from app.models.collaboration import (
    Challenge,
    Discussion,
    GroupRole,
    StudyGroup,
    StudyGroupMember,
)
from app.models.domain import Domain
from app.models.exam import ExamAnswer, ExamReport, ExamSession, ExamStatus
from app.models.flashcard import Flashcard
from app.models.progress import FlashcardProgress, QuestionProgress
from app.models.question import Question
from app.models.session import SessionType, StudySession
from app.models.task import Task
from app.models.user import User

__all__ = [
    "Domain",
    "Task",
    "Flashcard",
    "Question",
    "User",
    "FlashcardProgress",
    "QuestionProgress",
    "StudySession",
    "SessionType",
    "StudyGroup",
    "StudyGroupMember",
    "Discussion",
    "Challenge",
    "GroupRole",
    "ExamSession",
    "ExamAnswer",
    "ExamReport",
    "ExamStatus",
    "UserAnalytics",
    "LearningRecommendation",
]
