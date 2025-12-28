/**
 * Zustand store for progress and study session state management
 * Handles local progress tracking and study session state
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  OverallProgressSummary,
  DomainProgressSummary,
  SessionType,
} from '@/types';

interface StudySessionState {
  id: string | null;
  type: SessionType;
  domainId: number | null;
  taskId: number | null;
  startedAt: string | null;
  flashcardsReviewed: number;
  flashcardsCorrect: number;
  questionsAnswered: number;
  questionsCorrect: number;
}

interface ProgressState {
  // Progress summary (cached from API)
  overallProgress: OverallProgressSummary | null;
  domainProgress: DomainProgressSummary[];

  // Current study session
  currentSession: StudySessionState | null;

  // Study preferences
  selectedDomainId: number | null;
  selectedTaskId: number | null;

  // Loading states
  isLoadingProgress: boolean;
  progressError: string | null;

  // Actions
  setOverallProgress: (progress: OverallProgressSummary | null) => void;
  setDomainProgress: (progress: DomainProgressSummary[]) => void;
  setSelectedDomain: (domainId: number | null) => void;
  setSelectedTask: (taskId: number | null) => void;
  setLoadingProgress: (loading: boolean) => void;
  setProgressError: (error: string | null) => void;

  // Session actions
  startSession: (type: SessionType, domainId?: number, taskId?: number) => void;
  updateSession: (updates: Partial<Pick<StudySessionState, 'flashcardsReviewed' | 'flashcardsCorrect' | 'questionsAnswered' | 'questionsCorrect'>>) => void;
  endSession: () => void;
  setSessionId: (id: string) => void;

  // Progress tracking actions
  incrementFlashcardReview: (correct: boolean) => void;
  incrementQuestionAnswer: (correct: boolean) => void;

  // Reset
  reset: () => void;
}

const initialSessionState: StudySessionState = {
  id: null,
  type: 'mixed',
  domainId: null,
  taskId: null,
  startedAt: null,
  flashcardsReviewed: 0,
  flashcardsCorrect: 0,
  questionsAnswered: 0,
  questionsCorrect: 0,
};

const initialState = {
  overallProgress: null,
  domainProgress: [],
  currentSession: null,
  selectedDomainId: null,
  selectedTaskId: null,
  isLoadingProgress: false,
  progressError: null,
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setOverallProgress: (progress) => {
        set({ overallProgress: progress });
      },

      setDomainProgress: (progress) => {
        set({ domainProgress: progress });
      },

      setSelectedDomain: (domainId) => {
        set({
          selectedDomainId: domainId,
          // Clear task selection when domain changes
          selectedTaskId: null,
        });
      },

      setSelectedTask: (taskId) => {
        set({ selectedTaskId: taskId });
      },

      setLoadingProgress: (loading) => {
        set({ isLoadingProgress: loading });
      },

      setProgressError: (error) => {
        set({ progressError: error });
      },

      startSession: (type, domainId, taskId) => {
        set({
          currentSession: {
            ...initialSessionState,
            type,
            domainId: domainId ?? null,
            taskId: taskId ?? null,
            startedAt: new Date().toISOString(),
          },
        });
      },

      updateSession: (updates) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              ...updates,
            },
          });
        }
      },

      endSession: () => {
        set({ currentSession: null });
      },

      setSessionId: (id) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              id,
            },
          });
        }
      },

      incrementFlashcardReview: (correct) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              flashcardsReviewed: currentSession.flashcardsReviewed + 1,
              flashcardsCorrect: correct
                ? currentSession.flashcardsCorrect + 1
                : currentSession.flashcardsCorrect,
            },
          });
        }
      },

      incrementQuestionAnswer: (correct) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              questionsAnswered: currentSession.questionsAnswered + 1,
              questionsCorrect: correct
                ? currentSession.questionsCorrect + 1
                : currentSession.questionsCorrect,
            },
          });
        }
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'pmp-progress-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        selectedDomainId: state.selectedDomainId,
        selectedTaskId: state.selectedTaskId,
        currentSession: state.currentSession,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useOverallProgress = () => useProgressStore((state) => state.overallProgress);
export const useDomainProgressList = () => useProgressStore((state) => state.domainProgress);
export const useCurrentSession = () => useProgressStore((state) => state.currentSession);
export const useSelectedDomain = () => useProgressStore((state) => state.selectedDomainId);
export const useSelectedTask = () => useProgressStore((state) => state.selectedTaskId);
export const useIsInSession = () => useProgressStore((state) => state.currentSession !== null);

// Computed selectors
export const useSessionStats = () => {
  const session = useProgressStore((state) => state.currentSession);

  if (!session) {
    return {
      totalReviews: 0,
      correctReviews: 0,
      accuracy: 0,
      duration: 0,
    };
  }

  const totalReviews = session.flashcardsReviewed + session.questionsAnswered;
  const correctReviews = session.flashcardsCorrect + session.questionsCorrect;
  const accuracy = totalReviews > 0 ? (correctReviews / totalReviews) * 100 : 0;

  const duration = session.startedAt
    ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000)
    : 0;

  return {
    totalReviews,
    correctReviews,
    accuracy,
    duration,
  };
};

export const useDomainProgressById = (domainId: number) => {
  return useProgressStore((state) =>
    state.domainProgress.find((d) => d.domain_id === domainId)
  );
};
