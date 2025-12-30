/**
 * Telemetry system for tracking feature usage by tier
 *
 * Tracks user interactions with premium features to understand:
 * - Which features are most popular per tier
 * - Conversion rates from free to premium
 * - Feature engagement patterns
 */

import { useUserStore } from '@/stores/userStore';

export type TelemetryEvent =
  | 'page_view'
  | 'feature_click'
  | 'upgrade_click'
  | 'open_access_accessed'
  | 'study_session_start'
  | 'exam_start'
  | 'flashcard_review'
  | 'question_answered'
  | 'roadmap_view'
  | 'concept_graph_view'
  | 'micro_learning_start';

export interface TelemetryData {
  event: TelemetryEvent;
  feature?: string;
  tier: 'public' | 'free' | 'premium';
  timestamp: string;
  page?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Track a telemetry event
 *
 * @param event - The type of event
 * @param feature - Optional feature name (e.g., 'exam_simulator', 'roadmap')
 * @param metadata - Optional additional data
 */
export function trackEvent(
  event: TelemetryEvent,
  feature?: string,
  metadata?: Record<string, unknown>
): void {
  // Get current tier from store (this runs on client)
  if (typeof window === 'undefined') return;

  const tier = useUserStore.getState().tier;

  const telemetryData: TelemetryData = {
    event,
    feature,
    tier,
    timestamp: new Date().toISOString(),
    page: window.location.pathname,
    metadata,
  };

  // In production, send to analytics backend
  // For now, log to console for development
  if (process.env.NODE_ENV === 'development') {
    console.log('[Telemetry]', telemetryData);
  }

  // Send to backend API (when implemented)
  void sendToTelemetryAPI(telemetryData);
}

/**
 * Send telemetry data to backend API (Disabled for static site)
 */
async function sendToTelemetryAPI(_data: TelemetryData): Promise<void> {
  if (!_data) return;
  return;
}

/**
 * React hook for tracking feature usage
 */
export function useTelemetry() {
  const trackPageView = (pageName: string) => {
    trackEvent('page_view', pageName);
  };

  const trackFeatureClick = (featureName: string) => {
    trackEvent('feature_click', featureName);
  };

  const trackUpgradeClick = (source: string) => {
    trackEvent('upgrade_click', source, { source });
  };

  const trackOpenAccessFeature = (featureName: string) => {
    trackEvent('open_access_accessed', featureName);
  };

  const trackStudySession = (sessionType: string) => {
    trackEvent('study_session_start', sessionType);
  };

  const trackExamStart = (examType: 'mini' | 'full') => {
    trackEvent('exam_start', examType, { examType });
  };

  const trackFlashcardReview = (count: number) => {
    trackEvent('flashcard_review', undefined, { count });
  };

  const trackQuestionAnswered = (isCorrect: boolean) => {
    trackEvent('question_answered', undefined, { correct: isCorrect });
  };

  const trackRoadmapView = () => {
    trackEvent('roadmap_view');
  };

  const trackConceptGraphView = () => {
    trackEvent('concept_graph_view');
  };

  const trackMicroLearningStart = (context: string) => {
    trackEvent('micro_learning_start', context, { context });
  };

  return {
    trackPageView,
    trackFeatureClick,
    trackUpgradeClick,
    trackOpenAccessFeature,
    trackStudySession,
    trackExamStart,
    trackFlashcardReview,
    trackQuestionAnswered,
    trackRoadmapView,
    trackConceptGraphView,
    trackMicroLearningStart,
  };
}

/**
 * Higher-order component for automatic page view tracking
 */
export function withPageTracking<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName: string
): React.ComponentType<P> {
  const ComponentWithTracking = (props: P) => {
    React.useEffect(() => {
      trackEvent('page_view', pageName);
    }, []);

    return React.createElement(WrappedComponent, props);
  };

  ComponentWithTracking.displayName = `WithPageTracking(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;

  return ComponentWithTracking;
}

// Import React for the HOC
import React from 'react';
