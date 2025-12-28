'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuestions } from '@/lib/api/hooks';
import { TestSession } from '@/components/practice/TestSession';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function PracticeTestClient() {
    const searchParams = useSearchParams();

    const domainId = searchParams.get('domain_id');
    const taskId = searchParams.get('task_id');
    const difficulty = searchParams.get('difficulty');
    const mode = (searchParams.get('mode') as 'immediate' | 'exam') || 'immediate';

    const filters = useMemo(() => ({
        domain: domainId ? parseInt(domainId) : undefined,
        task: taskId ? parseInt(taskId) : undefined,
        difficulty: difficulty || undefined,
    }), [domainId, taskId, difficulty]);

    const { data: questions, isLoading, error } = useQuestions(filters);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 animate-pulse font-medium">Preparing your practice test...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
                <div className="text-red-500 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <h1 className="text-xl font-bold mb-2">Error loading questions</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    We encountered an issue while loading the practice questions. Please try again.
                </p>
                <Link href="/practice">
                    <Button>Back to Selection</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6 md:py-10 animate-fade-in">
            {!questions || questions.length === 0 ? (
                <div className="text-center py-20 px-6">
                    <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No questions found</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        Try adjusting your filters. No questions were found for the selected domain, task, and difficulty level.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/practice">
                            <Button>Change Filters</Button>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost">Return to Dashboard</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <TestSession questions={questions} mode={mode} />
            )}
        </div>
    );
}
