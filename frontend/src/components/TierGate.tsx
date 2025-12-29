'use client';

import { useMemo } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import type { ApiError } from '@/types';

/**
 * Tier types for the PMP Study App
 */
export type Tier = 'public' | 'free' | 'premium';

/**
 * Types of limits that can be enforced
 */
export type LimitType = 'flashcard_view' | 'question_answer' | 'mini_exam' | 'full_exam';

/**
 * Error detail structure from API tier enforcement
 */
export interface LimitErrorDetail {
  error: string;
  limit_type: string;
  limit: number;
  reset_at: string | null;
  upgrade_required: boolean;
  message: string;
}

/**
 * Props for TierGate component
 */
export interface TierGateProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal is closed */
  onClose: () => void;
  /** The error that triggered the gate (from ApiClientError) */
  error?: ApiError & { detail?: LimitErrorDetail | string };
  /** Callback when user clicks upgrade button */
  onUpgrade?: () => void;
}

/**
 * Tier limit configuration for display
 */
const TIER_LIMITS: Record<
  Tier,
  {
    name: string;
    description: string;
    flashcards: string;
    questions: string;
    miniExams: string;
    fullExams: string;
    features: string[];
  }
> = {
  public: {
    name: 'Public',
    description: 'Try before you commit',
    flashcards: '50/day',
    questions: '30/day',
    miniExams: '1/day',
    fullExams: 'Not available',
    features: ['Basic flashcards', 'Practice questions', 'Progress tracking'],
  },
  free: {
    name: 'Free',
    description: 'For casual learners',
    flashcards: 'Unlimited',
    questions: 'Unlimited',
    miniExams: '2/month',
    fullExams: 'Not available',
    features: [
      'Unlimited flashcards',
      'Unlimited questions',
      'Basic progress tracking',
      'Study sessions',
    ],
  },
  premium: {
    name: 'Premium',
    description: 'Full PMP preparation',
    flashcards: 'Unlimited',
    questions: 'Unlimited',
    miniExams: 'Unlimited',
    fullExams: 'Unlimited',
    features: [
      'Everything in Free',
      'Full 185-question exams',
      'Real exam simulation',
      'AI-powered insights',
      'Adaptive explanations',
      'Offline mobile access',
    ],
  },
};

/**
 * Format a reset time for display
 */
function formatResetTime(resetAt: string | null): string {
  if (!resetAt) return 'tomorrow';

  const resetDate = new Date(resetAt);
  const now = new Date();
  const diffMs = resetDate.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
  }
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
}

/**
 * Parse limit type to display name
 */
function parseLimitType(limitType: string): string {
  const typeMap: Record<string, string> = {
    flashcard_view: 'flashcard',
    question_answer: 'question',
    mini_exam: 'mini-exam',
    full_exam: 'full exam',
  };
  return typeMap[limitType] || limitType.replace(/_/g, ' ');
}

/**
 * TierGate Component
 *
 * Displays a modal when users hit tier limits, showing:
 * - What limit was reached
 * - How long until reset
 * - Option to upgrade to Premium
 *
 * Used in conjunction with API tier enforcement errors.
 */
export default function TierGate({ isOpen, onClose, error, onUpgrade }: TierGateProps) {
  // Parse error details
  const errorDetail = useMemo(() => {
    if (!error?.detail || typeof error.detail === 'string') return null;

    // Check if it's a LimitErrorDetail structure
    if ('error' in error.detail && 'limit_type' in error.detail) {
      return error.detail as LimitErrorDetail;
    }

    return null;
  }, [error]);

  const isUpgradeRequired = errorDetail?.upgrade_required ?? false;
  const limitType = errorDetail?.limit_type;
  const limit = errorDetail?.limit ?? 0;
  const resetAt = errorDetail?.reset_at ?? null;

  // Generate content based on error type
  const title = useMemo(() => {
    if (isUpgradeRequired) {
      return 'Premium Feature';
    }
    return 'Daily Limit Reached';
  }, [isUpgradeRequired]);

  const message = useMemo(() => {
    if (isUpgradeRequired) {
      return `This ${parseLimitType(limitType || 'feature')} requires a Premium subscription.`;
    }
    return `You've reached your daily limit of ${limit} ${parseLimitType(limitType || '')} views.`;
  }, [isUpgradeRequired, limitType, limit]);

  const resetMessage = resetAt
    ? `Limit resets in ${formatResetTime(resetAt)}.`
    : 'Limit resets daily.';

  const handleUpgrade = () => {
    onUpgrade?.();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <Button variant="secondary" onClick={onClose} className="flex-1 sm:flex-none">
            Maybe Later
          </Button>
          <Button variant="primary" onClick={handleUpgrade} className="flex-1 sm:flex-none">
            Upgrade to Premium
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Message */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-900/30 mb-4">
            {isUpgradeRequired ? (
              // Crown icon for premium features
              <svg
                className="w-8 h-8 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
            ) : (
              // Clock icon for daily limits
              <svg
                className="w-8 h-8 text-amber-600 dark:text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </div>
          <p className="text-lg font-medium text-gray-900 dark:text-white">{message}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{resetMessage}</p>
        </div>

        {/* Tier comparison */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Compare Plans
          </h3>
          <div className="space-y-3">
            {/* Free tier */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {TIER_LIMITS.free.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">Free</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {TIER_LIMITS.free.questions}, {TIER_LIMITS.free.miniExams}
                </p>
              </div>
            </div>

            {/* Premium tier - highlighted */}
            <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 -mx-2 px-2 py-2 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex-shrink-0 w-5 h-5 rounded-full border-2 border-blue-600 dark:border-blue-400 flex items-center justify-center">
                <svg
                  className="w-3 h-3 text-blue-600 dark:text-blue-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {TIER_LIMITS.premium.name}
                  </span>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    $14.99/mo
                  </span>
                </div>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-0.5">
                  {TIER_LIMITS.premium.questions}, {TIER_LIMITS.premium.fullExams}, all
                  features
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Premium features highlight */}
        <div className="grid grid-cols-2 gap-2">
          {TIER_LIMITS.premium.features.slice(0, 4).map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-xs">
              <svg
                className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-gray-600 dark:text-gray-400">{feature}</span>
            </div>
          ))}
        </div>

        {/* Annual savings note */}
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Save <span className="font-semibold text-green-600 dark:text-green-400">33%</span>{' '}
            with annual billing ($119.99/year)
          </p>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Hook to check if an error is a tier limit error
 */
export function isTierLimitError(error: unknown): error is ApiError & {
  detail?: LimitErrorDetail | string;
} {
  if (!error || typeof error !== 'object') return false;
  const err = error as Partial<ApiClientError>;
  if (!err.data || typeof err.data !== 'object') return false;
  const detail = err.data.detail;
  if (typeof detail === 'string') {
    return detail.includes('limit_exceeded') || detail.includes('upgrade_required');
  }
  if (detail && typeof detail === 'object' && 'error' in detail) {
    return (
      detail.error === 'limit_exceeded' ||
      detail.error === 'upgrade_required' ||
      'upgrade_required' in detail
    );
  }
  return false;
}

// For type checking with ApiClientError
interface ApiClientError {
  status: number;
  data: ApiError;
}
