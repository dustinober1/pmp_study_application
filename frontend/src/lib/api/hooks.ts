/**
 * SWR hooks for API data fetching with optimistic updates
 */

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, post, storage } from './client';
import { calculateSM2, isCardDue, type SM2Progress } from '../utils/sm2';
import type {
  DomainWithTasks,
  Task,
  FlashcardWithProgress,
  FlashcardReviewRequest,
  FlashcardReviewResponse,
  QuestionWithProgress,
  QuestionAnswerRequest,
  QuestionAnswerResponse,
  ProgressSummaryResponse,
  DomainDetailedProgress,
  FlashcardsDueResponse,
  StudyStreakResponse,
  StudySession,
  StudySessionSummary,
  StudySessionCreate,
  User,
} from '@/types';

// Storage key for SM-2 flashcard progress
const SM2_PROGRESS_KEY = 'pmp_flashcard_sm2_progress';

// ============ Domain Hooks ============

export function useDomains() {
  return useSWR<DomainWithTasks[]>('/api/domains', fetcher);
}

export function useDomain(id: number | undefined) {
  return useSWR<DomainWithTasks>(
    id ? `/api/domains/${id}` : null,
    fetcher
  );
}

// ============ Task Hooks ============

export function useTasks(domainId: number | undefined) {
  const url = domainId ? `/api/domains/${domainId}/tasks` : null;
  return useSWR<Task[]>(url, fetcher);
}

export function useTask(id: number | undefined) {
  return useSWR<Task>(
    id ? `/api/tasks/${id}` : null,
    fetcher
  );
}

// ============ Flashcard Hooks ============

interface FlashcardFilters {
  domain_id?: number;
  task_id?: number;
  due_only?: boolean;
}

/**
 * Custom fetcher that attaches SM-2 progress to flashcards
 */
async function fetcherWithSM2Progress(url: string): Promise<FlashcardWithProgress[]> {
  // Fetch base flashcards from static JSON
  const res = await fetch(url.startsWith('/api') ? url.replace('/api/flashcards', '/data/flashcards.json') : url);
  const flashcards: FlashcardWithProgress[] = await res.json();

  // Load SM-2 progress from localStorage
  const sm2Progress = storage.get<Record<number, SM2Progress>>(SM2_PROGRESS_KEY) || {};

  // Attach progress to each flashcard
  return flashcards.map(card => ({
    ...card,
    progress: sm2Progress[card.id] || null,
  }));
}

export function useFlashcards(filters?: FlashcardFilters) {
  const params = new URLSearchParams();
  if (filters?.domain_id) params.append('domain_id', String(filters.domain_id));
  if (filters?.task_id) params.append('task_id', String(filters.task_id));
  if (filters?.due_only) params.append('due_only', 'true');

  const queryString = params.toString();
  const url = `/api/flashcards${queryString ? `?${queryString}` : ''}`;

  // Custom SWR implementation for filtering by due_only
  const { data, ...rest } = useSWR<FlashcardWithProgress[]>(
    url,
    fetcherWithSM2Progress,
    {
      compare: (a, b) => {
        // Custom comparison to handle SM-2 progress changes
        return JSON.stringify(a) === JSON.stringify(b);
      },
    }
  );

  // Filter by due_only if requested
  let filteredData = data;
  if (filters?.due_only && data) {
    filteredData = data.filter(card => {
      if (!card.progress) return true; // No progress means due
      return isCardDue(card.progress.next_review_date);
    });
  }

  return { data: filteredData, ...rest };
}

export function useFlashcard(id: number | undefined) {
  return useSWR<FlashcardWithProgress>(
    id ? `/api/flashcards/${id}` : null,
    fetcher
  );
}

export function useFlashcardsDue() {
  return useSWR<FlashcardsDueResponse>('/api/flashcards/due', fetcher);
}

// Mutation hook for flashcard review with SM-2
export function useFlashcardReview(flashcardId: number) {
  return useSWRMutation<FlashcardReviewResponse, Error, string, FlashcardReviewRequest>(
    `/api/flashcards/${flashcardId}/review`,
    async (url, { arg }) => {
      // Get existing SM-2 progress
      const allProgress = storage.get<Record<number, SM2Progress>>(SM2_PROGRESS_KEY) || {};
      const previous = allProgress[flashcardId];

      // Calculate new SM-2 values
      const sm2Result = calculateSM2(arg.quality, previous);

      // Save progress to localStorage
      allProgress[flashcardId] = {
        ...sm2Result,
        last_review_date: new Date().toISOString(),
        last_quality: arg.quality,
      };
      storage.set(SM2_PROGRESS_KEY, allProgress);

      // Invalidate related caches after review
      mutate('/api/flashcards/due');
      mutate('/api/progress/summary');
      mutate(
        (key: string) => typeof key === 'string' && key.startsWith('/api/flashcards'),
        undefined,
        { revalidate: true }
      );

      return {
        flashcard_id: flashcardId,
        quality: arg.quality,
        ease_factor: sm2Result.ease_factor,
        interval: sm2Result.interval,
        next_review_at: sm2Result.next_review_date,
        message: 'Review saved successfully',
      };
    }
  );
}

// ============ Question Hooks ============

interface QuestionFilters {
  domain_id?: number;
  task_id?: number;
  difficulty?: string;
}

export function useQuestions(filters?: QuestionFilters) {
  const params = new URLSearchParams();
  if (filters?.domain_id) params.append('domain_id', String(filters.domain_id));
  if (filters?.task_id) params.append('task_id', String(filters.task_id));
  if (filters?.difficulty) params.append('difficulty', filters.difficulty);

  const queryString = params.toString();
  const url = `/api/questions${queryString ? `?${queryString}` : ''}`;

  return useSWR<QuestionWithProgress[]>(url, fetcher);
}

export function useQuestion(id: number | undefined) {
  return useSWR<QuestionWithProgress>(
    id ? `/api/questions/${id}` : null,
    fetcher
  );
}

// Mutation hook for answering a question
export function useQuestionAnswer(questionId: number) {
  const key = `/api/questions/${questionId}/answer`;

  return useSWRMutation<QuestionAnswerResponse, Error, string, QuestionAnswerRequest>(
    key,
    async (url, { arg }) => {
      const result = await post<QuestionAnswerRequest, QuestionAnswerResponse>(url, arg);

      // Invalidate related caches after answering
      mutate('/api/progress/summary');
      mutate(
        (key: string) => typeof key === 'string' && key.startsWith('/api/questions'),
        undefined,
        { revalidate: true }
      );

      return result;
    }
  );
}

// ============ Progress Hooks ============

export function useProgressSummary() {
  return useSWR<ProgressSummaryResponse>('/api/progress/summary', fetcher);
}

export function useDomainProgress(domainId: number | undefined) {
  return useSWR<DomainDetailedProgress>(
    domainId ? `/api/progress/domain/${domainId}` : null,
    fetcher
  );
}

export function useStudyStreak() {
  return useSWR<StudyStreakResponse>('/api/progress/streak', fetcher);
}

// ============ Session Hooks ============

export function useStudySessions(limit?: number) {
  const url = limit ? `/api/sessions?limit=${limit}` : '/api/sessions';
  return useSWR<StudySessionSummary[]>(url, fetcher);
}

export function useActiveSession() {
  return useSWR<StudySession | null>('/api/sessions/active', fetcher);
}

export function useStartSession() {
  return useSWRMutation<StudySession, Error, string, StudySessionCreate>(
    '/api/sessions',
    async (url, { arg }) => {
      const result = await post<StudySessionCreate, StudySession>(url, arg);

      // Invalidate sessions cache
      mutate('/api/sessions/active');
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/sessions'));

      return result;
    }
  );
}

export function useEndSession(sessionId: string | undefined) {
  return useSWRMutation<StudySession, Error, string | null>(
    sessionId ? `/api/sessions/${sessionId}/end` : null,
    async (url) => {
      if (!url) throw new Error('No session ID provided');
      const result = await post<object, StudySession>(url, {});

      // Invalidate related caches
      mutate('/api/sessions/active');
      mutate('/api/progress/summary');
      mutate('/api/progress/streak');
      mutate((key: string) => typeof key === 'string' && key.startsWith('/api/sessions'));

      return result;
    }
  );
}

// ============ User Hooks (Mocked) ============

export function useCurrentUser() {
  return useSWR<User>('/api/users/me', fetcher);
}

export function useRegisterUser() {
  return useSWRMutation<User, Error, string, { email: string; display_name?: string }>(
    '/api/users/register',
    async (_url, { arg }) => {
      const user = {
        id: crypto.randomUUID(),
        anonymous_id: crypto.randomUUID(),
        email: arg.email,
        display_name: arg.display_name || 'Guest User',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      storage.set('pmp_user', user);
      return user;
    }
  );
}

// ============ Utility Functions ============

/**
 * Prefetch domains data for faster initial load
 */
export function prefetchDomains() {
  return mutate('/api/domains', fetcher('/api/domains'));
}

/**
 * Invalidate all caches - useful after login/logout
 */
export function invalidateAllCaches() {
  return mutate(() => true, undefined, { revalidate: true });
}

/**
 * Invalidate progress-related caches
 */
export function invalidateProgressCaches() {
  mutate('/api/progress/summary');
  mutate('/api/progress/streak');
  mutate('/api/flashcards/due');
  mutate((key: string) => typeof key === 'string' && key.startsWith('/api/progress/domain'));
}
