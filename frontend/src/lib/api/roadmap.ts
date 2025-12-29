/**
 * Roadmap API client
 *
 * Provides functions for interacting with the study roadmap endpoints:
 * - POST /api/roadmap/create - Create a new study roadmap
 * - GET /api/roadmap/active - Get the user's active roadmap
 * - GET /api/roadmap/:id - Get a specific roadmap
 * - GET /api/roadmap/:id/daily/:date - Get daily study plan
 * - PUT /api/roadmap/:id/milestones/:milestoneId - Update milestone progress
 * - POST /api/roadmap/:id/adapt - Adapt roadmap based on progress
 * - DELETE /api/roadmap/:id - Archive a roadmap
 */

import { del, fetcher, post, put } from './client';

// ============ Types ============

/** Roadmap status */
export type RoadmapStatus = 'active' | 'paused' | 'completed' | 'archived';

/** Milestone status */
export type MilestoneStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';

/** Activity in a daily study plan */
export interface DailyPlanActivity {
  type: string;
  count?: number;
  duration_minutes?: number;
  full?: boolean;
}

/** Daily study plan for a specific day */
export interface DailyPlan {
  type: string;
  hours?: number;
  domain?: string;
  activities?: DailyPlanActivity[];
}

/** A milestone in the study roadmap */
export interface RoadmapMilestone {
  id: number;
  title: string;
  description: string | null;
  week_number: number;
  scheduled_date: string;
  target_date: string;
  domain_ids: number[];
  daily_plan: Record<string, DailyPlan>;
  completion_criteria: Record<string, unknown>;
  status: MilestoneStatus;
  flashcards_completed: number;
  questions_completed: number;
  quiz_score: number | null;
  completed_at: string | null;
}

/** Complete study roadmap */
export interface StudyRoadmap {
  id: number;
  user_id: string;
  exam_date: string;
  weekly_study_hours: number;
  study_days_per_week: number;
  status: RoadmapStatus;
  focus_areas: number[] | null;
  recommendations: Record<string, unknown> | null;
  total_milestones: number;
  completed_milestones: number;
  created_at: string;
  updated_at: string;
  last_adapted_at: string | null;
  milestones: RoadmapMilestone[];
}

/** Request to create a new roadmap */
export interface CreateRoadmapRequest {
  exam_date: string;
  weekly_study_hours: number;
  study_days_per_week: number;
}

/** Request to update milestone progress */
export interface UpdateMilestoneRequest {
  flashcards_completed?: number;
  questions_completed?: number;
  mark_complete?: boolean;
}

/** Response for daily plan endpoint */
export interface DailyPlanResponse {
  date: string;
  plan: DailyPlan | null;
}

/** Response for adapt roadmap endpoint */
export interface AdaptRoadmapResponse {
  message: string;
  roadmap_id: number;
  adapted: boolean;
}

// ============ API Functions ============

/**
 * Create a new personalized study roadmap.
 *
 * Generates a complete study plan with weekly milestones based on:
 * - Target exam date
 * - Available study time
 * - User's current weak domains
 */
export async function createRoadmap(request: CreateRoadmapRequest): Promise<StudyRoadmap> {
  return post<CreateRoadmapRequest, StudyRoadmap>('/api/roadmap/create', request);
}

/**
 * Get the user's active study roadmap.
 *
 * Returns the complete roadmap with all milestones including:
 * - Weekly study plans
 * - Daily breakdown
 * - Progress tracking
 * - AI-generated recommendations
 */
export async function getActiveRoadmap(): Promise<StudyRoadmap> {
  return fetcher<StudyRoadmap>('/api/roadmap/active');
}

/**
 * Get a specific roadmap by ID.
 *
 * Returns the complete roadmap with all milestones.
 */
export async function getRoadmap(roadmapId: number): Promise<StudyRoadmap> {
  return fetcher<StudyRoadmap>(`/api/roadmap/${roadmapId}`);
}

/**
 * Get the daily study plan for a specific date.
 *
 * Returns the planned activities for the given date including:
 * - Study hours
 * - Focus domains
 * - Flashcard and question targets
 */
export async function getDailyPlan(roadmapId: number, date: string): Promise<DailyPlanResponse> {
  return fetcher<DailyPlanResponse>(`/api/roadmap/${roadmapId}/daily/${date}`);
}

/**
 * Update progress for a specific milestone.
 *
 * Use this to track completed flashcards and questions for a milestone.
 * Can also mark the milestone as complete.
 */
export async function updateMilestone(
  roadmapId: number,
  milestoneId: number,
  request: UpdateMilestoneRequest
): Promise<RoadmapMilestone> {
  return put<UpdateMilestoneRequest, RoadmapMilestone>(
    `/api/roadmap/${roadmapId}/milestones/${milestoneId}`,
    request
  );
}

/**
 * Adapt the roadmap based on current progress.
 *
 * Re-analyzes user performance and adjusts remaining milestones:
 * - Allocates more time to weak domains
 * - Adjusts daily plans based on completion rates
 * - Updates AI recommendations
 *
 * Call this after completing major milestones or when
 * performance has changed significantly.
 */
export async function adaptRoadmap(roadmapId: number): Promise<AdaptRoadmapResponse> {
  return post<never, AdaptRoadmapResponse>(`/api/roadmap/${roadmapId}/adapt`, {});
}

/**
 * Archive a roadmap.
 *
 * Soft-deletes by archiving the roadmap rather than removing it.
 */
export async function archiveRoadmap(roadmapId: number): Promise<{ message: string }> {
  return del<{ message: string }>(`/api/roadmap/${roadmapId}`);
}
