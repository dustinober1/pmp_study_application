'use client';

import { PracticeQuestionContentDocument } from '@/types/firestore';

interface PracticeAnswerReviewProps {
  question: PracticeQuestionContentDocument;
  selectedChoice: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  timeSpent?: number;
}

export default function PracticeAnswerReview({
  question,
  selectedChoice,
  isCorrect,
  timeSpent,
}: PracticeAnswerReviewProps) {
  const correctChoice = question.choices.find((c) => c.isCorrect);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Question Review Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            Answer Review
          </h2>
          <div
            className={`px-4 py-2 rounded-full font-semibold text-lg ${
              isCorrect
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}
          >
            {isCorrect ? '✓ Correct' : '✗ Incorrect'}
          </div>
        </div>

        {/* Time Spent */}
        {timeSpent !== undefined && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Time spent: {timeSpent} seconds
          </p>
        )}
      </div>

      {/* Question */}
      <div className="bg-blue-50 dark:bg-blue-950 border-l-4 border-blue-500 p-6 mb-8 rounded">
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
          Question
        </p>
        <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed">
          {question.question}
        </p>
      </div>

      {/* Answer Choices Review */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-4">
          Your Answer
        </h3>
        <div className="space-y-3">
          {question.choices.map((choice) => (
            <div
              key={choice.letter}
              className={`p-4 rounded-lg border-2 transition-colors ${
                choice.letter === selectedChoice
                  ? isCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : 'border-red-500 bg-red-50 dark:bg-red-950'
                  : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    choice.letter === selectedChoice
                      ? isCorrect
                        ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                        : 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200'
                      : 'bg-gray-300 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                  }`}
                >
                  {choice.letter}
                </div>
                <div className="flex-1">
                  <p className="text-gray-800 dark:text-gray-100">
                    {choice.text}
                  </p>
                  {choice.letter === selectedChoice && (
                    <p className="text-sm mt-1 font-semibold">
                      {isCorrect ? (
                        <span className="text-green-700 dark:text-green-400">
                          You selected this
                        </span>
                      ) : (
                        <span className="text-red-700 dark:text-red-400">
                          You selected this
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Correct Answer Highlight (if wrong) */}
      {!isCorrect && correctChoice && (
        <div className="bg-green-50 dark:bg-green-950 border-l-4 border-green-500 p-6 mb-8 rounded">
          <p className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide mb-3">
            Correct Answer
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-semibold bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200">
              {correctChoice.letter}
            </div>
            <p className="text-gray-800 dark:text-gray-100">
              {correctChoice.text}
            </p>
          </div>
        </div>
      )}

      {/* Explanation / Remediation */}
      <div className="bg-amber-50 dark:bg-amber-950 border-l-4 border-amber-500 p-6 mb-8 rounded">
        <p className="text-sm font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3">
          Explanation
        </p>
        <p className="text-gray-800 dark:text-gray-100 leading-relaxed">
          {question.explanation}
        </p>
      </div>

      {/* References */}
      {question.references && question.references.length > 0 && (
        <div className="bg-purple-50 dark:bg-purple-950 border-l-4 border-purple-500 p-6 mb-8 rounded">
          <p className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wide mb-3">
            References
          </p>
          <ul className="space-y-2">
            {question.references.map((ref, idx) => (
              <li key={idx} className="text-gray-800 dark:text-gray-100">
                <span className="flex items-start gap-2">
                  <span className="text-purple-600 dark:text-purple-400 mt-1">
                    •
                  </span>
                  <span>{ref}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Metadata */}
      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400 mb-8">
        {question.difficulty && (
          <div>
            <span className="font-semibold">Difficulty:</span> {question.difficulty}
          </div>
        )}
        {question.stats && (
          <div>
            <span className="font-semibold">Success Rate:</span>{' '}
            {(question.stats.successRate * 100).toFixed(1)}%
          </div>
        )}
        {question.tags && question.tags.length > 0 && (
          <div>
            <span className="font-semibold">Tags:</span>{' '}
            {question.tags.join(', ')}
          </div>
        )}
      </div>
    </div>
  );
}
