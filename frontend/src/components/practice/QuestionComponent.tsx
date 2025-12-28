'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import type { AnswerChoice, QuestionAnswerResponse } from '@/types';

interface QuestionComponentProps {
    id: number;
    questionText: string;
    options: {
        A: string;
        B: string;
        C: string;
        D: string;
    };
    onAnswer: (choice: AnswerChoice) => Promise<QuestionAnswerResponse | void>;
    showFeedback?: boolean;
}

export const QuestionComponent: React.FC<QuestionComponentProps> = ({
    questionText,
    options,
    onAnswer,
    showFeedback = true,
}) => {
    const [selectedOption, setSelectedOption] = useState<AnswerChoice | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<QuestionAnswerResponse | null>(null);

    const handleOptionSelect = async (choice: AnswerChoice) => {
        if (selectedOption || isSubmitting) return;

        setSelectedOption(choice);
        setIsSubmitting(true);

        try {
            const response = await onAnswer(choice);
            if (response && showFeedback) {
                setFeedback(response);
            }
        } catch (error) {
            console.error('Failed to submit answer:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getOptionStyles = (choice: AnswerChoice) => {
        const base = "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-start gap-3 ";

        if (feedback) {
            if (choice === feedback.correct_answer) {
                return base + "border-green-500 bg-green-50 dark:bg-green-900/10 text-green-900 dark:text-green-100";
            }
            if (choice === selectedOption && !feedback.is_correct) {
                return base + "border-red-500 bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100";
            }
            return base + "border-gray-200 dark:border-gray-700 opacity-50";
        }

        if (selectedOption === choice) {
            return base + "border-blue-500 bg-blue-50 dark:bg-blue-900/10 text-blue-900 dark:text-blue-100 ring-2 ring-blue-500 ring-offset-2";
        }

        return base + "border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300";
    };

    return (
        <div className="w-full max-w-3xl mx-auto space-y-6">
            <Card className="p-6 md:p-8 shadow-md">
                <div className="space-y-6">
                    <div className="text-lg md:text-xl font-medium text-gray-900 dark:text-white leading-relaxed">
                        {questionText}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {(['A', 'B', 'C', 'D'] as AnswerChoice[]).map((choice) => (
                            <button
                                key={choice}
                                onClick={() => handleOptionSelect(choice)}
                                disabled={!!selectedOption || isSubmitting}
                                className={getOptionStyles(choice)}
                            >
                                <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${selectedOption === choice
                                    ? 'bg-blue-600 border-blue-600 text-white'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                    {choice}
                                </span>
                                <span className="pt-0.5">{options[choice]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {feedback && showFeedback && (
                <Card className={`p-6 border-l-4 animate-in slide-in-from-top-4 duration-300 ${feedback.is_correct ? 'border-l-green-500' : 'border-l-red-500'
                    }`}>
                    <div className="flex items-start gap-4">
                        <div className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${feedback.is_correct ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                            }`}>
                            {feedback.is_correct ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            )}
                        </div>
                        <div className="space-y-2">
                            <h4 className={`font-bold ${feedback.is_correct ? 'text-green-800 dark:text-green-400' : 'text-red-800 dark:text-red-400'
                                }`}>
                                {feedback.message}
                            </h4>
                            <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
                                <span className="font-semibold block mb-1">Explanation:</span>
                                {feedback.explanation}
                            </div>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};
