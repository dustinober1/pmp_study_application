import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { storage } from './client';
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
  StudyQueueEntry,
} from '@/types';

const MICRO_SESSIONS_KEY = 'pmp_micro_sessions';

interface StudyQueueOptions {
  context?: MicroContext;
  limit?: number;
}

interface DueCardsOptions {
  context?: MicroContext;
  limit?: number;
}

interface StartSessionOptions {
  context?: MicroContext;
  mode?: MicroSessionMode;
  target?: number;
}

/**
 * Get user's study queue for micro-learning (Mocked)
 */
export function useStudyQueue(options?: StudyQueueOptions) {
  const url = `/api/micro/queue`;
  return useSWR<StudyQueueResponse>(url, async () => {
    const res = await fetch('/data/flashcards.json');
    const allCards = await res.json();
    const queue: StudyQueueEntry[] = allCards.slice(0, options?.limit || 10).map((c: { id: number; front: string; back: string }, index: number) => ({
      queue_id: crypto.randomUUID(),
      position: index,
      recommended_context: options?.context || 'general',
      priority_score: 1.0,
      micro_flashcard: {
        id: c.id,
        micro_front: c.front,
        micro_back: c.back,
        audio_script: null,
        context_tags: [],
        estimated_seconds: 30,
        priority: 1,
        source_flashcard_id: c.id,
      },
      source_flashcard_id: c.id,
    }));

    return {
      user_id: 'guest',
      context: options?.context || 'general',
      queue: queue,
      queue_size: queue.length
    };
  });
}

/**
 * Rebuild user's study queue (Mocked)
 */
export function useRebuildQueue() {
  return useSWRMutation<
    { user_id: string; context: string; queue_size: number; message: string },
    Error,
    string,
    { context?: MicroContext; limit?: number }
  >(
    '/api/micro/queue/rebuild',
    async () => {
      return { user_id: 'guest', context: 'general', queue_size: 10, message: 'Queue rebuilt locally' };
    },
    {
      onSuccess: () => {
        mutate('/api/micro/queue');
      },
    }
  );
}

/**
 * Get micro cards due for review (Mocked)
 */
export function useDueCards(options?: DueCardsOptions) {
  const url = `/api/micro/due`;
  return useSWR<DueCardsResponse>(url, async (): Promise<DueCardsResponse> => {
    const res = await fetch('/data/flashcards.json');
    const allCards = await res.json();
    return {
      user_id: 'guest',
      due_count: 5,
      cards: allCards.slice(0, options?.limit || 5).map((c: { id: number; front: string; back: string }) => ({
        micro_flashcard_id: c.id,
        micro_front: c.front,
        micro_back: c.back,
        audio_script: null,
        estimated_seconds: 30,
        progress: {
          ease_factor: 2.5,
          interval: 1,
          repetitions: 0,
          review_count: 0,
          last_quality: null,
          next_review_at: null,
        },
        source_flashcard_id: c.id,
      })),
    };
  });
}

/**
 * Get micro-learning statistics (Mocked)
 */
export function useMicroStats() {
  return useSWR<MicroStatsResponse>('/api/micro/stats', async (): Promise<MicroStatsResponse> => {
    return {
      user_id: 'guest',
      total_reviews: 0,
      overall_accuracy: 0,
      unique_cards_learned: 0,
      context_accuracy: {},
      recent_sessions: {
        total: 0,
        avg_cards_completed: 0,
        avg_duration_seconds: 0,
      },
    };
  });
}

/**
 * Start a new quick micro-learning session (Mocked)
 */
export function useStartQuickSession() {
  return useSWRMutation<QuickSession, Error, string, StartSessionOptions>(
    '/api/micro/sessions/start',
    async (_url, { arg }) => {
      const newSession: QuickSession = {
        session_id: crypto.randomUUID(),
        context: arg.context || 'general',
        mode: arg.mode || 'cards',
        target: arg.target || 5,
        cards_count: arg.target || 5,
        started_at: new Date().toISOString(),
      };
      const sessions = storage.get<QuickSession[]>(MICRO_SESSIONS_KEY) || [];
      sessions.push(newSession);
      storage.set(MICRO_SESSIONS_KEY, sessions);
      return newSession;
    },
    {
      onSuccess: () => {
        mutate('/api/micro/sessions/active');
        mutate('/api/micro/queue');
      },
    }
  );
}

/**
 * Submit a micro flashcard review (Mocked)
 */
export function useMicroReview(_sessionId: string) {
  const url = `/api/micro/sessions/${_sessionId}/review`;
  return useSWRMutation<
    MicroReviewResponse,
    Error,
    string,
    { micro_flashcard_id: number; quality: number; context?: MicroContext }
  >(
    url,
    async () => {
      return {
        micro_flashcard_id: 0,
        quality: 0,
        ease_factor: 2.5,
        interval: 1,
        repetitions: 1,
        next_review_at: new Date().toISOString(),
      };
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
 * End a quick session (Mocked)
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
    async () => {
      const sessions = storage.get<QuickSessionDetail[]>(MICRO_SESSIONS_KEY) || [];
      const sessionIndex = sessions.findIndex(s => s.session_id === sessionId);
      if (sessionIndex !== -1) {
        sessions[sessionIndex].status = 'completed';
        sessions[sessionIndex].ended_at = new Date().toISOString();
        storage.set(MICRO_SESSIONS_KEY, sessions);
      }
      return {
        session_id: sessionId,
        is_completed: true,
        duration_seconds: 120,
        cards_completed: 5,
        cards_presented: 5,
        completion_rate: 100,
      };
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
 * Get active quick session (Mocked)
 */
export function useActiveQuickSession() {
  return useSWR<{ active_session: QuickSessionDetail | null }>(
    '/api/micro/sessions/active',
    async (): Promise<{ active_session: QuickSessionDetail | null }> => {
      const sessions = storage.get<QuickSessionDetail[]>(MICRO_SESSIONS_KEY) || [];
      const active = sessions.find(s => s.status === 'in_progress');
      if (!active) return { active_session: null };
      
      return {
        active_session: {
          ...active,
          cards: [],
        }
      };
    }
  );
}

/**
 * Get quick session history (Mocked)
 */
export function useQuickSessionHistory(limit?: number) {
  const url = '/api/micro/sessions/history';
  return useSWR<{ total_sessions: number; sessions: Array<QuickSessionDetail> }>(
    url,
    async (): Promise<{ total_sessions: number; sessions: Array<QuickSessionDetail> }> => {
      const sessions = storage.get<QuickSessionDetail[]>(MICRO_SESSIONS_KEY) || [];
      return {
        total_sessions: sessions.length,
        sessions: sessions.slice(0, limit || 10).map(s => ({
          ...s,
          cards: [],
        }))
      };
    }
  );
}

/**
 * Get a single micro flashcard (Mocked)
 */
export function useMicroFlashcard(microId: number | undefined) {
  return useSWR<MicroFlashcardWithProgress>(
    microId ? `/api/micro/flashcards/${microId}` : null,
    async () => {
      const res = await fetch('/data/flashcards.json');
      const allCards = await res.json();
      const card = allCards.find((c: { id: number; front: string; back: string }) => c.id === microId);
      return {
        id: card.id,
        micro_front: card.front,
        micro_back: card.back,
        audio_script: null,
        context_tags: [],
        estimated_seconds: 30,
        priority: 1,
        source_flashcard_id: card.id,
        progress: {
          ease_factor: 2.5,
          interval: 1,
          repetitions: 0,
          review_count: 0,
          last_quality: null,
          next_review_at: null,
        }
      };
    }
  );
}

/**
 * Prefetch study queue for faster initial load (Mocked)
 */
export function prefetchStudyQueue(context?: MicroContext) {
  const params = context ? `?context=${context}` : '';
  const url = `/api/micro/queue${params}`;
  // For mock, we just use useStudyQueue's internal logic or a simple fetch
  return mutate(url);
}

/**
 * Invalidate all micro-learning caches
 */
export function invalidateMicroCaches() {
  mutate((key) => typeof key === 'string' && key.startsWith('/api/micro'));
}
