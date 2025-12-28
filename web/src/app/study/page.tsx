'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db, functions } from '@/lib/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  getDoc,
  Timestamp
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import FlashcardDisplay from '@/components/FlashcardDisplay';
import RatingButtons from '@/components/RatingButtons';
import ProgressDisplay from '@/components/ProgressDisplay';
import DomainTaskBrowser from '@/components/DomainTaskBrowser';
import PracticeSessionFlow from '@/components/PracticeSessionFlow';
import LoadingSpinner from '@/components/LoadingSpinner';
import { ErrorAlert } from '@/components/ErrorAlert';
import { CardRating, Flashcard, FlashcardContent, Domain, Task, Progress, StudyStats, FSRSState } from '@/types';

export default function StudyPage() {
  const { user, loading: authLoading } = useAuth();

  // Data state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [studyStats, setStudyStats] = useState<StudyStats | null>(null);

  // UI state
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [isRating, setIsRating] = useState(false);
  const [studyMode, setStudyMode] = useState<'browse' | 'study' | 'progress' | 'practice'>('browse');

  // Study session state
  const [currentFlashcard, setCurrentFlashcard] = useState<(Flashcard & { content: FlashcardContent }) | null>(null);
  const [cardsInSession, setCardsInSession] = useState<(Flashcard & { content: FlashcardContent })[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [isStudySessionLoading, setIsStudySessionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [studySessionError, setStudySessionError] = useState<string | null>(null);

  // Load reference data (domains and tasks)
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch domains
        const domainsSnapshot = await getDocs(collection(db, 'domains'));
        const domainsData = domainsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            description: data.description,
            percentage: data.percentage,
          } as Domain;
        });
        setDomains(domainsData);

        // Fetch tasks
        const tasksSnapshot = await getDocs(collection(db, 'tasks'));
        const tasksData = tasksSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            domainId: data.domainId,
            name: data.title || data.name,
            description: data.description,
          } as Task;
        });
        setTasks(tasksData);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load domains and tasks';
        setError(errorMessage);
        console.error('Error loading reference data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadReferenceData();
  }, []);

  // Load user progress and stats
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        // Load progress for all domains and tasks
        const progressSnapshot = await getDocs(
          query(
            collection(db, 'users', user.uid, 'progress'),
            where('type', 'in', ['domain', 'task'])
          )
        );

        const progressData: Record<string, Progress> = {};
        progressSnapshot.docs.forEach(doc => {
          const data = doc.data();
          progressData[doc.id] = {
            id: doc.id,
            userId: user.uid,
            type: data.type,
            totalCards: data.totalCards || 0,
            newCards: data.newCards || 0,
            learningCards: data.learningCards || 0,
            reviewCards: data.reviewCards || 0,
            relearningCards: data.relearningCards || 0,
            masteredCards: data.masteredCards || 0,
            masteryPercentage: data.masteryPercentage || 0,
            totalReviews: data.totalReviews || 0,
            averageRetention: data.averageRetention || 0,
            lastReviewedAt: data.lastReviewedAt?.toDate(),
          };
        });
        setProgress(progressData);

        // Calculate stats from flashcards
        const flashcardsSnapshot = await getDocs(
          query(
            collection(db, 'flashcards'),
            where('userId', '==', user.uid),
            where('isSuspended', '==', false)
          )
        );

        let cardsDue = 0;
        let cardsNew = 0;
        let cardsLearning = 0;
        let cardsReview = 0;
        let cardsRelearning = 0;
        const now = new Date();

        flashcardsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const fsrs = data.fsrs || {};

          // Count by state
          switch (fsrs.state) {
            case FSRSState.NEW:
              cardsNew++;
              break;
            case FSRSState.LEARNING:
              cardsLearning++;
              break;
            case FSRSState.REVIEW:
              cardsReview++;
              break;
            case FSRSState.RELEARNING:
              cardsRelearning++;
              break;
          }

          // Count due cards
          if (fsrs.due && new Date(fsrs.due.toDate ? fsrs.due.toDate() : fsrs.due) <= now) {
            cardsDue++;
          }
        });

        // Get last study date from user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();

        setStudyStats({
          cardsAvailable: flashcardsSnapshot.size,
          cardsDue,
          cardsNew,
          cardsLearning,
          cardsReview,
          cardsRelearning,
          streak: userData?.stats?.currentStreak || 0,
          lastStudyDate: userData?.stats?.lastStudyDate?.toDate(),
        });
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    };

    loadUserData();
  }, [user]);

  // Load flashcards for study session
  useEffect(() => {
    if (studyMode !== 'study' || !user) return;

    const loadCardsForStudy = async () => {
      try {
        setIsStudySessionLoading(true);
        setStudySessionError(null);

        // Create a study session
        const createStudySession = httpsCallable(functions, 'createStudySession');
        const scope = {
          type: selectedTask ? 'task' : selectedDomain ? 'domain' : 'all',
          ...(selectedDomain && { domainId: selectedDomain }),
          ...(selectedTask && { taskId: selectedTask }),
        };

        const sessionResult = await createStudySession({ scope, platform: 'web' });
        const newSessionId = (sessionResult.data as any).sessionId;
        setSessionId(newSessionId);

        // Get cards for review
        const getCardsForReview = httpsCallable(functions, 'getCardsForReview');
        const reviewResult = await getCardsForReview({ limit: 50, scope });
        const cards = (reviewResult.data as any).cards || [];

        if (cards.length === 0) {
          setStudySessionError('No cards available for study in the selected scope.');
          setCardsInSession([]);
          setCurrentFlashcard(null);
          setIsStudySessionLoading(false);
          return;
        }

        // Enrich cards with content
        const enrichedCards: (Flashcard & { content: FlashcardContent })[] = [];

        for (const card of cards) {
          try {
            const contentDoc = await getDoc(doc(db, 'flashcardContent', card.contentId));
            if (contentDoc.exists()) {
              const contentData = contentDoc.data();
              enrichedCards.push({
                ...card,
                content: {
                  id: contentDoc.id,
                  domainId: contentData.domainId,
                  taskId: contentData.taskId,
                  front: contentData.front,
                  back: contentData.back,
                  tags: contentData.tags || [],
                  createdAt: contentData.createdAt?.toDate() || new Date(),
                  updatedAt: contentData.updatedAt?.toDate() || new Date(),
                } as FlashcardContent,
              });
            }
          } catch (error) {
            console.error(`Error loading content for card ${card.id}:`, error);
          }
        }

        if (enrichedCards.length > 0) {
          setCardsInSession(enrichedCards);
          setCurrentCardIndex(0);
          setCurrentFlashcard(enrichedCards[0]);
        } else {
          setStudySessionError('Failed to load card content. Please try again.');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load cards for study';
        setStudySessionError(errorMessage);
        console.error('Error loading cards for study:', error);
      } finally {
        setIsStudySessionLoading(false);
      }
    };

    loadCardsForStudy();
  }, [studyMode, user, selectedDomain, selectedTask]);

  const handleRate = async (rating: CardRating) => {
    if (!currentFlashcard || !user || !sessionId) return;

    setIsRating(true);
    setStudySessionError(null);

    try {
      // Call Cloud Function to record the rating
      const reviewCardInSession = httpsCallable(functions, 'reviewCardInSession');
      const elapsedMs = 0; // Would track actual time in production

      await reviewCardInSession({
        sessionId,
        flashcardId: currentFlashcard.id,
        rating,
        elapsedMs,
      });

      // Move to next card
      setIsFlipped(false);
      const nextIndex = currentCardIndex + 1;

      if (nextIndex < cardsInSession.length) {
        setCurrentCardIndex(nextIndex);
        setCurrentFlashcard(cardsInSession[nextIndex]);
      } else {
        // End session and return to browse
        try {
          const endStudySession = httpsCallable(functions, 'endStudySession');
          await endStudySession({ sessionId });
        } catch (error) {
          console.error('Error ending study session:', error);
          setStudySessionError('Failed to properly end study session, but your progress was saved.');
        }
        setStudyMode('browse');
        setCurrentFlashcard(null);
        setCardsInSession([]);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to record card rating';
      setStudySessionError(errorMessage);
      console.error('Error rating card:', error);
    } finally {
      setIsRating(false);
    }
  };

  const handleStudyClick = (type: 'all' | 'domain' | 'task', id?: string) => {
    if (type === 'domain') setSelectedDomain(id || null);
    if (type === 'task') setSelectedTask(id || null);
    if (type === 'all') {
      setSelectedDomain(null);
      setSelectedTask(null);
    }
    setStudyMode('study');
  };

  const handleBrowseClick = () => {
    setStudyMode('browse');
  };

  const handleProgressClick = () => {
    setStudyMode('progress');
  };

  if (authLoading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Please Log In</h1>
          <p className="text-gray-600">You need to be logged in to access the study page.</p>
        </div>
      </div>
    );
  }

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

        {/* Error Alert */}
        {error && (
          <div className="mb-6">
            <ErrorAlert
              error={error}
              type="error"
              onDismiss={() => setError(null)}
            />
          </div>
        )}

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
              isLoading ? (
                <LoadingSpinner />
              ) : (
                <DomainTaskBrowser
                  domains={domains}
                  tasks={tasks}
                  progress={progress}
                  selectedDomain={selectedDomain || undefined}
                  selectedTask={selectedTask || undefined}
                  onDomainSelect={setSelectedDomain}
                  onTaskSelect={setSelectedTask}
                  onStudyClick={handleStudyClick}
                />
              )
            )}

            {studyMode === 'study' && (
              isStudySessionLoading ? (
                <LoadingSpinner />
              ) : studySessionError ? (
                <div className="space-y-4">
                  <ErrorAlert
                    error={studySessionError}
                    type="error"
                    onDismiss={() => setStudySessionError(null)}
                  />
                  <button
                    onClick={() => setStudyMode('browse')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Back to Browse
                  </button>
                </div>
              ) : currentFlashcard ? (
                <div className="space-y-6">
                  <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-gray-800">Study Session</h2>
                      <div className="text-sm text-gray-600">
                        Card {currentCardIndex + 1} of {cardsInSession.length}
                      </div>
                    </div>

                    <FlashcardDisplay
                      flashcard={currentFlashcard}
                      content={currentFlashcard.content}
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
              ) : (
                <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
                  <p className="text-center text-gray-600">No cards available for study. Try another domain or task!</p>
                </div>
              )
            )}

            {studyMode === 'practice' && (
              <PracticeSessionFlow
                domains={domains}
                tasks={tasks}
                onClose={() => setStudyMode('browse')}
              />
            )}

            {studyMode === 'progress' && studyStats && (
              <ProgressDisplay
                progress={progress['people']}
                stats={studyStats}
                title="Overall Progress"
              />
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              {studyStats ? (
                <ProgressDisplay
                  stats={studyStats}
                  title="Quick Stats"
                />
              ) : (
                <LoadingSpinner />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
