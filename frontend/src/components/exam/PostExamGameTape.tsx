'use client';

import React, { useState, useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { getGameTape } from '@/lib/api/exams';
import type {
  GameTapeResponse,
  GameTapeEvent,
  BehaviorPattern,
  BehaviorSummary,
} from '@/types/exam';

export interface PostExamGameTapeProps {
  /** Exam session ID */
  sessionId: string;
  /** Custom class name for styling */
  className?: string;
}

/**
 * PostExamGameTape component for post-exam behavioral replay.
 *
 * Displays a chronological "game tape" of exam behaviors including:
 * - All answers with timing patterns
 * - Flag events
 * - Coaching interventions
 * - Pattern detections (rushing, dwelling, panic)
 * - Domain-wise breakdown
 *
 * Features:
 * - Collapsible event timeline
 * - Pattern-based visual indicators
 * - Summary statistics
 * - Coaching insights
 *
 * @example
 * ```tsx
 * <PostExamGameTape
 *   sessionId="123e4567-e89b-12d3-a456-426614174000"
 * />
 * ```
 */
export const PostExamGameTape: React.FC<PostExamGameTapeProps> = ({
  sessionId,
  className = '',
}) => {
  const [filter, setFilter] = useState<'all' | 'concerns' | 'coaching'>('all');
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  // Fetch game tape data
  const { data: gameTape, error, isLoading } = useSWR<GameTapeResponse>(
    sessionId ? `gametape-${sessionId}` : null,
    () => getGameTape(sessionId)
  );

  // Get event type display info
  const getEventTypeInfo = useCallback((eventType: GameTapeEvent['event_type']) => {
    const types: Record<GameTapeEvent['event_type'], { label: string; bgColor: string; textColor: string; icon: string }> = {
      answer: {
        label: 'Answered',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        textColor: 'text-blue-700 dark:text-blue-300',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      },
      flag: {
        label: 'Flagged',
        bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
        textColor: 'text-yellow-700 dark:text-yellow-300',
        icon: 'M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9',
      },
      revisit: {
        label: 'Revisited',
        bgColor: 'bg-purple-100 dark:bg-purple-900/30',
        textColor: 'text-purple-700 dark:text-purple-300',
        icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      },
      skip: {
        label: 'Skipped',
        bgColor: 'bg-gray-100 dark:bg-gray-900/30',
        textColor: 'text-gray-700 dark:text-gray-300',
        icon: 'M13 5l7 7-7 7M5 5l7 7-7 7',
      },
      coaching: {
        label: 'Coach Tip',
        bgColor: 'bg-green-100 dark:bg-green-900/30',
        textColor: 'text-green-700 dark:text-green-300',
        icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z',
      },
    };
    return types[eventType];
  }, []);

  // Get pattern display info
  const getPatternInfo = useCallback((pattern: BehaviorPattern | null) => {
    if (!pattern) return null;
    const patterns: Record<BehaviorPattern, { label: string; color: string; bgColor: string }> = {
      normal: { label: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30' },
      rushing: { label: 'Rushing', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
      dwelling: { label: 'Dwelling', color: 'text-yellow-600', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
      panic: { label: 'Panic', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30' },
      guessing: { label: 'Guessing', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
      flagging_spree: { label: 'Flagging Spree', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
      skipping: { label: 'Skipping', color: 'text-gray-600', bgColor: 'bg-gray-100 dark:bg-gray-900/30' },
      revisit_loop: { label: 'Revisit Loop', color: 'text-indigo-600', bgColor: 'bg-indigo-100 dark:bg-indigo-900/30' },
    };
    return patterns[pattern];
  }, []);

  // Format time display
  const formatTime = useCallback((seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }, []);

  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    if (!gameTape) return [];

    if (filter === 'all') return gameTape.events;

    if (filter === 'concerns') {
      return gameTape.events.filter(
        (e) => e.pattern_detected && e.pattern_detected !== 'normal'
      );
    }

    if (filter === 'coaching') {
      return gameTape.events.filter((e) => e.event_type === 'coaching');
    }

    return gameTape.events;
  }, [gameTape, filter]);

  // Toggle event expansion
  const toggleEvent = useCallback((index: number) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Count concerning patterns
  const concerningPatternCount = useMemo(() => {
    if (!gameTape) return 0;
    return gameTape.events.filter(
      (e) => e.pattern_detected && e.pattern_detected !== 'normal'
    ).length;
  }, [gameTape]);

  // Count coaching interventions
  const coachingCount = useMemo(() => {
    if (!gameTape) return 0;
    return gameTape.events.filter((e) => e.event_type === 'coaching').length;
  }, [gameTape]);

  if (error) {
    return (
      <div className={`bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 ${className}`}>
        <p className="text-sm text-red-700 dark:text-red-300">Unable to load game tape</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!gameTape) {
    return null;
  }

  const summary = gameTape.summary;

  return (
    <div className={`bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Exam Game Tape
          </h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-medium rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
              {filteredEvents.length} events
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Review your behavioral patterns throughout the exam
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Overall Pattern */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Pattern</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
              {summary.overall_pattern.replace('_', ' ')}
            </p>
          </div>

          {/* Engagement Score */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Engagement</p>
            <p className={`text-sm font-bold ${
              summary.engagement_score >= 80 ? 'text-green-600' :
              summary.engagement_score >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(summary.engagement_score)}%
            </p>
          </div>

          {/* Focus Score */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Focus</p>
            <p className={`text-sm font-bold ${
              summary.focus_score >= 80 ? 'text-green-600' :
              summary.focus_score >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {Math.round(summary.focus_score)}%
            </p>
          </div>

          {/* Coaching Interventions */}
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Coach Tips</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {coachingCount}
            </p>
          </div>
        </div>

        {/* Additional metrics */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Avg time/question:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {Math.round(summary.avg_time_per_question)}s
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Total flags:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {summary.total_flags}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Revisits:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {summary.question_revisits}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Max consecutive flags:</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {summary.max_consecutive_flags}
            </span>
          </div>
        </div>
      </div>

      {/* Filter buttons */}
      <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === 'all'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All Events ({gameTape.events.length})
          </button>
          <button
            onClick={() => setFilter('concerns')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === 'concerns'
                ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Concerns ({concerningPatternCount})
          </button>
          <button
            onClick={() => setFilter('coaching')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === 'coaching'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Coach Tips ({coachingCount})
          </button>
        </div>
      </div>

      {/* Events Timeline */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No events match the selected filter
            </p>
          </div>
        ) : (
          filteredEvents.map((event, index) => {
            const eventTypeInfo = getEventTypeInfo(event.event_type);
            const patternInfo = event.pattern_detected ? getPatternInfo(event.pattern_detected) : null;
            const isExpanded = expandedEvents.has(index);

            return (
              <div
                key={`${event.event_type}-${event.question_index}-${index}`}
                className={`px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                  patternInfo ? 'border-l-4 border-l-orange-400' : ''
                }`}
              >
                {/* Event header - always visible */}
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => toggleEvent(index)}
                >
                  <div className="flex items-start gap-3 flex-1">
                    {/* Event icon */}
                    <div className={`p-2 rounded-lg ${eventTypeInfo.bgColor} mt-0.5`}>
                      <svg
                        className="w-4 h-4 ${eventTypeInfo.textColor}"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={eventTypeInfo.icon} />
                      </svg>
                    </div>

                    {/* Event info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${eventTypeInfo.bgColor} ${eventTypeInfo.textColor}`}>
                          {eventTypeInfo.label}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Q{event.question_index + 1}
                        </span>
                        {patternInfo && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${patternInfo.bgColor} ${patternInfo.color}`}>
                            {patternInfo.label}
                          </span>
                        )}
                        {event.domain_name && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {event.domain_name}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <span>
                          <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {formatTime(event.time_spent_seconds)}
                        </span>
                        {event.is_correct !== null && (
                          <span className={event.is_correct ? 'text-green-600' : 'text-red-600'}>
                            {event.is_correct ? 'Correct' : 'Incorrect'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-3 pl-11 animate-fade-in">
                    {event.coaching_message && (
                      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                        <p className="text-sm text-green-800 dark:text-green-300">
                          {event.coaching_message}
                        </p>
                      </div>
                    )}

                    {event.pattern_detected && event.pattern_detected !== 'normal' && (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3 mt-2">
                        <p className="text-xs font-medium text-orange-800 dark:text-orange-300 mb-1">
                          Pattern detected: {event.pattern_detected.replace(/_/g, ' ')}
                        </p>
                        <p className="text-xs text-orange-700 dark:text-orange-400">
                          {getPatternInsight(event.pattern_detected)}
                        </p>
                      </div>
                    )}

                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 font-mono">
                      Timestamp: {new Date(event.timestamp).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// Pattern-specific insights
function getPatternInsight(pattern: BehaviorPattern): string {
  const insights: Record<BehaviorPattern, string> = {
    normal: 'Your pacing was consistent and within recommended ranges.',
    rushing: 'Answering quickly increases risk of misreading questions. Consider slowing down.',
    dwelling: 'Spending excessive time on single questions reduces time for remaining questions.',
    panic: 'Signs of anxiety detected. Practice breathing exercises during exams.',
    guessing: 'Inconsistent timing may indicate uncertainty. Focus on reading comprehension.',
    flagging_spree: 'Multiple consecutive flags suggest uncertainty in this topic area.',
    skipping: 'Skipped questions are guaranteed wrong. Make your best attempt.',
    revisit_loop: 'Excessive revisiting consumes valuable time. Trust your first instinct.',
  };
  return insights[pattern];
}

export default PostExamGameTape;
