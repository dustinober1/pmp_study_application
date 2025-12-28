/**
 * Zustand store for exam simulation state management
 * Handles exam sessions, answers, timer, and history
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type {
  ExamSession,
  ExamSessionDetail,
  ExamQuestion,
  ExamReport,
  ExamResult,
  ExamStatusType,
} from '@/types';

interface ExamAnswerState {
  question_id: number;
  question_index: number;
  selected_answer: string | null;
  is_correct: boolean | null;
  time_spent_seconds: number;
  is_flagged: boolean;
}

interface ExamSessionState {
  id: string;
  status: ExamStatusType;
  start_time: string;
  end_time: string | null;
  total_time_seconds: number;
  time_remaining_seconds: number;
  questions_count: number;
  current_question_index: number;
  answers: ExamAnswerState[];
  questions: ExamQuestion[];
  time_expired: boolean;
}

interface ExamState {
  // Current exam session
  currentSession: ExamSessionState | null;

  // Exam history (cached from API)
  history: ExamSession[];

  // Current exam report (after completion)
  currentReport: ExamReport | null;

  // Current exam result
  currentResult: ExamResult | null;

  // Loading states
  isLoadingSession: boolean;
  isLoadingHistory: boolean;
  isLoadingReport: boolean;
  examError: string | null;

  // Actions - Session management
  startExam: (sessionId: string, questions: ExamQuestion[], durationSeconds: number) => void;
  loadExamSession: (session: ExamSessionDetail, questions: ExamQuestion[]) => void;
  updateSession: (updates: Partial<ExamSessionState>) => void;

  // Actions - Answers
  submitAnswer: (questionId: number, questionIndex: number, answer: string, timeSpentSeconds: number) => void;
  flagQuestion: (questionIndex: number, flagged: boolean) => void;
  updateQuestionTime: (questionIndex: number, timeSpentSeconds: number) => void;

  // Actions - Navigation
  goToQuestion: (questionIndex: number) => void;
  goToNextQuestion: () => void;
  goToPreviousQuestion: () => void;

  // Actions - Timer
  updateTimeRemaining: (seconds: number) => void;
  decrementTimer: (seconds: number) => void;
  expireTime: () => void;

  // Actions - Completion
  endExam: (result: ExamResult, report?: ExamReport) => void;
  abandonExam: () => void;

  // Actions - History
  loadHistory: (sessions: ExamSession[]) => void;
  addSessionToHistory: (session: ExamSession) => void;

  // Actions - Reports
  loadReport: (report: ExamReport) => void;
  clearReport: () => void;

  // Actions - State
  setLoadingSession: (loading: boolean) => void;
  setLoadingHistory: (loading: boolean) => void;
  setLoadingReport: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Actions - Reset
  clearCurrentSession: () => void;
  reset: () => void;
}

const initialState = {
  currentSession: null,
  history: [],
  currentReport: null,
  currentResult: null,
  isLoadingSession: false,
  isLoadingHistory: false,
  isLoadingReport: false,
  examError: null,
};

export const useExamStore = create<ExamState>()(
  persist(
    (set, get) => ({
      ...initialState,

      startExam: (sessionId, questions, durationSeconds) => {
        const now = new Date().toISOString();
        set({
          currentSession: {
            id: sessionId,
            status: 'in_progress',
            start_time: now,
            end_time: null,
            total_time_seconds: durationSeconds,
            time_remaining_seconds: durationSeconds,
            questions_count: questions.length,
            current_question_index: 0,
            answers: questions.map((q) => ({
              question_id: q.question_id,
              question_index: q.question_index,
              selected_answer: q.selected_answer,
              is_correct: q.is_correct,
              time_spent_seconds: q.time_spent_seconds,
              is_flagged: q.is_flagged,
            })),
            questions,
            time_expired: false,
          },
          currentResult: null,
          currentReport: null,
          examError: null,
        });
      },

      loadExamSession: (session, questions) => {
        set({
          currentSession: {
            id: session.id,
            status: session.status,
            start_time: session.start_time,
            end_time: session.end_time,
            total_time_seconds: session.total_time_seconds,
            time_remaining_seconds: session.remaining_time_seconds,
            questions_count: session.questions_count,
            current_question_index: session.current_question_index,
            answers: questions.map((q) => ({
              question_id: q.question_id,
              question_index: q.question_index,
              selected_answer: q.selected_answer,
              is_correct: q.is_correct,
              time_spent_seconds: q.time_spent_seconds,
              is_flagged: q.is_flagged,
            })),
            questions,
            time_expired: session.time_expired,
          },
          currentResult: null,
          currentReport: null,
        });
      },

      updateSession: (updates) => {
        const { currentSession } = get();
        if (currentSession) {
          set({ currentSession: { ...currentSession, ...updates } });
        }
      },

      submitAnswer: (questionId, questionIndex, answer, timeSpentSeconds) => {
        const { currentSession } = get();
        if (currentSession) {
          const updatedAnswers = currentSession.answers.map((a) =>
            a.question_index === questionIndex
              ? { ...a, selected_answer: answer, time_spent_seconds: timeSpentSeconds }
              : a
          );

          const updatedQuestions = currentSession.questions.map((q) =>
            q.question_index === questionIndex
              ? { ...q, selected_answer: answer, time_spent_seconds: timeSpentSeconds }
              : q
          );

          set({
            currentSession: {
              ...currentSession,
              answers: updatedAnswers,
              questions: updatedQuestions,
            },
          });
        }
      },

      flagQuestion: (questionIndex, flagged) => {
        const { currentSession } = get();
        if (currentSession) {
          const updatedAnswers = currentSession.answers.map((a) =>
            a.question_index === questionIndex ? { ...a, is_flagged: flagged } : a
          );

          const updatedQuestions = currentSession.questions.map((q) =>
            q.question_index === questionIndex ? { ...q, is_flagged: flagged } : q
          );

          set({
            currentSession: {
              ...currentSession,
              answers: updatedAnswers,
              questions: updatedQuestions,
            },
          });
        }
      },

      updateQuestionTime: (questionIndex, timeSpentSeconds) => {
        const { currentSession } = get();
        if (currentSession) {
          const updatedAnswers = currentSession.answers.map((a) =>
            a.question_index === questionIndex ? { ...a, time_spent_seconds: timeSpentSeconds } : a
          );

          const updatedQuestions = currentSession.questions.map((q) =>
            q.question_index === questionIndex ? { ...q, time_spent_seconds: timeSpentSeconds } : q
          );

          set({
            currentSession: {
              ...currentSession,
              answers: updatedAnswers,
              questions: updatedQuestions,
            },
          });
        }
      },

      goToQuestion: (questionIndex) => {
        const { currentSession } = get();
        if (currentSession && questionIndex >= 0 && questionIndex < currentSession.questions_count) {
          set({
            currentSession: {
              ...currentSession,
              current_question_index: questionIndex,
            },
          });
        }
      },

      goToNextQuestion: () => {
        const { currentSession } = get();
        if (currentSession) {
          const nextIndex = Math.min(currentSession.current_question_index + 1, currentSession.questions_count - 1);
          set({
            currentSession: {
              ...currentSession,
              current_question_index: nextIndex,
            },
          });
        }
      },

      goToPreviousQuestion: () => {
        const { currentSession } = get();
        if (currentSession) {
          const prevIndex = Math.max(currentSession.current_question_index - 1, 0);
          set({
            currentSession: {
              ...currentSession,
              current_question_index: prevIndex,
            },
          });
        }
      },

      updateTimeRemaining: (seconds) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              time_remaining_seconds: Math.max(0, seconds),
            },
          });
        }
      },

      decrementTimer: (seconds) => {
        const { currentSession } = get();
        if (currentSession) {
          const newRemaining = Math.max(0, currentSession.time_remaining_seconds - seconds);
          set({
            currentSession: {
              ...currentSession,
              time_remaining_seconds: newRemaining,
              time_expired: newRemaining === 0,
            },
          });
        }
      },

      expireTime: () => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              time_remaining_seconds: 0,
              time_expired: true,
              status: 'completed',
            },
          });
        }
      },

      endExam: (result, report) => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              status: 'completed',
              end_time: new Date().toISOString(),
            },
            currentResult: result,
            currentReport: report ?? null,
          });
        }
      },

      abandonExam: () => {
        const { currentSession } = get();
        if (currentSession) {
          set({
            currentSession: {
              ...currentSession,
              status: 'abandoned',
              end_time: new Date().toISOString(),
            },
            currentResult: null,
            currentReport: null,
          });
        }
      },

      loadHistory: (sessions) => {
        set({ history: sessions });
      },

      addSessionToHistory: (session) => {
        const { history } = get();
        set({
          history: [session, ...history].sort(
            (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
          ),
        });
      },

      loadReport: (report) => {
        set({ currentReport: report });
      },

      clearReport: () => {
        set({ currentReport: null });
      },

      setLoadingSession: (loading) => {
        set({ isLoadingSession: loading });
      },

      setLoadingHistory: (loading) => {
        set({ isLoadingHistory: loading });
      },

      setLoadingReport: (loading) => {
        set({ isLoadingReport: loading });
      },

      setError: (error) => {
        set({ examError: error });
      },

      clearCurrentSession: () => {
        set({
          currentSession: null,
          currentResult: null,
          currentReport: null,
          examError: null,
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'pmp-exam-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentSession: state.currentSession,
        currentResult: state.currentResult,
        currentReport: state.currentReport,
        history: state.history,
      }),
    }
  )
);

// Selector hooks for common use cases
export const useCurrentExamSession = () => useExamStore((state) => state.currentSession);
export const useExamHistory = () => useExamStore((state) => state.history);
export const useCurrentExamReport = () => useExamStore((state) => state.currentReport);
export const useCurrentExamResult = () => useExamStore((state) => state.currentResult);
export const useExamTimeRemaining = () => useExamStore((state) => state.currentSession?.time_remaining_seconds ?? null);
export const useExamCurrentQuestion = () => useExamStore((state) => {
  if (!state.currentSession) return null;
  return state.currentSession.questions[state.currentSession.current_question_index] ?? null;
});
export const useExamQuestionCount = () => useExamStore((state) => state.currentSession?.questions_count ?? 0);
export const useExamAnsweredCount = () => useExamStore((state) => {
  if (!state.currentSession) return 0;
  return state.currentSession.answers.filter((a) => a.selected_answer !== null).length;
});
export const useExamFlaggedCount = () => useExamStore((state) => {
  if (!state.currentSession) return 0;
  return state.currentSession.answers.filter((a) => a.is_flagged).length;
});
export const useExamInProgress = () => useExamStore((state) => state.currentSession?.status === 'in_progress');
export const useExamIsCompleted = () => useExamStore((state) => state.currentSession?.status === 'completed');
export const useExamLoading = () => useExamStore((state) => ({
  session: state.isLoadingSession,
  history: state.isLoadingHistory,
  report: state.isLoadingReport,
}));
export const useExamError = () => useExamStore((state) => state.examError);

// Computed selectors
export const useExamProgress = () => {
  const session = useExamStore((state) => state.currentSession);

  if (!session) {
    return {
      answered: 0,
      total: 0,
      percentage: 0,
      flagged: 0,
      current: 0,
    };
  }

  const answered = session.answers.filter((a) => a.selected_answer !== null).length;
  const flagged = session.answers.filter((a) => a.is_flagged).length;

  return {
    answered,
    total: session.questions_count,
    percentage: session.questions_count > 0 ? (answered / session.questions_count) * 100 : 0,
    flagged,
    current: session.current_question_index,
  };
};

export const useExamTimer = () => {
  const session = useExamStore((state) => state.currentSession);

  if (!session) {
    return {
      remaining: 0,
      total: 0,
      percentage: 0,
      isExpired: false,
      formatted: '0:00:00',
    };
  }

  const remaining = session.time_remaining_seconds;
  const total = session.total_time_seconds;
  const percentage = total > 0 ? (remaining / total) * 100 : 0;

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  const formatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    remaining,
    total,
    percentage,
    isExpired: session.time_expired || remaining === 0,
    formatted,
  };
};

export const useExamQuestionByIndex = (index: number) => {
  return useExamStore((state) => state.currentSession?.questions[index] ?? null);
};

export const useExamAnswerByIndex = (index: number) => {
  return useExamStore((state) => state.currentSession?.answers[index] ?? null);
};
