'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { QuestionComponent } from './QuestionComponent';
import { useQuestionAnswer } from '@/lib/api/hooks';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import type { Question, AnswerChoice, QuestionAnswerResponse } from '@/types';

interface TestSessionProps {
    questions: Question[];
    mode?: 'immediate' | 'exam';
    onComplete?: (results: Record<string, unknown>) => void;
}

export const TestSession: React.FC<TestSessionProps> = ({
    questions,
    mode = 'immediate',
    onComplete
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<number, AnswerChoice>>({});
    const [feedbacks, setFeedbacks] = useState<Record<number, QuestionAnswerResponse>>({});
    const [isFinished, setIsFinished] = useState(false);
    const [timeLeft, setTimeLeft] = useState(questions.length * 90); // 90 seconds per question

    const currentQuestion = questions[currentIndex];
    const { trigger: submitAnswer } = useQuestionAnswer(currentQuestion?.id || 0);

    const handleFinish = useCallback(() => {
        setIsFinished(true);
        onComplete?.({
            total: questions.length,
            answered: Object.keys(answers).length,
            correct: Object.values(feedbacks).filter(f => f.is_correct).length
        });
    }, [questions.length, answers, feedbacks, onComplete]);

    // Timer logic for exam mode
    useEffect(() => {
        if (isFinished) return;

        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    clearInterval(timer);
                    handleFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isFinished, handleFinish]);

    const handleAnswer = async (choice: AnswerChoice) => {
        setAnswers({ ...answers, [currentQuestion.id]: choice });

        if (mode === 'immediate') {
            try {
                const response = await submitAnswer({ answer: choice });
                if (response) {
                    setFeedbacks({ ...feedbacks, [currentQuestion.id]: response });
                }
                return response;
            } catch (error) {
                console.error('Failed to submit answer:', error);
            }
        }
    };

    const handleNext = () => {
        if (currentIndex < questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            handleFinish();
        }
    };

    const handlePrevious = () => {
        if (currentIndex > 0) {
            setCurrentIndex(currentIndex - 1);
        }
    };


    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    if (questions.length === 0) {
        return (
            <Card className="p-8 text-center max-w-lg mx-auto">
                <h2 className="text-xl font-semibold mb-2">No questions found</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try a different selection or difficulty level.
                </p>
                <Link href="/practice">
                    <Button>Go Back</Button>
                </Link>
            </Card>
        );
    }

    if (isFinished) {
        const totalCorrect = Object.values(feedbacks).filter(f => f.is_correct).length;
        const answeredCount = Object.keys(answers).length;

        return (
            <Card className="p-8 text-center max-w-2xl mx-auto animate-fade-in">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Test Results</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    You answered {answeredCount} out of {questions.length} questions.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{questions.length}</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 uppercase font-semibold">Total</p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-800">
                        <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalCorrect}</p>
                        <p className="text-xs text-green-700 dark:text-green-300 uppercase font-semibold">Correct</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {Math.round((totalCorrect / questions.length) * 100)}%
                        </p>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Score</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={() => window.location.reload()}>Try Again</Button>
                    <Link href="/practice">
                        <Button variant="secondary">Change Topic</Button>
                    </Link>
                    <Link href="/">
                        <Button variant="ghost">Return Home</Button>
                    </Link>
                </div>
            </Card>
        );
    }

    const isAnswered = answers[currentQuestion.id] !== undefined;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Test Header */}
            <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-4">
                    <div className="text-sm font-semibold text-gray-500">
                        Question {currentIndex + 1} of {questions.length}
                    </div>
                    <div className="h-1.5 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                        />
                    </div>
                </div>

                <div className={`flex items-center gap-2 px-3 py-1 rounded-full font-mono font-bold ${timeLeft < 60 ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                    }`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {formatTime(timeLeft)}
                </div>
            </div>

            <QuestionComponent
                id={currentQuestion.id}
                questionText={currentQuestion.question_text}
                options={{
                    A: currentQuestion.option_a,
                    B: currentQuestion.option_b,
                    C: currentQuestion.option_c,
                    D: currentQuestion.option_d,
                }}
                onAnswer={handleAnswer}
                showFeedback={mode === 'immediate'}
            />

            {/* Navigation Footer */}
            <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-800">
                <Button
                    variant="secondary"
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                >
                    Previous
                </Button>

                <div className="flex gap-2">
                    {currentIndex === questions.length - 1 ? (
                        <Button
                            variant="primary"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={handleFinish}
                            disabled={mode === 'immediate' && !isAnswered}
                        >
                            Finish Test
                        </Button>
                    ) : (
                        <Button
                            onClick={handleNext}
                            disabled={mode === 'immediate' && !isAnswered}
                        >
                            Next Question
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};
