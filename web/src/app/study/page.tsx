'use client';

import { useState } from 'react';
import FlashcardDisplay from '@/components/FlashcardDisplay';
import RatingButtons from '@/components/RatingButtons';
import ProgressDisplay from '@/components/ProgressDisplay';
import DomainTaskBrowser from '@/components/DomainTaskBrowser';
import PracticeSessionFlow from '@/components/PracticeSessionFlow';
import { CardRating, Flashcard, FlashcardContent, Domain, Task, Progress, StudyStats } from '@/types';

// Mock data for demonstration
const MOCK_DOMAINS: Domain[] = [
  {
    id: 'people',
    name: 'People',
    description: 'Human resource management',
    percentage: 33,
  },
  {
    id: 'process',
    name: 'Process',
    description: 'Project management processes',
    percentage: 41,
  },
  {
    id: 'business_environment',
    name: 'Business Environment',
    description: 'Business and external environment',
    percentage: 26,
  },
];

const MOCK_TASKS: Task[] = [
  { id: 'people-1', domainId: 'people', name: 'Task 1.1', description: 'Stakeholder Management' },
  { id: 'people-2', domainId: 'people', name: 'Task 1.2', description: 'Team Development' },
  { id: 'people-3', domainId: 'people', name: 'Task 1.3', description: 'Leadership' },
  { id: 'process-1', domainId: 'process', name: 'Task 2.1', description: 'Planning' },
  { id: 'process-2', domainId: 'process', name: 'Task 2.2', description: 'Execution' },
  { id: 'process-3', domainId: 'process', name: 'Task 2.3', description: 'Monitoring' },
  { id: 'business_environment-1', domainId: 'business_environment', name: 'Task 3.1', description: 'Strategy' },
  { id: 'business_environment-2', domainId: 'business_environment', name: 'Task 3.2', description: 'Risk' },
];

const MOCK_FLASHCARD: Flashcard = {
  id: 'fc-1',
  userId: 'user-1',
  contentId: 'content-1',
  domainId: 'people',
  taskId: 'people-1',
  fsrs: {
    state: 0,
    difficulty: 5,
    stability: 1,
    due: new Date(),
    reps: 0,
    lapses: 0,
  },
  isSuspended: false,
  tags: ['leadership', 'communication'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_CONTENT: FlashcardContent = {
  id: 'content-1',
  domainId: 'people',
  taskId: 'people-1',
  front: 'What is the primary responsibility of a project manager in stakeholder management?',
  back: 'The primary responsibility is to identify, analyze, and engage stakeholders throughout the project lifecycle to ensure their interests are considered and potential conflicts are managed proactively.',
  tags: ['leadership', 'communication'],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_PROGRESS: Record<string, Progress> = {
  people: {
    id: 'people',
    userId: 'user-1',
    type: 'domain',
    totalCards: 45,
    newCards: 12,
    learningCards: 15,
    reviewCards: 12,
    relearningCards: 2,
    masteredCards: 4,
    masteryPercentage: 35,
    totalReviews: 120,
    averageRetention: 0.72,
  },
  process: {
    id: 'process',
    userId: 'user-1',
    type: 'domain',
    totalCards: 65,
    newCards: 20,
    learningCards: 25,
    reviewCards: 15,
    relearningCards: 3,
    masteredCards: 2,
    masteryPercentage: 28,
    totalReviews: 95,
    averageRetention: 0.65,
  },
  'people-1': {
    id: 'people-1',
    userId: 'user-1',
    type: 'task',
    totalCards: 15,
    newCards: 4,
    learningCards: 5,
    reviewCards: 4,
    relearningCards: 1,
    masteredCards: 1,
    masteryPercentage: 40,
    totalReviews: 40,
    averageRetention: 0.75,
  },
};

const MOCK_STATS: StudyStats = {
  cardsAvailable: 110,
  cardsDue: 27,
  cardsNew: 32,
  cardsLearning: 40,
  cardsReview: 27,
  cardsRelearning: 5,
  streak: 5,
  lastStudyDate: new Date(Date.now() - 86400000),
};

export default function StudyPage() {
  const [currentFlashcard] = useState<Flashcard>(MOCK_FLASHCARD);
  const [currentContent] = useState<FlashcardContent>(MOCK_CONTENT);
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [studyMode, setStudyMode] = useState<'browse' | 'study' | 'progress' | 'practice'>('browse');

  const handleRate = async (rating: CardRating) => {
    setIsRating(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Log the rating (in real app, save to Firestore)
    console.log(`Card rated: ${rating}`);

    // Reset for next card
    setIsFlipped(false);
    setIsRating(false);

    // In a real app, fetch next card here
  };

  const handleStudyClick = (type: 'all' | 'domain' | 'task', id?: string) => {
    setStudyMode('study');
    if (type === 'domain') setSelectedDomain(id || null);
    if (type === 'task') setSelectedTask(id || null);
  };

  const handleBrowseClick = () => {
    setStudyMode('browse');
  };

  const handleProgressClick = () => {
    setStudyMode('progress');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Flashcard Study</h1>
          <p className="text-gray-600">
            Learn PMP 2026 exam concepts with spaced repetition
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={handleBrowseClick}
            className={`
              px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap
              ${
                studyMode === 'browse'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            Browse
          </button>
          <button
            onClick={() => setStudyMode('study')}
            className={`
              px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap
              ${
                studyMode === 'study'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            Study Session
          </button>
          <button
            onClick={() => setStudyMode('practice')}
            className={`
              px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap
              ${
                studyMode === 'practice'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            Practice Questions
          </button>
          <button
            onClick={handleProgressClick}
            className={`
              px-4 py-3 font-semibold border-b-2 transition-colors whitespace-nowrap
              ${
                studyMode === 'progress'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            Progress
          </button>
        </div>

        {/* Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {studyMode === 'browse' && (
              <DomainTaskBrowser
                domains={MOCK_DOMAINS}
                tasks={MOCK_TASKS}
                progress={MOCK_PROGRESS}
                selectedDomain={selectedDomain || undefined}
                selectedTask={selectedTask || undefined}
                onDomainSelect={setSelectedDomain}
                onTaskSelect={setSelectedTask}
                onStudyClick={handleStudyClick}
              />
            )}

            {studyMode === 'study' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-800">Study Session</h2>
                    <div className="text-sm text-gray-600">
                      Card 1 of 10
                    </div>
                  </div>

                  <FlashcardDisplay
                    flashcard={currentFlashcard}
                    content={currentContent}
                    isFlipped={isFlipped}
                    onFlip={setIsFlipped}
                  />

                  {isFlipped && (
                    <RatingButtons
                      onRate={handleRate}
                      disabled={isRating}
                      loading={isRating}
                    />
                  )}

                  {!isFlipped && (
                    <div className="mt-8 text-center">
                      <p className="text-gray-600">Click the card to reveal the answer</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {studyMode === 'practice' && (
              <PracticeSessionFlow
                domains={MOCK_DOMAINS}
                tasks={MOCK_TASKS}
                onClose={() => setStudyMode('browse')}
              />
            )}

            {studyMode === 'progress' && (
              <ProgressDisplay
                progress={MOCK_PROGRESS['people']}
                stats={MOCK_STATS}
                title="Overall Progress"
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <ProgressDisplay
                stats={MOCK_STATS}
                title="Quick Stats"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
