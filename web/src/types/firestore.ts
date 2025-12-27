/**
 * Firestore document types for PMP Study App
 * These types mirror the backend types for data consistency
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum Domain {
  PEOPLE = 'people',
  PROCESS = 'process',
  BUSINESS_ENVIRONMENT = 'business_environment',
}

export enum Rating {
  AGAIN = 1,
  HARD = 2,
  GOOD = 3,
  EASY = 4,
}

export enum CardState {
  NEW = 0,
  LEARNING = 1,
  REVIEW = 2,
  RELEARNING = 3,
}

export enum SubscriptionTier {
  FREE = 'free',
  PREMIUM = 'premium',
}

// ============================================================================
// PRACTICE QUESTIONS
// ============================================================================

export interface AnswerChoice {
  letter: 'A' | 'B' | 'C' | 'D';
  text: string;
  isCorrect: boolean;
}

export interface PracticeQuestionContentDocument {
  id: string;
  domainId: string;
  taskId: string;
  question: string;
  choices: AnswerChoice[];
  explanation: string;
  references?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  version: number;
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    successRate: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PracticeAttemptDocument {
  id: string;
  userId: string;
  contentId: string;
  domainId: string;
  taskId: string;
  sessionId: string;
  selectedChoice: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  timeSpent: number;
  attempt: number;
  skipped: boolean;
  attemptedAt: Date;
  createdAt: Date;
}

export interface PracticeSessionDocument {
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
  questionsPresented: number;
  questionsAnswered: number;
  questionsSkipped: number;
  correctAnswers: number;
  incorrectAnswers: number;
  successRate: number;
  questionIds: string[];
  platform: 'web' | 'ios' | 'android';
  createdAt: Date;
}

export interface PracticeAttemptHistoryDocument {
  id: string;
  userId: string;
  contentId: string;
  sessionId: string;
  domainId: string;
  taskId: string;
  selectedChoice: 'A' | 'B' | 'C' | 'D';
  correctChoice: 'A' | 'B' | 'C' | 'D';
  isCorrect: boolean;
  timeSpent: number;
  attempt: number;
  skipped: boolean;
  attemptedAt: Date;
  createdAt: Date;
}

// ============================================================================
// FLASHCARDS (for completeness)
// ============================================================================

export interface FSRSData {
  state: CardState;
  difficulty: number;
  stability: number;
  lastReview?: Date;
  due: Date;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
}

export interface FlashcardContentDocument {
  id: string;
  domainId: string;
  taskId: string;
  front: string;
  back: string;
  hints?: string[];
  references?: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  version: number;
  stats: {
    totalReviews: number;
    averageRating: number;
    averageRetention: number;
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FlashcardDocument {
  id: string;
  userId: string;
  contentId: string;
  domainId: string;
  taskId: string;
  fsrs: FSRSData;
  isSuspended: boolean;
  tags: string[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// USER DATA
// ============================================================================

export interface UserDocument {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt?: Date;
  preferences: {
    dailyGoal: number;
    studyReminderTime?: string;
    enableNotifications: boolean;
    theme: 'light' | 'dark' | 'auto';
  };
  stats: {
    totalCardsStudied: number;
    currentStreak: number;
    longestStreak: number;
    totalStudyTime: number;
    lastStudyDate?: Date;
  };
  fsrsParameters: {
    requestRetention: number;
    maximumInterval: number;
    w: number[];
  };
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// DOMAIN & TASK REFERENCE DATA
// ============================================================================

export interface DomainDocument {
  id: string;
  name: string;
  percentage: number;
  description: string;
  taskIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TaskDocument {
  id: string;
  domainId: string;
  taskNumber: number;
  title: string;
  description: string;
  flashcardIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type WithId<T> = T & { id: string };

export type FirestoreTimestamp = {
  toDate(): Date;
  toMillis(): number;
};
