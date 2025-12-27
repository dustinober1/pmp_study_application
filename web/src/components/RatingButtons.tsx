'use client';

import { CardRating } from '@/types';

interface RatingButtonsProps {
  onRate: (rating: CardRating) => void;
  disabled?: boolean;
  loading?: boolean;
}

interface RatingOption {
  rating: CardRating;
  label: string;
  description: string;
  color: string;
  bgColor: string;
  hoverBg: string;
  textColor: string;
}

const ratingOptions: RatingOption[] = [
  {
    rating: CardRating.AGAIN,
    label: 'Again',
    description: 'Too difficult',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    hoverBg: 'hover:bg-red-100',
    textColor: 'text-red-600',
  },
  {
    rating: CardRating.HARD,
    label: 'Hard',
    description: 'Difficult',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    hoverBg: 'hover:bg-orange-100',
    textColor: 'text-orange-600',
  },
  {
    rating: CardRating.GOOD,
    label: 'Good',
    description: 'Moderate effort',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    hoverBg: 'hover:bg-blue-100',
    textColor: 'text-blue-600',
  },
  {
    rating: CardRating.EASY,
    label: 'Easy',
    description: 'Very easy',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    hoverBg: 'hover:bg-green-100',
    textColor: 'text-green-600',
  },
];

export default function RatingButtons({
  onRate,
  disabled = false,
  loading = false,
}: RatingButtonsProps) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="grid grid-cols-4 gap-3">
        {ratingOptions.map((option) => (
          <button
            key={option.rating}
            onClick={() => onRate(option.rating)}
            disabled={disabled || loading}
            className={`
              flex flex-col items-center justify-center gap-2
              px-4 py-6 rounded-lg border-2 border-gray-200
              transition-all duration-200
              ${option.bgColor} ${option.hoverBg}
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <span className={`font-bold text-lg ${option.color}`}>
              {option.label}
            </span>
            <span className={`text-xs ${option.textColor}`}>
              {option.description}
            </span>
            {loading && (
              <div className="mt-1 w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            )}
          </button>
        ))}
      </div>
      <p className="text-center text-sm text-gray-500 mt-4">
        How well did you remember this card?
      </p>
    </div>
  );
}
