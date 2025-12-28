"""Pydantic schemas for user analytics and learning recommendations."""

from datetime import datetime

from pydantic import BaseModel, Field


class DomainPerformanceMetric(BaseModel):
    """Performance metrics for a single domain."""

    domain_id: int = Field(..., description="Domain ID")
    accuracy: float = Field(..., description="Accuracy rate (0-1)")
    count: int = Field(..., description="Number of questions attempted")
    avg_response_time: float | None = Field(None, description="Average response time in seconds")


class TaskPerformanceMetric(BaseModel):
    """Performance metrics for a single task."""

    task_id: int = Field(..., description="Task ID")
    task_name: str = Field(..., description="Task name")
    domain_id: int = Field(..., description="Parent domain ID")
    accuracy: float = Field(..., description="Accuracy rate (0-1)")
    question_count: int = Field(..., description="Number of questions attempted")
    avg_response_time: float | None = Field(None, description="Average response time in seconds")


class DomainPerformanceSummary(BaseModel):
    """Domain performance summary with classification."""

    domain_id: int = Field(..., description="Domain ID")
    domain_name: str = Field(..., description="Domain name")
    weight: float = Field(..., description="Domain weight in exam (0-1)")
    accuracy: float | None = Field(None, description="Accuracy rate if attempted")
    question_count: int = Field(default=0, description="Number of questions attempted")
    avg_response_time: float | None = Field(None, description="Average response time in seconds")
    classification: str = Field(
        default="neutral",
        description="Classification: 'strong', 'weak', or 'neutral'"
    )


class UserAnalyticsSummary(BaseModel):
    """Summary of user's overall learning analytics."""

    user_id: str = Field(..., description="User UUID")
    total_questions_answered: int = Field(..., description="Total unique questions answered")
    overall_accuracy: float = Field(..., description="Overall accuracy rate (0-1)")
    avg_response_time: float | None = Field(None, description="Average response time in seconds")
    strong_domains: list[DomainPerformanceMetric] | None = Field(
        None, description="Domains with strong performance"
    )
    weak_domains: list[DomainPerformanceMetric] | None = Field(
        None, description="Domains needing improvement"
    )
    last_updated: datetime = Field(..., description="Last analytics calculation time")


class AnalyticsSummaryResponse(BaseModel):
    """Complete analytics summary response for GET /api/analytics/summary."""

    analytics: UserAnalyticsSummary = Field(..., description="User analytics summary")
    domain_performance: list[DomainPerformanceSummary] = Field(
        default_factory=list, description="Performance breakdown by domain"
    )
    task_performance: list[TaskPerformanceMetric] = Field(
        default_factory=list, description="Performance breakdown by task"
    )


class LearningRecommendationItem(BaseModel):
    """A single learning recommendation."""

    id: str = Field(..., description="Recommendation UUID")
    type: str = Field(..., description="Recommendation type")
    priority: int = Field(..., description="Priority (higher = more urgent)")
    reason: str = Field(..., description="Explanation for this recommendation")
    domain_id: int | None = Field(None, description="Target domain ID if applicable")
    task_id: int | None = Field(None, description="Target task ID if applicable")
    created_at: datetime = Field(..., description="When this recommendation was created")


class RecommendationsResponse(BaseModel):
    """Response for GET /api/analytics/recommendations."""

    recommendations: list[LearningRecommendationItem] = Field(
        default_factory=list, description="Personalized study recommendations"
    )


class RecalculateResponse(BaseModel):
    """Response for POST /api/analytics/recalculate."""

    message: str = Field(..., description="Status message")
    analytics_updated: bool = Field(..., description="Whether analytics were updated")
    recommendations_generated: int = Field(..., description="Number of recommendations created")
