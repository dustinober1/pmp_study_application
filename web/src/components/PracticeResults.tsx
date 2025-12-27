'use client';

import { useState, useMemo } from 'react';
import { PracticeSessionDocument, PracticeAttemptDocument } from '@/types/firestore';
import { DOMAIN_NAMES, DOMAIN_PERCENTAGES, TASK_NAMES } from '@/lib/constants';

interface PracticeResultsProps {
  session: PracticeSessionDocument;
  attempts: PracticeAttemptDocument[];
  onRetake?: (scope?: { type: 'all' | 'domain' | 'task'; domainId?: string; taskId?: string }) => void;
  onBackToDashboard?: () => void;
}

interface DomainStats {
  domainId: string;
  domainName: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  percentage: number;
  accuracy: number;
}

interface TaskStats {
  taskId: string;
  taskName: string;
  domainId: string;
  total: number;
  correct: number;
  incorrect: number;
  skipped: number;
  accuracy: number;
}

export default function PracticeResults({
  session,
  attempts,
  onRetake,
  onBackToDashboard,
}: PracticeResultsProps) {
  const [selectedTab, setSelectedTab] = useState<'overview' | 'domain' | 'task'>('overview');

  // Calculate domain stats
  const domainStats = useMemo(() => {
    const stats: Record<string, DomainStats> = {};

    attempts.forEach((attempt) => {
      if (!stats[attempt.domainId]) {
        stats[attempt.domainId] = {
          domainId: attempt.domainId,
          domainName: DOMAIN_NAMES[attempt.domainId] || attempt.domainId,
          total: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          percentage: DOMAIN_PERCENTAGES[attempt.domainId] || 0,
          accuracy: 0,
        };
      }

      stats[attempt.domainId].total += 1;
      if (attempt.skipped) {
        stats[attempt.domainId].skipped += 1;
      } else if (attempt.isCorrect) {
        stats[attempt.domainId].correct += 1;
      } else {
        stats[attempt.domainId].incorrect += 1;
      }
    });

    // Calculate accuracy for each domain
    Object.values(stats).forEach((stat) => {
      const answered = stat.correct + stat.incorrect;
      stat.accuracy = answered > 0 ? (stat.correct / answered) * 100 : 0;
    });

    return Object.values(stats).sort((a, b) => {
      const aDomainOrder = { people: 0, process: 1, business_environment: 2 };
      const aOrder = aDomainOrder[a.domainId as keyof typeof aDomainOrder] ?? 999;
      const bOrder = aDomainOrder[b.domainId as keyof typeof aDomainOrder] ?? 999;
      return aOrder - bOrder;
    });
  }, [attempts]);

  // Calculate task stats
  const taskStats = useMemo(() => {
    const stats: Record<string, TaskStats> = {};

    attempts.forEach((attempt) => {
      if (!stats[attempt.taskId]) {
        stats[attempt.taskId] = {
          taskId: attempt.taskId,
          taskName: TASK_NAMES[attempt.taskId] || attempt.taskId,
          domainId: attempt.domainId,
          total: 0,
          correct: 0,
          incorrect: 0,
          skipped: 0,
          accuracy: 0,
        };
      }

      stats[attempt.taskId].total += 1;
      if (attempt.skipped) {
        stats[attempt.taskId].skipped += 1;
      } else if (attempt.isCorrect) {
        stats[attempt.taskId].correct += 1;
      } else {
        stats[attempt.taskId].incorrect += 1;
      }
    });

    // Calculate accuracy for each task
    Object.values(stats).forEach((stat) => {
      const answered = stat.correct + stat.incorrect;
      stat.accuracy = answered > 0 ? (stat.correct / answered) * 100 : 0;
    });

    return Object.values(stats).sort((a, b) => b.accuracy - a.accuracy);
  }, [attempts]);

  // Format duration
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Get score color
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 60) return 'text-orange-600';
    return 'text-red-600';
  };

  // Get score background color
  const getScoreBgColor = (percentage: number): string => {
    if (percentage >= 80) return 'bg-green-50';
    if (percentage >= 70) return 'bg-blue-50';
    if (percentage >= 60) return 'bg-orange-50';
    return 'bg-red-50';
  };

  const totalQuestionsAnswered = session.questionsAnswered;
  const totalCorrect = session.correctAnswers;
  const overallAccuracy = totalQuestionsAnswered > 0
    ? Math.round((totalCorrect / totalQuestionsAnswered) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Practice Results</h1>
          <p className="text-gray-600">
            {session.scope.type === 'domain' && `Domain: ${DOMAIN_NAMES[session.scope.domainId || '']}`}
            {session.scope.type === 'task' && `Task: ${TASK_NAMES[session.scope.taskId || '']}`}
            {session.scope.type === 'all' && 'Full Practice Test'}
          </p>
        </div>

        {/* Overall Score Card */}
        <div className={`${getScoreBgColor(overallAccuracy)} rounded-lg shadow-md p-8 mb-8 border-l-4 border-blue-600`}>
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex-1 mb-6 md:mb-0">
              <h2 className="text-sm font-semibold text-gray-600 uppercase mb-2">Overall Score</h2>
              <div className="flex items-baseline gap-2">
                <span className={`text-5xl font-bold ${getScoreColor(overallAccuracy)}`}>
                  {overallAccuracy}%
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                {totalCorrect} out of {totalQuestionsAnswered} questions correct
              </p>
            </div>

            <div className="flex-1 grid grid-cols-3 gap-4 text-center">
              <div className="bg-white rounded p-4">
                <p className="text-2xl font-bold text-green-600">{totalCorrect}</p>
                <p className="text-xs text-gray-600 mt-1">Correct</p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-2xl font-bold text-red-600">{session.incorrectAnswers}</p>
                <p className="text-xs text-gray-600 mt-1">Incorrect</p>
              </div>
              <div className="bg-white rounded p-4">
                <p className="text-2xl font-bold text-orange-600">{session.questionsSkipped}</p>
                <p className="text-xs text-gray-600 mt-1">Skipped</p>
              </div>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-600">
            <p>Time: {formatDuration(session.durationSeconds)} | Questions: {session.questionsPresented}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200">
          <button
            onClick={() => setSelectedTab('overview')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              selectedTab === 'overview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setSelectedTab('domain')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              selectedTab === 'domain'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            By Domain
          </button>
          <button
            onClick={() => setSelectedTab('task')}
            className={`px-4 py-3 font-semibold border-b-2 transition-colors ${
              selectedTab === 'task'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            By Task
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {selectedTab === 'overview' && (
            <div className="space-y-6">
              {/* Summary Card */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Session Summary</h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-2">Total Questions</p>
                    <p className="text-3xl font-bold text-blue-600">{session.questionsPresented}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-2">Answered</p>
                    <p className="text-3xl font-bold text-gray-900">{session.questionsAnswered}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-2">Duration</p>
                    <p className="text-3xl font-bold text-gray-900">{formatDuration(session.durationSeconds)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-600 uppercase mb-2">Avg Time/Q</p>
                    <p className="text-3xl font-bold text-gray-900">
                      {Math.round(session.durationSeconds / session.questionsPresented)}s
                    </p>
                  </div>
                </div>
              </div>

              {/* Performance by Domain Overview */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-6">Performance by Domain</h3>

                <div className="space-y-4">
                  {domainStats.map((domain) => (
                    <div key={domain.domainId}>
                      <div className="flex justify-between items-center mb-2">
                        <div>
                          <p className="font-semibold text-gray-900">{domain.domainName}</p>
                          <p className="text-xs text-gray-600">
                            {domain.correct}/{domain.correct + domain.incorrect} questions
                            {domain.skipped > 0 && ` (${domain.skipped} skipped)`}
                          </p>
                        </div>
                        <p className={`text-lg font-bold ${getScoreColor(domain.accuracy)}`}>
                          {Math.round(domain.accuracy)}%
                        </p>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`${
                            domain.accuracy >= 80
                              ? 'bg-green-600'
                              : domain.accuracy >= 70
                              ? 'bg-blue-600'
                              : domain.accuracy >= 60
                              ? 'bg-orange-600'
                              : 'bg-red-600'
                          } h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${domain.accuracy}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Domain Tab */}
          {selectedTab === 'domain' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="grid grid-cols-12 gap-4 bg-gray-50 p-4 font-semibold text-sm text-gray-900 border-b border-gray-200">
                  <div className="col-span-5">Domain</div>
                  <div className="col-span-2 text-center">Correct</div>
                  <div className="col-span-2 text-center">Incorrect</div>
                  <div className="col-span-2 text-center">Accuracy</div>
                  <div className="col-span-1 text-center">%</div>
                </div>

                {domainStats.map((domain) => (
                  <div key={domain.domainId} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors">
                    <div className="col-span-5">
                      <p className="font-medium text-gray-900">{domain.domainName}</p>
                      <p className="text-xs text-gray-600">{domain.total} questions</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="font-semibold text-green-600">{domain.correct}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="font-semibold text-red-600">{domain.incorrect}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`${
                            domain.accuracy >= 80
                              ? 'bg-green-600'
                              : domain.accuracy >= 70
                              ? 'bg-blue-600'
                              : domain.accuracy >= 60
                              ? 'bg-orange-600'
                              : 'bg-red-600'
                          } h-1.5 rounded-full`}
                          style={{ width: `${domain.accuracy}%` }}
                        />
                      </div>
                    </div>
                    <div className="col-span-1 text-center">
                      <p className={`font-bold ${getScoreColor(domain.accuracy)}`}>
                        {Math.round(domain.accuracy)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Retake by Domain Button */}
              {onRetake && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-4">
                    Want to focus on a specific domain? Select one to retake:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {domainStats.map((domain) => (
                      <button
                        key={domain.domainId}
                        onClick={() =>
                          onRetake({
                            type: 'domain',
                            domainId: domain.domainId,
                          })
                        }
                        className="px-4 py-2 bg-white border border-blue-600 text-blue-600 rounded hover:bg-blue-50 transition-colors text-sm font-medium"
                      >
                        Retake {domain.domainName}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Task Tab */}
          {selectedTab === 'task' && (
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
                <div className="grid grid-cols-12 gap-4 bg-gray-50 p-4 font-semibold text-sm text-gray-900 border-b border-gray-200">
                  <div className="col-span-6">Task</div>
                  <div className="col-span-2 text-center">Correct</div>
                  <div className="col-span-2 text-center">Incorrect</div>
                  <div className="col-span-2 text-center">Accuracy</div>
                </div>

                {taskStats.filter((t) => t.total > 0).map((task) => (
                  <div key={task.taskId} className="grid grid-cols-12 gap-4 p-4 border-b border-gray-100 items-center hover:bg-gray-50 transition-colors">
                    <div className="col-span-6">
                      <p className="font-medium text-gray-900">{task.taskName}</p>
                      <p className="text-xs text-gray-600">{DOMAIN_NAMES[task.domainId]} • {task.total} questions</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="font-semibold text-green-600">{task.correct}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="font-semibold text-red-600">{task.incorrect}</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className={`font-bold ${getScoreColor(task.accuracy)}`}>
                        {Math.round(task.accuracy)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Lowest performing tasks section */}
              {taskStats.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Areas for Improvement</h4>
                  <div className="space-y-2">
                    {taskStats
                      .filter((t) => t.total > 0)
                      .slice(0, 3)
                      .map((task) => (
                        <div key={task.taskId} className="flex justify-between items-center text-sm">
                          <span className="text-gray-700">{task.taskName}</span>
                          <span className={`font-semibold ${getScoreColor(task.accuracy)}`}>
                            {Math.round(task.accuracy)}%
                          </span>
                        </div>
                      ))}
                  </div>
                  {onRetake && taskStats.length > 0 && (
                    <button
                      onClick={() => {
                        const lowestTask = taskStats[0];
                        onRetake({
                          type: 'task',
                          domainId: lowestTask.domainId,
                          taskId: lowestTask.taskId,
                        });
                      }}
                      className="mt-4 w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors text-sm font-medium"
                    >
                      Focus on Weakest Area
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-12 flex-col sm:flex-row">
          {onRetake && (
            <button
              onClick={() => onRetake({ type: 'all' })}
              className="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retake Full Test
            </button>
          )}
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
