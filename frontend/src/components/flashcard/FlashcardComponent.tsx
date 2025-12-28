'use client';

import React from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

interface FlashcardComponentProps {
    front: string;
    back: string;
    onReview: (quality: number) => void;
    isFlipped: boolean;
    onFlip: () => void;
}

export const FlashcardComponent: React.FC<FlashcardComponentProps> = ({
    front,
    back,
    onReview,
    isFlipped,
    onFlip,
}) => {
    return (
        <div className="w-full max-w-xl mx-auto perspective-1000 min-h-[400px]">
            <div
                className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''
                    }`}
                onClick={onFlip}
            >
                {/* Front Side */}
                <Card className="absolute inset-0 backface-hidden flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-xl">
                    <div className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                        Question
                    </div>
                    <div className="text-xl md:text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
                        {front}
                    </div>
                    <div className="mt-8 text-sm text-blue-600 dark:text-blue-400 font-medium animate-pulse">
                        Click to flip
                    </div>
                </Card>

                {/* Back Side */}
                <Card className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-8 text-center bg-blue-50 dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-900 shadow-xl overflow-y-auto">
                    <div className="absolute top-4 left-4 text-xs font-bold uppercase tracking-wider text-blue-400">
                        Answer
                    </div>
                    <div className="text-lg md:text-xl text-gray-800 dark:text-gray-100 leading-relaxed whitespace-pre-wrap">
                        {back}
                    </div>
                </Card>
            </div>

            {/* Control Buttons (Visible only when flipped) */}
            <div className={`mt-8 grid grid-cols-2 md:grid-cols-4 gap-3 transition-opacity duration-300 ${isFlipped ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                <Button
                    variant="secondary"
                    className="border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
                    onClick={() => onReview(0)}
                >
                    Again
                    <span className="block text-[10px] opacity-70 font-normal">{"< 1m"}</span>
                </Button>
                <Button
                    variant="secondary"
                    className="border-orange-200 text-orange-700 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-400 dark:hover:bg-orange-900/20"
                    onClick={() => onReview(3)}
                >
                    Hard
                    <span className="block text-[10px] opacity-70 font-normal">2d</span>
                </Button>
                <Button
                    variant="secondary"
                    className="border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20"
                    onClick={() => onReview(4)}
                >
                    Good
                    <span className="block text-[10px] opacity-70 font-normal">4d</span>
                </Button>
                <Button
                    variant="secondary"
                    className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-900/20"
                    onClick={() => onReview(5)}
                >
                    Easy
                    <span className="block text-[10px] opacity-70 font-normal">7d</span>
                </Button>
            </div>
        </div>
    );
};
