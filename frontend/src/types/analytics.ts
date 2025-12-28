/**
 * TypeScript type definitions for Analytics features
 * Matches backend Pydantic schemas for UserAnalytics and LearningRecommendation
 */

// ============ Analytics Types ============

/**
 * UserAnalytics - Tracks user performance metrics
 * Stored per-user and updated regularly based on study activity
 */
export interface UserAnalytics {
  id: string; // UUID
  user_id: string; // UUID reference to user
  total_questions_answered: number;
  overall_accuracy: number; // 0.0 to 1.0
  avg_response_time: number; // in seconds
  strong_domains: number[]; // Array of domain IDs where user performs well
  weak_domains: number[]; // Array of domain IDs where user needs improvement
  last_updated: string; // ISO datetime
  created_at: string;
  updated_at: string;
}

/**
 * LearningRecommendation - Personalized learning suggestions
 * Generated based on user analytics and performance patterns
 */
export interface LearningRecommendation {
  id: string; // UUID
  user_id: string; // UUID reference to user
  domain_id: number | null; // null for general recommendations
  task_id: number | null; // null for domain-level recommendations
  recommendation_type: RecommendationType;
  priority: RecommendationPriority;
  reason: string; // Human-readable explanation
  created_at: string;
  updated_at: string;
}

/**
 * Types of learning recommendations
 */
export type RecommendationType =
  | 'focus_area' // Suggest spending more time on specific domain/task
  | 'review_weak' // Recommend reviewing previously learned material
  | 'practice_more' // Suggest additional practice questions
  | 'try_difficult' // Challenge with harder questions
  | 'mixed_practice' // Recommend mixed domain practice
  | 'spaced_review' // SM-2 based review reminder
  | 'break_suggested' // Suggest taking a study break
  | 'milestone_achieved'; // Celebrate progress milestone

/**
 * Priority levels for recommendations
 */
export type RecommendationPriority = 'low' | 'medium' | 'high' | 'urgent';

/**
 * DomainPerformance - Detailed metrics for a single domain
 * Computed from user's question/flashcard performance
 */
export interface DomainPerformance {
  domain_id: number;
  domain_name: string;
  domain_weight: number; // PMP exam weight (e.g., 33 for People domain)
  total_questions: number;
  attempted_questions: number;
  correct_questions: number;
  accuracy: number; // 0.0 to 1.0
  avg_response_time: number; // in seconds
  trend: PerformanceTrend; // improving, stable, declining
  mastery_level: MasteryLevel;
  last_practiced_at: string | null;
}

/**
 * TaskPerformance - Detailed metrics for a single task
 * Computed from user's question/flashcard performance
 */
export interface TaskPerformance {
  task_id: number;
  task_name: string;
  domain_id: number;
  domain_name: string;
  total_questions: number;
  attempted_questions: number;
  correct_questions: number;
  accuracy: number; // 0.0 to 1.0
  avg_response_time: number; // in seconds
  trend: PerformanceTrend;
  mastery_level: MasteryLevel;
  last_practiced_at: string | null;
}

/**
 * Performance trend over recent sessions
 */
export type PerformanceTrend = 'improving' | 'stable' | 'declining';

/**
 * Mastery level based on accuracy and consistency
 */
export type MasteryLevel =
  | 'not_started' // No attempts yet
  | 'beginning' // < 50% accuracy
  | 'developing' // 50-70% accuracy
  | 'proficient' // 70-85% accuracy
  | 'mastered'; // > 85% accuracy with recent practice

/**
 * AnalyticsSummary - Aggregated view of user performance
 */
export interface AnalyticsSummary {
  user_analytics: UserAnalytics;
  domain_performance: DomainPerformance[];
  task_performance: TaskPerformance[];
  recommendations: LearningRecommendation[];
  study_streak_days: number;
  total_study_time_minutes: number;
}

/**
 * PerformanceMetrics - Time-series data for progress tracking
 */
export interface PerformanceMetrics {
  date: string; // ISO date
  questions_answered: number;
  accuracy: number;
  avg_response_time: number;
  domains_practiced: number[];
}

/**
 * StudySessionAnalytics - Extended session data for analytics
 */
export interface StudySessionAnalytics {
  session_id: string;
  session_type: 'flashcard' | 'practice_test' | 'mixed';
  started_at: string;
  duration_seconds: number;
  questions_answered: number;
  accuracy: number;
  avg_response_time: number;
  domains_practiced: number[];
  tasks_practiced: number[];
}

/**
 * AnalyticsUpdateRequest - Request to trigger analytics recalculation
 */
export interface AnalyticsUpdateRequest {
  force_recalculate?: boolean; // Force full recalculation vs incremental update
}

/**
 * AnalyticsUpdateResponse - Response from analytics update
 */
export interface AnalyticsUpdateResponse {
  message: string;
  analytics_updated: boolean;
  recommendations_generated: number;
  last_updated: string;
}

/**
 * RecommendationResponse - Paginated list of recommendations
 */
export interface RecommendationResponse {
  recommendations: LearningRecommendation[];
  total: number;
  dismissed_count: number;
  active_count: number;
}

/**
 * RecommendationDismissRequest - Dismiss a recommendation
 */
export interface RecommendationDismissRequest {
  recommendation_id: string;
  reason?: string; // Optional reason for dismissal
}

/**
 * PerformanceComparison - Compare user performance to averages
 */
export interface PerformanceComparison {
  user_accuracy: number;
  average_accuracy: number;
  user_response_time: number;
  average_response_time: number;
  percentile_rank: number; // 0-100
  above_average_domains: number[];
  below_average_domains: number[];
}
