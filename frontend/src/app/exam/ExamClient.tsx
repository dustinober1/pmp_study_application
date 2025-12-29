'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  useExamStore,
  useCurrentExamSession,
  useCurrentExamResult,
  useCurrentExamReport,
} from '@/stores/examStore';
import {
  createExamSession,
  startExamSession,
  getExamSessionQuestions,
  getExamHistory,
  resumeExamSession,
  abandonExamSession,
} from '@/lib/api/exams';
import { ExamInterface } from '@/components/exam/ExamInterface';
import { ScoreReport } from '@/components/exam/ScoreReport';
import { ResumeExamPrompt } from '@/components/exam';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import type { ExamSession } from '@/types';
import { useTelemetry } from '@/lib/telemetry';

type ExamView = 'landing' | 'active' | 'results';

export default function ExamClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionIdParam = searchParams.get('session');
  const telemetry = useTelemetry();

  const currentSession = useCurrentExamSession();
  const currentResult = useCurrentExamResult();
  const currentReport = useCurrentExamReport();
  const examError = useExamStore((state) => state.examError);
  const isLoadingSession = useExamStore((state) => state.isLoadingSession);

  const [view, setView] = useState<ExamView>('landing');
  const [history, setHistory] = useState<ExamSession[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Track page view on mount
  useEffect(() => {
    telemetry.trackPageView('exam_simulator');
    telemetry.trackPremiumFeatureAccess('exam_simulator');
  }, [telemetry]);

  // Load history on mount
  useEffect(() => {
    loadExamHistory();
  }, []);

  // Check for existing session in store or URL param
  useEffect(() => {
    if (sessionIdParam) {
      // URL param takes priority - try to resume
      resumeSession(sessionIdParam);
    } else if (currentSession) {
      // Check store for existing session from localStorage
      if (currentSession.status === 'in_progress') {
        // Show resume prompt instead of directly entering active mode
        setShowResumePrompt(true);
      } else if (currentSession.status === 'completed' && currentResult) {
        setView('results');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionIdParam]);

  const loadExamHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const sessions = await getExamHistory({ limit: 10 });
      setHistory(sessions);
      useExamStore.getState().loadHistory(sessions);
    } catch (error) {
      console.error('Failed to load exam history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const resumeSession = async (sessionId: string) => {
    useExamStore.getState().setLoadingSession(true);
    try {
      const resumeData = await resumeExamSession(sessionId);
      useExamStore.getState().loadExamSession(resumeData.session, resumeData.questions);
      setView('active');
    } catch (error) {
      console.error('Failed to resume session:', error);
      useExamStore.getState().setError('Failed to resume exam session');
    } finally {
      useExamStore.getState().setLoadingSession(false);
    }
  };

  const handleStartExam = async () => {
    setIsStarting(true);
    try {
      // Track exam start
      telemetry.trackExamStart('full');

      // Create new exam session (default 240 minutes, 185 questions for PMP)
      const session = await createExamSession({
        exam_duration_minutes: 240,
        total_questions: 185,
      });

      // Start the session to get questions
      const sessionDetail = await startExamSession(session.id);

      // Get questions for the session
      const questionsData = await getExamSessionQuestions(session.id);

      // Load into store
      useExamStore.getState().loadExamSession(sessionDetail, questionsData.questions);

      // Update URL without navigation
      const url = new URL(window.location.href);
      url.searchParams.set('session', session.id);
      window.history.pushState({}, '', url.toString());

      setView('active');
    } catch (error) {
      console.error('Failed to start exam:', error);
      useExamStore.getState().setError('Failed to start exam. Please try again.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleResumeFromPrompt = () => {
    // Sync with backend and enter active mode
    if (currentSession) {
      resumeSession(currentSession.id);
    }
    setShowResumePrompt(false);
  };

  const handleRestartFromPrompt = async () => {
    // Abandon current session and start new
    if (currentSession) {
      try {
        await abandonExamSession(currentSession.id);
      } catch (error) {
        console.error('Failed to abandon session:', error);
      }
    }
    setShowResumePrompt(false);
    await handleStartExam();
  };

  const handleResumeSession = (sessionId: string) => {
    router.push(`/exam?session=${sessionId}`);
  };

  const handleViewHistory = () => {
    router.push('/exam/history');
  };

  const handleBackToLanding = () => {
    // Clear URL param
    const url = new URL(window.location.href);
    url.searchParams.delete('session');
    window.history.pushState({}, '', url.toString());

    setView('landing');
    useExamStore.getState().clearCurrentSession();
  };

  // Show active exam interface
  if (view === 'active' && currentSession && currentSession.id) {
    return <ExamInterface sessionId={currentSession.id} />;
  }

  // Show results for completed exam
  if (view === 'results' && currentResult && currentSession) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
        <div className="mb-4 flex items-center justify-between max-w-7xl mx-auto px-4">
          <Button variant="ghost" size="sm" onClick={handleBackToLanding}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Exams
          </Button>
        </div>
        <ScoreReport
          result={currentResult}
          report={currentReport ?? undefined}
          sessionId={currentSession.id}
        />
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            PMP Exam Simulation
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Practice with a realistic PMP 2026 exam simulation featuring 185 questions across
            all three domains with a 240-minute time limit.
          </p>
        </div>

        {/* Error Display */}
        {examError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 px-4 py-3 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{examError}</span>
            </div>
          </div>
        )}

        {/* Start New Exam Card */}
        <Card className="shadow-lg">
          <CardHeader title="Start New Exam" />
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">185</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Questions</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">240</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Minutes</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">65%</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Passing Score</div>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400 mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span>People Domain (33% - Leadership, Team, Stakeholders)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Process Domain (41% - Planning, Execution, Monitoring)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <span>
                    Business Environment (26% - Strategy, Governance, Value)
                  </span>
                </div>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <p className="font-medium mb-1">Before you start:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Ensure you have 4 hours of uninterrupted time</li>
                      <li>You can flag questions to review later</li>
                      <li>Progress is saved automatically</li>
                      <li>You can exit and resume later if needed</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleStartExam}
                isLoading={isStarting}
                disabled={isLoadingSession}
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Start New Exam
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Exam History */}
        <Card>
          <CardHeader
            title="Recent Exams"
            action={
              <Button variant="ghost" size="sm" onClick={handleViewHistory}>
                View All
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            }
          />
          <CardBody>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <svg
                  className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p>No exam history yet. Start your first exam to track progress!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history.slice(0, 5).map((session) => {
                  const isCompleted = session.status === 'completed';
                  const isInProgress = session.status === 'in_progress';

                  const formatDate = new Date(session.start_time).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div
                            className={`px-2 py-1 text-xs font-medium rounded-full ${
                              isCompleted
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : isInProgress
                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}
                          >
                            {session.status === 'completed'
                              ? 'Completed'
                              : session.status === 'in_progress'
                              ? 'In Progress'
                              : 'Abandoned'}
                          </div>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDate}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-700 dark:text-gray-300">
                          <span>
                            {session.correct_count ?? 0} / {session.questions_count} answered
                          </span>
                          {isCompleted && session.correct_count !== undefined && (
                            <span className="font-semibold">
                              {Math.round((session.correct_count / session.questions_count) * 100)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isInProgress ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleResumeSession(session.id)}
                          >
                            Resume
                          </Button>
                        ) : isCompleted ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/exam/results/${session.id}`)}
                          >
                            View Results
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Navigation Links */}
        <div className="grid md:grid-cols-3 gap-4">
          <Link href="/flashcards">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardBody className="text-center py-6">
                <svg
                  className="w-10 h-10 mx-auto mb-3 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Flashcards</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Study key concepts with spaced repetition
                </p>
              </CardBody>
            </Card>
          </Link>

          <Link href="/practice">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardBody className="text-center py-6">
                <svg
                  className="w-10 h-10 mx-auto mb-3 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Practice</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Focused practice by domain or task
                </p>
              </CardBody>
            </Card>
          </Link>

          <Link href="/progress">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardBody className="text-center py-6">
                <svg
                  className="w-10 h-10 mx-auto mb-3 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Progress</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Track your learning journey
                </p>
              </CardBody>
            </Card>
          </Link>
        </div>
      </div>

      {/* Resume Exam Prompt */}
      <ResumeExamPrompt
        isOpen={showResumePrompt}
        onResume={handleResumeFromPrompt}
        onRestart={handleRestartFromPrompt}
      />
    </div>
  );
}
