/**
 * Analytics API client
 *
 * Provides functions for interacting with the analytics endpoints:
 * - GET /api/analytics/summary - Get user analytics summary
 * - GET /api/analytics/recommendations - Get personalized study recommendations
 * - POST /api/analytics/recalculate - Force recalculation of analytics
 */

import { fetcher, post } from './client';

// ============ Types ============

/** Domain performance classification */
export type DomainClassification = 'strong' | 'weak' | 'neutral';

/** Performance metrics for a single domain */
export interface DomainPerformanceMetric {
  domain_id: number;
  accuracy: number;
  count: number;
  avg_response_time: number | null;
}

/** Performance metrics for a single task */
export interface TaskPerformanceMetric {
  task_id: number;
  task_name: string;
  domain_id: number;
  accuracy: number;
  question_count: number;
  avg_response_time: number | null;
}

/** Domain performance summary with classification */
export interface DomainPerformanceSummary {
  domain_id: number;
  domain_name: string;
  weight: number;
  accuracy: number | null;
  question_count: number;
  avg_response_time: number | null;
  classification: DomainClassification;
}

/** User's overall learning analytics summary */
export interface UserAnalyticsSummary {
  user_id: string;
  total_questions_answered: number;
  overall_accuracy: number;
  avg_response_time: number | null;
  strong_domains: DomainPerformanceMetric[] | null;
  weak_domains: DomainPerformanceMetric[] | null;
  last_updated: string;
}

/** Complete analytics summary response */
export interface AnalyticsSummaryResponse {
  analytics: UserAnalyticsSummary;
  domain_performance: DomainPerformanceSummary[];
  task_performance: TaskPerformanceMetric[];
}

/** A single learning recommendation */
export interface LearningRecommendationItem {
  id: string;
  type: string;
  priority: number;
  reason: string;
  domain_id: number | null;
  task_id: number | null;
  created_at: string;
}

/** Response for recommendations endpoint */
export interface RecommendationsResponse {
  recommendations: LearningRecommendationItem[];
}

/** Response for recalculate endpoint */
export interface RecalculateResponse {
  message: string;
  analytics_updated: boolean;
  recommendations_generated: number;
}

// ============ API Functions ============

/**
 * Get user's learning analytics summary.
 *
 * Returns overall performance metrics including:
 * - Overall accuracy and response time
 * - Strong and weak domain identification
 * - Per-domain and per-task performance breakdown
 */
export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  return fetcher<AnalyticsSummaryResponse>('/api/analytics/summary');
}

/**
 * Get personalized study recommendations.
 *
 * Returns recommendations for improving weak areas and reinforcing
 * strong domains based on user's performance analytics.
 */
export async function getRecommendations(): Promise<RecommendationsResponse> {
  return fetcher<RecommendationsResponse>('/api/analytics/recommendations');
}

/**
 * Force recalculation of user analytics and regenerate recommendations.
 *
 * This triggers a full recalculation of:
 * - Overall and per-domain accuracy metrics
 * - Response time statistics
 * - Strong/weak domain identification
 * - Personalized study recommendations
 *
 * Use this to refresh analytics after significant study activity.
 */
export async function recalculateAnalytics(): Promise<RecalculateResponse> {
  return post<never, RecalculateResponse>('/api/analytics/recalculate', {});
}
