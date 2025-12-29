/**
 * Zustand store for Micro-Learning state management
 * Handles 2-minute micro-learning sessions with context-aware study
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MicroContext, MicroSessionMode } from '@/types';

interface MicroSessionState {
  sessionId: string | null;
  context: MicroContext;
  mode: MicroSessionMode;
  target: number;
  startedAt: string | null;
  currentIndex: number;
  cardsPresented: number[];
  cardsCompleted: number;
}

interface AudioState {
  isEnabled: boolean;
  isPlaying: boolean;
  currentText: string | null;
  rate: number; // Speech rate (0.5 to 2)
  pitch: number; // Speech pitch (0.5 to 2)
}

interface QueueState {
  lastRebuildAt: string | null;
  queueSize: number;
  selectedContext: MicroContext;
}

interface MicroLearningState {
  // Micro session
  currentSession: MicroSessionState | null;

  // Audio playback
  audio: AudioState;

  // Queue management
  queue: QueueState;

  // User preferences
  preferredContext: MicroContext;
  preferredMode: MicroSessionMode;
  defaultCardCount: number;
  defaultTimeSeconds: number;

  // Loading/error states
  isStartingSession: boolean;
  sessionError: string | null;

  // Actions - Session
  startMicroSession: (
    sessionId: string,
    context: MicroContext,
    mode: MicroSessionMode,
    target: number,
    cardsCount: number
  ) => void;
  updateSessionIndex: (index: number) => void;
  incrementCardsCompleted: () => void;
  endMicroSession: () => void;
  setSessionError: (error: string | null) => void;
  setStartingSession: (starting: boolean) => void;

  // Actions - Audio
  setAudioEnabled: (enabled: boolean) => void;
  setAudioPlaying: (playing: boolean, text?: string) => void;
  setAudioRate: (rate: number) => void;
  setAudioPitch: (pitch: number) => void;

  // Actions - Queue
  setQueueLastRebuild: (timestamp: string) => void;
  setQueueSize: (size: number) => void;
  setSelectedContext: (context: MicroContext) => void;

  // Actions - Preferences
  setPreferredContext: (context: MicroContext) => void;
  setPreferredMode: (mode: MicroSessionMode) => void;
  setDefaultCardCount: (count: number) => void;
  setDefaultTimeSeconds: (seconds: number) => void;

  // Reset
  reset: () => void;
}

const initialSessionState: MicroSessionState = {
  sessionId: null,
  context: 'general',
  mode: 'cards',
  target: 5,
  startedAt: null,
  currentIndex: 0,
  cardsPresented: [],
  cardsCompleted: 0,
};

const initialAudioState: AudioState = {
  isEnabled: false,
  isPlaying: false,
  currentText: null,
  rate: 1.0,
  pitch: 1.0,
};

const initialQueueState: QueueState = {
  lastRebuildAt: null,
  queueSize: 0,
  selectedContext: 'general',
};

const initialState = {
  currentSession: null,
  audio: initialAudioState,
  queue: initialQueueState,
  preferredContext: 'general',
  preferredMode: 'cards',
  defaultCardCount: 5,
  defaultTimeSeconds: 120,
  isStartingSession: false,
  sessionError: null,
};

export const useMicroStore = create<MicroLearningState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Session actions
      startMicroSession: (sessionId, context, mode, target, cardsCount) => {
        set({
          currentSession: {
            ...initialSessionState,
            sessionId,
            context,
            mode,
            target,
            startedAt: new Date().toISOString(),
            cardsPresented: Array.from({ length: cardsCount }, (_, i) => i),
          },
          sessionError: null,
        });
      },

      updateSessionIndex: (index) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              currentIndex: index,
            },
          });
        }
      },

      incrementCardsCompleted: () => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              cardsCompleted: currentSession.cardsCompleted + 1,
            },
          });
        }
      },

      endMicroSession: () => {
        set({ currentSession: null });
      },

      setSessionError: (error) => {
        set({ sessionError: error });
      },

      setStartingSession: (starting) => {
        set({ isStartingSession: starting });
      },

      // Audio actions
      setAudioEnabled: (enabled) => {
        set({
          audio: { ...get().audio, isEnabled: enabled },
        });
      },

      setAudioPlaying: (playing, text) => {
        set({
          audio: {
            ...get().audio,
            isPlaying: playing,
            currentText: text ?? null,
          },
        });
      },

      setAudioRate: (rate) => {
        set({
          audio: { ...get().audio, rate: Math.max(0.5, Math.min(2, rate)) },
        });
      },

      setAudioPitch: (pitch) => {
        set({
          audio: { ...get().audio, pitch: Math.max(0.5, Math.min(2, pitch)) },
        });
      },

      // Queue actions
      setQueueLastRebuild: (timestamp) => {
        set({
          queue: { ...get().queue, lastRebuildAt: timestamp },
        });
      },

      setQueueSize: (size) => {
        set({
          queue: { ...get().queue, queueSize: size },
        });
      },

      setSelectedContext: (context) => {
        set({
          queue: { ...get().queue, selectedContext: context },
        });
      },

      // Preferences actions
      setPreferredContext: (context) => {
        set({ preferredContext: context });
      },

      setPreferredMode: (mode) => {
        set({ preferredMode: mode });
      },

      setDefaultCardCount: (count) => {
        set({ defaultCardCount: Math.max(1, Math.min(20, count)) });
      },

      setDefaultTimeSeconds: (seconds) => {
        set({ defaultTimeSeconds: Math.max(30, Math.min(300, seconds)) });
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'pmp-micro-learning-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        preferredContext: state.preferredContext,
        preferredMode: state.preferredMode,
        defaultCardCount: state.defaultCardCount,
        defaultTimeSeconds: state.defaultTimeSeconds,
        audio: {
          isEnabled: state.audio.isEnabled,
          rate: state.audio.rate,
          pitch: state.audio.pitch,
        },
        queue: {
          selectedContext: state.queue.selectedContext,
        },
      }),
    }
  )
);

// Selector hooks for common use cases
export const useCurrentMicroSession = () =>
  useMicroStore((state) => state.currentSession);
export const useMicroAudio = () => useMicroStore((state) => state.audio);
export const useMicroQueue = () => useMicroStore((state) => state.queue);
export const useMicroPreferences = () =>
  useMicroStore((state) => ({
    context: state.preferredContext,
    mode: state.preferredMode,
    cardCount: state.defaultCardCount,
    timeSeconds: state.defaultTimeSeconds,
  }));
export const useIsInMicroSession = () =>
  useMicroStore((state) => state.currentSession !== null);
export const useMicroSessionError = () =>
  useMicroStore((state) => state.sessionError);

// Computed selectors
export const useMicroSessionProgress = () => {
  const session = useMicroStore((state) => state.currentSession);

  if (!session) {
    return { progress: 0, remaining: 0, percentage: 0 };
  }

  const total = session.cardsPresented.length;
  const completed = session.cardsCompleted;
  const remaining = total - completed;
  const percentage = total > 0 ? (completed / total) * 100 : 0;

  return { progress: completed, remaining, percentage };
};

export const useMicroSessionTimeRemaining = () => {
  const session = useMicroStore((state) => state.currentSession);

  if (!session || !session.startedAt || session.mode !== 'time') {
    return null;
  }

  const elapsed = Math.floor(
    (Date.now() - new Date(session.startedAt).getTime()) / 1000
  );
  const remaining = Math.max(0, session.target - elapsed);

  return { elapsed, remaining, target: session.target };
};

export const useShouldRebuildQueue = () => {
  const queue = useMicroStore((state) => state.queue);
  const session = useMicroStore((state) => state.currentSession);

  // Don't suggest rebuild if in active session
  if (session) {
    return false;
  }

  // Suggest rebuild if never rebuilt or more than 1 hour ago
  if (!queue.lastRebuildAt) {
    return true;
  }

  const lastRebuild = new Date(queue.lastRebuildAt).getTime();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  return lastRebuild < oneHourAgo;
};
