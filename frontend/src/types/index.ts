/**
 * TypeScript type definitions for PMP 2026 Study Application
 * Matches backend Pydantic schemas for API data structures
 */

// ============ Enums ============

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type AnswerChoice = 'A' | 'B' | 'C' | 'D';
export type SessionType = 'flashcard' | 'practice_test' | 'mixed';

// ============ Domain Types ============

export interface Domain {
  id: number;
  name: string;
  description: string | null;
  weight: number;
  order: number;
}

export interface DomainWithTasks extends Domain {
  tasks: Task[];
}

// ============ Task Types ============

export interface Task {
  id: number;
  name: string;
  description: string | null;
  order: number;
  domain_id: number;
}

export interface TaskWithDomain extends Task {
  domain: Domain;
}

// ============ User Types ============

export interface User {
  id: string; // UUID
  anonymous_id: string;
  email: string | null;
  display_name: string | null;
  created_at: string; // ISO datetime
  updated_at: string;
}

export interface UserSummary {
  id: string;
  display_name: string | null;
}

export interface UserCreate {
  anonymous_id: string;
}

export interface UserRegister {
  email: string;
  display_name?: string;
}

export interface UserUpdate {
  email?: string;
  display_name?: string;
}

// ============ Flashcard Types ============

export interface Flashcard {
  id: number;
  front: string;
  back: string;
  task_id: number;
  created_at: string;
  updated_at: string;
}

export interface FlashcardWithTask extends Flashcard {
  task: Task;
}

export interface FlashcardProgress {
  id: string; // UUID
  user_id: string;
  flashcard_id: number;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  review_count: number;
  correct_count: number;
  last_quality: number | null;
  created_at: string;
  updated_at: string;
}

export interface FlashcardWithProgress extends Flashcard {
  progress: FlashcardProgress | null;
}

export interface FlashcardReviewRequest {
  quality: number; // 0-5 SM-2 rating
}

export interface FlashcardReviewResponse {
  flashcard_id: number;
  quality: number;
  ease_factor: number;
  interval: number;
  next_review_at: string;
  message: string;
}

// ============ Question Types ============

export interface Question {
  id: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: AnswerChoice;
  explanation: string;
  difficulty: DifficultyLevel | null;
  task_id: number;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithTask extends Question {
  task: Task;
}

export interface QuestionProgress {
  id: string; // UUID
  user_id: string;
  question_id: string;
  attempt_count: number;
  correct_count: number;
  last_answer: AnswerChoice | null;
  last_correct: boolean | null;
  last_attempted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestionWithProgress extends Question {
  progress: QuestionProgress | null;
}

export interface QuestionAnswerRequest {
  answer: AnswerChoice;
}

export interface QuestionAnswerResponse {
  question_id: number;
  user_answer: AnswerChoice;
  correct_answer: AnswerChoice;
  is_correct: boolean;
  explanation: string;
  message: string;
}

// ============ Session Types ============

export interface StudySession {
  id: string; // UUID
  user_id: string;
  session_type: SessionType;
  domain_id: number | null;
  task_id: number | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  flashcards_reviewed: number;
  flashcards_correct: number;
  questions_answered: number;
  questions_correct: number;
  created_at: string;
  updated_at: string;
}

export interface StudySessionSummary {
  id: string;
  session_type: SessionType;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  flashcards_reviewed: number;
  questions_answered: number;
}

export interface StudySessionCreate {
  session_type?: SessionType;
  domain_id?: number;
  task_id?: number;
}

export interface StudySessionUpdate {
  flashcards_reviewed?: number;
  flashcards_correct?: number;
  questions_answered?: number;
  questions_correct?: number;
}

// ============ Progress Types ============

export interface TaskProgressSummary {
  task_id: number;
  task_name: string;
  total_flashcards: number;
  reviewed_flashcards: number;
  mastered_flashcards: number;
  total_questions: number;
  attempted_questions: number;
  correct_questions: number;
  flashcard_accuracy: number;
  question_accuracy: number;
}

export interface DomainProgressSummary {
  domain_id: number;
  domain_name: string;
  domain_weight: number;
  total_flashcards: number;
  reviewed_flashcards: number;
  mastered_flashcards: number;
  total_questions: number;
  attempted_questions: number;
  correct_questions: number;
  flashcard_accuracy: number;
  question_accuracy: number;
}

export interface OverallProgressSummary {
  total_flashcards: number;
  reviewed_flashcards: number;
  mastered_flashcards: number;
  total_questions: number;
  attempted_questions: number;
  correct_questions: number;
  total_study_time_seconds: number;
  total_sessions: number;
  flashcard_accuracy: number;
  question_accuracy: number;
  streak_days: number;
  last_study_date: string | null;
}

export interface ProgressSummaryResponse {
  overall: OverallProgressSummary;
  by_domain: DomainProgressSummary[];
}

export interface DomainDetailedProgress {
  domain: DomainProgressSummary;
  by_task: TaskProgressSummary[];
}

export interface FlashcardsDueResponse {
  count: number;
  flashcard_ids: number[];
}

export interface StudyStreakResponse {
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  study_dates: string[];
}

// ============ Auth Types ============

export interface AnonymousAuthRequest {
  anonymous_id: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  display_name?: string;
}

export interface AuthResponse {
  user_id: string;
  anonymous_id: string;
  email: string | null;
  display_name: string | null;
  is_registered: boolean;
  access_token: string;
  token_type: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ============ API Response Types ============

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface ApiError {
  detail: string;
  status_code?: number;
}

// ============ Collaboration Types ============
// Export all collaboration types from the dedicated module
export * from './collaboration';

// ============ Exam Types ============
// Export all exam types from the dedicated module
export * from './exam';
