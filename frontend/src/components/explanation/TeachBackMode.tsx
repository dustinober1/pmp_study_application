'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';

interface TeachBackModeProps {
    concept: string;
    correctExplanation: string;
    onComplete: (userExplanation: string, score: number) => void;
}

type TeachingStep = 'prompt' | 'writing' | 'comparing' | 'result';

interface ComparisonResult {
    coverageScore: number;
    keyPointsCovered: string[];
    keyPointsMissed: string[];
    feedback: string;
}

export const TeachBackMode: React.FC<TeachBackModeProps> = ({
    concept,
    correctExplanation,
    onComplete,
}) => {
    const [step, setStep] = useState<TeachingStep>('prompt');
    const [userExplanation, setUserExplanation] = useState('');
    const [comparison, setComparison] = useState<ComparisonResult | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleStartTeaching = () => {
        setStep('writing');
    };

    const handleAnalyze = async () => {
        if (!userExplanation.trim()) return;

        setIsAnalyzing(true);

        // Simulate analysis - in production, this would call an AI service
        // to compare the user's explanation with the correct one
        await new Promise((resolve) => setTimeout(resolve, 1500));

        const result = analyzeExplanation(userExplanation, correctExplanation);
        setComparison(result);
        setStep('result');
        setIsAnalyzing(false);

        onComplete(userExplanation, result.coverageScore);
    };

    const analyzeExplanation = (
        userText: string,
        correctText: string
    ): ComparisonResult => {
        // Simple keyword-based analysis for demonstration
        // In production, use semantic similarity/AI analysis

        const correctWords = correctText.toLowerCase().split(/\s+/);
        const userWords = userText.toLowerCase().split(/\s+/);

        // Extract key concepts (words longer than 5 characters)
        const keyConcepts = Array.from(new Set(
            correctWords.filter((w) => w.length > 5)
        ));

        const covered: string[] = [];
        const missed: string[] = [];

        for (const concept of keyConcepts) {
            if (userWords.some((w) => w.includes(concept) || concept.includes(w))) {
                covered.push(concept);
            } else {
                missed.push(concept);
            }
        }

        const coverageScore = Math.round(
            (covered.length / Math.max(keyConcepts.length, 1)) * 100
        );

        let feedback = '';
        if (coverageScore >= 80) {
            feedback = 'Excellent! You have a strong understanding of this concept.';
        } else if (coverageScore >= 60) {
            feedback = 'Good effort! Review the key points you missed to strengthen your understanding.';
        } else if (coverageScore >= 40) {
            feedback = 'You&apos;re on the right track. Spend more time studying this concept.';
        } else {
            feedback = 'This concept needs more review. Try re-reading the explanation and try again.';
        }

        return {
            coverageScore,
            keyPointsCovered: covered.slice(0, 5),
            keyPointsMissed: missed.slice(0, 5),
            feedback,
        };
    };

    const handleTryAgain = () => {
        setUserExplanation('');
        setComparison(null);
        setStep('writing');
    };

    const handleFinish = () => {
        setStep('comparing');
    };

    return (
        <Card className="overflow-hidden">
            {step === 'prompt' && (
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <svg className="w-6 h-6 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Teach-Back Mode</h3>
                            <p className="text-gray-600 dark:text-gray-400">Test your understanding by explaining in your own words</p>
                        </div>
                    </div>

                    <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 mb-6">
                        <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">Concept to Explain:</h4>
                        <p className="text-indigo-800 dark:text-indigo-200 font-medium text-lg">{concept}</p>
                    </div>

                    <div className="space-y-3 mb-6">
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">Explain the concept in your own words</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">We&apos;ll analyze your explanation against the correct answer</p>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300">Get instant feedback on your understanding</p>
                        </div>
                    </div>

                    <button
                        onClick={handleStartTeaching}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Start Teaching
                    </button>
                </div>
            )}

            {step === 'writing' && (
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            Explain: {concept}
                        </h3>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            {userExplanation.length} characters
                        </span>
                    </div>

                    <textarea
                        value={userExplanation}
                        onChange={(e) => setUserExplanation(e.target.value)}
                        placeholder="Explain this concept in your own words. What does it mean? How would you use it in practice?..."
                        className="w-full h-48 p-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                    />

                    <div className="flex gap-3 mt-4">
                        <button
                            onClick={() => setStep('prompt')}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAnalyze}
                            disabled={!userExplanation.trim() || isAnalyzing}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                            {isAnalyzing ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Analyze My Explanation
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {step === 'result' && comparison && (
                <div className="p-6">
                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Analysis Results</h3>
                            <div className={`px-4 py-1 rounded-full text-sm font-bold ${
                                comparison.coverageScore >= 80
                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                    : comparison.coverageScore >= 60
                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                                {comparison.coverageScore}% Coverage
                            </div>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400">{comparison.feedback}</p>
                    </div>

                    {/* Score Bar */}
                    <div className="mb-6">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${
                                    comparison.coverageScore >= 80
                                        ? 'bg-green-500'
                                        : comparison.coverageScore >= 60
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                }`}
                                style={{ width: `${comparison.coverageScore}%` }}
                            />
                        </div>
                    </div>

                    {/* Key Points Analysis */}
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                            <h4 className="font-semibold text-green-800 dark:text-green-300 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Key Points Covered
                            </h4>
                            {comparison.keyPointsCovered.length > 0 ? (
                                <ul className="text-sm text-green-700 dark:text-green-400 space-y-1">
                                    {comparison.keyPointsCovered.map((point) => (
                                        <li key={point} className="flex items-start gap-2">
                                            <span>•</span>
                                            <span className="capitalize">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-green-600 dark:text-green-500">None detected</p>
                            )}
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                            <h4 className="font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                Key Points Missed
                            </h4>
                            {comparison.keyPointsMissed.length > 0 ? (
                                <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                                    {comparison.keyPointsMissed.map((point) => (
                                        <li key={point} className="flex items-start gap-2">
                                            <span>•</span>
                                            <span className="capitalize">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-red-600 dark:text-red-500">Great job! All covered.</p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleTryAgain}
                            className="flex-1 py-2 border border-indigo-600 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg font-semibold transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={handleFinish}
                            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                        >
                            View Correct Explanation
                        </button>
                    </div>
                </div>
            )}

            {step === 'comparing' && (
                <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Correct Explanation</h3>

                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {correctExplanation}
                        </p>
                    </div>

                    <button
                        onClick={() => onComplete(userExplanation, comparison?.coverageScore || 0)}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors"
                    >
                        Complete Teach-Back Mode
                    </button>
                </div>
            )}
        </Card>
    );
};
