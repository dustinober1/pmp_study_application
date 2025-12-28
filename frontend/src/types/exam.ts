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

export interface ExamSessionResponse extends ExamSession {}

export interface ExamSessionDetailResponse extends ExamSessionDetail {}

export interface ExamAnswerResponse extends ExamAnswer {}

export interface ExamReportResponse extends ExamReport {}

export interface ExamResultResponse extends ExamResult {}

export interface ExamResumeResponse extends ExamResumeData {}
