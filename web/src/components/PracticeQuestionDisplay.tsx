'use client';

import { useState, useEffect } from 'react';
import { PracticeQuestionContentDocument } from '@/types/firestore';
import type { AnswerChoice } from '@/types/firestore';

interface PracticeQuestionDisplayProps {
  question: PracticeQuestionContentDocument;
  onAnswer?: (selectedLetter: 'A' | 'B' | 'C' | 'D', isCorrect: boolean) => void;
  onNext?: () => void;
  showFeedback?: boolean;
}

export default function PracticeQuestionDisplay({
  question,
  onAnswer,
  onNext,
  showFeedback: initialShowFeedback = true,
}: PracticeQuestionDisplayProps) {
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showFeedbackState, setShowFeedbackState] = useState(initialShowFeedback);

  // Reset state when question changes
  useEffect(() => {
    setSelectedChoice(null);
    setShowExplanation(false);
    setIsCorrect(null);
  }, [question.id]);

  const handleChoiceSelect = (choice: AnswerChoice) => {
    if (selectedChoice !== null) return; // Prevent changing answer once selected

    const letter = choice.letter;
    setSelectedChoice(letter);
    const correct = choice.isCorrect;
    setIsCorrect(correct);

    if (initialShowFeedback) {
      setShowExplanation(true);
    }

    // Call the callback
    onAnswer?.(letter, correct);
  };

  const correctChoice = question.choices.find((c) => c.isCorrect);

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Question Container */}
      <div className="mb-8">
        {/* Question Text */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {question.question}
          </h2>
          <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Domain: <span className="font-semibold">{question.domainId}</span></span>
            <span>Task: <span className="font-semibold">{question.taskId}</span></span>
            <span>Difficulty: <span className="font-semibold capitalize">{question.difficulty}</span></span>
          </div>
        </div>

        {/* Answer Choices */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {question.choices.map((choice) => {
            const isSelected = selectedChoice === choice.letter;
            const isAnswered = selectedChoice !== null;
            const showAsCorrect = isAnswered && choice.isCorrect;
            const showAsIncorrect = isAnswered && isSelected && !choice.isCorrect;
            const isUnselectedWrongChoice = isAnswered && !isSelected && !choice.isCorrect;

            return (
              <button
                key={choice.letter}
                onClick={() => handleChoiceSelect(choice)}
                disabled={isAnswered}
                className={`p-4 text-left rounded-lg border-2 transition-all ${
                  isAnswered ? 'cursor-not-allowed' : 'cursor-pointer hover:border-blue-400'
                } ${
                  showAsCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-950'
                    : showAsIncorrect
                      ? 'border-red-500 bg-red-50 dark:bg-red-950'
                      : isUnselectedWrongChoice
                        ? 'border-gray-300 bg-gray-50 dark:bg-gray-800 dark:border-gray-600 opacity-60'
                        : isSelected
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Choice Letter Badge */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      showAsCorrect
                        ? 'bg-green-500 text-white'
                        : showAsIncorrect
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    {choice.letter}
                  </div>

                  {/* Choice Text and Icons */}
                  <div className="flex-1 flex items-center justify-between">
                    <span
                      className={`text-base font-medium ${
                        showAsCorrect
                          ? 'text-green-700 dark:text-green-200'
                          : showAsIncorrect
                            ? 'text-red-700 dark:text-red-200'
                            : isUnselectedWrongChoice
                              ? 'text-gray-600 dark:text-gray-400'
                              : 'text-gray-900 dark:text-white'
                      }`}
                    >
                      {choice.text}
                    </span>

                    {/* Feedback Icons */}
                    {isAnswered && showAsCorrect && (
                      <span className="ml-2 text-green-500 font-bold">✓</span>
                    )}
                    {isAnswered && showAsIncorrect && (
                      <span className="ml-2 text-red-500 font-bold">✗</span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation/Feedback Section */}
      {showFeedbackState && showExplanation && selectedChoice !== null && (
        <div
          className={`mt-8 p-6 rounded-lg border-l-4 ${
            isCorrect
              ? 'border-green-500 bg-green-50 dark:bg-green-950'
              : 'border-red-500 bg-red-50 dark:bg-red-950'
          }`}
        >
          {/* Feedback Header */}
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`font-bold text-lg ${
                isCorrect ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'
              }`}
            >
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </span>
            {!isCorrect && correctChoice && (
              <span className="text-sm text-gray-700 dark:text-gray-300">
                The correct answer is <span className="font-semibold">{correctChoice.letter}</span>
              </span>
            )}
          </div>

          {/* Explanation */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Explanation:</h3>
            <p className="text-gray-800 dark:text-gray-200 leading-relaxed">
              {question.explanation}
            </p>
          </div>

          {/* References */}
          {question.references && question.references.length > 0 && (
            <div className="mb-4">
              <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">References:</h3>
              <ul className="list-disc list-inside space-y-1">
                {question.references.map((ref, idx) => (
                  <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                    {ref}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next Button */}
          {onNext && (
            <div className="mt-6">
              <button
                onClick={onNext}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                Next Question
              </button>
            </div>
          )}
        </div>
      )}

      {/* Submit Button (when feedback is hidden) */}
      {!showFeedbackState && selectedChoice !== null && (
        <div className="mt-8 flex gap-3">
          <button
            onClick={() => {
              setShowExplanation(true);
              setShowFeedbackState(true);
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Show Explanation
          </button>
        </div>
      )}
    </div>
  );
}
