'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useExamStore, useExamTimer, useExamProgress, useExamCurrentQuestion } from '@/stores/examStore';
import { submitExamAnswer, completeExamSession, abandonExamSession } from '@/lib/api/exams';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface ExamInterfaceProps {
  sessionId: string;
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({ sessionId }) => {
  const router = useRouter();
  const currentSession = useExamStore((state) => state.currentSession);
  const submitAnswer = useExamStore((state) => state.submitAnswer);
  const goToQuestion = useExamStore((state) => state.goToQuestion);
  const goToNextQuestion = useExamStore((state) => state.goToNextQuestion);
  const goToPreviousQuestion = useExamStore((state) => state.goToPreviousQuestion);
  const flagQuestion = useExamStore((state) => state.flagQuestion);
  const updateQuestionTime = useExamStore((state) => state.updateQuestionTime);
  const endExam = useExamStore((state) => state.endExam);
  const clearCurrentSession = useExamStore((state) => state.clearCurrentSession);
  const setError = useExamStore((state) => state.setError);

  const { remaining, formatted, isExpired } = useExamTimer();
  const { answered, total, percentage, flagged, current: currentIndex } = useExamProgress();
  const currentQuestion = useExamCurrentQuestion();

  const [isFullScreen, setIsFullScreen] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [showQuestionNav, setShowQuestionNav] = useState(false);

  // Track question time
  useEffect(() => {
    setQuestionStartTime(Date.now());
  }, [currentIndex]);

  // Restore selected answer from current question
  useEffect(() => {
    setSelectedAnswer(currentQuestion?.selected_answer ?? null);
  }, [currentQuestion?.selected_answer, currentIndex]);

  // Auto-submit on time expiry
  useEffect(() => {
    if (isExpired && currentSession?.status === 'in_progress') {
      handleSubmitExam(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpired, currentSession?.status]);

  const toggleFullScreen = useCallback(() => {
    setIsFullScreen((prev) => !prev);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreen) {
        toggleFullScreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreen, toggleFullScreen]);

  const handleAnswerSelect = async (answer: string) => {
    if (isSubmitting || !currentQuestion) return;

    setSelectedAnswer(answer);
    setIsSubmitting(true);

    const timeSpentSeconds = Math.floor((Date.now() - questionStartTime) / 1000);

    try {
      // Optimistic update
      submitAnswer(
        currentQuestion.question_id,
        currentQuestion.question_index,
        answer,
        timeSpentSeconds
      );

      // API call
      await submitExamAnswer(sessionId, {
        question_id: currentQuestion.question_id,
        selected_answer: answer,
        time_spent_seconds: timeSpentSeconds,
      });

      updateQuestionTime(currentQuestion.question_index, timeSpentSeconds);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setError('Failed to submit answer. Please try again.');
      setSelectedAnswer(currentQuestion.selected_answer);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNavClick = (index: number) => {
    goToQuestion(index);
    setShowQuestionNav(false);
  };

  const handleNext = () => {
    goToNextQuestion();
  };

  const handlePrevious = () => {
    goToPreviousQuestion();
  };

  const handleFlagToggle = () => {
    if (!currentQuestion) return;
    const newFlaggedState = !currentQuestion.is_flagged;
    flagQuestion(currentQuestion.question_index, newFlaggedState);
  };

  const handleSubmitExam = async (forceComplete = false) => {
    if (!currentSession) return;

    setIsSubmitting(true);
    try {
      const result = await completeExamSession(sessionId, { force_complete: forceComplete });
      endExam(result);
      // Navigate to results after a brief delay
      setTimeout(() => {
        router.push(`/exam/results/${sessionId}`);
      }, 1000);
    } catch (error) {
      console.error('Failed to submit exam:', error);
      setError('Failed to submit exam. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowSubmitConfirm(false);
    }
  };

  const handleAbandonExam = async () => {
    if (!currentSession) return;

    setIsSubmitting(true);
    try {
      await abandonExamSession(sessionId);
      clearCurrentSession();
      router.push('/exam');
    } catch (error) {
      console.error('Failed to abandon exam:', error);
      setError('Failed to abandon exam. Please try again.');
    } finally {
      setIsSubmitting(false);
      setShowAbandonConfirm(false);
    }
  };

  if (!currentSession || !currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading exam...</p>
        </div>
      </div>
    );
  }

  const options = ['A', 'B', 'C', 'D'] as const;
  const optionText: Record<string, string> = {
    A: currentQuestion.option_a,
    B: currentQuestion.option_b,
    C: currentQuestion.option_c,
    D: currentQuestion.option_d,
  };

  const isLastQuestion = currentIndex === total - 1;
  const allAnswered = answered === total;

  return (
    <div
      className={`transition-all duration-300 ${
        isFullScreen
          ? 'fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 overflow-auto'
          : 'min-h-screen'
      }`}
    >
      {/* Top Bar - Timer and Actions */}
      <div className="sticky top-0 z-40 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold ${
                remaining < 300
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatted}</span>
            </div>

            {/* Middle - Progress */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Answered:</span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {answered}/{total}
                </span>
              </div>
              {flagged > 0 && (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zm1 3a1 1 0 100 2h6a1 1 0 100-2H4z" />
                  </svg>
                  <span className="font-semibold text-yellow-600 dark:text-yellow-400">{flagged}</span>
                </div>
              )}
              <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleFullScreen}
                title={isFullScreen ? 'Exit full screen' : 'Full screen'}
              >
                {isFullScreen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                )}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setShowQuestionNav(true)}>
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                Questions
              </Button>
            </div>
          </div>

          {/* Mobile Progress Bar */}
          <div className="mt-3 md:hidden flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {answered}/{total} answered
            </span>
            <div className="w-40 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Question Number */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Question {currentIndex + 1} of {total}
            </span>
            {currentQuestion.domain_name && (
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                {currentQuestion.domain_name}
              </span>
            )}
          </div>
          <Button
            variant={currentQuestion.is_flagged ? 'secondary' : 'ghost'}
            size="sm"
            onClick={handleFlagToggle}
            className={currentQuestion.is_flagged ? 'border-yellow-500 text-yellow-700' : ''}
          >
            <svg
              className={`w-4 h-4 mr-1 ${currentQuestion.is_flagged ? 'fill-yellow-500' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"
              />
            </svg>
            {currentQuestion.is_flagged ? 'Flagged' : 'Flag'}
          </Button>
        </div>

        {/* Question Card */}
        <Card className="p-6 md:p-8 shadow-lg mb-6">
          <div className="mb-6">
            <p className="text-lg md:text-xl font-medium text-gray-900 dark:text-white leading-relaxed">
              {currentQuestion.question_text}
            </p>
          </div>

          {/* Answer Options */}
          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option}
                onClick={() => handleAnswerSelect(option)}
                disabled={isSubmitting}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-start gap-3 ${
                  selectedAnswer === option
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-gray-900'
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <span
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
                    selectedAnswer === option
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {option}
                </span>
                <span className="pt-0.5">{optionText[option]}</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-4">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentIndex === 0 || isSubmitting}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {isLastQuestion && allAnswered ? (
              <Button variant="success" onClick={() => setShowSubmitConfirm(true)} isLoading={isSubmitting}>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Submit Exam
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={isSubmitting}>
                Next
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowAbandonConfirm(true)} disabled={isSubmitting}>
              Exit
            </Button>
          </div>
        </div>

        {/* Bottom Progress Indicator */}
        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span>Answered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full border-2 border-gray-300 dark:border-gray-600"></div>
            <span>Unanswered</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
            <span>Flagged</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-600 border-2 border-blue-600"></div>
            <span>Current</span>
          </div>
        </div>
      </div>

      {/* Question Navigation Modal */}
      <Modal isOpen={showQuestionNav} onClose={() => setShowQuestionNav(false)} title="Question Navigator">
        <div className="max-w-2xl max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 p-4">
            {currentSession.questions.map((q, idx) => {
              const isAnswered = q.selected_answer !== null;
              const isCurrent = idx === currentIndex;
              const isFlagged = q.is_flagged;

              return (
                <button
                  key={idx}
                  onClick={() => handleNavClick(idx)}
                  className={`aspect-square flex items-center justify-center text-sm font-medium rounded-lg transition-all ${
                    isCurrent
                      ? 'bg-blue-600 text-white ring-2 ring-blue-600 ring-offset-2 dark:ring-offset-gray-900'
                      : isFlagged
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-2 border-yellow-500'
                      : isAnswered
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-2 border-gray-200 dark:border-gray-700'
                  } hover:scale-105`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-blue-600"></div>
              <span className="text-gray-600 dark:text-gray-400">Current</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-blue-100 dark:bg-blue-900/30"></div>
              <span className="text-gray-600 dark:text-gray-400">Answered</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-gray-100 dark:bg-gray-800"></div>
              <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500"></div>
              <span className="text-gray-600 dark:text-gray-400">Flagged</span>
            </div>
          </div>
        </div>
      </Modal>

      {/* Submit Confirmation Modal */}
      <Modal
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        title="Submit Exam"
      >
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300">
              {allAnswered
                ? 'All questions have been answered.'
                : `${total - answered} question(s) remaining unanswered.`}
            </p>
            {flagged > 0 && (
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-2">
                {flagged} flagged question(s) - review them before submitting.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{answered}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Answered</div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{flagged}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Flagged</div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Are you sure you want to submit your exam? This action cannot be undone.
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowSubmitConfirm(false)}>
              Continue Exam
            </Button>
            <Button variant="success" fullWidth onClick={() => handleSubmitExam(false)} isLoading={isSubmitting}>
              Submit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Abandon Confirmation Modal */}
      <Modal
        isOpen={showAbandonConfirm}
        onClose={() => setShowAbandonConfirm(false)}
        title="Exit Exam"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              Your progress will be saved. You can resume this exam later from the exam history page.
            </p>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Are you sure you want to exit this exam?
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowAbandonConfirm(false)}>
              Continue Exam
            </Button>
            <Button variant="danger" fullWidth onClick={handleAbandonExam} isLoading={isSubmitting}>
              Exit Exam
            </Button>
          </div>
        </div>
      </Modal>

      {/* Time Warning Toast */}
      {remaining < 300 && remaining > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-bounce">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-medium">Less than 5 minutes remaining!</span>
        </div>
      )}
    </div>
  );
};

export default ExamInterface;
