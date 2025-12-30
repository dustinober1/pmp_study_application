import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';
import { storage } from './client';

// ============ Types ============

export type ExplanationStyle = 'simple' | 'technical' | 'analogy' | 'visual' | 'story';

export interface ExplanationData {
  explanation: string;
  style: ExplanationStyle;
  alternative_styles: ExplanationStyle[];
  is_personalized: boolean;
  metadata: Record<string, unknown> | null;
}

export interface ExplanationRateRequest {
  was_helpful: boolean;
  time_spent_seconds?: number;
}

export interface StyleAnalyticsItem {
  total_views: number;
  helpful_count: number;
  helpfulness_rate: number;
}

export interface StyleAnalytics {
  user_id: string;
  total_explanations_viewed: number;
  style_breakdown: Record<ExplanationStyle, StyleAnalyticsItem>;
  most_helpful_style: ExplanationStyle | null;
  current_preferred_style: ExplanationStyle | null;
}

export interface UserLearningPreferences {
  user_id: string;
  preferred_style: ExplanationStyle | null;
  expertise_level: 'beginner' | 'intermediate' | 'advanced';
  style_effectiveness: Record<ExplanationStyle, number> | null;
  preferred_modalities: string[] | null;
  prefers_detailed: boolean;
}

export interface ExplanationPreferencesUpdate {
  preferred_style?: ExplanationStyle;
  expertise_level?: 'beginner' | 'intermediate' | 'advanced';
  preferred_modalities?: string[];
  prefers_detailed?: boolean;
}

const PREFERENCES_KEY = 'pmp_learning_preferences';

// ============ Explanation Hooks (Mocked) ============

/**
 * Get adaptive explanation for content (Mocked)
 */
export function useExplanation(
  contentType: 'question' | 'flashcard' | undefined,
  contentId: number | undefined,
  style: ExplanationStyle = 'simple'
) {
  const url = contentType && contentId
    ? `/api/explanations/${contentType}/${contentId}?style=${style}`
    : null;

  return useSWR<ExplanationData>(url, async (): Promise<ExplanationData> => {
    // For static mode, we return a generic message or try to find it in local data
    return {
      explanation: `This is a static ${style} explanation for ${contentType} #${contentId}. In the full version, this would be AI-generated based on your learning style.`,
      style: style,
      alternative_styles: ['simple', 'technical', 'analogy', 'visual', 'story'],
      is_personalized: false,
      metadata: null,
    };
  });
}

/**
 * Rate an explanation (Mocked)
 */
export function useRateExplanation(
  contentType: 'question' | 'flashcard' | undefined,
  contentId: number | undefined
) {
  return useSWRMutation<
    { message: string },
    Error,
    string | null,
    { style: ExplanationStyle; was_helpful: boolean; time_spent_seconds?: number }
  >(
    contentType && contentId ? `/api/explanations/${contentType}/${contentId}/rate` : null,
    async () => {
      return { message: 'Rating saved locally' };
    }
  );
}

/**
 * Record performance after viewing an explanation (Mocked)
 */
export function useRecordPerformance(
  contentType: 'question' | 'flashcard' | undefined,
  contentId: number | undefined
) {
  return useSWRMutation<
    { message: string },
    Error,
    string | null,
    { was_correct: boolean }
  >(
    contentType && contentId ? `/api/explanations/${contentType}/${contentId}/performance` : null,
    async () => {
      return { message: 'Performance recorded locally' };
    }
  );
}

/**
 * Get user learning preferences (Mocked)
 */
export function useUserPreferences() {
  return useSWR<UserLearningPreferences>('/api/explanations/preferences/me', async () => {
    return storage.get<UserLearningPreferences>(PREFERENCES_KEY) || {
      user_id: 'guest',
      preferred_style: 'simple',
      expertise_level: 'beginner',
      style_effectiveness: null,
      preferred_modalities: [],
      prefers_detailed: false,
    };
  });
}

/**
 * Update user learning preferences (Mocked)
 */
export function useUpdatePreferences() {
  return useSWRMutation<
    UserLearningPreferences,
    Error,
    string,
    ExplanationPreferencesUpdate
  >(
    '/api/explanations/preferences/me',
    async (_url, { arg }) => {
      const current = storage.get<UserLearningPreferences>(PREFERENCES_KEY) || {
        user_id: 'guest',
        preferred_style: 'simple',
        expertise_level: 'beginner',
        style_effectiveness: null,
        preferred_modalities: [],
        prefers_detailed: false,
      };
      const updated = { ...current, ...arg };
      storage.set(PREFERENCES_KEY, updated);
      return updated as UserLearningPreferences;
    }
  );
}

/**
 * Get user style analytics (Mocked)
 */
export function useStyleAnalytics() {
  return useSWR<StyleAnalytics>('/api/explanations/analytics/my-styles', async (): Promise<StyleAnalytics> => {
    return {
      user_id: 'guest',
      total_explanations_viewed: 0,
      style_breakdown: {
        simple: { total_views: 0, helpful_count: 0, helpfulness_rate: 0 },
        technical: { total_views: 0, helpful_count: 0, helpfulness_rate: 0 },
        analogy: { total_views: 0, helpful_count: 0, helpfulness_rate: 0 },
        visual: { total_views: 0, helpful_count: 0, helpfulness_rate: 0 },
        story: { total_views: 0, helpful_count: 0, helpfulness_rate: 0 },
      },
      most_helpful_style: null,
      current_preferred_style: 'simple',
    };
  });
}

/**
 * Invalidate all explanation-related caches
 */
export function invalidateExplanationCaches() {
  // Mock: no-op or clear specific SWR keys if needed
}
