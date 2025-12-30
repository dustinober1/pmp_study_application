/**
 * Local Data Persistence and API Simulation for Static Site
 */

import type { ApiError } from '@/types';

// Storage keys
export const ANONYMOUS_ID_KEY = 'pmp_anonymous_id';
const SESSIONS_KEY = 'pmp_sessions';
const USER_KEY = 'pmp_user';
const FLASHCARD_PROGRESS_KEY = 'pmp_flashcard_progress';
const QUESTION_PROGRESS_KEY = 'pmp_question_progress';

/**
 * Get or create anonymous user ID from localStorage
 */
export function getAnonymousId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let anonymousId = localStorage.getItem(ANONYMOUS_ID_KEY);

  if (!anonymousId) {
    anonymousId = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, anonymousId);
  }

  return anonymousId;
}

/**
 * Local Storage Helpers
 */
export const storage = {
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null;
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  },
  set: <T>(key: string, value: T): void => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  },
};

/**
 * Simulated API Error
 */
export class ApiClientError extends Error {
  status: number;
  data: ApiError;

  constructor(message: string, status: number, data: ApiError) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.data = data;
  }
}

/**
 * Mock Fetcher - Fetches from local JSON or returns stored progress
 */
export async function fetcher<T>(url: string): Promise<T> {
  // Handle static data requests
  if (url.startsWith('/api/domains')) {
    const res = await fetch('/data/domains.json');
    const data: { id: number }[] = await res.json();
    
    const domainIdMatch = url.match(/\/api\/domains\/(\d+)/);
    if (domainIdMatch) {
      const id = parseInt(domainIdMatch[1]);
      const domain = (data as { id: number }[]).find((d) => d.id === id);
      return domain as T;
    }
    
    return data as T;
  }
  
  if (url.startsWith('/api/tasks')) {
    const res = await fetch('/data/tasks.json');
    const allTasks: { id: number; domain_id: number }[] = await res.json();
    const taskIdMatch = url.match(/\/api\/tasks\/(\d+)/);
    if (taskIdMatch) {
      const id = parseInt(taskIdMatch[1]);
      const tasks = allTasks as { id: number }[];
      const task = tasks.find((t) => t.id === id);
      return task as T;
    }
    
    // Handle domains/{id}/tasks
    const domainTasksMatch = url.match(/\/api\/domains\/(\d+)\/tasks/);
    if (domainTasksMatch) {
      const domainId = parseInt(domainTasksMatch[1]);
      const tasks = (allTasks as { domain_id: number }[]).filter((t) => t.domain_id === domainId);
      return tasks as T;
    }
    
    return allTasks as T;
  }
  
  if (url.startsWith('/api/flashcards')) {
    const res = await fetch('/data/flashcards.json');
    const allCards: { id: number; domain_id: number; task_id: number }[] = await res.json();
    
    const singleMatch = url.match(/\/api\/flashcards\/(\d+)/);
    if (singleMatch) {
      const id = parseInt(singleMatch[1]);
      const cards = allCards as { id: number }[];
      const card = cards.find((c) => c.id === id);
      return card as T;
    }

    // Filter by domain/task if present in params
    const urlObj = new URL(url, 'http://localhost');
    const domainId = urlObj.searchParams.get('domain_id');
    const taskId = urlObj.searchParams.get('task_id');
    
    let filtered = allCards as { domain_id: number; task_id: number }[];
    if (domainId) filtered = filtered.filter((c) => c.domain_id === parseInt(domainId));
    if (taskId) filtered = filtered.filter((c) => c.task_id === parseInt(taskId));
    
    return filtered as T;
  }
  
  if (url.startsWith('/api/questions')) {
    const res = await fetch('/data/questions.json');
    const allQuestions: { id: number; domain_id: number; task_id: number }[] = await res.json();
    
    const singleMatch = url.match(/\/api\/questions\/(\d+)/);
    if (singleMatch) {
      const id = parseInt(singleMatch[1]);
      const qs = allQuestions as { id: number }[];
      const question = qs.find((q) => q.id === id);
      return question as T;
    }

    const urlObj = new URL(url, 'http://localhost');
    const domainId = urlObj.searchParams.get('domain_id');
    const taskId = urlObj.searchParams.get('task_id');
    
    let qs = allQuestions as { domain_id: number; task_id: number }[];
    if (domainId) qs = qs.filter((q) => q.domain_id === parseInt(domainId));
    if (taskId) qs = qs.filter((q) => q.task_id === parseInt(taskId));
    
    return qs as T;
  }

  // Handle User requests from LocalStorage
  if (url === '/api/users/me') {
    const user = storage.get(USER_KEY) || {
      id: getAnonymousId(),
      anonymous_id: getAnonymousId(),
      email: null,
      display_name: 'Guest User',
      is_registered: false
    };
    return user as T;
  }

  if (url === '/api/progress/summary') {
    const flashcardProgress = storage.get<Record<string, { review_count?: number; quality: number }>>(FLASHCARD_PROGRESS_KEY) || {};
    const questionProgress = storage.get<Record<string, { attempt_count?: number; is_correct: boolean }>>(QUESTION_PROGRESS_KEY) || {};
    const sessions = storage.get<{ duration_seconds: number }[]>(SESSIONS_KEY) || [];
    const reviewedFlashcards = Object.keys(flashcardProgress).length;
    const attemptedQuestions = Object.keys(questionProgress).length;
    
    // Calculate accuracy
    let totalReviews = 0;
    let correctReviews = 0;
    Object.values(flashcardProgress).forEach((p) => {
      totalReviews += (p.review_count || 1);
      if (p.quality >= 3) correctReviews += 1;
    });

    let totalAttempts = 0;
    let correctAttempts = 0;
    Object.values(questionProgress).forEach((p: { is_correct: boolean; attempt_count?: number }) => {
      totalAttempts += (p.attempt_count || 1);
      if (p.is_correct) correctAttempts += 1;
    });

    const totalStudyTime = sessions.reduce((acc, s) => acc + (s.duration_seconds || 0), 0);

    return {
      overall: {
        total_flashcards: 130,
        reviewed_flashcards: reviewedFlashcards,
        mastered_flashcards: Object.values(flashcardProgress).filter((p: { quality: number }) => p.quality >= 4).length,
        total_questions: 78,
        attempted_questions: attemptedQuestions,
        correct_questions: correctAttempts,
        total_study_time_seconds: totalStudyTime,
        total_sessions: sessions.length,
        flashcard_accuracy: totalReviews > 0 ? Math.round((correctReviews / totalReviews) * 100) : 0,
        question_accuracy: totalAttempts > 0 ? Math.round((correctAttempts / totalAttempts) * 100) : 0,
        streak_days: 0, // Simplified
      },
      by_domain: [] // Would need more logic to populate
    } as T;
  }

  // Default empty returns for other endpoints to prevent crashes
  if (url.startsWith('/api/progress/domain')) return { domain: {}, by_task: [] } as T;
  if (url.startsWith('/api/sessions')) return [] as T;
  if (url.startsWith('/api/micro/queue')) return { queue: [] } as T;
  if (url.startsWith('/api/micro/stats')) return {} as T;

  throw new ApiClientError('Not Found', 404, { detail: `Endpoint ${url} not mocked yet` });
}

export async function post<T, R>(url: string, data: T): Promise<R> {
  console.log('Mock POST:', url, data);
  
  if (url.includes('/review')) {
    const cardId = url.split('/')[3];
    const progress = storage.get<Record<string, { last_reviewed: string }>>(FLASHCARD_PROGRESS_KEY) || {};
    progress[cardId] = {
      ...(progress[cardId] || {}),
      ...(data as Record<string, unknown>),
      last_reviewed: new Date().toISOString(),
    };
    storage.set(FLASHCARD_PROGRESS_KEY, progress);
    return { status: 'success' } as unknown as R;
  }

  if (url.includes('/answer')) {
    const qId = url.split('/')[3];
    const progress = storage.get<Record<string, { last_answered: string }>>(QUESTION_PROGRESS_KEY) || {};
    progress[qId] = {
      ...(progress[qId] || {}),
      ...(data as Record<string, unknown>),
      last_answered: new Date().toISOString(),
    };
    storage.set(QUESTION_PROGRESS_KEY, progress);
    return { status: 'success' } as unknown as R;
  }

  return { status: 'success' } as unknown as R;
}

export async function put<T, R>(url: string, data: T): Promise<R> {
  return post(url, data);
}

export async function patch<T, R>(url: string, data: T): Promise<R> {
  return post(url, data);
}

export async function del<R>(_url: string): Promise<R> {
  if (_url) {
    // Acknowledge _url
  }
  return { status: 'success' } as unknown as R;
}

// These are needed by some components but don't do anything in static mode
export const API_BASE_URL = '';
export function buildHeaders() { return {}; }
