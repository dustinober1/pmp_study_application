'use client';

import React from 'react';
import { useExamTimer, useExamProgress } from '@/stores/examStore';
import { Card } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

interface ResumeExamPromptProps {
  isOpen: boolean;
  onResume: () => void;
  onRestart: () => void;
}

/**
 * Modal shown when user navigates to exam page with an in-progress session.
 * Allows user to resume existing session or start fresh.
 */
export const ResumeExamPrompt: React.FC<ResumeExamPromptProps> = ({
  isOpen,
  onResume,
  onRestart,
}) => {
  const { formatted } = useExamTimer();
  const { answered, total, percentage } = useExamProgress();

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title="Resume Exam?">
      <div className="space-y-6">
        {/* Info Message */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            You have an exam in progress. Your progress has been saved automatically.
          </p>
        </div>

        {/* Progress Summary */}
        <Card className="bg-gray-50 dark:bg-gray-800">
          <div className="p-4 space-y-4">
            {/* Time Remaining */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Time Remaining:</span>
              <span className="font-mono font-bold text-lg text-gray-900 dark:text-white">
                {formatted}
              </span>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">Progress:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {answered} / {total} ({Math.round(percentage)}%)
                </span>
              </div>
              <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Options */}
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Would you like to resume this exam, or start a new one?
          </p>

          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={onRestart}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Start New Exam
            </Button>
            <Button variant="primary" fullWidth onClick={onResume}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Resume Exam
            </Button>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-300 px-4 py-3 rounded-lg text-sm">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <p>
              Starting a new exam will abandon your current progress. You can still access the
              abandoned exam from history.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ResumeExamPrompt;
