/**
 * Exam API client functions for PMP 2026 Study Application
 * Provides fetch-based API calls to backend exam endpoints
 * Uses X-Anonymous-ID header for anonymous user tracking
 */

import { storage } from './client';
import type {
  ExamSession,
  ExamSessionDetail,
  ExamSessionCreate,
  ExamSessionSubmit,
  ExamAnswer,
  ExamAnswerSubmit,
  ExamQuestion,
  ExamQuestionsList,
  ExamResult,
  ExamReport,
  ExamSessionWithReport,
  ExamResumeData,
  BehaviorMetrics,
  BehaviorSummary,
  GameTapeResponse,
} from '@/types/exam';

const EXAM_SESSIONS_KEY = 'pmp_exam_sessions';

// ============ Exam Session API (Mocked) ============

export async function createExamSession(
  config?: ExamSessionCreate
): Promise<ExamSession> {
  const sessions = storage.get<ExamSession[]>(EXAM_SESSIONS_KEY) || [];
  const now = new Date().toISOString();
  const newSession: ExamSession = {
    id: crypto.randomUUID(),
    user_id: 'guest',
    status: 'in_progress',
    start_time: now,
    end_time: null,
    total_time_seconds: (config?.exam_duration_minutes || 240) * 60,
    questions_count: config?.total_questions || 185,
    correct_count: 0,
    current_question_index: 0,
    time_expired: false,
    created_at: now,
    updated_at: now,
  };
  sessions.push(newSession);
  storage.set(EXAM_SESSIONS_KEY, sessions);
  return newSession;
}

export async function startExamSession(sessionId: string): Promise<ExamSessionDetail> {
  const sessions = storage.get<ExamSession[]>(EXAM_SESSIONS_KEY) || [];
  const session = sessions.find(s => s.id === sessionId);
  if (!session) throw new Error('Session not found');
  
  return {
    ...session,
    remaining_time_seconds: session.total_time_seconds,
    answered_count: 0,
    flagged_count: 0,
  };
}

export async function submitExamAnswer(
  sessionId: string,
  answer: ExamAnswerSubmit
): Promise<ExamAnswer> {
  const key = `pmp_exam_answers_${sessionId}`;
  const answers = storage.get<Record<number, ExamAnswerSubmit>>(key) || {};
  answers[answer.question_id] = answer;
  storage.set(key, answers);
  
  return {
    id: crypto.randomUUID(),
    exam_session_id: sessionId,
    question_id: answer.question_id,
    question_index: 0, // Placeholder
    selected_answer: answer.selected_answer,
    is_correct: true, // Simplified
    time_spent_seconds: answer.time_spent_seconds || 0,
    is_flagged: answer.is_flagged || false,
    created_at: new Date().toISOString(),
  };
}

export async function completeExamSession(
  sessionId: string,
  _submitData?: ExamSessionSubmit
): Promise<ExamResult> {
  const sessions = storage.get<ExamSession[]>(EXAM_SESSIONS_KEY) || [];
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) throw new Error('Session not found');
  
  const now = new Date().toISOString();
  sessions[sessionIndex].status = 'completed';
  sessions[sessionIndex].end_time = now;
  sessions[sessionIndex].updated_at = now;
  storage.set(EXAM_SESSIONS_KEY, sessions);
  
  // Use variable to satisfy lint
  if (_submitData) { /* ignore */ }
  
  return {
    exam_session_id: sessionId,
    score_percentage: 75,
    passed: true,
    domain_breakdown: {},
    task_breakdown: {},
    time_spent_seconds: 3600,
    time_expired: false,
    questions_count: sessions[sessionIndex].questions_count,
    correct_count: 140,
  };
}

export async function getExamSession(_sessionId: string): Promise<ExamSessionWithReport> {
  const sessions = storage.get<ExamSession[]>(EXAM_SESSIONS_KEY) || [];
  const session = sessions.find(s => s.id === _sessionId);
  if (!session) throw new Error('Session not found');
  
  const report: ExamReport = {
    id: crypto.randomUUID(),
    exam_session_id: _sessionId,
    score_percentage: 75,
    domain_breakdown: {},
    task_breakdown: {},
    recommendations: [],
    strengths: [],
    weaknesses: [],
    created_at: session.created_at,
    updated_at: session.updated_at,
  };

  return {
    ...session,
    report,
  };
}

export async function getExamSessionQuestions(_sessionId: string): Promise<ExamQuestionsList> {
  const res = await fetch('/data/questions.json');
  const allQuestions = await res.json();
  
  // Map raw questions to ExamQuestion type
  const examQuestions: ExamQuestion[] = allQuestions.slice(0, 185).map((q: { id: number; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string }, index: number) => ({
    question_index: index,
    question_id: q.id,
    question_text: q.question_text,
    option_a: q.option_a,
    option_b: q.option_b,
    option_c: q.option_c,
    option_d: q.option_d,
    selected_answer: null,
    is_correct: null,
    is_flagged: false,
    time_spent_seconds: 0,
    domain_name: null,
    task_name: null,
  }));

  return {
    exam_session_id: _sessionId,
    questions: examQuestions,
  };
}

export async function resumeExamSession(_sessionId: string): Promise<ExamResumeData> {
  const session = await getExamSession(_sessionId);
  const questions = await getExamSessionQuestions(_sessionId);
  
  return {
    session: {
      ...session,
      remaining_time_seconds: session.total_time_seconds,
      answered_count: 0,
      flagged_count: 0,
    },
    questions: questions.questions,
    current_question: questions.questions[0],
  } as ExamResumeData;
}

export async function getExamHistory(options?: {
  status?: 'in_progress' | 'completed' | 'abandoned';
  limit?: number;
  offset?: number;
}): Promise<ExamSession[]> {
  let sessions = storage.get<ExamSession[]>(EXAM_SESSIONS_KEY) || [];
  if (options?.status) {
    sessions = sessions.filter(s => s.status === options.status);
  }
  return sessions.slice(0, options?.limit || 10);
}

export async function abandonExamSession(_sessionId: string): Promise<void> {
  const sessions = storage.get<ExamSession[]>(EXAM_SESSIONS_KEY) || [];
  const sessionIndex = sessions.findIndex(s => s.id === _sessionId);
  if (sessionIndex !== -1) {
    sessions[sessionIndex].status = 'abandoned';
    sessions[sessionIndex].updated_at = new Date().toISOString();
    storage.set(EXAM_SESSIONS_KEY, sessions);
  }
}

// ============ Exam Coach API (Mocked) ============

export async function getBehaviorMetrics(_sessionId: string): Promise<BehaviorMetrics> {
  if (_sessionId) { /* ignore */ }
  return {
    current_pattern: 'normal',
    engagement_score: 0.9,
    focus_score: 0.8,
    pace_trajectory: 'on_track',
    time_remaining_minutes: 180,
    questions_completed: 10,
    avg_time_per_question: 60,
  };
}

export async function getBehaviorSummary(_sessionId: string): Promise<BehaviorSummary> {
  if (_sessionId) { /* ignore */ }
  return {
    overall_pattern: 'normal',
    engagement_score: 0.9,
    focus_score: 0.8,
    pace_trajectory: 'on_track',
    total_flags: 5,
    max_consecutive_flags: 2,
    question_revisits: 3,
    avg_time_per_question: 60,
    fastest_question: 15,
    slowest_question: 120,
    coaching_interventions: 0,
    pattern_history: [],
    current_metrics: {
      time_remaining_minutes: 180,
      questions_completed: 10,
    },
  };
}

export async function getGameTape(_sessionId: string): Promise<GameTapeResponse> {
  const summary = await getBehaviorSummary(_sessionId);
  return {
    exam_session_id: _sessionId,
    events: [],
    summary,
  };
}
