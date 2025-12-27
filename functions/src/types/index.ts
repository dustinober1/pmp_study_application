/**
 * PMP Study App - Firestore Data Model Types
 *
 * This file defines TypeScript interfaces for all Firestore collections
 * and documents in the PMP study application.
 */

// ============================================================================
// ENUMS
// ============================================================================

/**
 * PMP 2026 Exam Domains
 */
export enum Domain {
  PEOPLE = 'people',
  PROCESS = 'process',
  BUSINESS_ENVIRONMENT = 'business_environment'
}

/**
 * FSRS Rating Scale (1-4)
 * Based on the FSRS algorithm for spaced repetition
 */
export enum Rating {
  AGAIN = 1,    // Complete blackout, wrong answer
  HARD = 2,     // Wrong answer, but remembered something
  GOOD = 3,     // Correct answer with effort
  EASY = 4      // Perfect answer, effortless recall
}

/**
 * Card state in the FSRS algorithm
 */
export enum CardState {
  NEW = 0,       // Never studied
  LEARNING = 1,  // Currently being learned
  REVIEW = 2,    // In review phase
  RELEARNING = 3 // Forgotten, being relearned
}

/**
 * Subscription tier
 */
export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium'
}

// ============================================================================
// DOMAIN REFERENCE DATA
// ============================================================================

/**
 * Domain collection - Static reference data for PMP exam domains
 * Collection: /domains/{domainId}
 */
export interface DomainDocument {
  id: string;                    // 'people', 'process', or 'business_environment'
  name: string;                  // Display name: 'People', 'Process', 'Business Environment'
  percentage: number;            // Exam weight: 33, 41, or 26
  description: string;           // Domain description
  taskIds: string[];             // Array of task IDs in this domain
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Task collection - Static reference data for PMP exam tasks
 * Collection: /tasks/{taskId}
 */
export interface TaskDocument {
  id: string;                    // e.g., 'people-1', 'process-1'
  domainId: string;              // Reference to parent domain
  taskNumber: number;            // Task number within domain (1-based)
  title: string;                 // Task title
  description: string;           // Detailed task description
  flashcardIds: string[];        // Array of flashcard IDs for this task
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// USER DATA
// ============================================================================

/**
 * User collection - Main user profile data
 * Collection: /users/{userId}
 */
export interface UserDocument {
  uid: string;                   // Firebase Auth UID
  email: string;
  displayName?: string;
  photoURL?: string;

  // Subscription
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: Date;

  // Study preferences
  preferences: {
    dailyGoal: number;           // Target cards per day
    studyReminderTime?: string;  // HH:MM format
    enableNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };

  // Statistics
  stats: {
    totalCardsStudied: number;
    currentStreak: number;       // Days in a row
    longestStreak: number;
    totalStudyTime: number;      // Minutes
    lastStudyDate?: Date;
  };

  // FSRS parameters (personalized for user)
  fsrsParameters: {
    requestRetention: number;    // Target retention rate (default: 0.9)
    maximumInterval: number;     // Max days between reviews (default: 36500)
    w: number[];                 // 17 FSRS weights (optimized per user)
  };

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// FLASHCARDS
// ============================================================================

/**
 * FSRS scheduling data for a flashcard
 */
export interface FSRSData {
  state: CardState;              // Current card state
  difficulty: number;            // Card difficulty (0-10)
  stability: number;             // Memory stability in days
  lastReview?: Date;             // Last review timestamp
  due: Date;                     // Next review due date
  elapsedDays: number;           // Days since last review
  scheduledDays: number;         // Days until next review
  reps: number;                  // Total review count
  lapses: number;                // Number of times forgotten
}

/**
 * Flashcard collection - User's flashcard instances
 * Collection: /flashcards/{flashcardId}
 *
 * Note: Flashcard content (front/back) is stored separately in a master
 * collection managed by admins. This collection stores per-user progress.
 */
export interface FlashcardDocument {
  id: string;                    // Auto-generated ID
  userId: string;                // Owner of this card instance

  // Content reference
  contentId: string;             // Reference to master flashcard content
  domainId: string;              // Domain this card belongs to
  taskId: string;                // Task this card belongs to

  // FSRS scheduling data
  fsrs: FSRSData;

  // Card metadata
  isSuspended: boolean;          // User can suspend cards they don't want to study
  tags: string[];                // User-defined tags
  notes?: string;                // User's personal notes on this card

  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// USER PROGRESS
// ============================================================================

/**
 * User progress tracking per domain and task
 * Subcollection: /users/{userId}/progress/{progressId}
 *
 * progressId format: '{domainId}' or '{domainId}-{taskId}'
 */
export interface UserProgressDocument {
  id: string;                    // Domain or task ID
  userId: string;                // Parent user ID
  type: 'domain' | 'task';       // Progress level

  // Hierarchy
  domainId: string;
  taskId?: string;               // Only present for task-level progress

  // Progress metrics
  totalCards: number;            // Total cards in this scope
  newCards: number;              // Cards in NEW state
  learningCards: number;         // Cards in LEARNING state
  reviewCards: number;           // Cards in REVIEW state
  relearningCards: number;       // Cards in RELEARNING state

  // Mastery metrics
  masteredCards: number;         // Cards with stability > 21 days
  masteryPercentage: number;     // masteredCards / totalCards * 100

  // Study metrics
  totalReviews: number;          // Total review count
  averageRetention: number;      // Success rate (0-1)
  lastStudiedAt?: Date;

  updatedAt: Date;
}

// ============================================================================
// STUDY SESSIONS
// ============================================================================

/**
 * Review item within a study session
 */
export interface ReviewItem {
  flashcardId: string;
  contentId: string;
  domainId: string;
  taskId: string;
  rating: Rating;                // User's rating for this review
  timeSpent: number;             // Seconds spent on this card
  previousState: CardState;      // State before review
  newState: CardState;           // State after review
  previousDue: Date;             // Due date before review
  newDue: Date;                  // Due date after review
}

/**
 * Study session collection - Records of study sessions
 * Collection: /studySessions/{sessionId}
 */
export interface StudySessionDocument {
  id: string;                    // Auto-generated ID
  userId: string;

  // Session metadata
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;       // Total session time

  // Session scope
  scope: {
    type: 'all' | 'domain' | 'task';
    domainId?: string;
    taskId?: string;
  };

  // Session metrics
  cardsReviewed: number;
  cardsNew: number;              // New cards introduced this session
  cardsRelearning: number;       // Cards that were relearned

  // Performance metrics
  ratings: {
    again: number;               // Count of Rating.AGAIN
    hard: number;                // Count of Rating.HARD
    good: number;                // Count of Rating.GOOD
    easy: number;                // Count of Rating.EASY
  };

  // Detailed review history
  reviews: ReviewItem[];

  // Platform
  platform: 'web' | 'ios' | 'android';

  createdAt: Date;
}

// ============================================================================
// REVIEW HISTORY
// ============================================================================

/**
 * Review history collection - Individual card review records
 * Collection: /reviewHistory/{reviewId}
 *
 * This provides a detailed audit trail of all reviews.
 * Study sessions aggregate multiple reviews.
 */
export interface ReviewHistoryDocument {
  id: string;                    // Auto-generated ID
  userId: string;
  flashcardId: string;
  contentId: string;

  // Context
  sessionId: string;             // Parent study session
  domainId: string;
  taskId: string;

  // Review data
  rating: Rating;
  timeSpent: number;             // Seconds

  // FSRS state transitions
  stateBefore: CardState;
  stateAfter: CardState;
  dueBefore: Date;
  dueAfter: Date;
  difficultyBefore: number;
  difficultyAfter: number;
  stabilityBefore: number;
  stabilityAfter: number;

  reviewedAt: Date;
  createdAt: Date;
}

// ============================================================================
// MASTER FLASHCARD CONTENT (Admin-managed)
// ============================================================================

/**
 * Master flashcard content collection - Admin-managed flashcard content
 * Collection: /flashcardContent/{contentId}
 *
 * This is read-only for users and contains the actual flashcard content.
 * Each user gets their own FlashcardDocument that references this content.
 */
export interface FlashcardContentDocument {
  id: string;                    // Auto-generated ID

  // Hierarchy
  domainId: string;
  taskId: string;

  // Content
  front: string;                 // Question/prompt
  back: string;                  // Answer/explanation
  hints?: string[];              // Optional hints
  references?: string[];         // PMBOK references

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  version: number;               // For content versioning

  // Usage stats (aggregated across all users)
  stats: {
    totalReviews: number;
    averageRating: number;       // 1-4 scale
    averageRetention: number;    // Success rate
  };

  isActive: boolean;             // Can be deactivated without deletion
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PRACTICE QUESTIONS
// ============================================================================

/**
 * Answer choice for a multiple choice question
 */
export interface AnswerChoice {
  letter: 'A' | 'B' | 'C' | 'D';  // Choice letter
  text: string;                    // Choice text
  isCorrect: boolean;              // Whether this is the correct answer
}

/**
 * Master practice question content collection - Admin-managed question content
 * Collection: /practiceQuestions/{questionId}
 *
 * This is read-only for users and contains the actual question content.
 * Each user attempt references this content via contentId.
 */
export interface PracticeQuestionContentDocument {
  id: string;                      // Auto-generated ID

  // Hierarchy
  domainId: string;
  taskId: string;

  // Content
  question: string;                // The question text
  choices: AnswerChoice[];          // 4 answer choices (A, B, C, D)
  explanation: string;             // Detailed explanation (remediation)
  references?: string[];           // PMBOK references

  // Metadata
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  version: number;                 // For content versioning

  // Usage stats (aggregated across all users)
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    successRate: number;           // correctAttempts / totalAttempts (0-1)
  };

  isActive: boolean;               // Can be deactivated without deletion
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User practice attempt collection - User's practice question attempts
 * Collection: /practiceAttempts/{attemptId}
 *
 * Records each time a user answers a practice question.
 */
export interface PracticeAttemptDocument {
  id: string;                      // Auto-generated ID
  userId: string;                  // Owner of this attempt

  // Content reference
  contentId: string;               // Reference to master question content
  domainId: string;
  taskId: string;

  // Session reference
  sessionId: string;               // Parent practice session

  // Attempt data
  selectedChoice: 'A' | 'B' | 'C' | 'D';  // User's selected answer
  isCorrect: boolean;              // Whether the answer was correct
  timeSpent: number;               // Seconds spent on this question

  // Metadata
  attempt: number;                 // Attempt number (1st attempt, 2nd, etc.)
  skipped: boolean;                // Whether user skipped this question

  attemptedAt: Date;
  createdAt: Date;
}

/**
 * Practice session collection - Records of practice test sessions
 * Collection: /practiceSessions/{sessionId}
 *
 * Tracks a practice test session with multiple questions.
 */
export interface PracticeSessionDocument {
  id: string;                      // Auto-generated ID
  userId: string;

  // Session metadata
  startedAt: Date;
  endedAt?: Date;
  durationSeconds: number;         // Total session time

  // Session scope
  scope: {
    type: 'all' | 'domain' | 'task';  // Scope of questions
    domainId?: string;
    taskId?: string;
  };

  // Session metrics
  questionsPresented: number;      // Total questions in session
  questionsAnswered: number;       // Questions user answered (not skipped)
  questionsSkipped: number;        // Questions user skipped

  // Performance metrics
  correctAnswers: number;
  incorrectAnswers: number;
  successRate: number;             // correctAnswers / questionsAnswered (0-1)

  // Question IDs in this session (for reference)
  questionIds: string[];

  // Platform
  platform: 'web' | 'ios' | 'android';

  createdAt: Date;
}

/**
 * Practice attempt history collection - Individual question attempt records
 * Collection: /practiceAttemptHistory/{historyId}
 *
 * This provides a detailed audit trail of all practice attempts.
 * Practice sessions aggregate multiple attempts.
 */
export interface PracticeAttemptHistoryDocument {
  id: string;                      // Auto-generated ID
  userId: string;
  contentId: string;

  // Context
  sessionId: string;               // Parent practice session
  domainId: string;
  taskId: string;

  // Attempt data
  selectedChoice: 'A' | 'B' | 'C' | 'D';
  correctChoice: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  timeSpent: number;               // Seconds

  // Metadata
  attempt: number;                 // Attempt sequence in session
  skipped: boolean;

  attemptedAt: Date;
  createdAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Firestore document with ID
 */
export type WithId<T> = T & { id: string };

/**
 * Firestore timestamp conversion helper
 */
export type FirestoreTimestamp = {
  toDate(): Date;
  toMillis(): number;
};

/**
 * Convert Date fields to Firestore timestamps for writes
 */
export type ToFirestore<T> = {
  [K in keyof T]: T[K] extends Date
    ? FirestoreTimestamp | Date
    : T[K] extends object
    ? ToFirestore<T[K]>
    : T[K];
};

/**
 * Convert Firestore timestamps to Dates for reads
 */
export type FromFirestore<T> = {
  [K in keyof T]: T[K] extends FirestoreTimestamp
    ? Date
    : T[K] extends object
    ? FromFirestore<T[K]>
    : T[K];
};
