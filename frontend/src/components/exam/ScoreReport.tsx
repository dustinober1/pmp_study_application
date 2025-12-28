'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { ExamResult, ExamReport } from '@/types';

interface ScoreReportProps {
  result: ExamResult;
  report?: ExamReport | null;
  sessionId: string;
}

const PASSING_SCORE = 65;

const PMP_DOMAINS = {
  People: { weight: 33, color: 'bg-blue-500' },
  Process: { weight: 41, color: 'bg-green-500' },
  'Business Environment': { weight: 26, color: 'bg-purple-500' },
};

export const ScoreReport: React.FC<ScoreReportProps> = ({ result, report, sessionId }) => {
  const router = useRouter();

  const passed = result.score_percentage >= PASSING_SCORE;
  const timeExpired = result.time_expired;

  // Format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  // Get score color
  const getScoreColor = (percentage: number): string => {
    if (percentage >= PASSING_SCORE + 15) return 'text-green-600';
    if (percentage >= PASSING_SCORE) return 'text-blue-600';
    if (percentage >= PASSING_SCORE - 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (percentage: number): string => {
    if (percentage >= PASSING_SCORE + 15) return 'bg-green-100 dark:bg-green-900/30';
    if (percentage >= PASSING_SCORE) return 'bg-blue-100 dark:bg-blue-900/30';
    if (percentage >= PASSING_SCORE - 10) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  // Domain data for chart
  const domainData = useMemo(() => {
    return Object.entries(result.domain_breakdown).map(([domain, perf]) => ({
      name: domain,
      ...perf,
      weight: PMP_DOMAINS[domain as keyof typeof PMP_DOMAINS]?.weight ?? 0,
      color: PMP_DOMAINS[domain as keyof typeof PMP_DOMAINS]?.color ?? 'bg-gray-500',
    }));
  }, [result.domain_breakdown]);

  // Find weakest and strongest domains
  const { weakestDomain, strongestDomain } = useMemo(() => {
    const sorted = [...domainData].sort((a, b) => a.percentage - b.percentage);
    return {
      weakestDomain: sorted[0],
      strongestDomain: sorted[sorted.length - 1],
    };
  }, [domainData]);

  // Calculate average time per question
  const avgTimePerQuestion = useMemo(() => {
    return Math.floor(result.time_spent_seconds / result.questions_count);
  }, [result.time_spent_seconds, result.questions_count]);

  const handleRetry = () => {
    router.push('/exam');
  };

  const viewHistory = () => {
    router.push('/exam/history');
  };

  const viewQuestions = () => {
    router.push(`/exam/review/${sessionId}`);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header Card - Score Display */}
      <Card className="shadow-lg">
        <CardBody className="p-6">
          <div className="text-center">
            {/* Pass/Fail Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6">
              {passed ? (
                <>
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                  <span className="font-semibold text-green-700 dark:text-green-400">
                    PASSED
                  </span>
                </>
              ) : (
                <>
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                  <span className="font-semibold text-red-700 dark:text-red-400">
                    DID NOT PASS
                  </span>
                </>
              )}
            </div>

            {/* Score Circle */}
            <div className={`inline-flex items-center justify-center w-48 h-48 rounded-full ${getScoreBgColor(result.score_percentage)} mb-6`}>
              <div className="text-center">
                <div className={`text-6xl font-bold ${getScoreColor(result.score_percentage)}`}>
                  {result.score_percentage}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Score
                </div>
              </div>
            </div>

            {/* Passing Reference */}
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Passing Score:
                </span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {PASSING_SCORE}%
                </span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.correct_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Correct</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {result.questions_count - result.correct_count}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Incorrect</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {avgTimePerQuestion}s
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Avg/Question</div>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatTime(result.time_spent_seconds)}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Total Time</div>
              </div>
            </div>

            {/* Time Expired Warning */}
            {timeExpired && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">Time expired during exam</span>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Domain Breakdown Chart */}
      <Card>
        <CardHeader title="Domain Performance Breakdown" />
        <CardBody>
          <div className="space-y-4">
            {domainData.map((domain) => {
              const actualPercentage = domain.percentage;
              const isAboveTarget = actualPercentage >= PASSING_SCORE;

              return (
                <div key={domain.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded ${domain.color}`}></div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {domain.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        ({domain.weight}% exam weight)
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${isAboveTarget ? 'text-green-600' : 'text-red-600'}`}>
                        {domain.correct}/{domain.total}
                      </span>
                      <span className={`font-bold ${isAboveTarget ? 'text-green-600' : 'text-red-600'}`}>
                        {actualPercentage}%
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="relative h-6 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    {/* Domain weight background indicator */}
                    <div
                      className="absolute top-0 bottom-0 bg-gray-200 dark:bg-gray-700 opacity-30"
                      style={{ left: `${domain.weight}%`, width: '2px' }}
                    ></div>

                    {/* Actual score bar */}
                    <div
                      className={`absolute top-0 bottom-0 ${domain.color} transition-all duration-500 rounded-full`}
                      style={{ width: `${actualPercentage}%` }}
                    ></div>

                    {/* Passing score marker */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 dark:bg-red-400 z-10"
                      style={{ left: `${PASSING_SCORE}%` }}
                    ></div>
                  </div>

                  {/* Below threshold warning */}
                  {!isAboveTarget && (
                    <div className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      Below passing threshold
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-red-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Passing threshold</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gray-400 opacity-30"></div>
              <span className="text-gray-600 dark:text-gray-400">Domain weight</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Performance Analysis */}
      {report && (
        <Card>
          <CardHeader title="Performance Analysis" />
          <CardBody className="space-y-6">
            {/* Strengths */}
            {report.strengths.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Strengths</h4>
                </div>
                <ul className="space-y-2 ml-10">
                  {report.strengths.map((strength, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-green-500 mt-0.5">•</span>
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Weaknesses */}
            {report.weaknesses.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Areas for Improvement</h4>
                </div>
                <ul className="space-y-2 ml-10">
                  {report.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <span className="text-red-500 mt-0.5">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Best and Worst Domain Summary */}
            <div className="grid md:grid-cols-2 gap-4">
              {strongestDomain && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    <span className="font-semibold text-green-800 dark:text-green-300">Strongest Domain</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {strongestDomain.name}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-400">
                    {strongestDomain.correct}/{strongestDomain.total} ({strongestDomain.percentage}%)
                  </div>
                </div>
              )}

              {weakestDomain && weakestDomain.percentage < PASSING_SCORE && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                    <span className="font-semibold text-red-800 dark:text-red-300">Needs Focus</span>
                  </div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {weakestDomain.name}
                  </div>
                  <div className="text-sm text-red-700 dark:text-red-400">
                    {weakestDomain.correct}/{weakestDomain.total} ({weakestDomain.percentage}%)
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recommendations */}
      {report && report.recommendations.length > 0 && (
        <Card>
          <CardHeader title="Study Recommendations" />
          <CardBody>
            <div className="space-y-3">
              {report.recommendations.map((recommendation, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">
                    {recommendation}
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardBody className="p-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button variant="primary" size="lg" onClick={handleRetry}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Retry Exam
            </Button>
            <Button variant="secondary" size="lg" onClick={viewQuestions}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Review Questions
            </Button>
            <Button variant="ghost" size="lg" onClick={viewHistory}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View History
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Encouragement Message */}
      {passed ? (
        <div className="text-center p-6 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
          <svg className="w-12 h-12 text-green-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold text-green-800 dark:text-green-300 mb-2">
            Congratulations!
          </h3>
          <p className="text-green-700 dark:text-green-400">
            You&apos;ve demonstrated a solid understanding of PMP concepts. Keep practicing to maintain your proficiency.
          </p>
        </div>
      ) : (
        <div className="text-center p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <svg className="w-12 h-12 text-blue-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300 mb-2">
            Keep Studying!
          </h3>
          <p className="text-blue-700 dark:text-blue-400">
            Focus on your weak areas identified above and try again. Consistent practice is key to passing the PMP exam.
          </p>
        </div>
      )}
    </div>
  );
};

export default ScoreReport;
