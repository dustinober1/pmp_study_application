'use client';

import { useState, useEffect } from 'react';
import { PracticeQuestionContentDocument } from '@/types/firestore';

interface PracticeQuestionProps {
  question: PracticeQuestionContentDocument;
  onAnswered: (
    isCorrect: boolean,
    selectedChoice: 'A' | 'B' | 'C' | 'D',
    timeSpent: number,
    skipped?: boolean
  ) => void;
  questionNumber: number;
  totalQuestions: number;
}

export default function PracticeQuestion({
  question,
  onAnswered,
  questionNumber,
  totalQuestions,
}: PracticeQuestionProps) {
  const [selectedChoice, setSelectedChoice] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answered, setAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Timer for tracking time spent
  useEffect(() => {
    if (answered) return;

    const interval = setInterval(() => {
      setTimeSpent((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [answered]);

  const handleSelectChoice = (choice: 'A' | 'B' | 'C' | 'D') => {
    if (answered) return;
    setSelectedChoice(choice);
  };

  const handleSubmitAnswer = async () => {
    if (selectedChoice === null) return;

    setAnswered(true);
    setIsLoading(true);

    const correct = question.choices.find((c) => c.letter === selectedChoice)?.isCorrect || false;
    setIsCorrect(correct);

    // Show explanation after a short delay
    setTimeout(() => {
      setShowExplanation(true);
      setIsLoading(false);
    }, 500);
  };

  const handleSkip = async () => {
    setIsLoading(true);
    // Call with 'A' as default but marked as skipped
    await new Promise((resolve) => setTimeout(resolve, 300));
    onAnswered(false, 'A', timeSpent, true);
  };

  const handleContinue = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onAnswered(isCorrect, selectedChoice || 'A', timeSpent);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 space-y-6">
      {/* Progress Bar */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-600">
            Question {questionNumber} of {totalQuestions}
          </span>
          <span className="text-sm font-medium text-gray-600">
            Time: {formatTime(timeSpent)}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Difficulty and Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-full capitalize font-medium">
          {question.difficulty}
        </span>
        {question.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="px-3 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Question */}
      <div>
        <h2 className="text-xl font-bold text-gray-800 mb-4">{question.question}</h2>
      </div>

      {/* Choices */}
      <div className="space-y-3">
        {question.choices.map((choice) => (
          <button
            key={choice.letter}
            onClick={() => handleSelectChoice(choice.letter)}
            disabled={answered}
            className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
              selectedChoice === choice.letter
                ? answered
                  ? choice.isCorrect
                    ? 'border-green-500 bg-green-50'
                    : 'border-red-500 bg-red-50'
                  : 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${answered ? 'cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50'} ${
              answered && choice.isCorrect ? 'ring-2 ring-green-200' : ''
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center font-semibold ${
                  selectedChoice === choice.letter
                    ? answered
                      ? choice.isCorrect
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-red-500 bg-red-500 text-white'
                      : 'border-blue-500 bg-blue-500 text-white'
                    : 'border-gray-300 text-gray-700'
                }`}
              >
                {choice.letter}
              </div>
              <div className="flex-grow">
                <p className="font-medium text-gray-800">{choice.text}</p>
                {answered && choice.isCorrect && (
                  <p className="text-sm text-green-700 mt-1">✓ Correct Answer</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Explanation (shown after answer) */}
      {showExplanation && (
        <div className={`p-4 rounded-lg border-l-4 ${
          isCorrect
            ? 'bg-green-50 border-green-500 text-green-900'
            : 'bg-yellow-50 border-yellow-500 text-yellow-900'
        }`}>
          <h3 className="font-bold mb-2">Explanation</h3>
          <p className="text-sm leading-relaxed">{question.explanation}</p>

          {question.references && question.references.length > 0 && (
            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
              <p className="text-xs font-semibold mb-1">References:</p>
              <ul className="text-xs space-y-1">
                {question.references.map((ref, idx) => (
                  <li key={idx}>• {ref}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        {!answered ? (
          <>
            <button
              onClick={handleSkip}
              disabled={isLoading}
              className="flex-1 py-3 px-4 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
            >
              Skip
            </button>
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedChoice === null || isLoading}
              className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Submit Answer
            </button>
          </>
        ) : (
          <button
            onClick={handleContinue}
            disabled={isLoading}
            className="w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {questionNumber === totalQuestions ? 'See Results' : 'Next Question'}
          </button>
        )}
      </div>
    </div>
  );
}
