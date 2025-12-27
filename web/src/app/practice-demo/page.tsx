'use client';

import { useState } from 'react';
import PracticeQuestionDisplay from '@/components/PracticeQuestionDisplay';
import { PracticeQuestionContentDocument } from '@/types/firestore';

// Sample practice questions for demo
const DEMO_QUESTIONS: PracticeQuestionContentDocument[] = [
  {
    id: 'pq-001',
    domainId: 'people',
    taskId: 'people-1',
    question: 'What is a key characteristic of an effective project manager in the People domain?',
    choices: [
      {
        letter: 'A',
        text: 'The ability to complete all work tasks personally',
        isCorrect: false,
      },
      {
        letter: 'B',
        text: 'Strong interpersonal and communication skills to lead and motivate the team',
        isCorrect: true,
      },
      {
        letter: 'C',
        text: 'The ability to make all decisions without team input',
        isCorrect: false,
      },
      {
        letter: 'D',
        text: 'Avoiding conflict at all costs',
        isCorrect: false,
      },
    ],
    explanation:
      'Effective project managers in the People domain need strong interpersonal and communication skills. They must be able to lead, motivate, and inspire their teams while fostering collaboration and managing conflicts constructively. This is more important than doing all the work themselves or making unilateral decisions.',
    references: ['PMBOK Guide 6th Edition - Section 8.0 Resource Management'],
    difficulty: 'easy',
    tags: ['leadership', 'communication', 'team-management'],
    version: 1,
    stats: {
      totalAttempts: 245,
      correctAttempts: 198,
      successRate: 0.81,
    },
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'pq-002',
    domainId: 'process',
    taskId: 'process-1',
    question:
      'During project execution, you discover that a previously identified risk has occurred. What should you be your first action?',
    choices: [
      {
        letter: 'A',
        text: 'Immediately escalate the issue to senior management',
        isCorrect: false,
      },
      {
        letter: 'B',
        text: 'Execute the contingency plan that was previously prepared for this risk',
        isCorrect: true,
      },
      {
        letter: 'C',
        text: 'Call an emergency team meeting to discuss the problem',
        isCorrect: false,
      },
      {
        letter: 'D',
        text: 'Document the risk and schedule a discussion for the next project meeting',
        isCorrect: false,
      },
    ],
    explanation:
      'When a risk that was previously identified occurs, the project manager should implement the contingency plan that was already prepared during the risk response planning process. This is the most efficient and effective approach since the response strategy has already been developed and approved.',
    references: [
      'PMBOK Guide 6th Edition - Section 11.0 Risk Management',
      'Project Execution and Monitoring processes',
    ],
    difficulty: 'medium',
    tags: ['risk-management', 'contingency-planning', 'response-planning'],
    version: 1,
    stats: {
      totalAttempts: 189,
      correctAttempts: 142,
      successRate: 0.75,
    },
    isActive: true,
    createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-16'),
  },
  {
    id: 'pq-003',
    domainId: 'business_environment',
    taskId: 'business_environment-1',
    question:
      'Which of the following BEST represents the relationship between the organization\'s business strategy and project portfolio management?',
    choices: [
      {
        letter: 'A',
        text: 'Project portfolio management should be independent of organizational strategy',
        isCorrect: false,
      },
      {
        letter: 'B',
        text: 'Projects in the portfolio should be selected and prioritized based on their alignment with organizational strategy',
        isCorrect: true,
      },
      {
        letter: 'C',
        text: 'Business strategy should be adjusted to fit the available projects',
        isCorrect: false,
      },
      {
        letter: 'D',
        text: 'Portfolio management is only relevant for large enterprises',
        isCorrect: false,
      },
    ],
    explanation:
      'Project portfolio management is directly aligned with organizational strategy. Projects should be carefully selected and prioritized based on their contribution to organizational objectives and strategic goals. This ensures that resources are invested in projects that deliver the most value to the organization.',
    references: ['PMBOK Guide 6th Edition - Portfolio Management Concepts'],
    difficulty: 'hard',
    tags: ['strategic-alignment', 'portfolio-management', 'business-environment'],
    version: 1,
    stats: {
      totalAttempts: 156,
      correctAttempts: 101,
      successRate: 0.65,
    },
    isActive: true,
    createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-17'),
  },
];

export default function PracticeDemoPage() {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<
    Array<{ questionId: string; selectedLetter: 'A' | 'B' | 'C' | 'D'; isCorrect: boolean }>
  >([]);

  const currentQuestion = DEMO_QUESTIONS[currentQuestionIndex];

  const handleAnswer = (selectedLetter: 'A' | 'B' | 'C' | 'D', isCorrect: boolean) => {
    const newAnswers = [...answers];
    const existingAnswerIndex = newAnswers.findIndex((a) => a.questionId === currentQuestion.id);

    if (existingAnswerIndex >= 0) {
      newAnswers[existingAnswerIndex] = {
        questionId: currentQuestion.id,
        selectedLetter,
        isCorrect,
      };
    } else {
      newAnswers.push({
        questionId: currentQuestion.id,
        selectedLetter,
        isCorrect,
      });
    }

    setAnswers(newAnswers);
  };

  const handleNext = () => {
    if (currentQuestionIndex < DEMO_QUESTIONS.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const correctCount = answers.filter((a) => a.isCorrect).length;
  const isComplete = currentQuestionIndex === DEMO_QUESTIONS.length - 1 && answers.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Practice Questions Demo
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test the PracticeQuestionDisplay component with sample questions
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Question {currentQuestionIndex + 1} of {DEMO_QUESTIONS.length}
            </h2>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Correct: {correctCount} / {answers.length}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / DEMO_QUESTIONS.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question Display */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 mb-8">
          <PracticeQuestionDisplay
            question={currentQuestion}
            onAnswer={handleAnswer}
            onNext={handleNext}
            showFeedback={true}
          />
        </div>

        {/* Results Summary (shown at the end) */}
        {isComplete && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Quiz Complete!
            </h2>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                <p className="text-green-700 dark:text-green-200 text-sm font-semibold">Correct</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{correctCount}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                <p className="text-red-700 dark:text-red-200 text-sm font-semibold">Incorrect</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {answers.length - correctCount}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-blue-700 dark:text-blue-200 text-sm font-semibold">Success Rate</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  {((correctCount / answers.length) * 100).toFixed(0)}%
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentQuestionIndex(0);
                setAnswers([]);
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Restart Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
