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

import { storage } from './client';

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

const ROADMAP_KEY = 'pmp_study_roadmap';

// ============ API Functions (Mocked) ============

export async function createRoadmap(request: CreateRoadmapRequest): Promise<StudyRoadmap> {
  const now = new Date().toISOString();
  const roadmap: StudyRoadmap = {
    id: 1,
    user_id: 'guest',
    exam_date: request.exam_date,
    weekly_study_hours: request.weekly_study_hours,
    study_days_per_week: request.study_days_per_week,
    status: 'active',
    focus_areas: [],
    recommendations: {},
    total_milestones: 4,
    completed_milestones: 0,
    created_at: now,
    updated_at: now,
    last_adapted_at: null,
    milestones: [
      {
        id: 1,
        title: 'Foundations & People Domain',
        description: 'Focus on leadership and team dynamics',
        week_number: 1,
        scheduled_date: now,
        target_date: now,
        domain_ids: [1],
        daily_plan: {},
        completion_criteria: {},
        status: 'in_progress',
        flashcards_completed: 0,
        questions_completed: 0,
        quiz_score: null,
        completed_at: null,
      }
    ],
  };
  storage.set(ROADMAP_KEY, roadmap);
  return roadmap;
}

export async function getActiveRoadmap(): Promise<StudyRoadmap> {
  const roadmap = storage.get<StudyRoadmap>(ROADMAP_KEY);
  if (!roadmap) throw new Error('No active roadmap');
  return roadmap;
}

export async function getRoadmap(_roadmapId: number): Promise<StudyRoadmap> {
  if (!_roadmapId) return {} as StudyRoadmap;
  return getActiveRoadmap();
}

export async function getDailyPlan(_roadmapId: number, date: string): Promise<DailyPlanResponse> {
  if (!_roadmapId) return { date, plan: null };
  return {
    date,
    plan: {
      type: 'study',
      hours: 2,
      domain: 'People',
      activities: [
        { type: 'flashcards', count: 20 },
        { type: 'questions', count: 10 }
      ]
    }
  };
}

export async function updateMilestone(
  _roadmapId: number,
  milestoneId: number,
  request: UpdateMilestoneRequest
): Promise<RoadmapMilestone> {
  if (!_roadmapId) return {} as RoadmapMilestone;
  const roadmap = await getActiveRoadmap();
  const milestone = roadmap.milestones.find((m: RoadmapMilestone) => m.id === milestoneId);
  if (milestone) {
    if (request.flashcards_completed !== undefined) milestone.flashcards_completed = request.flashcards_completed;
    if (request.questions_completed !== undefined) milestone.questions_completed = request.questions_completed;
    if (request.mark_complete) milestone.status = 'completed';
    storage.set(ROADMAP_KEY, roadmap);
  }
  return milestone!;
}

export async function adaptRoadmap(roadmapId: number): Promise<AdaptRoadmapResponse> {
  return {
    message: 'Roadmap adapted locally',
    roadmap_id: roadmapId,
    adapted: true,
  };
}

export async function archiveRoadmap(_roadmapId: number): Promise<{ message: string }> {
  if (!_roadmapId) return { message: 'No roadmap specified' };
  storage.set(ROADMAP_KEY, null);
  return { message: 'Roadmap archived' };
}
