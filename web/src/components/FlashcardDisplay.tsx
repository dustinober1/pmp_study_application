'use client';

import { useState } from 'react';
import { Flashcard, FlashcardContent } from '@/types';

interface FlashcardDisplayProps {
  flashcard: Flashcard;
  content: FlashcardContent;
  isFlipped?: boolean;
  onFlip?: (isFlipped: boolean) => void;
}

export default function FlashcardDisplay({
  flashcard,
  content,
  isFlipped = false,
  onFlip,
}: FlashcardDisplayProps) {
  const [localFlipped, setLocalFlipped] = useState(isFlipped);

  const handleFlip = () => {
    const newFlipped = !localFlipped;
    setLocalFlipped(newFlipped);
    onFlip?.(newFlipped);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div
        className="relative w-full h-96 cursor-pointer perspective"
        onClick={handleFlip}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleFlip();
          }
        }}
      >
        {/* Flip Animation Container */}
        <div
          className="relative w-full h-full transition-transform duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: localFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front of Card */}
          <div
            className="absolute w-full h-full bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-lg p-8 flex items-center justify-center border-2 border-blue-200"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <div className="text-center">
              <p className="text-sm text-blue-600 font-semibold mb-4 uppercase tracking-wide">
                Question
              </p>
              <p className="text-2xl font-bold text-gray-800 leading-relaxed">
                {content.front}
              </p>
              <p className="text-sm text-blue-500 mt-8">Click to reveal answer</p>
            </div>
          </div>

          {/* Back of Card */}
          <div
            className="absolute w-full h-full bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-lg p-8 flex items-center justify-center border-2 border-green-200"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <div className="text-center">
              <p className="text-sm text-green-600 font-semibold mb-4 uppercase tracking-wide">
                Answer
              </p>
              <p className="text-lg font-semibold text-gray-800 leading-relaxed">
                {content.back}
              </p>
              <p className="text-sm text-green-500 mt-8">Click to flip back</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Info */}
      <div className="mt-6 flex items-center justify-between text-sm text-gray-600">
        <div>
          <span className="font-semibold">Domain:</span> {flashcard.domainId}
        </div>
        <div>
          <span className="font-semibold">Task:</span> {flashcard.taskId}
        </div>
        <div>
          <span className="font-semibold">Reviews:</span> {flashcard.fsrs.reps}
        </div>
      </div>
    </div>
  );
}
