'use client';

import React from 'react';
import { ExamHistory } from '@/components/exam';
import { MainLayout } from '@/components/layout';

export default function ExamHistoryPage() {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Exam History
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your progress and review past exam performances
          </p>
        </div>

        {/* Exam History List */}
        <ExamHistory />
      </div>
    </MainLayout>
  );
}
