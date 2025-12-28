'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    useDomains,
    useTasks,
    useFlashcardsDue
} from '@/lib/api/hooks';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Link from 'next/link';

export default function FlashcardsSelectionPage() {
    const router = useRouter();
    const [selectedDomainId, setSelectedDomainId] = useState<string>('');
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');

    const { data: domains, isLoading: isLoadingDomains } = useDomains();
    const { data: tasks, isLoading: isLoadingTasks } = useTasks(
        selectedDomainId ? parseInt(selectedDomainId) : undefined
    );
    const { data: dueInfo } = useFlashcardsDue();

    // Reset task selection when domain changes
    useEffect(() => {
        setSelectedTaskId('');
    }, [selectedDomainId]);

    const domainOptions = domains?.map((d) => ({
        value: String(d.id),
        label: `${d.name} (${d.weight}%)`,
    })) || [];

    const taskOptions = tasks?.map((t) => ({
        value: String(t.id),
        label: `Task ${t.order}: ${t.name}`,
    })) || [];

    const handleStartSession = () => {
        const params = new URLSearchParams();
        if (selectedDomainId) params.append('domain_id', selectedDomainId);
        if (selectedTaskId) params.append('task_id', selectedTaskId);

        router.push(`/flashcards/study?${params.toString()}`);
    };

    const isLoading = isLoadingDomains;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Study Flashcards
                    </h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Select a domain or task to focus your study session
                    </p>
                </div>
                <Link href="/">
                    <Button variant="secondary" size="sm">
                        Back to Dashboard
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Session Configuration
                        </h2>
                        <div className="space-y-4">
                            <Select
                                label="Choose a Domain"
                                placeholder="All Domains"
                                options={domainOptions}
                                value={selectedDomainId}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedDomainId(e.target.value)}
                                fullWidth
                            />

                            <Select
                                label="Choose a Task (Optional)"
                                placeholder="All Tasks in Domain"
                                options={taskOptions}
                                value={selectedTaskId}
                                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTaskId(e.target.value)}
                                disabled={!selectedDomainId || isLoadingTasks}
                                fullWidth
                                helperText={!selectedDomainId ? "Select a domain first to filter by task" : ""}
                            />

                            <div className="pt-4">
                                <Button
                                    size="lg"
                                    fullWidth
                                    onClick={handleStartSession}
                                >
                                    Start Study Session
                                </Button>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
                        <h3 className="text-blue-900 dark:text-blue-100 font-semibold mb-2">
                            Pro Tip: Spaced Repetition
                        </h3>
                        <p className="text-blue-800 dark:text-blue-200 text-sm leading-relaxed">
                            Our system uses the SM-2 algorithm to schedule your reviews. Focus on the cards marked as <strong>&quot;Due&quot;</strong> for maximum retention with minimum effort.
                        </p>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            At a Glance
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Due Now</span>
                                <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {dueInfo?.count || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-800">
                                <span className="text-gray-600 dark:text-gray-400">Total Cards</span>
                                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {dueInfo?.flashcard_ids?.length || 0}
                                </span>
                            </div>
                        </div>

                        <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
                            <Button
                                variant="secondary"
                                fullWidth
                                onClick={() => router.push('/flashcards/study?due_only=true')}
                                disabled={!dueInfo?.count}
                            >
                                Review {dueInfo?.count || 0} Due Cards
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
