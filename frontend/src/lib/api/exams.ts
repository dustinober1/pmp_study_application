/**
 * Exam API client functions for PMP 2026 Study Application
 * Provides fetch-based API calls to backend exam endpoints
 * Uses X-Anonymous-ID header for anonymous user tracking
 */

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
import { API_BASE_URL, buildHeaders, ApiClientError } from './client';

// ============ Helper Functions ============

/**
 * Build the full API URL for exam endpoints
 */
function examUrl(path: string): string {
  return `${API_BASE_URL}/api/exams${path}`;
}

/**
 * Handle fetch response with error checking
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorData: { detail: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiClientError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    );
  }
  return response.json();
}

// ============ Exam Session API ============

/**
 * Create a new exam session
 * POST /api/exams/sessions
 */
export async function createExamSession(
  config?: ExamSessionCreate
): Promise<ExamSession> {
  const response = await fetch(examUrl('/sessions'), {
    method: 'POST',
    headers: buildHeaders(),
    body: config ? JSON.stringify(config) : undefined,
  });
  return handleResponse<ExamSession>(response);
}

/**
 * Start an exam session (validate and get session details)
 * POST /api/exams/sessions/{id}/start
 */
export async function startExamSession(sessionId: string): Promise<ExamSessionDetail> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/start`), {
    method: 'POST',
    headers: buildHeaders(),
  });
  return handleResponse<ExamSessionDetail>(response);
}

/**
 * Submit an answer for a question in the exam
 * POST /api/exams/sessions/{sessionId}/answers
 */
export async function submitExamAnswer(
  sessionId: string,
  answer: ExamAnswerSubmit
): Promise<ExamAnswer> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/answers`), {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify(answer),
  });
  return handleResponse<ExamAnswer>(response);
}

/**
 * Complete/submit an exam session
 * POST /api/exams/sessions/{id}/submit
 */
export async function completeExamSession(
  sessionId: string,
  submitData?: ExamSessionSubmit
): Promise<ExamResult> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/submit`), {
    method: 'POST',
    headers: buildHeaders(),
    body: submitData ? JSON.stringify(submitData) : undefined,
  });
  return handleResponse<ExamResult>(response);
}

/**
 * Get an exam session by ID
 * GET /api/exams/sessions/{id}
 */
export async function getExamSession(sessionId: string): Promise<ExamSessionWithReport> {
  const response = await fetch(examUrl(`/sessions/${sessionId}`), {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<ExamSessionWithReport>(response);
}

/**
 * Get questions for an exam session
 * GET /api/exams/sessions/{id}/questions
 */
export async function getExamSessionQuestions(sessionId: string): Promise<ExamQuestionsList> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/questions`), {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<ExamQuestionsList>(response);
}

/**
 * Resume an in-progress exam session
 * GET /api/exams/sessions/{id}/resume
 */
export async function resumeExamSession(sessionId: string): Promise<ExamResumeData> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/resume`), {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<ExamResumeData>(response);
}

/**
 * List exam sessions for the current user
 * GET /api/exams/sessions?status=&limit=&offset=
 */
export async function getExamHistory(options?: {
  status?: 'in_progress' | 'completed' | 'abandoned';
  limit?: number;
  offset?: number;
}): Promise<ExamSession[]> {
  const params = new URLSearchParams();
  if (options?.status) {
    params.append('status_filter', options.status);
  }
  if (options?.limit !== undefined) {
    params.append('limit', options.limit.toString());
  }
  if (options?.offset !== undefined) {
    params.append('offset', options.offset.toString());
  }

  const queryString = params.toString();
  const url = examUrl(`/sessions${queryString ? `?${queryString}` : ''}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<ExamSession[]>(response);
}

/**
 * Abandon an in-progress exam session
 * DELETE /api/exams/sessions/{id}
 */
export async function abandonExamSession(sessionId: string): Promise<void> {
  const response = await fetch(examUrl(`/sessions/${sessionId}`), {
    method: 'DELETE',
    headers: buildHeaders(),
  });

  if (!response.ok) {
    let errorData: { detail: string };
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    throw new ApiClientError(
      errorData.detail || 'An error occurred',
      response.status,
      errorData
    );
  }
}

// ============ Exam Coach API ============

/**
 * Get real-time behavior metrics for an exam session
 * GET /api/exams/sessions/{id}/coach/metrics
 */
export async function getBehaviorMetrics(sessionId: string): Promise<BehaviorMetrics> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/coach/metrics`), {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<BehaviorMetrics>(response);
}

/**
 * Get complete behavioral summary for an exam session
 * GET /api/exams/sessions/{id}/coach/summary
 */
export async function getBehaviorSummary(sessionId: string): Promise<BehaviorSummary> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/coach/summary`), {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<BehaviorSummary>(response);
}

/**
 * Get post-exam "game tape" behavioral replay
 * GET /api/exams/sessions/{id}/coach/gametape
 */
export async function getGameTape(sessionId: string): Promise<GameTapeResponse> {
  const response = await fetch(examUrl(`/sessions/${sessionId}/coach/gametape`), {
    method: 'GET',
    headers: buildHeaders(),
  });
  return handleResponse<GameTapeResponse>(response);
}
