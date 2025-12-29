/**
 * Zustand stores exports
 */

// User store
export {
  useUserStore,
  useUser,
  useAnonymousId,
  useIsAuthenticated,
  useUserLoading,
  useUserError,
} from './userStore';

// Progress store
export {
  useProgressStore,
  useOverallProgress,
  useDomainProgressList,
  useCurrentSession,
  useSelectedDomain,
  useSelectedTask,
  useIsInSession,
  useSessionStats,
  useDomainProgressById,
} from './progressStore';

// Analytics store
export {
  useAnalyticsStore,
  useAnalytics,
  useRecommendations,
  useAnalyticsSummary,
  useAnalyticsLoading,
  useRecommendationsLoading,
  useAnalyticsRefreshing,
  useAnalyticsError,
  useRecommendationsError,
  useActiveRecommendations,
  useHighPriorityRecommendations,
  useDomainPerformance,
  useTaskPerformance,
  useWeakAreasByPriority,
  useAnalyticsIsStale,
  useAnalyticsActions,
} from './analyticsStore';

// Re-export analytics types
export type {
  DomainPerformance,
  TaskPerformance,
  StudyPattern,
  WeakArea,
  UserAnalytics,
  RecommendationType,
  RecommendationPriority,
  LearningRecommendation,
  AnalyticsSummary,
} from './analyticsStore';

// Exam store
export {
  useExamStore,
  useCurrentExamSession,
  useExamHistory,
  useCurrentExamReport,
  useCurrentExamResult,
  useExamTimeRemaining,
  useExamCurrentQuestion,
  useExamQuestionCount,
  useExamAnsweredCount,
  useExamFlaggedCount,
  useExamInProgress,
  useExamIsCompleted,
  useExamLoading,
  useExamError,
  useExamProgress,
  useExamTimer,
  useExamQuestionByIndex,
  useExamAnswerByIndex,
} from './examStore';

// Collaboration store
export {
  useCollaborationStore,
  useGroups,
  useCurrentGroup,
  useGroupMembers,
  useInviteCode,
  useDiscussions,
  useChallenges,
  useIsLoadingGroups,
  useIsLoadingDiscussions,
  useIsLoadingChallenges,
  useCollaborationError,
  useGroupById,
  useDiscussionById,
  useChallengeById,
  useGroupDiscussions,
  useGroupChallenges,
  useActiveChallenges,
} from './collaborationStore';

// Micro-learning store
export {
  useMicroStore,
  useCurrentMicroSession,
  useMicroAudio,
  useMicroQueue,
  useMicroPreferences,
  useIsInMicroSession,
  useMicroSessionError,
  useMicroSessionProgress,
  useMicroSessionTimeRemaining,
  useShouldRebuildQueue,
} from './microStore';
