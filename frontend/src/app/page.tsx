'use client';

import React from 'react';
import {
  useDomains,
  useProgressSummary,
  useStudyStreak
} from '@/lib/api/hooks';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function Home() {
  const { data: domains, isLoading: isLoadingDomains } = useDomains();
  const { data: progress, isLoading: isLoadingProgress } = useProgressSummary();
  const { data: streak, isLoading: isLoadingStreak } = useStudyStreak();

  const isLoading = isLoadingDomains || isLoadingProgress || isLoadingStreak;

  // Domain UI metadata
  const domainMetadata: Record<string, { color: string; bgColor: string; textColor: string; description: string }> = {
    'People': {
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-700 dark:text-blue-300',
      description: 'Leadership, team dynamics, stakeholder engagement',
    },
    'Process': {
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-700 dark:text-green-300',
      description: 'Planning, execution, monitoring, adaptation',
    },
    'Business Environment': {
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-700 dark:text-purple-300',
      description: 'Strategic alignment, governance, value delivery',
    },
  };

  const quickActions = [
    {
      title: 'Study Flashcards',
      description: 'Review key concepts with spaced repetition',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      href: '/flashcards',
      color: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Practice Test',
      description: 'Take a timed practice exam',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      href: '/practice',
      color: 'text-green-600 dark:text-green-400',
    },
    {
      title: 'View Progress',
      description: 'Track your study progress',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      href: '/progress',
      color: 'text-purple-600 dark:text-purple-400',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Section */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Welcome to PMP 2026 Study
            </h1>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Master the new PMP Examination Content Outline (ECO) effective July 2026
            </p>
          </div>
          <Link href="/flashcards">
            <Button size="lg" className="whitespace-nowrap">
              Start Studying
            </Button>
          </Link>
        </div>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Flashcards Mastered</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {progress?.overall?.mastered_flashcards || 0} / {progress?.overall?.total_flashcards || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Questions Answered</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {progress?.overall?.attempted_questions || 0} / {progress?.overall?.total_questions || 0}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Study Streak</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {streak?.current_streak || 0} days
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Study Time</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">
                {Math.floor((progress?.overall?.total_study_time_seconds || 0) / 3600)}h {Math.floor(((progress?.overall?.total_study_time_seconds || 0) % 3600) / 60)}m
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <Link
            key={action.title}
            href={action.href}
            className="card p-5 group transition-all hover:bg-white dark:hover:bg-gray-800 border-2 border-transparent hover:border-blue-500/50"
          >
            <div className={`${action.color} mb-3`}>{action.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
              {action.title}
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {action.description}
            </p>
          </Link>
        ))}
      </div>

      {/* ECO Domains */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          PMP 2026 ECO Domains
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {domains?.map((domain) => {
            const meta = domainMetadata[domain.name] || domainMetadata['Process'];
            const domainProgress = progress?.by_domain?.find(d => d.domain_id === domain.id);
            const masterPercentage = domainProgress?.flashcard_accuracy || 0;

            return (
              <Link href={`/flashcards?domain_id=${domain.id}`} key={domain.id}>
                <Card className="overflow-hidden group hover:bg-white dark:hover:bg-gray-800 border-2 border-transparent hover:border-blue-500/50 transition-all">
                  <div className={`h-1 ${meta.color}`} />
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {domain.name}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${meta.bgColor} ${meta.textColor}`}>
                        {domain.weight}%
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {meta.description}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">
                        {domain.tasks.length} Tasks
                      </span>
                      <span className="text-blue-600 dark:text-blue-400 font-medium">
                        {masterPercentage}% Mastered
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mt-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${meta.color}`}
                        style={{ width: `${masterPercentage}%` }}
                      />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Exam Info */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 text-center">
          PMP 2026 Exam Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">185</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Questions</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">240</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Minutes</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">60%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Agile/Hybrid</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">40%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Predictive</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

