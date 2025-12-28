'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore } from '@/stores/examStore';
import { getExamHistory } from '@/lib/api/exams';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { ExamSession } from '@/types';

interface ExamHistoryProps {
  limit?: number;
  showViewAll?: boolean;
}

export const ExamHistory: React.FC<ExamHistoryProps> = ({ limit, showViewAll = true }) => {
  const router = useRouter();
  const history = useExamStore((state) => state.history);
  const loadHistory = useExamStore((state) => state.loadHistory);
  const setLoadingHistory = useExamStore((state) => state.setLoadingHistory);
  const isLoadingHistory = useExamStore((state) => state.isLoadingHistory);
  const setError = useExamStore((state) => state.setError);

  // Load history on mount
  useEffect(() => {
    const fetchHistory = async () => {
      setLoadingHistory(true);
      try {
        const sessions = await getExamHistory({ status: 'completed' });
        loadHistory(sessions);
      } catch (error) {
        console.error('Failed to load exam history:', error);
        setError('Failed to load exam history');
      } finally {
        setLoadingHistory(false);
      }
    };

    fetchHistory();
  }, [loadHistory, setLoadingHistory, setError]);

  // Filter and limit history
  const displayHistory = useMemo(() => {
    const completed = history.filter((s) => s.status === 'completed');
    return limit ? completed.slice(0, limit) : completed;
  }, [history, limit]);

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get score color
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600 dark:text-green-400';
    if (percentage >= 65) return 'text-blue-600 dark:text-blue-400';
    if (percentage >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Get score background
  const getScoreBg = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-100 dark:bg-green-900/30';
    if (percentage >= 65) return 'bg-blue-100 dark:bg-blue-900/30';
    if (percentage >= 50) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  // Get score badge
  const getScoreBadge = (percentage: number): { text: string; bg: string } => {
    if (percentage >= 80) return { text: 'Excellent', bg: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' };
    if (percentage >= 65) return { text: 'Passed', bg: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' };
    if (percentage >= 50) return { text: 'Needs Work', bg: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' };
    return { text: 'Below Passing', bg: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' };
  };

  // Calculate score percentage
  const getScorePercentage = (session: ExamSession): number => {
    return session.questions_count > 0
      ? Math.round((session.correct_count / session.questions_count) * 100)
      : 0;
  };

  const handleRetry = () => {
    router.push('/exam');
  };

  const handleViewDetails = (sessionId: string) => {
    router.push(`/exam/results/${sessionId}`);
  };

  if (isLoadingHistory) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading exam history...</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  if (displayHistory.length === 0) {
    return (
      <Card>
        <CardBody className="p-6">
          <div className="text-center py-8">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Exam History</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Complete your first exam to see your progress here.
            </p>
            <Button onClick={handleRetry}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Start First Exam
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Previous Exams"
        subtitle={showViewAll ? "Your recent exam performance history" : undefined}
        action={
          showViewAll && limit ? (
            <Button variant="ghost" size="sm" onClick={() => router.push('/exam/history')}>
              View All
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Button>
          ) : undefined
        }
      />
      <CardBody>
        <div className="space-y-3">
          {displayHistory.map((session) => {
            const scorePercentage = getScorePercentage(session);
            const scoreBadge = getScoreBadge(scorePercentage);
            const duration = session.end_time
              ? formatDuration(Math.floor((new Date(session.end_time).getTime() - new Date(session.start_time).getTime()) / 1000))
              : formatDuration(session.total_time_seconds);

            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors"
              >
                {/* Date and Score */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Score Badge */}
                  <div className={`flex-shrink-0 w-16 h-16 rounded-lg ${getScoreBg(scorePercentage)} flex items-center justify-center`}>
                    <div className="text-center">
                      <div className={`text-xl font-bold ${getScoreColor(scorePercentage)}`}>
                        {scorePercentage}%
                      </div>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {formatDate(session.start_time)}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${scoreBadge.bg}`}>
                        {scoreBadge.text}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {session.correct_count}/{session.questions_count} correct
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {duration}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleViewDetails(session.id)}
                    title="View detailed results"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        {displayHistory.length >= 2 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {displayHistory.length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Exams Taken</div>
              </div>
              <div>
                <div className={`text-2xl font-bold ${
                  displayHistory.length > 0
                    ? getScoreColor(Math.round(displayHistory.reduce((sum, s) => sum + getScorePercentage(s), 0) / displayHistory.length))
                    : 'text-gray-900 dark:text-white'
                }`}>
                  {displayHistory.length > 0
                    ? Math.round(displayHistory.reduce((sum, s) => sum + getScorePercentage(s), 0) / displayHistory.length)
                    : 0}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg Score</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {displayHistory.filter((s) => getScorePercentage(s) >= 65).length}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Passed</div>
              </div>
            </div>
          </div>
        )}

        {/* Retry Button */}
        <div className="mt-6 flex justify-center">
          <Button variant="primary" onClick={handleRetry}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Take New Exam
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};

export default ExamHistory;
