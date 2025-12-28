'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    useDomains,
    useTasks
} from '@/lib/api/hooks';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import Link from 'next/link';

export default function PracticeSelectionPage() {
    const router = useRouter();
    const [selectedDomainId, setSelectedDomainId] = useState<string>('');
    const [selectedTaskId, setSelectedTaskId] = useState<string>('');
    const [difficulty, setDifficulty] = useState<string>('');

    const { data: domains, isLoading: isLoadingDomains } = useDomains();
    const { data: tasks, isLoading: isLoadingTasks } = useTasks(
        selectedDomainId ? parseInt(selectedDomainId) : undefined
    );

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

    const difficultyOptions = [
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' },
    ];

    const handleStartPractice = (mode: 'immediate' | 'exam') => {
        const params = new URLSearchParams();
        if (selectedDomainId) params.append('domain_id', selectedDomainId);
        if (selectedTaskId) params.append('task_id', selectedTaskId);
        if (difficulty) params.append('difficulty', difficulty);
        if (mode === 'exam') params.append('mode', 'exam');

        router.push(`/practice/test?${params.toString()}`);
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
                        Practice Tests
                    </h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Customize your practice session to target specific ECO areas
                    </p>
                </div>
                <Link href="/">
                    <Button variant="secondary" size="sm">
                        Back to Dashboard
                    </Button>
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Custom Session
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
                            placeholder="All Tasks"
                            options={taskOptions}
                            value={selectedTaskId}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTaskId(e.target.value)}
                            disabled={!selectedDomainId || isLoadingTasks}
                            fullWidth
                        />

                        <Select
                            label="Difficulty (Optional)"
                            placeholder="Any Difficulty"
                            options={difficultyOptions}
                            value={difficulty}
                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDifficulty(e.target.value)}
                            fullWidth
                        />

                        <div className="pt-4 space-y-3">
                            <Button
                                size="lg"
                                fullWidth
                                onClick={() => handleStartPractice('immediate')}
                            >
                                Practice with Feedback
                            </Button>
                            <p className="text-xs text-gray-500 text-center">
                                Get immediate explanations after each answer
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="space-y-6">
                    <Card className="p-6 border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/5">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="p-1 px-2 bg-blue-600 text-white text-[10px] rounded uppercase">Pro</span>
                            Exam Simulation
                        </h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                            Test your knowledge under exam-like conditions. No feedback until the end, timed session, and random distribution.
                        </p>
                        <Button
                            variant="secondary"
                            fullWidth
                            size="lg"
                            className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleStartPractice('exam')}
                        >
                            Start Simulation
                        </Button>
                    </Card>

                    <Card className="p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 italic">
                            Did you know?
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                            The real PMP exam consists of 180 questions with a 230-minute time limit. Our simulation mode mimics this format to build your endurance.
                        </p>
                    </Card>
                </div>
            </div>
        </div>
    );
}
