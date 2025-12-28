/**
 * Zustand store for analytics and learning recommendations state management
 * Handles user performance analytics, study patterns, and adaptive learning recommendations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============ Analytics Types ============

export interface DomainPerformance {
  domain_id: number;
  domain_name: string;
  flashcard_accuracy: number;
  question_accuracy: number;
  total_reviews: number;
  avg_response_time_ms: number;
  mastery_level: 'beginner' | 'developing' | 'proficient' | 'advanced';
  trend: 'improving' | 'stable' | 'declining';
}

export interface TaskPerformance {
  task_id: number;
  task_name: string;
  domain_id: number;
  flashcard_accuracy: number;
  question_accuracy: number;
  total_reviews: number;
  avg_response_time_ms: number;
  mastery_level: 'beginner' | 'developing' | 'proficient' | 'advanced';
}

export interface StudyPattern {
  period: string; // ISO date
  total_study_time_seconds: number;
  sessions_count: number;
  flashcards_reviewed: number;
  questions_answered: number;
  accuracy: number;
}

export interface WeakArea {
  domain_id: number;
  domain_name: string;
  task_id: number | null;
  task_name: string | null;
  accuracy: number;
  total_attempts: number;
  priority: 'high' | 'medium' | 'low';
}

export interface UserAnalytics {
  user_id: string;
  overall_accuracy: number;
  total_study_time_seconds: number;
  total_sessions: number;
  current_streak_days: number;
  longest_streak_days: number;
  domain_performances: DomainPerformance[];
  task_performances: TaskPerformance[];
  study_patterns: StudyPattern[];
  weak_areas: WeakArea[];
  last_calculated_at: string;
}

export type RecommendationType =
  | 'review_flashcards'
  | 'practice_questions'
  | 'focus_domain'
  | 'focus_task'
  | 'take_exam'
  | 'maintain_streak'
  | 'increase_study_time';

export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface LearningRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  description: string;
  priority: RecommendationPriority;
  domain_id: number | null;
  task_id: number | null;
  estimated_minutes: number | null;
  action_url: string | null;
  created_at: string;
  dismissed: boolean;
}

export interface AnalyticsSummary {
  overall_accuracy: number;
  total_study_time_hours: number;
  current_streak_days: number;
  domain_mastery_levels: Record<number, 'beginner' | 'developing' | 'proficient' | 'advanced'>;
}

// ============ State Interface ============

interface AnalyticsState {
  // Data
  analytics: UserAnalytics | null;
  recommendations: LearningRecommendation[];
  analyticsSummary: AnalyticsSummary | null;

  // Loading states
  isLoadingAnalytics: boolean;
  isLoadingRecommendations: boolean;
  isRefreshing: boolean;

  // Error states
  analyticsError: string | null;
  recommendationsError: string | null;

  // Timestamps
  lastAnalyticsFetch: number | null;
  lastRecommendationsFetch: number | null;

  // Actions
  setAnalytics: (analytics: UserAnalytics | null) => void;
  setRecommendations: (recommendations: LearningRecommendation[]) => void;
  setAnalyticsSummary: (summary: AnalyticsSummary | null) => void;
  setLoadingAnalytics: (loading: boolean) => void;
  setLoadingRecommendations: (loading: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
  setAnalyticsError: (error: string | null) => void;
  setRecommendationsError: (error: string | null) => void;

  // Dismiss recommendation
  dismissRecommendation: (id: string) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  analytics: null,
  recommendations: [],
  analyticsSummary: null,
  isLoadingAnalytics: false,
  isLoadingRecommendations: false,
  isRefreshing: false,
  analyticsError: null,
  recommendationsError: null,
  lastAnalyticsFetch: null,
  lastRecommendationsFetch: null,
};

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setAnalytics: (analytics) => {
        set({
          analytics,
          lastAnalyticsFetch: Date.now(),
        });

        // Update summary when analytics changes
        if (analytics) {
          const domainMasteryLevels: Record<number, 'beginner' | 'developing' | 'proficient' | 'advanced'> = {};
          analytics.domain_performances.forEach((dp) => {
            domainMasteryLevels[dp.domain_id] = dp.mastery_level;
          });

          set({
            analyticsSummary: {
              overall_accuracy: analytics.overall_accuracy,
              total_study_time_hours: analytics.total_study_time_seconds / 3600,
              current_streak_days: analytics.current_streak_days,
              domain_mastery_levels: domainMasteryLevels,
            },
          });
        }
      },

      setRecommendations: (recommendations) => {
        set({
          recommendations,
          lastRecommendationsFetch: Date.now(),
        });
      },

      setAnalyticsSummary: (summary) => {
        set({ analyticsSummary: summary });
      },

      setLoadingAnalytics: (loading) => {
        set({ isLoadingAnalytics: loading });
      },

      setLoadingRecommendations: (loading) => {
        set({ isLoadingRecommendations: loading });
      },

      setRefreshing: (refreshing) => {
        set({ isRefreshing: refreshing });
      },

      setAnalyticsError: (error) => {
        set({ analyticsError: error });
      },

      setRecommendationsError: (error) => {
        set({ recommendationsError: error });
      },

      dismissRecommendation: (id) => {
        const { recommendations } = get();
        set({
          recommendations: recommendations.map((rec) =>
            rec.id === id ? { ...rec, dismissed: true } : rec
          ),
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'pmp-analytics-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        analytics: state.analytics,
        analyticsSummary: state.analyticsSummary,
        lastAnalyticsFetch: state.lastAnalyticsFetch,
      }),
    }
  )
);

// ============ Selector Hooks ============

export const useAnalytics = () => useAnalyticsStore((state) => state.analytics);
export const useRecommendations = () => useAnalyticsStore((state) => state.recommendations);
export const useAnalyticsSummary = () => useAnalyticsStore((state) => state.analyticsSummary);
export const useAnalyticsLoading = () => useAnalyticsStore((state) => state.isLoadingAnalytics);
export const useRecommendationsLoading = () => useAnalyticsStore((state) => state.isLoadingRecommendations);
export const useAnalyticsRefreshing = () => useAnalyticsStore((state) => state.isRefreshing);
export const useAnalyticsError = () => useAnalyticsStore((state) => state.analyticsError);
export const useRecommendationsError = () => useAnalyticsStore((state) => state.recommendationsError);

// Active recommendations (non-dismissed)
export const useActiveRecommendations = () => {
  const recommendations = useAnalyticsStore((state) => state.recommendations);
  return recommendations.filter((rec) => !rec.dismissed);
};

// High priority recommendations
export const useHighPriorityRecommendations = () => {
  const recommendations = useAnalyticsStore((state) => state.recommendations);
  return recommendations.filter((rec) => !rec.dismissed && rec.priority === 'high');
};

// Domain performance by ID
export const useDomainPerformance = (domainId: number) => {
  const analytics = useAnalyticsStore((state) => state.analytics);
  return analytics?.domain_performances.find((dp) => dp.domain_id === domainId);
};

// Task performance by ID
export const useTaskPerformance = (taskId: number) => {
  const analytics = useAnalyticsStore((state) => state.analytics);
  return analytics?.task_performances.find((tp) => tp.task_id === taskId);
};

// Weak areas filtered by priority
export const useWeakAreasByPriority = (priority: 'high' | 'medium' | 'low') => {
  const analytics = useAnalyticsStore((state) => state.analytics);
  return analytics?.weak_areas.filter((wa) => wa.priority === priority) ?? [];
};

// Check if analytics data is stale (older than 5 minutes)
export const useAnalyticsIsStale = () => {
  const lastFetch = useAnalyticsStore((state) => state.lastAnalyticsFetch);
  if (!lastFetch) return true;
  const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes
  return Date.now() - lastFetch > STALE_TIME_MS;
};

// Store actions hook
export const useAnalyticsActions = () => {
  return {
    setAnalytics: useAnalyticsStore((state) => state.setAnalytics),
    setRecommendations: useAnalyticsStore((state) => state.setRecommendations),
    setAnalyticsSummary: useAnalyticsStore((state) => state.setAnalyticsSummary),
    setLoadingAnalytics: useAnalyticsStore((state) => state.setLoadingAnalytics),
    setLoadingRecommendations: useAnalyticsStore((state) => state.setLoadingRecommendations),
    setRefreshing: useAnalyticsStore((state) => state.setRefreshing),
    setAnalyticsError: useAnalyticsStore((state) => state.setAnalyticsError),
    setRecommendationsError: useAnalyticsStore((state) => state.setRecommendationsError),
    dismissRecommendation: useAnalyticsStore((state) => state.dismissRecommendation),
    reset: useAnalyticsStore((state) => state.reset),
  };
};
