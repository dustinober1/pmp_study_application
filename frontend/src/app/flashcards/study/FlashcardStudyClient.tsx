'use client';

import React, { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFlashcards } from '@/lib/api/hooks';
import { FlashcardDeck } from '@/components/flashcard/FlashcardDeck';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function FlashcardStudyClient() {
    const searchParams = useSearchParams();

    const domainId = searchParams.get('domain_id');
    const taskId = searchParams.get('task_id');
    const dueOnly = searchParams.get('due_only') === 'true';

    const filters = useMemo(() => ({
        domain_id: domainId ? parseInt(domainId) : undefined,
        task_id: taskId ? parseInt(taskId) : undefined,
        due_only: dueOnly,
    }), [domainId, taskId, dueOnly]);

    const { data: flashcards, isLoading, error } = useFlashcards(filters);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 animate-pulse">Loading cards...</p>
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
                <h1 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">Failed to load flashcards</h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                    There was an error fetching your flashcards. Please try again or check your connection.
                </p>
                <Link href="/flashcards">
                    <Button>Back to Selection</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto py-6 md:py-10 animate-fade-in">
            {!flashcards || flashcards.length === 0 ? (
                <div className="text-center py-20 px-6">
                    <div className="bg-gray-100 dark:bg-gray-800 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No cards due for review</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
                        {dueOnly
                            ? "Great job! You've reviewed all cards scheduled for today."
                            : "No flashcards found for your selection. Try selecting a different domain or task."}
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/flashcards">
                            <Button>Select Different Topic</Button>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost">Go to Dashboard</Button>
                        </Link>
                    </div>
                </div>
            ) : (
                <FlashcardDeck flashcards={flashcards} />
            )}
        </div>
    );
}
