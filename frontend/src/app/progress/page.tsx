'use client';

import React from 'react';
import {
    useProgressSummary,
    useStudyStreak
} from '@/lib/api/hooks';
import Card from '@/components/ui/Card';
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    Cell,
    LineChart,
    Line
} from 'recharts';
import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function ProgressPage() {
    const { data: summary, isLoading: isLoadingSummary } = useProgressSummary();
    const { data: streak, isLoading: isLoadingStreak } = useStudyStreak();

    const isLoading = isLoadingSummary || isLoadingStreak;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const overall = summary?.overall;
    const byDomain = summary?.by_domain || [];

    // Mock data for study velocity line chart (since we don't have a history API yet)
    const studyHistory = [
        { date: '12/22', cards: 15, questions: 5 },
        { date: '12/23', cards: 25, questions: 10 },
        { date: '12/24', cards: 10, questions: 8 },
        { date: '12/25', cards: 45, questions: 15 },
        { date: '12/26', cards: 20, questions: 12 },
        { date: '12/27', cards: 35, questions: 20 },
        { date: streak?.last_study_date ? new Date(streak.last_study_date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }) : 'Today', cards: overall?.reviewed_flashcards || 0, questions: overall?.attempted_questions || 0 },
    ];

    const domainData = byDomain.map(d => ({
        name: d.domain_name.split(' ').map(w => w[0]).join(''), // Initials for small screens
        fullName: d.domain_name,
        mastery: Math.round((d.mastered_flashcards / d.total_flashcards) * 100) || 0,
        accuracy: Math.round(d.question_accuracy) || 0,
        color: d.domain_name.includes('People') ? '#3b82f6' : d.domain_name.includes('Process') ? '#10b981' : '#f59e0b'
    }));

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Performance Analytics
                    </h1>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                        Track your mastery and identify areas for improvement
                    </p>
                </div>
                <Link href="/">
                    <Button variant="secondary">Back to Dashboard</Button>
                </Link>
            </div>

            {/* High Level Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-6 text-center">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Overall Mastery</p>
                    <p className="text-3xl font-bold text-blue-600">{Math.round(overall?.flashcard_accuracy || 0)}%</p>
                    <p className="text-xs text-gray-400 mt-2">{overall?.mastered_flashcards} / {overall?.total_flashcards} cards</p>
                </Card>
                <Card className="p-6 text-center">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Exam Readiness</p>
                    <p className="text-3xl font-bold text-green-600">{Math.round(overall?.question_accuracy || 0)}%</p>
                    <p className="text-xs text-gray-400 mt-2">{overall?.attempted_questions} questions answered</p>
                </Card>
                <Card className="p-6 text-center border-orange-100 dark:border-orange-900">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Study Streak</p>
                    <p className="text-3xl font-bold text-orange-600">{streak?.current_streak || 0} Days</p>
                    <p className="text-xs text-gray-400 mt-2">Best: {streak?.longest_streak || 0} days</p>
                </Card>
                <Card className="p-6 text-center">
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-1">Time Invested</p>
                    <p className="text-3xl font-bold text-indigo-600">{Math.round((overall?.total_study_time_seconds || 0) / 3600)} hrs</p>
                    <p className="text-xs text-gray-400 mt-2">{overall?.total_sessions} total sessions</p>
                </Card>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Domain Success Bar Chart */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-6">Mastery by Domain</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={domainData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="name" />
                                <YAxis unit="%" />
                                <Tooltip
                                    formatter={(value) => [`${value}%`, 'Mastery']}
                                    labelFormatter={(name, items) => items[0]?.payload?.fullName || name}
                                />
                                <Bar dataKey="mastery" radius={[4, 4, 0, 0]}>
                                    {domainData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Study Frequency Line Chart */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-6">Study History</h2>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={studyHistory}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="cards"
                                    name="Flashcards"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="questions"
                                    name="Questions"
                                    stroke="#10b981"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

            {/* Detailed Table Breakdown */}
            <Card className="overflow-hidden">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-lg font-semibold">ECO Domain Breakdown</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs font-semibold text-gray-500 uppercase tracking-widest">
                            <tr>
                                <th className="px-6 py-4">Domain</th>
                                <th className="px-6 py-4">Cards Mastered</th>
                                <th className="px-6 py-4">Question Accuracy</th>
                                <th className="px-4 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                            {byDomain.map((domain) => {
                                const mastery = Math.round((domain.mastered_flashcards / domain.total_flashcards) * 100) || 0;
                                return (
                                    <tr key={domain.domain_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900 dark:text-white">{domain.domain_name}</div>
                                            <div className="text-xs text-gray-500">Weight: {domain.domain_weight}%</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-[100px]">
                                                    <div
                                                        className="h-full bg-blue-500 rounded-full"
                                                        style={{ width: `${mastery}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium">{mastery}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden max-w-[100px]">
                                                    <div
                                                        className="h-full bg-green-500 rounded-full"
                                                        style={{ width: `${domain.question_accuracy}%` }}
                                                    />
                                                </div>
                                                <span className="text-sm font-medium">{Math.round(domain.question_accuracy)}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${mastery > 80 ? 'bg-green-100 text-green-700' :
                                                mastery > 50 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {mastery > 80 ? 'Mastered' : mastery > 50 ? 'Developing' : 'Starting'}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
