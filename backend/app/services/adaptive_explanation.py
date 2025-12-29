"""
Adaptive Explanation Engine for PMP Study App.

Provides intelligent explanation selection and generation based on:
- User learning preferences and expertise level
- Historical engagement with different explanation styles
- Content type (question or flashcard)
- Performance patterns

Explanation Styles:
- Simple: Plain language, beginner-friendly explanations
- Technical: PMBOK terminology, formal PM language
- Analogy: Real-world comparisons and metaphors
- Visual: Structured formats, diagrams (in text form)
- Story: Narrative approach with scenarios
"""

import uuid
from datetime import datetime
from enum import Enum
from typing import Any

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models import (
    ExplanationHistory,
    ExplanationStyle,
    ExplanationTemplate,
    User,
    UserLearningPreference,
)


class ExpertiseLevel(str, Enum):
    """User expertise levels for PMP concepts."""

    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class AdaptiveExplanationEngine:
    """
    Adaptive engine for selecting the best explanation style for each user.

    Learns from user engagement to improve explanation selection over time.
    """

    def __init__(self, db: Session) -> None:
        """Initialize the explanation engine with a database session."""
        self.db = db

    def get_explanation(
        self,
        user_id: uuid.UUID,
        content_type: str,
        content_id: int,
        preferred_style: str | None = None,
    ) -> dict[str, Any]:
        """
        Get the best explanation for a user and content.

        Args:
            user_id: User UUID
            content_type: 'question' or 'flashcard'
            content_id: Question or Flashcard ID
            preferred_style: Optional user-specified style override

        Returns:
            Dictionary with explanation data including:
            - explanation: The explanation text
            - style: The style used
            - alternative_styles: List of available alternative styles
            - is_personalized: Whether this was personalized
        """
        # Get or create user learning preferences
        preferences = self._get_or_create_preferences(user_id)

        # Determine the best style
        selected_style = self._select_best_style(
            preferences, preferred_style
        )

        # Get the explanation template
        template = self._get_explanation_template(
            content_type, content_id, selected_style
        )

        # Track this explanation view
        self._track_explanation_view(
            user_id, content_type, content_id, selected_style
        )

        # Get available alternative styles
        alternatives = self._get_available_styles(content_type, content_id)

        return {
            "explanation": template.explanation if template else self._generate_fallback_explanation(
                content_type, content_id, selected_style
            ),
            "style": selected_style,
            "alternative_styles": [
                s for s in alternatives if s != selected_style
            ],
            "is_personalized": preferences.preferred_style is not None,
            "metadata": template.explanation_metadata if template else None,
        }

    def rate_explanation(
        self,
        user_id: uuid.UUID,
        content_type: str,
        content_id: int,
        style: str,
        was_helpful: bool,
        time_spent_seconds: int | None = None,
    ) -> dict[str, Any]:
        """
        Rate an explanation for learning and improvement.

        Args:
            user_id: User UUID
            content_type: 'question' or 'flashcard'
            content_id: Question or Flashcard ID
            style: The explanation style being rated
            was_helpful: Whether the user found it helpful
            time_spent_seconds: How long the user spent reading

        Returns:
            Updated preference summary
        """
        # Find the most recent explanation history entry
        history = self.db.execute(
            select(ExplanationHistory)
            .where(
                ExplanationHistory.user_id == user_id,
                ExplanationHistory.content_type == content_type,
                ExplanationHistory.content_id == content_id,
                ExplanationHistory.style_shown == style,
            )
            .order_by(ExplanationHistory.viewed_at.desc())
        ).scalar_one_or_none()

        if history:
            history.was_helpful = was_helpful
            history.time_spent_seconds = time_spent_seconds
            self.db.commit()

        # Update user preferences based on feedback
        self._update_preferences_from_feedback(
            user_id, style, was_helpful, time_spent_seconds
        )

        return self._get_preference_summary(user_id)

    def record_subsequent_performance(
        self,
        user_id: uuid.UUID,
        content_type: str,
        content_id: int,
        was_correct: bool,
    ) -> None:
        """
        Record subsequent performance after viewing an explanation.

        This helps the engine learn which explanations lead to better outcomes.

        Args:
            user_id: User UUID
            content_type: 'question' or 'flashcard'
            content_id: Question or Flashcard ID
            was_correct: Whether user answered correctly after explanation
        """
        # Find the most recent explanation history entry
        history = self.db.execute(
            select(ExplanationHistory)
            .where(
                ExplanationHistory.user_id == user_id,
                ExplanationHistory.content_type == content_type,
                ExplanationHistory.content_id == content_id,
            )
            .order_by(ExplanationHistory.viewed_at.desc())
        ).scalar_one_or_none()

        if history:
            history.subsequent_performance_correct = was_correct
            self.db.commit()

            # Update style effectiveness based on performance
            self._update_style_effectiveness(
                user_id, history.style_shown, was_correct
            )

    def get_user_preferences(self, user_id: uuid.UUID) -> dict[str, Any]:
        """
        Get user learning preferences and style effectiveness.

        Args:
            user_id: User UUID

        Returns:
            Dictionary with user preferences
        """
        return self._get_preference_summary(user_id)

    def update_user_preferences(
        self,
        user_id: uuid.UUID,
        preferred_style: str | None = None,
        expertise_level: str | None = None,
        preferred_modalities: list[str] | None = None,
        prefers_detailed: bool | None = None,
    ) -> dict[str, Any]:
        """
        Update user learning preferences.

        Args:
            user_id: User UUID
            preferred_style: User's preferred explanation style
            expertise_level: User's expertise level
            preferred_modalities: List of preferred learning modalities
            prefers_detailed: Whether user prefers detailed explanations

        Returns:
            Updated preferences
        """
        preferences = self._get_or_create_preferences(user_id)

        if preferred_style is not None:
            preferences.preferred_style = preferred_style

        if expertise_level is not None:
            preferences.expertise_level = expertise_level

        if preferred_modalities is not None:
            preferences.preferred_modalities = preferred_modalities

        if prefers_detailed is not None:
            preferences.prefers_detailed = prefers_detailed

        self.db.commit()
        self.db.refresh(preferences)

        return self._get_preference_summary(user_id)

    # ========================
    # Private Methods
    # ========================

    def _get_or_create_preferences(
        self, user_id: uuid.UUID
    ) -> UserLearningPreference:
        """Get existing preferences or create default ones."""
        preferences = self.db.execute(
            select(UserLearningPreference).where(
                UserLearningPreference.user_id == user_id
            )
        ).scalar_one_or_none()

        if not preferences:
            preferences = UserLearningPreference(
                user_id=user_id,
                expertise_level=ExpertiseLevel.BEGINNER,
                style_effectiveness={
                    ExplanationStyle.SIMPLE: 0.7,
                    ExplanationStyle.TECHNICAL: 0.5,
                    ExplanationStyle.ANALOGY: 0.6,
                    ExplanationStyle.VISUAL: 0.6,
                    ExplanationStyle.STORY: 0.5,
                },
                preferred_modalities=["text"],
                prefers_detailed=True,
            )
            self.db.add(preferences)
            self.db.commit()
            self.db.refresh(preferences)

        return preferences

    def _select_best_style(
        self,
        preferences: UserLearningPreference,
        override_style: str | None = None,
    ) -> str:
        """Select the best explanation style for the user."""
        if override_style:
            return override_style

        if preferences.preferred_style:
            return preferences.preferred_style

        # Select based on expertise level
        if preferences.expertise_level == ExpertiseLevel.BEGINNER:
            return ExplanationStyle.SIMPLE
        elif preferences.expertise_level == ExpertiseLevel.ADVANCED:
            return ExplanationStyle.TECHNICAL
        else:
            return ExplanationStyle.ANALOGY

    def _get_explanation_template(
        self,
        content_type: str,
        content_id: int,
        style: str,
    ) -> ExplanationTemplate | None:
        """Get an explanation template for the content and style."""
        template = self.db.execute(
            select(ExplanationTemplate).where(
                ExplanationTemplate.content_type == content_type,
                ExplanationTemplate.content_id == content_id,
                ExplanationTemplate.style == style,
            )
        ).scalar_one_or_none()

        return template

    def _get_available_styles(
        self,
        content_type: str,
        content_id: int,
    ) -> list[str]:
        """Get all available explanation styles for this content."""
        templates = self.db.execute(
            select(ExplanationTemplate.style)
            .where(
                ExplanationTemplate.content_type == content_type,
                ExplanationTemplate.content_id == content_id,
            )
            .distinct()
        ).scalars().all()

        return list(templates)

    def _track_explanation_view(
        self,
        user_id: uuid.UUID,
        content_type: str,
        content_id: int,
        style: str,
    ) -> None:
        """Track that a user viewed an explanation."""
        history = ExplanationHistory(
            user_id=user_id,
            content_type=content_type,
            content_id=content_id,
            style_shown=style,
        )
        self.db.add(history)
        self.db.commit()

    def _update_preferences_from_feedback(
        self,
        user_id: uuid.UUID,
        style: str,
        was_helpful: bool,
        time_spent_seconds: int | None,
    ) -> None:
        """Update user preferences based on feedback."""
        preferences = self._get_or_create_preferences(user_id)

        # Initialize style effectiveness if not present
        if not preferences.style_effectiveness:
            preferences.style_effectiveness = {}

        # Update effectiveness score for this style
        current_score = preferences.style_effectiveness.get(style, 0.5)

        if was_helpful:
            # Positive feedback increases score
            new_score = min(1.0, current_score + 0.1)
        else:
            # Negative feedback decreases score
            new_score = max(0.0, current_score - 0.1)

        preferences.style_effectiveness[style] = new_score

        # Optionally update preferred style if this one is clearly best
        if new_score > 0.8:
            preferences.preferred_style = style

        self.db.commit()

    def _update_style_effectiveness(
        self,
        user_id: uuid.UUID,
        style: str,
        was_correct: bool,
    ) -> None:
        """Update style effectiveness based on subsequent performance."""
        preferences = self._get_or_create_preferences(user_id)

        if not preferences.style_effectiveness:
            preferences.style_effectiveness = {}

        current_score = preferences.style_effectiveness.get(style, 0.5)

        # Correct answer after viewing increases effectiveness
        if was_correct:
            new_score = min(1.0, current_score + 0.05)
        else:
            new_score = max(0.0, current_score - 0.03)

        preferences.style_effectiveness[style] = new_score
        self.db.commit()

    def _get_preference_summary(
        self, user_id: uuid.UUID
    ) -> dict[str, Any]:
        """Get a summary of user preferences."""
        preferences = self._get_or_create_preferences(user_id)

        return {
            "user_id": str(user_id),
            "preferred_style": preferences.preferred_style,
            "expertise_level": preferences.expertise_level,
            "style_effectiveness": preferences.style_effectiveness or {},
            "preferred_modalities": preferences.preferred_modalities or [],
            "prefers_detailed": preferences.prefers_detailed,
        }

    def _generate_fallback_explanation(
        self,
        content_type: str,
        content_id: int,
        style: str,
    ) -> str:
        """
        Generate a fallback explanation when no template exists.

        This is a simple placeholder that would be replaced by
        an AI generation service in production.
        """
        style_descriptions = {
            ExplanationStyle.SIMPLE: "explained in simple terms",
            ExplanationStyle.TECHNICAL: "explained with PMBOK terminology",
            ExplanationStyle.ANALOGY: "explained with real-world comparisons",
            ExplanationStyle.VISUAL: "explained with structured formatting",
            ExplanationStyle.STORY: "explained through a narrative scenario",
        }

        base = f"This concept is {style_descriptions.get(style, 'explained')}. "

        if style == ExplanationStyle.SIMPLE:
            base += "Think of this as a straightforward concept that builds practical project management skills. "
        elif style == ExplanationStyle.TECHNICAL:
            base += "This aligns with PMBOK Guide standards and formal project management methodology. "
        elif style == ExplanationStyle.ANALOGY:
            base += "Consider how this relates to everyday planning and coordination activities. "
        elif style == ExplanationStyle.VISUAL:
            base += "Key points:\n• Core concept\n• Application\n• Best practices\n"
        elif style == ExplanationStyle.STORY:
            base += "Imagine a project manager facing this situation in a real project scenario. "

        return base


# ========================
# Helper Functions
# ========================

def get_explanation_for_content(
    db: Session,
    user_id: uuid.UUID,
    content_type: str,
    content_id: int,
    preferred_style: str | None = None,
) -> dict[str, Any]:
    """
    Convenience function to get an explanation.

    Args:
        db: Database session
        user_id: User UUID
        content_type: 'question' or 'flashcard'
        content_id: Content ID
        preferred_style: Optional preferred style

    Returns:
        Explanation dictionary
    """
    engine = AdaptiveExplanationEngine(db)
    return engine.get_explanation(user_id, content_type, content_id, preferred_style)


def get_user_style_analytics(
    db: Session, user_id: uuid.UUID
) -> dict[str, Any]:
    """
    Get analytics about which explanation styles work best for a user.

    Args:
        db: Database session
        user_id: User UUID

    Returns:
        Style analytics summary
    """
    preferences = db.execute(
        select(UserLearningPreference).where(
            UserLearningPreference.user_id == user_id
        )
    ).scalar_one_or_none()

    if not preferences:
        return {
            "user_id": str(user_id),
            "total_explanations_viewed": 0,
            "style_breakdown": {},
            "most_helpful_style": None,
        }

    # Get explanation history for this user
    history = db.execute(
        select(ExplanationHistory)
        .where(ExplanationHistory.user_id == user_id)
        .order_by(ExplanationHistory.viewed_at.desc())
    ).scalars().all()

    style_counts: dict[str, int] = {}
    style_helpful: dict[str, int] = {}

    for h in history:
        style = h.style_shown
        style_counts[style] = style_counts.get(style, 0) + 1
        if h.was_helpful:
            style_helpful[style] = style_helpful.get(style, 0) + 1

    # Calculate helpfulness rates
    style_breakdown = {}
    most_helpful_style = None
    highest_rate = 0

    for style, count in style_counts.items():
        helpful_count = style_helpful.get(style, 0)
        rate = helpful_count / count if count > 0 else 0
        style_breakdown[style] = {
            "total_views": count,
            "helpful_count": helpful_count,
            "helpfulness_rate": round(rate, 2),
        }

        if rate > highest_rate and count >= 3:  # Minimum 3 views
            highest_rate = rate
            most_helpful_style = style

    return {
        "user_id": str(user_id),
        "total_explanations_viewed": len(history),
        "style_breakdown": style_breakdown,
        "most_helpful_style": most_helpful_style,
        "current_preferred_style": preferences.preferred_style,
    }
