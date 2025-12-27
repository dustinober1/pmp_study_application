import { auth, db } from '@/config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import {
  PracticeQuestionContentDocument,
  PracticeAttemptDocument,
  PracticeSessionDocument,
  PracticeAttemptHistoryDocument,
} from '@/types/firestore';

/**
 * Practice question data service
 * Handles CRUD operations and session management for practice questions
 */
export class PracticeService {
  private async getUserId(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  // ============================================================================
  // PRACTICE QUESTION CONTENT OPERATIONS (Read-only for users)
  // ============================================================================

  /**
   * Get a single practice question by ID
   */
  async getPracticeQuestion(
    questionId: string
  ): Promise<PracticeQuestionContentDocument | null> {
    try {
      const docRef = doc(db, 'practiceQuestions', questionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as PracticeQuestionContentDocument;
      }
      return null;
    } catch (error) {
      console.error('Error fetching practice question:', error);
      throw error;
    }
  }

  /**
   * Get all active practice questions
   */
  async getAllPracticeQuestions(): Promise<PracticeQuestionContentDocument[]> {
    try {
      const q = query(
        collection(db, 'practiceQuestions'),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeQuestionContentDocument
      );
    } catch (error) {
      console.error('Error fetching all practice questions:', error);
      throw error;
    }
  }

  /**
   * Get practice questions by domain
   */
  async getPracticeQuestionsByDomain(
    domainId: string
  ): Promise<PracticeQuestionContentDocument[]> {
    try {
      const q = query(
        collection(db, 'practiceQuestions'),
        where('domainId', '==', domainId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeQuestionContentDocument
      );
    } catch (error) {
      console.error(
        `Error fetching practice questions for domain ${domainId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get practice questions by task
   */
  async getPracticeQuestionsByTask(
    taskId: string
  ): Promise<PracticeQuestionContentDocument[]> {
    try {
      const q = query(
        collection(db, 'practiceQuestions'),
        where('taskId', '==', taskId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeQuestionContentDocument
      );
    } catch (error) {
      console.error(
        `Error fetching practice questions for task ${taskId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get practice questions by domain and task
   */
  async getPracticeQuestionsByDomainAndTask(
    domainId: string,
    taskId: string
  ): Promise<PracticeQuestionContentDocument[]> {
    try {
      const q = query(
        collection(db, 'practiceQuestions'),
        where('domainId', '==', domainId),
        where('taskId', '==', taskId),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeQuestionContentDocument
      );
    } catch (error) {
      console.error(
        `Error fetching practice questions for domain ${domainId} and task ${taskId}:`,
        error
      );
      throw error;
    }
  }

  // ============================================================================
  // PRACTICE SESSION OPERATIONS
  // ============================================================================

  /**
   * Create a new practice session
   */
  async createPracticeSession(
    scope: {
      type: 'all' | 'domain' | 'task';
      domainId?: string;
      taskId?: string;
    },
    questionIds: string[]
  ): Promise<PracticeSessionDocument> {
    const userId = await this.getUserId();
    const sessionId = doc(collection(db, 'practiceSessions')).id;
    const now = new Date();

    const session: PracticeSessionDocument = {
      id: sessionId,
      userId,
      startedAt: now,
      durationSeconds: 0,
      scope,
      questionsPresented: questionIds.length,
      questionsAnswered: 0,
      questionsSkipped: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      successRate: 0,
      questionIds,
      platform: 'web',
      createdAt: now,
    };

    try {
      const sessionRef = doc(db, 'practiceSessions', sessionId);
      await setDoc(sessionRef, {
        ...session,
        startedAt: Timestamp.fromDate(session.startedAt),
        createdAt: Timestamp.fromDate(session.createdAt),
      });
      return session;
    } catch (error) {
      console.error('Error creating practice session:', error);
      throw error;
    }
  }

  /**
   * Get a practice session by ID
   */
  async getPracticeSession(
    sessionId: string
  ): Promise<PracticeSessionDocument | null> {
    try {
      const docRef = doc(db, 'practiceSessions', sessionId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        return docSnap.data() as PracticeSessionDocument;
      }
      return null;
    } catch (error) {
      console.error('Error fetching practice session:', error);
      throw error;
    }
  }

  /**
   * Get all practice sessions for the current user
   */
  async getUserPracticeSessions(): Promise<PracticeSessionDocument[]> {
    const userId = await this.getUserId();

    try {
      const q = query(
        collection(db, 'practiceSessions'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeSessionDocument
      );
    } catch (error) {
      console.error('Error fetching user practice sessions:', error);
      throw error;
    }
  }

  /**
   * Get practice sessions for a specific domain
   */
  async getPracticeSessionsByDomain(
    domainId: string
  ): Promise<PracticeSessionDocument[]> {
    const userId = await this.getUserId();

    try {
      const q = query(
        collection(db, 'practiceSessions'),
        where('userId', '==', userId),
        where('scope.domainId', '==', domainId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeSessionDocument
      );
    } catch (error) {
      console.error(
        `Error fetching practice sessions for domain ${domainId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * End a practice session and update final metrics
   */
  async endPracticeSession(
    sessionId: string,
    durationSeconds: number
  ): Promise<void> {
    try {
      const sessionRef = doc(db, 'practiceSessions', sessionId);
      const endTime = new Date();

      const successRate =
        durationSeconds > 0
          ? Math.round(
              ((this.calculateSessionScore() || 0) /
                durationSeconds) *
                100
            ) / 100
          : 0;

      await updateDoc(sessionRef, {
        endedAt: Timestamp.fromDate(endTime),
        durationSeconds,
        successRate,
      });
    } catch (error) {
      console.error('Error ending practice session:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRACTICE ATTEMPT OPERATIONS
  // ============================================================================

  /**
   * Record a user's attempt on a practice question
   */
  async recordPracticeAttempt(
    sessionId: string,
    contentId: string,
    selectedChoice: 'A' | 'B' | 'C' | 'D',
    isCorrect: boolean,
    timeSpent: number,
    skipped: boolean = false
  ): Promise<PracticeAttemptDocument> {
    const userId = await this.getUserId();

    try {
      // Get the question content to extract domain and task info
      const question = await this.getPracticeQuestion(contentId);
      if (!question) {
        throw new Error(`Practice question not found: ${contentId}`);
      }

      // Get existing attempts for this question in this session to calculate attempt number
      const existingAttempts = await getDocs(
        query(
          collection(db, 'practiceAttempts'),
          where('sessionId', '==', sessionId),
          where('contentId', '==', contentId)
        )
      );

      const attemptNumber = existingAttempts.size + 1;
      const attemptId = doc(collection(db, 'practiceAttempts')).id;
      const now = new Date();

      const attempt: PracticeAttemptDocument = {
        id: attemptId,
        userId,
        contentId,
        domainId: question.domainId,
        taskId: question.taskId,
        sessionId,
        selectedChoice,
        isCorrect,
        timeSpent,
        attempt: attemptNumber,
        skipped,
        attemptedAt: now,
        createdAt: now,
      };

      const attemptRef = doc(db, 'practiceAttempts', attemptId);
      await setDoc(attemptRef, {
        ...attempt,
        attemptedAt: Timestamp.fromDate(attempt.attemptedAt),
        createdAt: Timestamp.fromDate(attempt.createdAt),
      });

      // Record in attempt history for analytics
      await this.recordPracticeAttemptHistory(
        userId,
        contentId,
        sessionId,
        question.domainId,
        question.taskId,
        selectedChoice,
        question.choices.find((c) => c.isCorrect)?.letter || 'A',
        isCorrect,
        timeSpent,
        attemptNumber,
        skipped
      );

      // Update session metrics
      await this.updateSessionMetrics(
        sessionId,
        isCorrect,
        skipped
      );

      return attempt;
    } catch (error) {
      console.error('Error recording practice attempt:', error);
      throw error;
    }
  }

  /**
   * Get all attempts for a session
   */
  async getSessionAttempts(
    sessionId: string
  ): Promise<PracticeAttemptDocument[]> {
    try {
      const q = query(
        collection(db, 'practiceAttempts'),
        where('sessionId', '==', sessionId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeAttemptDocument
      );
    } catch (error) {
      console.error('Error fetching session attempts:', error);
      throw error;
    }
  }

  /**
   * Get attempts for a specific question in a session
   */
  async getQuestionAttempts(
    sessionId: string,
    contentId: string
  ): Promise<PracticeAttemptDocument[]> {
    try {
      const q = query(
        collection(db, 'practiceAttempts'),
        where('sessionId', '==', sessionId),
        where('contentId', '==', contentId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeAttemptDocument
      );
    } catch (error) {
      console.error('Error fetching question attempts:', error);
      throw error;
    }
  }

  /**
   * Get all attempts for the current user
   */
  async getUserPracticeAttempts(): Promise<PracticeAttemptDocument[]> {
    const userId = await this.getUserId();

    try {
      const q = query(
        collection(db, 'practiceAttempts'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeAttemptDocument
      );
    } catch (error) {
      console.error('Error fetching user practice attempts:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRACTICE ATTEMPT HISTORY (Analytics)
  // ============================================================================

  /**
   * Record practice attempt history for analytics
   */
  private async recordPracticeAttemptHistory(
    userId: string,
    contentId: string,
    sessionId: string,
    domainId: string,
    taskId: string,
    selectedChoice: 'A' | 'B' | 'C' | 'D',
    correctChoice: 'A' | 'B' | 'C' | 'D',
    isCorrect: boolean,
    timeSpent: number,
    attempt: number,
    skipped: boolean
  ): Promise<void> {
    try {
      const historyId = doc(collection(db, 'practiceAttemptHistory')).id;
      const now = new Date();

      const history: PracticeAttemptHistoryDocument = {
        id: historyId,
        userId,
        contentId,
        sessionId,
        domainId,
        taskId,
        selectedChoice,
        correctChoice,
        isCorrect,
        timeSpent,
        attempt,
        skipped,
        attemptedAt: now,
        createdAt: now,
      };

      const historyRef = doc(db, 'practiceAttemptHistory', historyId);
      await setDoc(historyRef, {
        ...history,
        attemptedAt: Timestamp.fromDate(history.attemptedAt),
        createdAt: Timestamp.fromDate(history.createdAt),
      });
    } catch (error) {
      console.error('Error recording practice attempt history:', error);
      // Don't throw - this is analytics-only
    }
  }

  /**
   * Get practice attempt history for the current user
   */
  async getUserPracticeAttemptHistory(): Promise<PracticeAttemptHistoryDocument[]> {
    const userId = await this.getUserId();

    try {
      const q = query(
        collection(db, 'practiceAttemptHistory'),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(
        (doc) => doc.data() as PracticeAttemptHistoryDocument
      );
    } catch (error) {
      console.error('Error fetching user practice attempt history:', error);
      throw error;
    }
  }

  /**
   * Get practice statistics for a specific question
   */
  async getQuestionStatistics(contentId: string) {
    try {
      const q = query(
        collection(db, 'practiceAttemptHistory'),
        where('contentId', '==', contentId)
      );
      const querySnapshot = await getDocs(q);
      const attempts = querySnapshot.docs.map(
        (doc) => doc.data() as PracticeAttemptHistoryDocument
      );

      const totalAttempts = attempts.length;
      const correctAttempts = attempts.filter((a) => a.isCorrect).length;
      const successRate =
        totalAttempts > 0 ? correctAttempts / totalAttempts : 0;

      return {
        totalAttempts,
        correctAttempts,
        successRate,
      };
    } catch (error) {
      console.error('Error fetching question statistics:', error);
      throw error;
    }
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Update session metrics when a question is answered
   */
  private async updateSessionMetrics(
    sessionId: string,
    isCorrect: boolean,
    skipped: boolean
  ): Promise<void> {
    try {
      const sessionRef = doc(db, 'practiceSessions', sessionId);

      // Fetch current session to get existing metrics
      const session = await this.getPracticeSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      const updates: any = {
        questionsAnswered: skipped
          ? session.questionsAnswered
          : session.questionsAnswered + 1,
        questionsSkipped: skipped
          ? session.questionsSkipped + 1
          : session.questionsSkipped,
        correctAnswers: isCorrect && !skipped
          ? session.correctAnswers + 1
          : session.correctAnswers,
        incorrectAnswers:
          !isCorrect && !skipped
            ? session.incorrectAnswers + 1
            : session.incorrectAnswers,
      };

      // Calculate success rate
      if (updates.questionsAnswered > 0) {
        updates.successRate = updates.correctAnswers / updates.questionsAnswered;
      }

      await updateDoc(sessionRef, updates);
    } catch (error) {
      console.error('Error updating session metrics:', error);
      // Don't throw - continue with the flow
    }
  }

  /**
   * Calculate session score (helper method)
   */
  private calculateSessionScore(): number {
    // This would be implemented based on session data
    // For now, return a placeholder
    return 0;
  }
}

// Singleton instance
let serviceInstance: PracticeService | null = null;

export function getPracticeService(): PracticeService {
  if (!serviceInstance) {
    serviceInstance = new PracticeService();
  }
  return serviceInstance;
}
