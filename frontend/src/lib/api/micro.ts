/**
 * SWR hooks for Micro-Learning API
 *
 * Provides hooks for 2-minute micro-learning sessions with:
 * - Study queue management
 * - Quick session creation/review
 * - Context-aware learning (commute, break, waiting, general)
 * - Audio flashcard support
 */

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher, post } from './client';
import type {
  StudyQueueResponse,
  DueCardsResponse,
  MicroStatsResponse,
  QuickSession,
  QuickSessionDetail,
  MicroReviewResponse,
  MicroFlashcardWithProgress,
  MicroContext,
  MicroSessionMode,
} from '@/types';

// ============ Study Queue Hooks ============

interface StudyQueueOptions {
  context?: MicroContext;
  limit?: number;
}

/**
 * Get user's study queue for micro-learning
 */
export function useStudyQueue(options?: StudyQueueOptions) {
  const params = new URLSearchParams();
  if (options?.context) params.append('context', options.context);
  if (options?.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const url = `/api/micro/queue${queryString ? `?${queryString}` : ''}`;

  return useSWR<StudyQueueResponse>(url, fetcher);
}

/**
 * Rebuild user's study queue with updated priority scores
 */
export function useRebuildQueue() {
  return useSWRMutation<
    { user_id: string; context: string; queue_size: number; message: string },
    Error,
    string,
    { context?: MicroContext; limit?: number }
  >(
    '/api/micro/queue/rebuild',
    async (url, { arg }) => {
      const params = new URLSearchParams();
      if (arg?.context) params.append('context', arg.context);
      if (arg?.limit) params.append('limit', String(arg.limit));

      const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to rebuild queue');
      return response.json();
    },
    {
      onSuccess: () => {
        // Invalidate queue cache after rebuild
        mutate('/api/micro/queue');
      },
    }
  );
}

// ============ Due Cards Hook ============

interface DueCardsOptions {
  context?: MicroContext;
  limit?: number;
}

/**
 * Get micro cards due for review
 */
export function useDueCards(options?: DueCardsOptions) {
  const params = new URLSearchParams();
  if (options?.context) params.append('context', options.context);
  if (options?.limit) params.append('limit', String(options.limit));

  const queryString = params.toString();
  const url = `/api/micro/due${queryString ? `?${queryString}` : ''}`;

  return useSWR<DueCardsResponse>(url, fetcher);
}

// ============ Micro Stats Hook ============

/**
 * Get micro-learning statistics for the user
 */
export function useMicroStats() {
  return useSWR<MicroStatsResponse>('/api/micro/stats', fetcher);
}

// ============ Quick Session Hooks ============

interface StartSessionOptions {
  context?: MicroContext;
  mode?: MicroSessionMode;
  target?: number;
}

/**
 * Start a new quick micro-learning session
 */
export function useStartQuickSession() {
  return useSWRMutation<
    QuickSession,
    Error,
    string,
    StartSessionOptions
  >(
    '/api/micro/sessions/start',
    async (url, { arg }) => {
      const params = new URLSearchParams();
      if (arg?.context) params.append('context', arg.context);
      if (arg?.mode) params.append('mode', arg.mode);
      if (arg?.target) params.append('target', String(arg.target));

      const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to start session');
      return response.json();
    },
    {
      onSuccess: () => {
        // Invalidate related caches
        mutate('/api/micro/sessions/active');
        mutate('/api/micro/queue');
      },
    }
  );
}

/**
 * Submit a micro flashcard review within a session
 */
export function useMicroReview(sessionId: string) {
  const url = `/api/micro/sessions/${sessionId}/review`;

  return useSWRMutation<
    MicroReviewResponse,
    Error,
    string,
    { micro_flashcard_id: number; quality: number; context?: MicroContext }
  >(
    url,
    async (url, { arg }) => {
      const params = new URLSearchParams();
      if (arg?.context) params.append('context', arg.context);

      const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          body: JSON.stringify({
            micro_flashcard_id: arg.micro_flashcard_id,
            quality: arg.quality,
          }),
        },
      });
      if (!response.ok) throw new Error('Failed to submit review');
      return response.json();
    },
    {
      onSuccess: () => {
        mutate('/api/micro/stats');
        mutate('/api/micro/due');
      },
    }
  );
}

/**
 * End a quick session and record final metrics
 */
export function useEndQuickSession(sessionId: string) {
  const url = `/api/micro/sessions/${sessionId}/end`;

  return useSWRMutation<
    {
      session_id: string;
      is_completed: boolean;
      duration_seconds: number | null;
      cards_completed: number;
      cards_presented: number;
      completion_rate: number;
    },
    Error,
    string,
    { cards_completed?: number }
  >(
    url,
    async (url, { arg }) => {
      const params = new URLSearchParams();
      if (arg?.cards_completed !== undefined) {
        params.append('cards_completed', String(arg.cards_completed));
      }

      const fullUrl = `${url}${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) throw new Error('Failed to end session');
      return response.json();
    },
    {
      onSuccess: () => {
        mutate('/api/micro/sessions/active');
        mutate('/api/micro/sessions/history');
        mutate('/api/micro/stats');
      },
    }
  );
}

/**
 * Get user's currently active quick session
 */
export function useActiveQuickSession() {
  return useSWR<{ active_session: QuickSessionDetail | null }>(
    '/api/micro/sessions/active',
    fetcher
  );
}

/**
 * Get user's completed quick session history
 */
export function useQuickSessionHistory(limit?: number) {
  const url = limit
    ? `/api/micro/sessions/history?limit=${limit}`
    : '/api/micro/sessions/history';

  return useSWR<
    { total_sessions: number; sessions: Array<QuickSessionDetail> }
  >(url, fetcher);
}

// ============ Single Micro Flashcard Hook ============

/**
 * Get a single micro flashcard by ID
 */
export function useMicroFlashcard(microId: number | undefined) {
  return useSWR<MicroFlashcardWithProgress>(
    microId ? `/api/micro/flashcards/${microId}` : null,
    fetcher
  );
}

// ============ Utility Functions ============

/**
 * Invalidate all micro-learning caches
 */
export function invalidateMicroCaches() {
  mutate((key) => typeof key === 'string' && key.startsWith('/api/micro'));
}

/**
 * Prefetch study queue for faster initial load
 */
export function prefetchStudyQueue(context?: MicroContext) {
  const params = context ? `?context=${context}` : '';
  return mutate(`/api/micro/queue${params}`, fetcher(`/api/micro/queue${params}`));
}
