/**
 * TypeScript type definitions for PMP 2026 Exam Simulation
 * Matches backend Pydantic schemas in backend/app/schemas/exam.py
 */

// ============ Exam Enums ============

export type ExamStatusType = 'in_progress' | 'completed' | 'abandoned';

// ============ Exam Session Types ============

export interface ExamSession {
  id: string; // UUID
  user_id: string; // UUID
  status: ExamStatusType;
  start_time: string; // ISO datetime
  end_time: string | null;
  total_time_seconds: number;
  questions_count: number;
  correct_count: number;
  current_question_index: number;
  time_expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExamSessionDetail extends ExamSession {
  remaining_time_seconds: number;
  answered_count: number;
  flagged_count: number;
}

export interface ExamSessionCreate {
  exam_duration_minutes?: number; // Default: 240 for PMP
  total_questions?: number; // Default: 185 for PMP
}

export interface ExamSessionSubmit {
  force_complete?: boolean;
}

// ============ Exam Answer Types ============

export interface ExamAnswer {
  id: string; // UUID
  exam_session_id: string; // UUID
  question_id: number;
  question_index: number;
  selected_answer: string; // 'A' | 'B' | 'C' | 'D'
  is_correct: boolean;
  time_spent_seconds: number;
  is_flagged: boolean;
  created_at: string;
}

export interface ExamAnswerSubmit {
  question_id: number;
  selected_answer: string; // 'A' | 'B' | 'C' | 'D'
  time_spent_seconds?: number;
  is_flagged?: boolean;
}

// ============ Exam Question Types ============

export interface ExamQuestion {
  question_index: number;
  question_id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  selected_answer: string | null;
  is_correct: boolean | null;
  is_flagged: boolean;
  time_spent_seconds: number;
  domain_name: string | null;
  task_name: string | null;
}

export interface ExamQuestionsList {
  exam_session_id: string;
  questions: ExamQuestion[];
}

// ============ Exam Report Types ============

export interface DomainPerformance {
  correct: number;
  total: number;
  percentage: number;
}

export interface TaskPerformance {
  correct: number;
  total: number;
}

export interface ExamReport {
  id: string; // UUID
  exam_session_id: string; // UUID
  score_percentage: number;
  domain_breakdown: Record<string, DomainPerformance>;
  task_breakdown: Record<string, TaskPerformance> | null;
  recommendations: string[];
  strengths: string[];
  weaknesses: string[];
  created_at: string;
  updated_at: string;
}

// ============ Exam Result Types ============

export interface ExamResult {
  exam_session_id: string;
  score_percentage: number;
  passed: boolean;
  domain_breakdown: Record<string, DomainPerformance>;
  task_breakdown: Record<string, TaskPerformance>;
  time_spent_seconds: number;
  time_expired: boolean;
  questions_count: number;
  correct_count: number;
}

// ============ Exam Session with Report ============

export interface ExamSessionWithReport extends ExamSession {
  report: ExamReport | null;
}

// ============ Exam Resume Types ============

export interface ExamResumeData {
  session: ExamSessionDetail;
  questions: ExamQuestion[];
  current_question: ExamQuestion | null;
}

// ============ API Response Types ============

export type ExamSessionResponse = ExamSession;

export type ExamSessionDetailResponse = ExamSessionDetail;

export type ExamAnswerResponse = ExamAnswer;

export type ExamReportResponse = ExamReport;

export type ExamResultResponse = ExamResult;

export type ExamResumeResponse = ExamResumeData;

// ============ Exam Coach / Behavior Types ============

export type BehaviorPattern =
  | 'normal'
  | 'rushing'
  | 'dwelling'
  | 'panic'
  | 'guessing'
  | 'flagging_spree'
  | 'skipping'
  | 'revisit_loop';

export type CoachingSeverity = 'info' | 'suggestion' | 'warning' | 'urgent';

export type PaceTrajectory = 'ahead' | 'on_track' | 'behind' | 'critical';

export interface CoachingAlert {
  pattern: string;
  severity: CoachingSeverity;
  title: string;
  message: string;
  suggested_action: string | null;
  question_index: number | null;
}

export interface BehaviorMetrics {
  current_pattern: BehaviorPattern;
  engagement_score: number;
  focus_score: number;
  pace_trajectory: PaceTrajectory;
  time_remaining_minutes: number;
  questions_completed: number;
  avg_time_per_question: number;
}

export interface GameTapeEvent {
  event_type: 'answer' | 'flag' | 'revisit' | 'skip' | 'coaching';
  question_index: number;
  timestamp: string;
  time_spent_seconds: number;
  pattern_detected: BehaviorPattern | null;
  coaching_message: string | null;
  domain_name: string | null;
  is_correct: boolean | null;
}

export interface GameTapeResponse {
  exam_session_id: string;
  events: GameTapeEvent[];
  summary: BehaviorSummary;
}

export interface BehaviorSummary {
  overall_pattern: BehaviorPattern;
  engagement_score: number;
  focus_score: number;
  pace_trajectory: PaceTrajectory;
  total_flags: number;
  max_consecutive_flags: number;
  question_revisits: number;
  avg_time_per_question: number;
  fastest_question: number;
  slowest_question: number;
  coaching_interventions: number;
  pattern_history: PatternHistoryEntry[];
  current_metrics: {
    time_remaining_minutes: number;
    questions_completed: number;
  };
}

export interface PatternHistoryEntry {
  pattern: BehaviorPattern;
  start_q: number;
  end_q: number;
  duration_sec: number;
}

export interface BehaviorMetricsResponse {
  current_pattern: BehaviorPattern;
  engagement_score: number;
  focus_score: number;
  pace_trajectory: PaceTrajectory;
  time_remaining_minutes: number;
  questions_completed: number;
  avg_time_per_question: number;
}
