/**
 * Type definitions for the PMP Study App
 */

/**
 * FSRS State enum
 * 0: NEW - New card never reviewed
 * 1: LEARNING - Card being learned
 * 2: REVIEW - Card in review phase
 * 3: RELEARNING - Card failed, being relearned
 */
export enum FSRSState {
  NEW = 0,
  LEARNING = 1,
  REVIEW = 2,
  RELEARNING = 3,
}

/**
 * Rating for a flashcard review
 */
export enum CardRating {
  AGAIN = 1,      // Card was too difficult, need to relearn
  HARD = 2,       // Card was hard, but remember
  GOOD = 3,       // Card was remembered with effort
  EASY = 4,       // Card was easy
}

/**
 * FSRS parameters for spaced repetition
 */
export interface FSRSData {
  state: FSRSState;
  difficulty: number;      // 0-10
  stability: number;       // Memory stability in days
  due: Date;               // Next review due date
  reps: number;            // Total reviews completed
  lapses: number;          // Times forgotten
}

/**
 * Flashcard content (master content, shared across users)
 */
export interface FlashcardContent {
  id: string;
  domainId: string;        // 'people', 'process', 'business_environment'
  taskId: string;          // 'people-1', 'people-2', etc.
  front: string;           // Question/prompt
  back: string;            // Answer
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User's flashcard instance with FSRS scheduling
 */
export interface Flashcard {
  id: string;
  userId: string;
  contentId: string;       // Reference to master content
  domainId: string;
  taskId: string;
  fsrs: FSRSData;
  isSuspended: boolean;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Review of a single flashcard
 */
export interface Review {
  id: string;
  flashcardId: string;
  contentId: string;
  userId: string;
  rating: CardRating;
  elapsedDays: number;
  scheduledDays: number;
  review_state: FSRSState;
  reviewedAt: Date;
}

/**
 * Study session
 */
export interface StudySession {
  id: string;
  userId: string;
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;
  scope: {
    type: 'all' | 'domain' | 'task';
    domainId?: string;
    taskId?: string;
  };
  cardsReviewed: number;
  ratings: {
    again: number;
    hard: number;
    good: number;
    easy: number;
  };
  reviews: Review[];
  platform: 'web' | 'ios' | 'android';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User progress for a domain or task
 */
export interface Progress {
  id: string;
  userId: string;
  type: 'domain' | 'task';
  totalCards: number;
  newCards: number;
  learningCards: number;
  reviewCards: number;
  relearningCards: number;
  masteredCards: number;      // stability > 21 days
  masteryPercentage: number;
  totalReviews: number;
  averageRetention: number;   // 0-1
  lastReviewedAt?: Date;
}

/**
 * Domain information
 */
export interface Domain {
  id: string;
  name: string;
  description: string;
  percentage: number;          // % of exam
  color?: string;
}

/**
 * Task information
 */
export interface Task {
  id: string;
  domainId: string;
  name: string;
  description: string;
}

/**
 * User profile
 */
export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Study statistics
 */
export interface StudyStats {
  cardsAvailable: number;
  cardsDue: number;
  cardsNew: number;
  cardsLearning: number;
  cardsReview: number;
  cardsRelearning: number;
  streak: number;
  lastStudyDate?: Date;
}
