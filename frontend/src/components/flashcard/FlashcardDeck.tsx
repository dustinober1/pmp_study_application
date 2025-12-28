'use client';

import React, { useState } from 'react';
import { FlashcardComponent } from './FlashcardComponent';
import { useFlashcardReview } from '@/lib/api/hooks';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Link from 'next/link';
import type { FlashcardWithProgress } from '@/types';

interface FlashcardDeckProps {
    flashcards: FlashcardWithProgress[];
    onComplete?: () => void;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({
    flashcards,
    onComplete
}) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isFlipped, setIsFlipped] = useState(false);
    const [sessionResults, setSessionResults] = useState<{ id: number; quality: number }[]>([]);
    const [isFinished, setIsFinished] = useState(false);

    // Review mutation
    const currentFlashcard = flashcards[currentIndex];
    const { trigger: submitReview } = useFlashcardReview(currentFlashcard?.id || 0);

    const handleReview = async (quality: number) => {
        if (!currentFlashcard) return;

        // Record result locally
        setSessionResults([...sessionResults, { id: currentFlashcard.id, quality }]);

        // Submit to API
        try {
            await submitReview({ quality });
        } catch (error) {
            console.error('Failed to submit review:', error);
        }

        // Move to next card or finish
        if (currentIndex < flashcards.length - 1) {
            setIsFlipped(false);
            // Small timeout to allow flip transition before switching content
            setTimeout(() => {
                setCurrentIndex(currentIndex + 1);
            }, 300);
        } else {
            setIsFinished(true);
            onComplete?.();
        }
    };

    const handleFlip = () => {
        setIsFlipped(!isFlipped);
    };

    if (flashcards.length === 0) {
        return (
            <Card className="p-8 text-center max-w-lg mx-auto">
                <h2 className="text-xl font-semibold mb-2">No flashcards found</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Try a different domain or task selection.
                </p>
                <Link href="/flashcards">
                    <Button>Go Back</Button>
                </Link>
            </Card>
        );
    }

    if (isFinished) {
        const correctCount = sessionResults.filter(r => r.quality >= 3).length;
        const accuracy = Math.round((correctCount / flashcards.length) * 100);

        return (
            <Card className="p-8 text-center max-w-lg mx-auto animate-fade-in">
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 dark:text-green-400">
                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    Session Complete!
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                    You&apos;ve reviewed {flashcards.length} cards with {accuracy}% accuracy.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{correctCount}</p>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Correct</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{flashcards.length - correctCount}</p>
                        <p className="text-xs text-gray-500 uppercase font-semibold">Again</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Button fullWidth onClick={() => window.location.reload()}>
                        Study More
                    </Button>
                    <Link href="/flashcards" className="block">
                        <Button variant="secondary" fullWidth>
                            Change Topic
                        </Button>
                    </Link>
                    <Link href="/" className="block">
                        <Button variant="ghost" fullWidth>
                            Exit to Dashboard
                        </Button>
                    </Link>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="max-w-3xl mx-auto flex items-center justify-between px-2">
                <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Card {currentIndex + 1} of {flashcards.length}
                </div>
                <div className="flex gap-1 h-1.5 w-32 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ width: `${((currentIndex + 1) / flashcards.length) * 100}%` }}
                    />
                </div>
            </div>

            <FlashcardComponent
                front={currentFlashcard.front}
                back={currentFlashcard.back}
                isFlipped={isFlipped}
                onFlip={handleFlip}
                onReview={handleReview}
            />

            <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-8">
                {!isFlipped ? "Tap space or card to flip" : "Press 1-4 for feedback"}
            </div>
        </div>
    );
};
