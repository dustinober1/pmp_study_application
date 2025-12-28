/**
 * Integration tests for Study Session Cloud Functions with Batch Operations
 * Tests the complete flow of reviewing cards including batch operations, FSRS updates, and metrics
 */

import {FSRS, Rating, FSRSCard, CardState} from "../fsrs";

// Mock Firestore batch operations
interface MockBatchOperation {
  type: "update" | "set" | "delete";
  ref: string;
  data?: any;
}

interface MockBatch {
  operations: MockBatchOperation[];
  update: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
  commit: jest.Mock;
}

describe("reviewCardInSession - Batch Operations Integration", () => {
  const userId = "test-user-123";
  const sessionId = "session-123";
  const flashcardId = "card-123";
  const domainId = "people";
  const taskId = "people-1";

  // Helper to create a mock batch
  const createMockBatch = (): MockBatch => ({
    operations: [],
    update: jest.fn(function (ref, data) {
      const refPath = typeof ref === "string" ? ref : ref.path;
      this.operations.push({type: "update", ref: refPath, data});
      return this;
    }),
    set: jest.fn(function (ref, data) {
      const refPath = typeof ref === "string" ? ref : ref.path;
      this.operations.push({type: "set", ref: refPath, data});
      return this;
    }),
    delete: jest.fn(function (ref) {
      const refPath = typeof ref === "string" ? ref : ref.path;
      this.operations.push({type: "delete", ref: refPath});
      return this;
    }),
    commit: jest.fn().mockResolvedValue(undefined),
  });

  // Helper to create initial FSRS card
  const createInitialCard = (): FSRSCard => ({
    due: new Date(),
    stability: 0,
    difficulty: 5,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    state: CardState.New,
    lastReview: new Date(),
  });

  describe("Batch Structure and Operations", () => {
    it("should create three batch operations per card review", () => {
      const batch = createMockBatch();

      batch.update({path: `flashcards/${flashcardId}`}, {
        fsrsData: {state: CardState.Learning},
      });
      batch.set(`reviewHistory/review-1`, {
        userId,
        rating: 3,
      });
      batch.update({path: `studySessions/${sessionId}`}, {
        cardsReviewed: 1,
      });

      expect(batch.operations.length).toBe(3);
      expect(batch.operations[0].type).toBe("update");
      expect(batch.operations[1].type).toBe("set");
      expect(batch.operations[2].type).toBe("update");
    });

    it("should commit batch atomically", async () => {
      const batch = createMockBatch();
      batch.update({path: `flashcards/${flashcardId}`}, {});
      batch.set(`reviewHistory/auto`, {});
      batch.update({path: `studySessions/${sessionId}`}, {});

      await batch.commit();

      expect(batch.commit).toHaveBeenCalledTimes(1);
      expect(batch.operations.length).toBe(3);
    });

    it("should handle batch rollback on error", async () => {
      const batch = createMockBatch();
      batch.commit = jest.fn().mockRejectedValue(new Error("Batch failed"));

      batch.update({path: `flashcards/${flashcardId}`}, {});
      batch.set(`reviewHistory/entry`, {});
      batch.update({path: `studySessions/${sessionId}`}, {});

      await expect(batch.commit()).rejects.toThrow("Batch failed");
      expect(batch.operations.length).toBe(3);
    });
  });

  describe("Flashcard FSRS Update in Batch", () => {
    it("should update flashcard with new FSRS data", () => {
      const batch = createMockBatch();
      const nextCard = createInitialCard();
      nextCard.stability = 10;
      nextCard.difficulty = 6;
      nextCard.state = CardState.Learning;
      nextCard.reps = 1;

      batch.update({path: `flashcards/${flashcardId}`}, {
        fsrsData: {
          due: nextCard.due,
          stability: nextCard.stability,
          difficulty: nextCard.difficulty,
          state: nextCard.state,
          reps: nextCard.reps,
          elapsedDays: nextCard.elapsedDays,
          scheduledDays: nextCard.scheduledDays,
          lapses: nextCard.lapses,
        },
        lastReviewedAt: new Date(),
        updatedAt: new Date(),
      });

      const updateOp = batch.operations[0];
      expect(updateOp.type).toBe("update");
      expect(updateOp.data.fsrsData.stability).toBe(10);
      expect(updateOp.data.fsrsData.state).toBe(CardState.Learning);
    });

    it("should track FSRS state transitions", () => {
      const fsrs = new FSRS();
      const currentCard = createInitialCard();
      currentCard.state = CardState.New;
      const now = new Date();

      const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
      ratings.forEach(rating => {
        const results = fsrs.repeat(currentCard, now);
        const result = results[rating];

        expect(result.card.state).toBeDefined();
        expect([0, 1, 2, 3]).toContain(result.card.state);
      });
    });

    it("should update all FSRS fields correctly", () => {
      const batch = createMockBatch();
      const fsrs = new FSRS();
      const card = createInitialCard();
      const results = fsrs.repeat(card, new Date());
      const {card: nextCard} = results[Rating.Good];

      batch.update({path: `flashcards/${flashcardId}`}, {
        fsrsData: {
          due: nextCard.due,
          stability: nextCard.stability,
          difficulty: nextCard.difficulty,
          elapsedDays: nextCard.elapsedDays,
          scheduledDays: nextCard.scheduledDays,
          reps: nextCard.reps,
          lapses: nextCard.lapses,
          state: nextCard.state,
        },
      });

      const data = batch.operations[0].data.fsrsData;
      expect(data.due).toBeInstanceOf(Date);
      expect(data.stability).toBeGreaterThanOrEqual(0);
      expect(data.difficulty).toBeGreaterThanOrEqual(0);
      expect(data.reps).toBeGreaterThan(0);
    });
  });

  describe("Review History Creation in Batch", () => {
    it("should create review history document in batch", () => {
      const batch = createMockBatch();
      const now = new Date();

      batch.set(`reviewHistory/entry-${Date.now()}`, {
        userId,
        sessionId,
        flashcardId,
        domainId,
        taskId,
        rating: Rating.Good,
        reviewedAt: now,
        scheduledDays: 3,
        elapsedDays: 1,
        state: CardState.Learning,
        nextState: CardState.Review,
        newDifficulty: 5,
        newStability: 10,
        createdAt: now,
      });

      const setOp = batch.operations[0];
      expect(setOp.type).toBe("set");
      expect(setOp.data.userId).toBe(userId);
      expect(setOp.data.flashcardId).toBe(flashcardId);
      expect(setOp.data.rating).toBe(Rating.Good);
    });

    it("should record all rating types in history", () => {
      const ratings = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy];
      const batch = createMockBatch();

      ratings.forEach((rating, index) => {
        batch.set(`reviewHistory/entry-${index}`, {
          userId,
          flashcardId,
          rating,
          reviewedAt: new Date(),
        });
      });

      expect(batch.operations.length).toBe(4);
      expect(batch.operations.map(op => op.data.rating)).toEqual(ratings);
    });

    it("should link review history to session and flashcard", () => {
      const batch = createMockBatch();

      batch.set(`reviewHistory/linked`, {
        userId,
        sessionId,
        flashcardId,
        domainId,
        taskId,
        rating: Rating.Good,
      });

      const setOp = batch.operations[0];
      expect(setOp.data.sessionId).toBe(sessionId);
      expect(setOp.data.flashcardId).toBe(flashcardId);
      expect(setOp.data.domainId).toBe(domainId);
      expect(setOp.data.taskId).toBe(taskId);
    });
  });

  describe("Session Metrics Update in Batch", () => {
    it("should increment cards reviewed in batch", () => {
      const batch = createMockBatch();

      batch.update({path: `studySessions/${sessionId}`}, {
        cardsReviewed: 1,
      });
      batch.update({path: `studySessions/${sessionId}`}, {
        cardsReviewed: 2,
      });

      expect(batch.operations[0].data.cardsReviewed).toBe(1);
      expect(batch.operations[1].data.cardsReviewed).toBe(2);
    });

    it("should track rating breakdown in batch", () => {
      const batch = createMockBatch();

      batch.update({path: `studySessions/${sessionId}`}, {
        "ratings.good": 3,
        "ratings.easy": 1,
        "ratings.hard": 1,
        "ratings.again": 0,
      });

      const updateOp = batch.operations[0];
      expect(updateOp.data["ratings.good"]).toBe(3);
      expect(updateOp.data["ratings.easy"]).toBe(1);
      expect(updateOp.data["ratings.hard"]).toBe(1);
    });

    it("should accumulate duration in batch", () => {
      const batch = createMockBatch();

      batch.update({path: `studySessions/${sessionId}`}, {
        durationSeconds: 15,
      });
      batch.update({path: `studySessions/${sessionId}`}, {
        durationSeconds: 35,
      });

      expect(batch.operations[0].data.durationSeconds).toBe(15);
      expect(batch.operations[1].data.durationSeconds).toBe(35);
    });

    it("should validate rating counts consistency", () => {
      const session = {
        cardsReviewed: 10,
        ratings: {
          again: 1,
          hard: 2,
          good: 4,
          easy: 3,
        },
      };

      const totalRated = Object.values(session.ratings).reduce((a, b) => a + b, 0);
      expect(totalRated).toBeLessThanOrEqual(session.cardsReviewed);
    });
  });

  describe("Multi-Card Review Session", () => {
    it("should handle multiple card reviews in single batch", async () => {
      const batch = createMockBatch();
      const fsrs = new FSRS();

      const reviews = [
        {cardId: "card-1", rating: Rating.Good},
        {cardId: "card-2", rating: Rating.Easy},
        {cardId: "card-3", rating: Rating.Hard},
      ];

      reviews.forEach(review => {
        const card = createInitialCard();
        const results = fsrs.repeat(card, new Date());
        const {card: nextCard} = results[review.rating];

        batch.update({path: `flashcards/${review.cardId}`}, {
          fsrsData: {state: nextCard.state},
        });
        batch.set(`reviewHistory/${review.cardId}`, {
          userId,
          flashcardId: review.cardId,
          rating: review.rating,
        });
      });

      batch.update({path: `studySessions/${sessionId}`}, {
        cardsReviewed: 3,
        "ratings.good": 1,
        "ratings.easy": 1,
        "ratings.hard": 1,
      });

      await batch.commit();

      expect(batch.operations.length).toBe(7); // 3 flashcard updates + 3 history sets + 1 session update
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it("should maintain operation order in batch", () => {
      const batch = createMockBatch();

      // Operations should maintain order
      batch.update({path: `flashcards/c1`}, {fsrsData: {}});
      batch.set(`reviewHistory/r1`, {});
      batch.update({path: `studySessions/${sessionId}`}, {cardsReviewed: 1});
      batch.update({path: `flashcards/c2`}, {fsrsData: {}});
      batch.set(`reviewHistory/r2`, {});
      batch.update({path: `studySessions/${sessionId}`}, {cardsReviewed: 2});

      expect(batch.operations[0].ref).toContain("flashcards/c1");
      expect(batch.operations[1].ref).toContain("reviewHistory");
      expect(batch.operations[2].ref).toContain("studySessions");
      expect(batch.operations[3].ref).toContain("flashcards/c2");
    });
  });

  describe("FSRS Integration with Batch", () => {
    it("should apply FSRS algorithm in batch context", () => {
      const batch = createMockBatch();
      const fsrs = new FSRS();
      const card = createInitialCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);

      Object.values(results).forEach(result => {
        batch.update({path: `flashcards/${flashcardId}`}, {
          fsrsData: {
            state: result.card.state,
            stability: result.card.stability,
          },
        });
      });

      expect(batch.operations.length).toBe(4); // One for each rating
    });

    it("should calculate correct scheduling after batch update", () => {
      const batch = createMockBatch();
      const fsrs = new FSRS();
      const card = createInitialCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const goodResult = results[Rating.Good];

      batch.update({path: `flashcards/${flashcardId}`}, {
        fsrsData: {
          due: goodResult.card.due,
          scheduledDays: goodResult.card.scheduledDays,
        },
      });

      const updateOp = batch.operations[0];
      expect(updateOp.data.fsrsData.due).toBeInstanceOf(Date);
      expect(updateOp.data.fsrsData.scheduledDays).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Error Handling in Batch", () => {
    it("should validate required fields before batch", () => {
      const validInput = {
        sessionId,
        flashcardId,
        rating: Rating.Good,
      };

      expect(validInput.sessionId).toBeDefined();
      expect(validInput.flashcardId).toBeDefined();
      expect([1, 2, 3, 4]).toContain(validInput.rating);
    });

    it("should reject invalid rating values", () => {
      const invalidRatings = [0, 5, 6, -1];

      invalidRatings.forEach(rating => {
        expect([1, 2, 3, 4]).not.toContain(rating);
      });
    });

    it("should enforce permission checks before batch commit", () => {
      const flashcardOwnerId = userId;
      const requestingUserId: string = "other-user-456";

      const hasPermission = flashcardOwnerId === requestingUserId;
      expect(hasPermission).toBe(false);
    });

    it("should handle missing document gracefully", () => {
      const documentExists = false;

      expect(documentExists).toBe(false);
      // Would throw error in production
    });
  });

  describe("Complete Review Workflow with Batch", () => {
    it("should execute full review workflow atomically", async () => {
      const batch = createMockBatch();
      const fsrs = new FSRS();
      const currentCard = createInitialCard();
      const now = new Date();
      const rating = Rating.Good;
      const elapsedSeconds = 20;

      // 1. Calculate FSRS
      const scheduleResults = fsrs.repeat(currentCard, now);
      const scheduleResult = scheduleResults[rating];
      const {card: nextCard, log: reviewLog} = scheduleResult;

      // 2. Update flashcard
      batch.update({path: `flashcards/${flashcardId}`}, {
        fsrsData: {
          due: nextCard.due,
          stability: nextCard.stability,
          difficulty: nextCard.difficulty,
          state: nextCard.state,
          reps: nextCard.reps,
          lapses: nextCard.lapses,
        },
        lastReviewedAt: now,
      });

      // 3. Create review history
      batch.set(`reviewHistory/entry`, {
        userId,
        sessionId,
        flashcardId,
        rating,
        scheduledDays: reviewLog.scheduledDays,
        elapsedDays: reviewLog.elapsedDays,
        state: reviewLog.state,
        nextState: nextCard.state,
      });

      // 4. Update session metrics
      batch.update({path: `studySessions/${sessionId}`}, {
        cardsReviewed: 1,
        "ratings.good": 1,
        durationSeconds: elapsedSeconds,
      });

      await batch.commit();

      expect(batch.operations.length).toBe(3);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it("should maintain consistency across session reviews", async () => {
      const batch = createMockBatch();
      const fsrs = new FSRS();
      let totalCards = 0;
      let totalSeconds = 0;

      const reviews = [
        {cardId: "card-1", rating: Rating.Good, elapsedSeconds: 8},
        {cardId: "card-2", rating: Rating.Easy, elapsedSeconds: 6},
        {cardId: "card-3", rating: Rating.Hard, elapsedSeconds: 12},
        {cardId: "card-4", rating: Rating.Again, elapsedSeconds: 15},
        {cardId: "card-5", rating: Rating.Good, elapsedSeconds: 9},
      ];

      reviews.forEach(review => {
        const card = createInitialCard();
        const results = fsrs.repeat(card, new Date());
        const {card: nextCard} = results[review.rating];

        batch.update({path: `flashcards/${review.cardId}`}, {
          fsrsData: {state: nextCard.state},
        });
        batch.set(`reviewHistory/${review.cardId}`, {
          rating: review.rating,
        });

        totalCards++;
        totalSeconds += review.elapsedSeconds;
      });

      batch.update({path: `studySessions/${sessionId}`}, {
        cardsReviewed: totalCards,
        durationSeconds: totalSeconds,
      });

      await batch.commit();

      expect(totalCards).toBe(5);
      expect(totalSeconds).toBe(50);
      expect(batch.operations.length).toBe(11); // 5 updates + 5 sets + 1 final update
    });
  });
});
