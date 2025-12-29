'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

export type ExplanationStyle = 'simple' | 'technical' | 'analogy' | 'visual' | 'story';

interface ExplanationData {
    explanation: string;
    style: ExplanationStyle;
    alternative_styles: ExplanationStyle[];
    is_personalized: boolean;
    metadata: Record<string, unknown> | null;
}

interface StyleAnalytics {
    total_views: number;
    helpful_count: number;
    helpfulness_rate: number;
}

interface AdaptiveExplanationPanelProps {
    contentType: 'question' | 'flashcard';
    contentId: number;
    onClose?: () => void;
}

const STYLE_LABELS: Record<ExplanationStyle, string> = {
    simple: 'Simple Language',
    technical: 'Technical (PMBOK)',
    analogy: 'Real-World Analogy',
    visual: 'Visual Format',
    story: 'Story-Based',
};

const STYLE_DESCRIPTIONS: Record<ExplanationStyle, string> = {
    simple: 'Plain language, beginner-friendly explanation',
    technical: 'PMBOK terminology and formal project management language',
    analogy: 'Real-world comparisons and metaphors',
    visual: 'Structured formatting with key points',
    story: 'Narrative approach with scenarios',
};

export const AdaptiveExplanationPanel: React.FC<AdaptiveExplanationPanelProps> = ({
    contentType,
    contentId,
    onClose,
}) => {
    const [explanation, setExplanation] = useState<ExplanationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showRating, setShowRating] = useState(false);
    const [viewStartTime, setViewStartTime] = useState<number>(Date.now());
    const [currentStyle, setCurrentStyle] = useState<ExplanationStyle | null>(null);

    const fetchExplanation = async (style?: ExplanationStyle) => {
        setIsLoading(true);
        setError(null);

        try {
            const anonymousId = localStorage.getItem('anonymous_id');
            if (!anonymousId) {
                throw new Error('No anonymous ID found');
            }

            const url = new URL(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/explanations/${contentType}/${contentId}`
            );
            if (style) {
                url.searchParams.set('style', style);
            }

            const response = await fetch(url.toString(), {
                headers: {
                    'X-Anonymous-Id': anonymousId,
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch explanation');
            }

            const data = (await response.json()) as ExplanationData;
            setExplanation(data);
            setCurrentStyle(data.style);
            setViewStartTime(Date.now());
            setShowRating(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load explanation');
        } finally {
            setIsLoading(false);
        }
    };

    const rateExplanation = async (wasHelpful: boolean) => {
        if (!currentStyle) return;

        try {
            const anonymousId = localStorage.getItem('anonymous_id');
            if (!anonymousId) return;

            const timeSpent = Math.round((Date.now() - viewStartTime) / 1000);

            await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/explanations/${contentType}/${contentId}/rate?style=${currentStyle}&was_helpful=${wasHelpful}&time_spent_seconds=${timeSpent}`,
                {
                    method: 'POST',
                    headers: {
                        'X-Anonymous-Id': anonymousId,
                    },
                }
            );

            setShowRating(true);
        } catch (err) {
            console.error('Failed to rate explanation:', err);
        }
    };

    useEffect(() => {
        fetchExplanation();
    }, [contentType, contentId]);

    if (isLoading) {
        return (
            <Card className="p-6">
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="p-6 border-l-4 border-l-red-500">
                <p className="text-red-600 dark:text-red-400">{error}</p>
            </Card>
        );
    }

    if (!explanation) {
        return null;
    }

    return (
        <Card className="overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white">Adaptive Explanation</h3>
                    <p className="text-blue-100 text-sm">
                        {explanation.is_personalized ? 'Personalized for your learning style' : 'Select your preferred style'}
                    </p>
                </div>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-white hover:text-blue-200 transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                )}
            </div>

            {/* Style Selector */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-3">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => fetchExplanation(explanation.style)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                            currentStyle === explanation.style
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                    >
                        {STYLE_LABELS[explanation.style]}
                    </button>
                    {explanation.alternative_styles.map((style) => (
                        <button
                            key={style}
                            onClick={() => fetchExplanation(style)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                currentStyle === style
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {STYLE_LABELS[style]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Current Style Description */}
            <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-900">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                    <span className="font-semibold">Style:</span> {STYLE_DESCRIPTIONS[explanation.style]}
                </p>
            </div>

            {/* Explanation Content */}
            <div className="p-6">
                <div className="prose dark:prose-invert max-w-none">
                    {explanation.style === 'visual' ? (
                        <pre className="whitespace-pre-wrap font-sans text-gray-700 dark:text-gray-300 leading-relaxed">
                            {explanation.explanation}
                        </pre>
                    ) : (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                            {explanation.explanation}
                        </p>
                    )}
                </div>
            </div>

            {/* Rating Section */}
            {!showRating ? (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Was this explanation helpful?</p>
                    <div className="flex gap-3">
                        <button
                            onClick={() => rateExplanation(true)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                            Yes, helpful
                        </button>
                        <button
                            onClick={() => rateExplanation(false)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                            </svg>
                            No, not helpful
                        </button>
                    </div>
                </div>
            ) : (
                <div className="px-6 py-4 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-900">
                    <p className="text-sm text-green-800 dark:text-green-300 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Thanks for your feedback! This helps us improve your explanations.
                    </p>
                </div>
            )}
        </Card>
    );
};
