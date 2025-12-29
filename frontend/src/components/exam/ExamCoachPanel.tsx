'use client';

import React, { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { getBehaviorMetrics } from '@/lib/api/exams';
import type { BehaviorMetrics, BehaviorPattern, PaceTrajectory } from '@/types/exam';

export interface ExamCoachPanelProps {
  /** Exam session ID */
  sessionId: string;
  /** Polling interval in milliseconds (default: 5000ms) */
  pollingInterval?: number;
  /** Whether to show the panel collapsed initially */
  initiallyCollapsed?: boolean;
  /** Custom class name for styling */
  className?: string;
}

/**
 * ExamCoachPanel component for real-time behavioral coaching during exams.
 *
 * Displays:
 * - Current behavior pattern (normal, rushing, dwelling, panic, etc.)
 * - Engagement score (0-100)
 * - Focus score (0-100)
 * - Pace trajectory (ahead, on_track, behind, critical)
 * - Time remaining and questions completed
 * - Average time per question
 *
 * Features:
 * - Real-time polling for updated metrics
 * - Collapsible panel to save screen space
 * - Color-coded severity indicators
 * - Pattern-based coaching hints
 *
 * @example
 * ```tsx
 * <ExamCoachPanel
 *   sessionId="123e4567-e89b-12d3-a456-426614174000"
 *   pollingInterval={5000}
 *   initiallyCollapsed={false}
 * />
 * ```
 */
export const ExamCoachPanel: React.FC<ExamCoachPanelProps> = ({
  sessionId,
  pollingInterval = 5000,
  initiallyCollapsed = false,
  className = '',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(initiallyCollapsed);
  const [hasNewAlert, setHasNewAlert] = useState(false);

  // Fetch behavior metrics with SWR for polling
  const { data: metrics, error } = useSWR<BehaviorMetrics>(
    sessionId ? `behavior-metrics-${sessionId}` : null,
    () => getBehaviorMetrics(sessionId),
    {
      refreshInterval: pollingInterval,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
    }
  );

  // Check for concerning patterns to show alert
  useEffect(() => {
    if (metrics) {
      const isConcerning =
        metrics.current_pattern !== 'normal' ||
        metrics.engagement_score < 70 ||
        metrics.focus_score < 70 ||
        metrics.pace_trajectory === 'behind' ||
        metrics.pace_trajectory === 'critical';

      setHasNewAlert(isConcerning);
    }
  }, [metrics]);

  // Get pattern display info
  const getPatternInfo = useCallback((pattern: BehaviorPattern) => {
    const patterns: Record<BehaviorPattern, { label: string; color: string; bgColor: string; icon: string }> = {
      normal: {
        label: 'On Track',
        color: 'text-green-700 dark:text-green-300',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />',
      },
      rushing: {
        label: 'Rushing',
        color: 'text-orange-700 dark:text-orange-300',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />',
      },
      dwelling: {
        label: 'Dwelling',
        color: 'text-yellow-700 dark:text-yellow-300',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />',
      },
      panic: {
        label: 'Panic',
        color: 'text-red-700 dark:text-red-300',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />',
      },
      guessing: {
        label: 'Guessing',
        color: 'text-purple-700 dark:text-purple-300',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />',
      },
      flagging_spree: {
        label: 'Flagging',
        color: 'text-blue-700 dark:text-blue-300',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />',
      },
      skipping: {
        label: 'Skipping',
        color: 'text-gray-700 dark:text-gray-300',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" />',
      },
      revisit_loop: {
        label: 'Revisiting',
        color: 'text-indigo-700 dark:text-indigo-300',
        bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
        icon: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />',
      },
    };
    return patterns[pattern] || patterns.normal;
  }, []);

  // Get pace trajectory info
  const getPaceInfo = useCallback((trajectory: PaceTrajectory) => {
    const paces: Record<PaceTrajectory, { label: string; color: string }> = {
      ahead: { label: 'Ahead', color: 'text-green-600 dark:text-green-400' },
      on_track: { label: 'On Track', color: 'text-blue-600 dark:text-blue-400' },
      behind: { label: 'Behind', color: 'text-yellow-600 dark:text-yellow-400' },
      critical: { label: 'Critical', color: 'text-red-600 dark:text-red-400 animate-pulse' },
    };
    return paces[trajectory] || paces.on_track;
  }, []);

  // Get score color class
  const getScoreColor = useCallback((score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, []);

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 ${className}`}>
        <p className="text-sm text-red-700 dark:text-red-300">Unable to load coach panel</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className={`bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 ${className}`}>
        <div className="animate-pulse flex space-x-2">
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  const patternInfo = getPatternInfo(metrics.current_pattern);
  const paceInfo = getPaceInfo(metrics.pace_trajectory);

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm ${className}`}>
      {/* Header - Always visible */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          {/* Alert indicator */}
          {hasNewAlert && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500"></span>
            </span>
          )}

          {/* Coach icon */}
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>

          <span className="font-semibold text-gray-900 dark:text-white">Exam Coach</span>

          {/* Pattern badge */}
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${patternInfo.bgColor} ${patternInfo.color} flex items-center gap-1`}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: patternInfo.icon }} />
            {patternInfo.label}
          </span>
        </div>

        {/* Collapse toggle */}
        <button
          className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
        >
          <svg
            className={`w-5 h-5 transition-transform ${isCollapsed ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {/* Content - Collapsible */}
      {!isCollapsed && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 animate-fade-in">
          {/* Score bars */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            {/* Engagement Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Engagement</span>
                <span className={`text-sm font-bold ${getScoreColor(metrics.engagement_score)}`}>
                  {Math.round(metrics.engagement_score)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    metrics.engagement_score >= 80 ? 'bg-green-500' :
                    metrics.engagement_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.engagement_score}%` }}
                />
              </div>
            </div>

            {/* Focus Score */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Focus</span>
                <span className={`text-sm font-bold ${getScoreColor(metrics.focus_score)}`}>
                  {Math.round(metrics.focus_score)}%
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    metrics.focus_score >= 80 ? 'bg-green-500' :
                    metrics.focus_score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.focus_score}%` }}
                />
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-3 gap-3 text-center">
            {/* Pace */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pace</p>
              <p className={`text-sm font-semibold ${paceInfo.color}`}>{paceInfo.label}</p>
            </div>

            {/* Time remaining */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Time Left</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.time_remaining_minutes}m
              </p>
            </div>

            {/* Questions completed */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Completed</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {metrics.questions_completed}
              </p>
            </div>
          </div>

          {/* Average time per question */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Avg time per question</span>
              <span className="font-medium text-gray-900 dark:text-white">
                {Math.round(metrics.avg_time_per_question)}s
              </span>
            </div>
          </div>

          {/* Pattern-specific coaching hint */}
          {metrics.current_pattern !== 'normal' && (
            <div className={`mt-3 p-2 rounded-lg ${patternInfo.bgColor}`}>
              <p className={`text-xs ${patternInfo.color}`}>
                {getPatternHint(metrics.current_pattern)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Pattern-specific coaching hints
function getPatternHint(pattern: BehaviorPattern): string {
  const hints: Record<BehaviorPattern, string> = {
    normal: 'Continue at your current pace.',
    rushing: 'Slow down. Read each question carefully before answering.',
    dwelling: 'Consider flagging and moving on. Don\'t spend more than 2 minutes per question.',
    panic: 'Take 3 deep breaths. You\'ve prepared for this. Trust yourself.',
    guessing: 'Focus on understanding the question. Eliminate obviously wrong answers.',
    flagging_spree: 'Too many flags may indicate uncertainty. Make your best choice and move forward.',
    skipping: 'Try to answer each question. An unanswered question is always wrong.',
    revisit_loop: 'Minimize revisits. Trust your first instinct and keep moving forward.',
  };
  return hints[pattern] || hints.normal;
}

export default ExamCoachPanel;
