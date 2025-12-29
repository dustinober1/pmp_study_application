'use client';

import { useDomains, useProgressSummary, useStudyStreak, useFlashcardsDue } from '@/lib/api/hooks';
import Card, { CardBody } from '@/components/ui/Card';
import Link from 'next/link';
import { useIsPremium, useTierDisplay, useUser } from '@/stores/userStore';
import { useTelemetry } from '@/lib/telemetry';
import { useEffect } from 'react';

// Domain color configurations
const domainColors: Record<string, { color: string; bgColor: string; textColor: string }> = {
  People: {
    color: 'bg-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    textColor: 'text-blue-700 dark:text-blue-300',
  },
  Process: {
    color: 'bg-green-500',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    textColor: 'text-green-700 dark:text-green-300',
  },
  'Business Environment': {
    color: 'bg-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-700 dark:text-purple-300',
  },
};

// Circular progress component
function CircularProgress({
  percentage,
  size = 80,
  strokeWidth = 8,
  color = 'stroke-blue-500'
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          className="stroke-gray-200 dark:stroke-gray-700"
          strokeWidth={strokeWidth}
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={`${color} transition-all duration-500 ease-out`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 dark:text-white">
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

// Domain Card component
function DomainCard({
  domainId,
  name,
  weight,
  description,
  taskCount,
  flashcardsReviewed,
  totalFlashcards,
  questionsCorrect,
  totalQuestions,
  flashcardAccuracy,
  questionAccuracy,
}: {
  domainId: number;
  name: string;
  weight: number;
  description: string;
  taskCount: number;
  flashcardsReviewed: number;
  totalFlashcards: number;
  questionsCorrect: number;
  totalQuestions: number;
  flashcardAccuracy: number;
  questionAccuracy: number;
}) {
  const colors = domainColors[name] || domainColors['People'];

  // Calculate overall domain progress
  const flashcardProgress = totalFlashcards > 0 ? (flashcardsReviewed / totalFlashcards) * 100 : 0;
  const questionProgress = totalQuestions > 0 ? (questionsCorrect / totalQuestions) * 100 : 0;
  const overallProgress = (flashcardProgress + questionProgress) / 2;

  return (
    <Card variant="default" hoverable className="overflow-hidden">
      {/* Color bar at top */}
      <div className={`h-2 ${colors.color}`} />

      <CardBody className="p-6">
        {/* Header with name and weight */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              {name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors.bgColor} ${colors.textColor}`}>
            {weight}%
          </span>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-6 mb-6">
          <CircularProgress
            percentage={overallProgress}
            color={colors.color.replace('bg-', 'stroke-')}
          />

          <div className="flex-1 space-y-3">
            {/* Flashcard progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Flashcards</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {flashcardsReviewed}/{totalFlashcards}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.color} transition-all duration-500`}
                  style={{ width: `${flashcardProgress}%` }}
                />
              </div>
            </div>

            {/* Question progress */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600 dark:text-gray-400">Questions</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {questionsCorrect}/{totalQuestions}
                </span>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full ${colors.color} transition-all duration-500`}
                  style={{ width: `${questionProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Tasks</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {flashcardAccuracy > 0 ? `${Math.round(flashcardAccuracy)}%` : '-'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Flashcard Acc.</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {questionAccuracy > 0 ? `${Math.round(questionAccuracy)}%` : '-'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Question Acc.</p>
          </div>
        </div>

        {/* Study button */}
        <Link
          href={`/study?domain=${domainId}`}
          className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg ${colors.bgColor} ${colors.textColor} font-medium hover:opacity-80 transition-opacity`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          Study This Domain
        </Link>
      </CardBody>
    </Card>
  );
}

// Loading skeleton for domain cards
function DomainCardSkeleton() {
  return (
    <Card variant="default" className="overflow-hidden animate-pulse">
      <div className="h-2 bg-gray-300 dark:bg-gray-600" />
      <CardBody className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          </div>
          <div className="h-6 w-12 bg-gray-200 dark:bg-gray-700 rounded-full" />
        </div>

        <div className="flex items-center gap-6 mb-6">
          <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
          <div className="flex-1 space-y-3">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-12 mx-auto mb-1" />
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto" />
            </div>
          ))}
        </div>

        <div className="mt-4 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
      </CardBody>
    </Card>
  );
}

// Stats card component
function StatsCard({
  icon,
  label,
  value,
  subValue,
  iconBgColor,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  iconBgColor: string;
  iconColor: string;
}) {
  return (
    <Card variant="default" padding="md">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${iconBgColor}`}>
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subValue && (
            <p className="text-xs text-gray-400 dark:text-gray-500">{subValue}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: domains, isLoading: domainsLoading, error: domainsError } = useDomains();
  const { data: progress, isLoading: progressLoading } = useProgressSummary();
  const { data: streak } = useStudyStreak();
  const { data: flashcardsDue } = useFlashcardsDue();
  const isPremium = useIsPremium();
  const tierDisplay = useTierDisplay();
  const user = useUser();
  const telemetry = useTelemetry();

  // Track dashboard page view
  useEffect(() => {
    telemetry.trackPageView('dashboard');
  }, [telemetry]);

  const isLoading = domainsLoading || progressLoading;

  // Calculate days until exam (placeholder - would come from user profile)
  const daysUntilExam = 90;

  // Format study time
  const formatStudyTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Get domain progress data
  const getDomainProgress = (domainId: number) => {
    const domainProgress = progress?.by_domain?.find(d => d.domain_id === domainId);
    return {
      flashcardsReviewed: domainProgress?.reviewed_flashcards ?? 0,
      totalFlashcards: domainProgress?.total_flashcards ?? 0,
      questionsCorrect: domainProgress?.correct_questions ?? 0,
      totalQuestions: domainProgress?.total_questions ?? 0,
      flashcardAccuracy: domainProgress?.flashcard_accuracy ?? 0,
      questionAccuracy: domainProgress?.question_accuracy ?? 0,
    };
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Track your PMP 2026 exam preparation progress
            </p>
          </div>
          {/* Tier Badge */}
          <div className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${tierDisplay.bgColor} ${tierDisplay.color}`}>
            {tierDisplay.name}
            {isPremium && (
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            )}
          </div>
        </div>

        {flashcardsDue && flashcardsDue.count > 0 && (
          <Link
            href="/flashcards?due_only=true"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-lg font-medium hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {flashcardsDue.count} cards due for review
          </Link>
        )}
      </div>

      {/* Premium Upgrade CTA for non-premium users */}
      {!isPremium && user?.email && (
        <Card variant="filled" className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800">
          <CardBody className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                  <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                    Unlock Premium Features
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Get full 185-question exams, AI-powered coaching, adaptive explanations, and more. Start your free trial today.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/pricing"
                  onClick={() => telemetry.trackUpgradeClick('dashboard_upgrade_cta')}
                  className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                >
                  Upgrade to Premium
                </Link>
                <Link
                  href="/pricing"
                  onClick={() => telemetry.trackUpgradeClick('dashboard_view_plans')}
                  className="px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-200"
                >
                  View Plans
                </Link>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Exam Day Countdown (shows for all users) */}
      <Card variant="default" padding="md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Days Until Exam
              </h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {daysUntilExam} days
              </p>
            </div>
          </div>
          {user?.email && !isPremium && (
            <Link
              href="/roadmap"
              className="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
            >
              Set up Study Plan
            </Link>
          )}
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          }
          label="Flashcards Reviewed"
          value={progress?.overall?.reviewed_flashcards ?? 0}
          subValue={`of ${progress?.overall?.total_flashcards ?? 0} total`}
          iconBgColor="bg-blue-100 dark:bg-blue-900/30"
          iconColor="text-blue-600 dark:text-blue-400"
        />

        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Questions Answered"
          value={progress?.overall?.attempted_questions ?? 0}
          subValue={`${progress?.overall?.correct_questions ?? 0} correct`}
          iconBgColor="bg-green-100 dark:bg-green-900/30"
          iconColor="text-green-600 dark:text-green-400"
        />

        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
          label="Study Streak"
          value={`${streak?.current_streak ?? 0} days`}
          subValue={streak?.longest_streak ? `Best: ${streak.longest_streak} days` : undefined}
          iconBgColor="bg-purple-100 dark:bg-purple-900/30"
          iconColor="text-purple-600 dark:text-purple-400"
        />

        <StatsCard
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Study Time"
          value={formatStudyTime(progress?.overall?.total_study_time_seconds ?? 0)}
          subValue={`${progress?.overall?.total_sessions ?? 0} sessions`}
          iconBgColor="bg-amber-100 dark:bg-amber-900/30"
          iconColor="text-amber-600 dark:text-amber-400"
        />
      </div>

      {/* Overall Accuracy */}
      {progress?.overall && (progress.overall.flashcard_accuracy > 0 || progress.overall.question_accuracy > 0) && (
        <Card variant="default" padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Overall Accuracy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Flashcard Accuracy</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Math.round(progress.overall.flashcard_accuracy)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progress.overall.flashcard_accuracy}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Question Accuracy</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {Math.round(progress.overall.question_accuracy)}%
                </span>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-500"
                  style={{ width: `${progress.overall.question_accuracy}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Domain Overview Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Domain Progress
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            PMP 2026 ECO Domains
          </span>
        </div>

        {domainsError && (
          <Card variant="outlined" padding="lg" className="text-center">
            <p className="text-red-500 dark:text-red-400">
              Failed to load domains. Please try again later.
            </p>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <>
              <DomainCardSkeleton />
              <DomainCardSkeleton />
              <DomainCardSkeleton />
            </>
          ) : (
            domains?.map((domain) => {
              const domainProgress = getDomainProgress(domain.id);
              return (
                <DomainCard
                  key={domain.id}
                  domainId={domain.id}
                  name={domain.name}
                  weight={domain.weight}
                  description={domain.description || ''}
                  taskCount={domain.tasks?.length ?? 0}
                  {...domainProgress}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/flashcards"
          className="card p-5 group hover:shadow-lg transition-all"
        >
          <div className="text-blue-600 dark:text-blue-400 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
            Study Flashcards
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review key concepts with spaced repetition
          </p>
        </Link>

        <Link
          href="/practice"
          className="card p-5 group hover:shadow-lg transition-all"
        >
          <div className="text-green-600 dark:text-green-400 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
            Practice Test
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Take a timed practice exam
          </p>
        </Link>

        <Link
          href="/progress"
          className="card p-5 group hover:shadow-lg transition-all"
        >
          <div className="text-purple-600 dark:text-purple-400 mb-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
            View Progress
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track your detailed study progress
          </p>
        </Link>
      </div>
    </div>
  );
}
