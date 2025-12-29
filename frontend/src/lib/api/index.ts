/**
 * API module exports
 */

// Client utilities
export {
  API_BASE_URL,
  ANONYMOUS_ID_KEY,
  getAnonymousId,
  buildHeaders,
  ApiClientError,
  fetcher,
  post,
  put,
  patch,
  del,
} from './client';

// SWR hooks
export {
  // Domain hooks
  useDomains,
  useDomain,
  // Task hooks
  useTasks,
  useTask,
  // Flashcard hooks
  useFlashcards,
  useFlashcard,
  useFlashcardsDue,
  useFlashcardReview,
  // Question hooks
  useQuestions,
  useQuestion,
  useQuestionAnswer,
  // Progress hooks
  useProgressSummary,
  useDomainProgress,
  useStudyStreak,
  // Session hooks
  useStudySessions,
  useActiveSession,
  useStartSession,
  useEndSession,
  // User hooks
  useCurrentUser,
  useRegisterUser,
  // Utility functions
  prefetchDomains,
  invalidateAllCaches,
  invalidateProgressCaches,
} from './hooks';

// Explanation hooks
export {
  useExplanation,
  useRateExplanation,
  useRecordPerformance,
  useUserPreferences,
  useUpdatePreferences,
  useStyleAnalytics,
  invalidateExplanationCaches,
  type ExplanationStyle,
  type ExplanationData,
  type ExplanationRateRequest,
  type StyleAnalytics,
  type StyleAnalyticsItem,
  type UserLearningPreferences,
  type ExplanationPreferencesUpdate,
} from './explanations';

// Micro-learning hooks
export {
  useStudyQueue,
  useRebuildQueue,
  useDueCards,
  useMicroStats,
  useStartQuickSession,
  useMicroReview,
  useEndQuickSession,
  useActiveQuickSession,
  useQuickSessionHistory,
  useMicroFlashcard,
  invalidateMicroCaches,
  prefetchStudyQueue,
} from './micro';
