/**
 * API hooks for Adaptive Explanations feature
 */

import useSWR, { mutate } from 'swr';
import useSWRMutation from 'swr/mutation';
import { fetcher } from './client';

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

// ============ Custom fetcher for URL query params ============

async function fetchWithParams<T>(
  baseUrl: string,
  params?: Record<string, string | number | boolean | undefined>
): Promise<T> {
  const url = new URL(`${import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${baseUrl}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      'X-Anonymous-Id': localStorage.getItem('pmp_anonymous_id') || '',
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'An error occurred');
  }

  return response.json();
}

// ============ Explanation Hooks ============

/**
 * Get adaptive explanation for content
 */
export function useExplanation(
  contentType: 'question' | 'flashcard' | undefined,
  contentId: number | undefined,
  style?: ExplanationStyle
) {
  const url = contentType && contentId
    ? `/api/explanations/${contentType}/${contentId}`
    : null;

  const params = style ? { style } : undefined;

  // Build full URL with params
  const fullUrl = url && params
    ? `${url}?${new URLSearchParams(params as Record<string, string>).toString()}`
    : url;

  return useSWR<ExplanationData>(fullUrl, fetcher);
}

/**
 * Rate an explanation (mutation)
 */
export function useRateExplanation(
  contentType: 'question' | 'flashcard' | undefined,
  contentId: number | undefined
) {
  return useSWRMutation<
    { message: string; updated_preferences?: UserLearningPreferences },
    Error,
    string,
    { style: ExplanationStyle; was_helpful: boolean; time_spent_seconds?: number }
  >(
    contentType && contentId ? `/api/explanations/${contentType}/${contentId}/rate` : null,
    async (url, { arg }) => {
      const params = new URLSearchParams({
        style: arg.style,
        was_helpful: String(arg.was_helpful),
      });

      if (arg.time_spent_seconds !== undefined) {
        params.append('time_spent_seconds', String(arg.time_spent_seconds));
      }

      const response = await fetch(
        `${import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}?${params}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Anonymous-Id': localStorage.getItem('pmp_anonymous_id') || '',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || 'Failed to rate explanation');
      }

      // Invalidate preferences cache
      mutate('/api/explanations/preferences/me');

      return response.json();
    }
  );
}

/**
 * Record performance after viewing an explanation (mutation)
 */
export function useRecordPerformance(
  contentType: 'question' | 'flashcard' | undefined,
  contentId: number | undefined
) {
  return useSWRMutation<
    { message: string },
    Error,
    string,
    { was_correct: boolean }
  >(
    contentType && contentId ? `/api/explanations/${contentType}/${contentId}/performance` : null,
    async (url, { arg }) => {
      const params = new URLSearchParams({
        was_correct: String(arg.was_correct),
      });

      const response = await fetch(
        `${import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}?${params}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Anonymous-Id': localStorage.getItem('pmp_anonymous_id') || '',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || 'Failed to record performance');
      }

      return response.json();
    }
  );
}

/**
 * Get user learning preferences
 */
export function useUserPreferences() {
  return useSWR<UserLearningPreferences>('/api/explanations/preferences/me', fetcher);
}

/**
 * Update user learning preferences (mutation)
 */
export function useUpdatePreferences() {
  return useSWRMutation<
    UserLearningPreferences,
    Error,
    string,
    ExplanationPreferencesUpdate
  >(
    '/api/explanations/preferences/me',
    async (url, { arg }) => {
      const params = new URLSearchParams();

      if (arg.preferred_style !== undefined) {
        params.append('preferred_style', arg.preferred_style);
      }
      if (arg.expertise_level !== undefined) {
        params.append('expertise_level', arg.expertise_level);
      }
      if (arg.prefers_detailed !== undefined) {
        params.append('prefers_detailed', String(arg.prefers_detailed));
      }
      if (arg.preferred_modalities !== undefined) {
        arg.preferred_modalities.forEach((modality) => {
          params.append('preferred_modalities', modality);
        });
      }

      const response = await fetch(
        `${import.meta.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${url}?${params}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Anonymous-Id': localStorage.getItem('pmp_anonymous_id') || '',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(errorData.detail || 'Failed to update preferences');
      }

      // Invalidate preferences cache
      mutate('/api/explanations/preferences/me');

      return response.json();
    }
  );
}

/**
 * Get user style analytics
 */
export function useStyleAnalytics() {
  return useSWR<StyleAnalytics>('/api/explanations/analytics/my-styles', fetcher);
}

// ============ Utility Functions ============

/**
 * Invalidate all explanation-related caches
 */
export function invalidateExplanationCaches() {
  mutate((key) => typeof key === 'string' && key.startsWith('/api/explanations'));
}
