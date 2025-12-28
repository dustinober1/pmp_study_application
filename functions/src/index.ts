import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FSRS, Rating, FSRSCard} from "./fsrs";
import {errorTracker} from "./errorTracking";

admin.initializeApp();

const db = admin.firestore();
const fsrs = new FSRS();

/**
 * Calculate next review schedule for a flashcard based on user rating
 *
 * Triggered when a user reviews a flashcard
 */
export const calculateNextReview = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to calculate reviews"
    );
  }

  const {flashcardId, rating} = data;

  // Validate input
  if (!flashcardId || !rating) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "flashcardId and rating are required"
    );
  }

  if (![Rating.Again, Rating.Hard, Rating.Good, Rating.Easy].includes(rating)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid rating value"
    );
  }

  try {
    const userId = context.auth.uid;
    const flashcardRef = db.collection("flashcards").doc(flashcardId);
    const flashcardDoc = await flashcardRef.get();

    if (!flashcardDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Flashcard not found"
      );
    }

    const flashcardData = flashcardDoc.data();

    // Verify ownership
    if (flashcardData?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to update this flashcard"
      );
    }

    // Get current card state or initialize new card
    const currentCard: FSRSCard = flashcardData.fsrsData || fsrs.initCard();

    // Calculate next review schedule
    const now = new Date();
    const scheduleResults = fsrs.repeat(currentCard, now);
    const scheduleResult = scheduleResults[rating as Rating];
    const {card: nextCard, log: reviewLog} = scheduleResult;

    // Update flashcard with new FSRS data
    await flashcardRef.update({
      fsrsData: nextCard,
      nextReviewDate: admin.firestore.Timestamp.fromDate(nextCard.due),
      lastReviewedAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create review history entry
    await db.collection("reviewHistory").add({
      userId,
      flashcardId,
      rating,
      reviewedAt: admin.firestore.Timestamp.fromDate(now),
      scheduledDays: reviewLog.scheduledDays,
      elapsedDays: reviewLog.elapsedDays,
      state: reviewLog.state,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      nextReviewDate: nextCard.due.toISOString(),
      scheduledDays: nextCard.scheduledDays,
    };
  } catch (error) {
    console.error("Error calculating next review:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to calculate next review"
    );
  }
});

/**
 * Get due flashcards for a user
 *
 * Returns all flashcards that are due for review
 */
export const getDueFlashcards = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {limit = 20} = data;

  try {
    const now = admin.firestore.Timestamp.now();
    const flashcardsSnapshot = await db
      .collection("flashcards")
      .where("userId", "==", userId)
      .where("nextReviewDate", "<=", now)
      .orderBy("nextReviewDate", "asc")
      .limit(limit)
      .get();

    const flashcards = flashcardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      flashcards,
      count: flashcards.length,
    };
  } catch (error) {
    console.error("Error getting due flashcards:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get due flashcards"
    );
  }
});

/**
 * Initialize user profile when a new user signs up
 *
 * Triggered automatically when a new user account is created
 */
export const onUserCreate = functions.auth.user().onCreate(async (user) => {
  try {
    await db.collection("users").doc(user.uid).set({
      email: user.email,
      displayName: user.displayName || null,
      photoURL: user.photoURL || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Initialize user settings
    await db.collection("users").doc(user.uid).collection("settings").doc("preferences").set({
      dailyGoal: 20,
      notifications: true,
      theme: "light",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`User profile created for ${user.uid}`);
  } catch (error) {
    console.error("Error creating user profile:", error);
  }
});

/**
 * Clean up user data when a user account is deleted
 *
 * Triggered automatically when a user account is deleted
 */
export const onUserDelete = functions.auth.user().onDelete(async (user) => {
  try {
    const userId = user.uid;
    const batch = db.batch();

    // Delete user document
    batch.delete(db.collection("users").doc(userId));

    // Delete user flashcards
    const flashcardsSnapshot = await db
      .collection("flashcards")
      .where("userId", "==", userId)
      .get();
    flashcardsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete user study sessions
    const sessionsSnapshot = await db
      .collection("studySessions")
      .where("userId", "==", userId)
      .get();
    sessionsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    // Delete user review history
    const reviewsSnapshot = await db
      .collection("reviewHistory")
      .where("userId", "==", userId)
      .get();
    reviewsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));

    await batch.commit();

    console.log(`User data deleted for ${userId}`);
  } catch (error) {
    console.error("Error deleting user data:", error);
  }
});

/**
 * Create a new study session
 *
 * Initializes a study session with scope (all, domain, or task)
 * Returns session ID for tracking reviews
 */
export const createStudySession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {scope = {type: "all"}, platform = "web"} = data;

  // Validate scope
  if (!["all", "domain", "task"].includes(scope.type)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid scope type"
    );
  }

  try {
    const now = new Date();
    const sessionData = {
      userId,
      startedAt: admin.firestore.Timestamp.fromDate(now),
      endedAt: null,
      durationSeconds: 0,
      scope: scope,
      cardsReviewed: 0,
      ratings: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
      },
      platform,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const sessionRef = await db.collection("studySessions").add(sessionData);

    // Track successful study session creation
    await errorTracker.logEvent("study_session_created", {
      userId,
      data: {
        sessionId: sessionRef.id,
        platform,
        scopeType: scope.type,
      },
    });

    return {
      success: true,
      sessionId: sessionRef.id,
      startedAt: now.toISOString(),
    };
  } catch (error) {
    console.error("Error creating study session:", error);
    await errorTracker.logError(error, {
      userId,
      functionName: "createStudySession",
      action: "create_session",
      severity: "high",
    });
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create study session"
    );
  }
});

/**
 * Fetch new cards up to the user's daily limit
 *
 * Returns NEW state cards that haven't been reviewed yet
 * Respects the user's daily goal for new cards
 */
export const fetchNewCards = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {limit = 20, scope = {type: "all"}} = data;

  try {
    let query: FirebaseFirestore.Query = db
      .collection("flashcards")
      .where("userId", "==", userId)
      .where("isSuspended", "==", false);

    // Apply scope filter if specified
    if (scope.type === "domain" && scope.domainId) {
      query = query.where("domainId", "==", scope.domainId);
    } else if (scope.type === "task" && scope.taskId) {
      query = query.where("taskId", "==", scope.taskId);
    }

    // Filter for NEW state cards (fsrs.state = 0)
    // Note: This requires client-side filtering or a dedicated index for state = NEW
    // For now, we fetch all new cards and filter them
    const newCardsSnapshot = await query
      .orderBy("createdAt", "asc")
      .limit(limit * 2) // Fetch extra to filter on client side
      .get();

    const newCards = newCardsSnapshot.docs
      .filter((doc) => {
        const fsrsData = doc.data().fsrsData;
        return fsrsData?.state === 0; // CardState.New
      })
      .slice(0, limit)
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

    return {
      success: true,
      cards: newCards,
      count: newCards.length,
    };
  } catch (error) {
    console.error("Error fetching new cards:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to fetch new cards"
    );
  }
});

/**
 * Get cards ready for review by state and scope
 *
 * Returns cards filtered by:
 * - User
 * - Card state (Learning, Review, Relearning)
 * - Scope (all, domain, task)
 * - Due date
 */
export const getCardsForReview = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {limit = 50, scope = {type: "all"}, state = null} = data;

  try {
    const now = admin.firestore.Timestamp.now();
    let query: FirebaseFirestore.Query = db
      .collection("flashcards")
      .where("userId", "==", userId)
      .where("isSuspended", "==", false)
      .where("fsrs.due", "<=", now);

    // Apply scope filter
    if (scope.type === "domain" && scope.domainId) {
      query = query.where("domainId", "==", scope.domainId);
    } else if (scope.type === "task" && scope.taskId) {
      query = query.where("taskId", "==", scope.taskId);
    }

    const cardsSnapshot = await query
      .orderBy("fsrs.due", "asc")
      .limit(limit)
      .get();

    let cards = cardsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by state if specified (1=Learning, 2=Review, 3=Relearning)
    if (state !== null) {
      cards = cards.filter((card) => {
        const cardData = card as any;
        return cardData.fsrsData?.state === state;
      });
    }

    return {
      success: true,
      cards,
      count: cards.length,
    };
  } catch (error) {
    console.error("Error getting cards for review:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get cards for review"
    );
  }
});

/**
 * Update study session metrics after a card review
 *
 * Tracks:
 * - Rating counts (again, hard, good, easy)
 * - Total cards reviewed
 * - Duration
 * - Individual review records
 */
export const updateStudySessionMetrics = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {sessionId, flashcardId, rating, elapsedMs = 0} = data;

  // Validate input
  if (!sessionId || !flashcardId || ![1, 2, 3, 4].includes(rating)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId, flashcardId, and valid rating are required"
    );
  }

  try {
    const sessionRef = db.collection("studySessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Study session not found"
      );
    }

    // Verify ownership
    if (sessionDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to update this session"
      );
    }

    const ratingMap = {
      1: "again",
      2: "hard",
      3: "good",
      4: "easy",
    };

    const ratingKey = ratingMap[rating as keyof typeof ratingMap];

    // Update session with new review
    await sessionRef.update({
      cardsReviewed: admin.firestore.FieldValue.increment(1),
      [`ratings.${ratingKey}`]: admin.firestore.FieldValue.increment(1),
      durationSeconds: admin.firestore.FieldValue.increment(Math.round(elapsedMs / 1000)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      message: "Session metrics updated",
    };
  } catch (error) {
    console.error("Error updating study session metrics:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to update session metrics"
    );
  }
});

/**
 * End a study session and calculate final statistics
 *
 * Finalizes the session and records final metrics
 */
export const endStudySession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {sessionId} = data;

  if (!sessionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId is required"
    );
  }

  try {
    const sessionRef = db.collection("studySessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Study session not found"
      );
    }

    // Verify ownership
    if (sessionDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to end this session"
      );
    }

    const now = new Date();
    await sessionRef.update({
      endedAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedSession = await sessionRef.get();
    const sessionData = updatedSession.data();

    // Track successful study session completion
    await errorTracker.logEvent("study_session_ended", {
      userId,
      data: {
        sessionId,
        cardsReviewed: sessionData?.cardsReviewed || 0,
        durationSeconds: sessionData?.durationSeconds || 0,
        ratings: sessionData?.ratings,
      },
    });

    return {
      success: true,
      session: {
        id: sessionId,
        ...sessionData,
      },
    };
  } catch (error) {
    console.error("Error ending study session:", error);
    await errorTracker.logError(error, {
      userId,
      functionName: "endStudySession",
      action: "end_session",
      severity: "high",
      additionalData: {
        sessionId,
      },
    });
    throw new functions.https.HttpsError(
      "internal",
      "Failed to end study session"
    );
  }
});

/**
 * Get study session statistics and details
 *
 * Retrieves detailed information about a study session including:
 * - Session metadata (start/end times, duration)
 * - Rating distribution
 * - Cards reviewed
 * - Recent reviews
 */
export const getSessionStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {sessionId} = data;

  if (!sessionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId is required"
    );
  }

  try {
    // Get session document
    const sessionRef = db.collection("studySessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Study session not found"
      );
    }

    const sessionData = sessionDoc.data();

    // Verify ownership
    if (sessionData?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to view this session"
      );
    }

    // Get reviews in this session
    const reviewsSnapshot = await db
      .collection("reviewHistory")
      .where("userId", "==", userId)
      .where("sessionId", "==", sessionId)
      .orderBy("reviewedAt", "desc")
      .get();

    const reviews = reviewsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate statistics
    const totalCards = reviews.length;
    const ratingCounts = {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
    };

    reviews.forEach((review) => {
      const ratingMap = {
        1: "again",
        2: "hard",
        3: "good",
        4: "easy",
      };
      const reviewData = review as any;
      const ratingKey = ratingMap[reviewData.rating as keyof typeof ratingMap];
      if (ratingKey) {
        ratingCounts[ratingKey as keyof typeof ratingCounts]++;
      }
    });

    return {
      success: true,
      session: sessionData,
      stats: {
        totalCardsReviewed: totalCards,
        ratingCounts,
        successRate: totalCards > 0
          ? ((ratingCounts.good + ratingCounts.easy) / totalCards * 100).toFixed(1)
          : 0,
      },
      reviews: reviews.slice(0, 10), // Last 10 reviews
    };
  } catch (error) {
    console.error("Error getting session stats:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get session statistics"
    );
  }
});

/**
 * Complete review of a card during a study session
 *
 * This is the main function for handling card reviews. It:
 * 1. Validates the flashcard and study session
 * 2. Calculates next review schedule using FSRS
 * 3. Updates the flashcard with new FSRS data
 * 4. Records the review in review history
 * 5. Updates study session metrics
 * 6. Returns the next review information and card state
 */
export const reviewCardInSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {sessionId, flashcardId, rating, elapsedMs = 0} = data;

  // Validate input
  if (!sessionId || !flashcardId || ![1, 2, 3, 4].includes(rating)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId, flashcardId, and valid rating (1-4) are required"
    );
  }

  try {
    const batch = db.batch();

    // Verify study session exists and belongs to user
    const sessionRef = db.collection("studySessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Study session not found"
      );
    }

    if (sessionDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to use this session"
      );
    }

    // Get flashcard and verify ownership
    const flashcardRef = db.collection("flashcards").doc(flashcardId);
    const flashcardDoc = await flashcardRef.get();

    if (!flashcardDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Flashcard not found"
      );
    }

    const flashcardData = flashcardDoc.data();

    if (flashcardData?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to update this flashcard"
      );
    }

    // Calculate next review schedule using FSRS
    const currentCard: FSRSCard = flashcardData.fsrsData || fsrs.initCard();
    const now = new Date();
    const scheduleResults = fsrs.repeat(currentCard, now);
    const scheduleResult = scheduleResults[rating as Rating];
    const {card: nextCard, log: reviewLog} = scheduleResult;

    // Get the number of milliseconds per card review (for time tracking)
    const cardElapsedSeconds = Math.round(elapsedMs / 1000);

    // Update flashcard with new FSRS data
    batch.update(flashcardRef, {
      fsrsData: {
        due: admin.firestore.Timestamp.fromDate(nextCard.due),
        stability: nextCard.stability,
        difficulty: nextCard.difficulty,
        elapsedDays: nextCard.elapsedDays,
        scheduledDays: nextCard.scheduledDays,
        reps: nextCard.reps,
        lapses: nextCard.lapses,
        state: nextCard.state,
        lastReview: admin.firestore.Timestamp.fromDate(nextCard.lastReview || now),
      },
      lastReviewedAt: admin.firestore.Timestamp.fromDate(now),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Create review history entry
    batch.set(db.collection("reviewHistory").doc(), {
      userId,
      sessionId,
      flashcardId,
      domainId: flashcardData.domainId,
      taskId: flashcardData.taskId,
      rating,
      reviewedAt: admin.firestore.Timestamp.fromDate(now),
      scheduledDays: reviewLog.scheduledDays,
      elapsedDays: reviewLog.elapsedDays,
      state: reviewLog.state,
      nextState: nextCard.state,
      newDifficulty: nextCard.difficulty,
      newStability: nextCard.stability,
      nextReviewDate: admin.firestore.Timestamp.fromDate(nextCard.due),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update session metrics
    const ratingMap = {
      1: "again",
      2: "hard",
      3: "good",
      4: "easy",
    };
    const ratingKey = ratingMap[rating as keyof typeof ratingMap];

    batch.update(sessionRef, {
      cardsReviewed: admin.firestore.FieldValue.increment(1),
      [`ratings.${ratingKey}`]: admin.firestore.FieldValue.increment(1),
      durationSeconds: admin.firestore.FieldValue.increment(cardElapsedSeconds),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Commit all changes
    await batch.commit();

    // Track successful card review
    await errorTracker.logEvent("card_reviewed", {
      userId,
      data: {
        sessionId,
        flashcardId,
        rating,
        elapsedMs,
        domainId: flashcardData.domainId,
        taskId: flashcardData.taskId,
      },
    });

    return {
      success: true,
      review: {
        rating,
        ratingName: ratingKey,
        nextReviewDate: nextCard.due.toISOString(),
        scheduledDays: nextCard.scheduledDays,
        cardState: nextCard.state,
        cardDifficulty: nextCard.difficulty,
        cardStability: nextCard.stability,
      },
    };
  } catch (error) {
    console.error("Error reviewing card in session:", error);
    await errorTracker.logError(error, {
      userId,
      functionName: "reviewCardInSession",
      action: "review_card",
      severity: "high",
      additionalData: {
        sessionId,
        flashcardId,
        rating,
      },
    });
    throw new functions.https.HttpsError(
      "internal",
      "Failed to record card review"
    );
  }
});

// ============================================================================
// PRACTICE SESSION FUNCTIONS
// ============================================================================

/**
 * Create a new practice session
 *
 * Initializes a practice test session with scope (all, domain, or task)
 * Returns session ID for tracking question attempts
 */
export const createPracticeSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {scope = {type: "all"}, platform = "web"} = data;

  // Validate scope
  if (!["all", "domain", "task"].includes(scope.type)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid scope type"
    );
  }

  try {
    const now = new Date();
    const sessionData = {
      userId,
      startedAt: admin.firestore.Timestamp.fromDate(now),
      endedAt: null,
      durationSeconds: 0,
      scope: scope,
      questionsPresented: 0,
      questionsAnswered: 0,
      questionsSkipped: 0,
      correctAnswers: 0,
      incorrectAnswers: 0,
      successRate: 0,
      questionIds: [],
      platform,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    const sessionRef = await db.collection("practiceSessions").add(sessionData);

    return {
      success: true,
      sessionId: sessionRef.id,
      startedAt: now.toISOString(),
    };
  } catch (error) {
    console.error("Error creating practice session:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to create practice session"
    );
  }
});

/**
 * Get questions for practice session
 *
 * Returns practice questions filtered by:
 * - User scope (all, domain, task)
 * - Active questions only
 * - Randomized order
 */
export const getQuestionsForPractice = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const {limit = 10, scope = {type: "all"}} = data;

  // Validate limit
  if (limit < 1 || limit > 100) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Limit must be between 1 and 100"
    );
  }

  // Validate scope
  if (!["all", "domain", "task"].includes(scope.type)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid scope type"
    );
  }

  try {
    let query: FirebaseFirestore.Query = db
      .collection("practiceQuestions")
      .where("isActive", "==", true);

    // Apply scope filter
    if (scope.type === "domain" && scope.domainId) {
      query = query.where("domainId", "==", scope.domainId);
    } else if (scope.type === "task" && scope.taskId) {
      query = query.where("taskId", "==", scope.taskId);
    }

    // Fetch extra questions to randomize
    const questionsSnapshot = await query
      .limit(limit * 3)
      .get();

    const questions = questionsSnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort(() => Math.random() - 0.5)
      .slice(0, limit)
      .map((question: any) => ({
        id: question.id,
        question: question.question,
        choices: question.choices,
        difficulty: question.difficulty,
        domainId: question.domainId,
        taskId: question.taskId,
        // Note: explanation is NOT returned here for immediate remediation
      }));

    return {
      success: true,
      questions,
      count: questions.length,
    };
  } catch (error) {
    console.error("Error getting questions for practice:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get practice questions"
    );
  }
});

/**
 * Submit a practice answer
 *
 * Records a user's answer to a practice question and returns:
 * - Whether the answer was correct
 * - The correct answer
 * - Detailed explanation (remediation)
 */
export const submitPracticeAnswer = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {sessionId, contentId, selectedChoice, elapsedMs = 0, skipped = false} = data;

  // Validate input
  if (!sessionId || !contentId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId and contentId are required"
    );
  }

  if (!skipped && !["A", "B", "C", "D"].includes(selectedChoice)) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "selectedChoice must be A, B, C, or D (unless skipped)"
    );
  }

  try {
    const batch = db.batch();
    const now = new Date();

    // Verify practice session exists and belongs to user
    const sessionRef = db.collection("practiceSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Practice session not found"
      );
    }

    if (sessionDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to use this session"
      );
    }

    // Get question content
    const questionRef = db.collection("practiceQuestions").doc(contentId);
    const questionDoc = await questionRef.get();

    if (!questionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Question not found"
      );
    }

    const questionData = questionDoc.data();
    const correctAnswer = questionData?.choices.find((choice: any) => choice.isCorrect)?.letter;
    const isCorrect = !skipped && selectedChoice === correctAnswer;

    const elapsedSeconds = Math.round(elapsedMs / 1000);

    // Create practice attempt record
    batch.set(db.collection("practiceAttemptHistory").doc(), {
      userId,
      contentId,
      sessionId,
      domainId: questionData?.domainId,
      taskId: questionData?.taskId,
      selectedChoice: skipped ? null : selectedChoice,
      correctChoice: correctAnswer,
      isCorrect,
      timeSpent: elapsedSeconds,
      attempt: 1,
      skipped,
      attemptedAt: admin.firestore.Timestamp.fromDate(now),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update session metrics
    batch.update(sessionRef, {
      questionsAnswered: admin.firestore.FieldValue.increment(skipped ? 0 : 1),
      questionsSkipped: admin.firestore.FieldValue.increment(skipped ? 1 : 0),
      correctAnswers: admin.firestore.FieldValue.increment(isCorrect ? 1 : 0),
      incorrectAnswers: admin.firestore.FieldValue.increment(!isCorrect && !skipped ? 1 : 0),
      durationSeconds: admin.firestore.FieldValue.increment(elapsedSeconds),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Update question content stats
    batch.update(questionRef, {
      "stats.totalAttempts": admin.firestore.FieldValue.increment(1),
      "stats.correctAttempts": admin.firestore.FieldValue.increment(isCorrect ? 1 : 0),
    });

    await batch.commit();

    // Return question content with explanation (remediation)
    return {
      success: true,
      isCorrect,
      correctAnswer,
      explanation: questionData?.explanation || "",
      references: questionData?.references || [],
      timeSpent: elapsedSeconds,
    };
  } catch (error) {
    console.error("Error submitting practice answer:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to submit practice answer"
    );
  }
});

/**
 * End a practice session
 *
 * Finalizes the session and records final metrics including success rate
 */
export const endPracticeSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {sessionId} = data;

  if (!sessionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId is required"
    );
  }

  try {
    const sessionRef = db.collection("practiceSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Practice session not found"
      );
    }

    // Verify ownership
    if (sessionDoc.data()?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to end this session"
      );
    }

    const sessionData = sessionDoc.data();
    const questionsAnswered = sessionData?.questionsAnswered || 0;
    const correctAnswers = sessionData?.correctAnswers || 0;
    const successRate = questionsAnswered > 0 ? correctAnswers / questionsAnswered : 0;

    const now = new Date();
    await sessionRef.update({
      endedAt: admin.firestore.Timestamp.fromDate(now),
      successRate: successRate,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedSession = await sessionRef.get();
    const updatedData = updatedSession.data();

    return {
      success: true,
      session: {
        id: sessionId,
        ...updatedData,
      },
      stats: {
        questionsPresented: updatedData?.questionsPresented || 0,
        questionsAnswered: updatedData?.questionsAnswered || 0,
        questionsSkipped: updatedData?.questionsSkipped || 0,
        correctAnswers: updatedData?.correctAnswers || 0,
        incorrectAnswers: updatedData?.incorrectAnswers || 0,
        successRate: (successRate * 100).toFixed(1),
      },
    };
  } catch (error) {
    console.error("Error ending practice session:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to end practice session"
    );
  }
});

/**
 * Get practice session statistics
 *
 * Retrieves detailed information about a practice session including:
 * - Session metadata (start/end times, duration)
 * - Performance metrics (success rate, correct/incorrect counts)
 * - Individual attempt records
 */
export const getPracticeStats = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const userId = context.auth.uid;
  const {sessionId} = data;

  if (!sessionId) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "sessionId is required"
    );
  }

  try {
    // Get session document
    const sessionRef = db.collection("practiceSessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Practice session not found"
      );
    }

    const sessionData = sessionDoc.data();

    // Verify ownership
    if (sessionData?.userId !== userId) {
      throw new functions.https.HttpsError(
        "permission-denied",
        "You do not have permission to view this session"
      );
    }

    // Get attempts in this session
    const attemptsSnapshot = await db
      .collection("practiceAttemptHistory")
      .where("userId", "==", userId)
      .where("sessionId", "==", sessionId)
      .orderBy("attemptedAt", "desc")
      .get();

    const attempts = attemptsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate statistics
    const totalAttempts = attempts.filter((a: any) => !a.skipped).length;
    const correctCount = attempts.filter((a: any) => a.isCorrect).length;
    const successRate = totalAttempts > 0 ? (correctCount / totalAttempts * 100).toFixed(1) : 0;

    // Group by domain
    const byDomain: Record<string, any> = {};
    attempts.forEach((attempt: any) => {
      const domain = attempt.domainId || "unknown";
      if (!byDomain[domain]) {
        byDomain[domain] = {
          correct: 0,
          total: 0,
          skipped: 0,
        };
      }
      if (attempt.skipped) {
        byDomain[domain].skipped++;
      } else {
        byDomain[domain].total++;
        if (attempt.isCorrect) {
          byDomain[domain].correct++;
        }
      }
    });

    return {
      success: true,
      session: {
        id: sessionId,
        startedAt: sessionData?.startedAt,
        endedAt: sessionData?.endedAt,
        durationSeconds: sessionData?.durationSeconds || 0,
        scope: sessionData?.scope,
      },
      stats: {
        totalAttempts,
        correctAnswers: correctCount,
        incorrectAnswers: totalAttempts - correctCount,
        skippedQuestions: attempts.filter((a: any) => a.skipped).length,
        successRate: successRate,
      },
      byDomain,
      attempts: attempts.slice(0, 50), // Last 50 attempts
    };
  } catch (error) {
    console.error("Error getting practice stats:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to get practice statistics"
    );
  }
});
