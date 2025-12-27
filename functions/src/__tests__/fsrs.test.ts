/**
 * Unit tests for FSRS implementation
 * Tests core algorithm and edge case handling
 */

import {FSRS, CardState, Rating} from '../fsrs';

describe('FSRS Algorithm', () => {
  let fsrs: FSRS;

  beforeEach(() => {
    fsrs = new FSRS();
  });

  describe('Card Initialization', () => {
    it('should initialize a new card with correct default values', () => {
      const card = fsrs.initCard();

      expect(card.state).toBe(CardState.New);
      expect(card.stability).toBe(0);
      expect(card.difficulty).toBe(0);
      expect(card.reps).toBe(0);
      expect(card.lapses).toBe(0);
      expect(card.elapsedDays).toBe(0);
      expect(card.scheduledDays).toBe(0);
      expect(card.lastReview).toBeUndefined();
    });
  });

  describe('First Review', () => {
    it('should handle "Again" rating on first review', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const again = results[Rating.Again];

      expect(again.card.state).toBe(CardState.Relearning);
      expect(again.card.lapses).toBe(1);
      expect(again.card.reps).toBe(1);
      expect(again.card.lastReview).toEqual(now);
    });

    it('should handle "Good" rating on first review', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const good = results[Rating.Good];

      expect(good.card.state).toBe(CardState.Review);
      expect(good.card.reps).toBe(1);
      expect(good.card.stability).toBeGreaterThan(0);
      expect(good.card.scheduledDays).toBeGreaterThan(0);
    });

    it('should transition card to Learning state after first review', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);

      Object.values(results).forEach((result) => {
        if (result.card.lapses === 0) {
          // Non-Again ratings should be in Review state (after Learning)
          expect([CardState.Review, CardState.Relearning]).toContain(result.card.state);
        }
      });
    });
  });

  describe('Difficulty Progression', () => {
    it('should decrease difficulty when rated Easy', () => {
      const card = fsrs.initCard();
      const now = new Date();

      // First review with Good
      const results1 = fsrs.repeat(card, now);
      const card2 = results1[Rating.Good].card;

      // Second review with Easy
      const now2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const results2 = fsrs.repeat(card2, now2);
      const easyCard = results2[Rating.Easy].card;

      const hardCard = results2[Rating.Hard].card;

      // Easy should have lower difficulty than Hard
      expect(easyCard.difficulty).toBeLessThan(hardCard.difficulty);
    });

    it('should keep difficulty within valid range (1-10)', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);

      Object.values(results).forEach((result) => {
        expect(result.card.difficulty).toBeGreaterThanOrEqual(1);
        expect(result.card.difficulty).toBeLessThanOrEqual(10);
      });
    });
  });

  describe('Interval Scheduling', () => {
    it('should schedule longer intervals for easier cards', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const easyInterval = results[Rating.Easy].card.scheduledDays;
      const hardInterval = results[Rating.Hard].card.scheduledDays;
      const againInterval = results[Rating.Again].card.scheduledDays;

      expect(easyInterval).toBeGreaterThan(hardInterval);
      expect(hardInterval).toBeGreaterThanOrEqual(againInterval);
    });

    it('should cap intervals at maximum allowed', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);

      Object.values(results).forEach((result) => {
        expect(result.card.scheduledDays).toBeLessThanOrEqual(36500); // 100 years
      });
    });

    it('should have minimum interval of 1 day', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);

      Object.values(results).forEach((result) => {
        expect(result.card.scheduledDays).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Overdue Handling', () => {
    it('should detect overdue cards correctly', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const reviewedCard = results[Rating.Good].card;

      const onTimeDate = new Date(reviewedCard.due.getTime() - 24 * 60 * 60 * 1000);
      const overdueDate = new Date(reviewedCard.due.getTime() + 24 * 60 * 60 * 1000);

      expect(fsrs.isOverdue(reviewedCard, onTimeDate)).toBe(false);
      expect(fsrs.isOverdue(reviewedCard, overdueDate)).toBe(true);
    });

    it('should calculate days overdue correctly', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const reviewedCard = results[Rating.Good].card;

      const overdueDate = new Date(reviewedCard.due.getTime() + 5 * 24 * 60 * 60 * 1000);

      const daysOverdue = fsrs.getDaysOverdue(reviewedCard, overdueDate);
      expect(daysOverdue).toBe(5);
    });
  });

  describe('Retrieval and Retention', () => {
    it('should calculate retention probability', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const reviewedCard = results[Rating.Good].card;

      const retention = fsrs.getRetention(reviewedCard, now);

      // On day of review, retention should be at target (0.9)
      expect(retention).toBeGreaterThan(0.85);
      expect(retention).toBeLessThanOrEqual(1.0);
    });

    it('should decrease retention over time', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const reviewedCard = results[Rating.Good].card;

      const retentionNow = fsrs.getRetention(reviewedCard, now);

      const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const retentionFuture = fsrs.getRetention(reviewedCard, futureDate);

      expect(retentionFuture).toBeLessThan(retentionNow);
    });
  });

  describe('Edge Cases', () => {
    it('should handle lapses correctly', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      const againCard = results[Rating.Again].card;

      expect(againCard.lapses).toBe(1);
      expect(againCard.state).toBe(CardState.Relearning);
    });

    it('should increment reps on every review', () => {
      let card = fsrs.initCard();
      const now = new Date();

      const results1 = fsrs.repeat(card, now);
      card = results1[Rating.Good].card;
      expect(card.reps).toBe(1);

      const now2 = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      const results2 = fsrs.repeat(card, now2);
      card = results2[Rating.Good].card;
      expect(card.reps).toBe(2);
    });

    it('should handle missed reviews gracefully', () => {
      let card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);
      card = results[Rating.Good].card;

      // Simulate missed review - wait beyond due date
      const missedDate = new Date(card.due.getTime() + 30 * 24 * 60 * 60 * 1000);
      const handleResult = fsrs.scheduleCardForRating(card, Rating.Good, missedDate);

      // Card should still be processable
      expect(handleResult.card).toBeDefined();
      expect(handleResult.card.reps).toBeGreaterThan(card.reps);
    });

    it('should prevent negative or zero stability values', () => {
      const card = fsrs.initCard();
      const now = new Date();

      const results = fsrs.repeat(card, now);

      Object.values(results).forEach((result) => {
        expect(result.card.stability).toBeGreaterThan(0);
      });
    });
  });

  describe('Optimal Interval Calculation', () => {
    it('should calculate optimal intervals for different ratings', () => {
      const card = fsrs.initCard();

      const againInterval = fsrs.getOptimalInterval(card, Rating.Again);
      const hardInterval = fsrs.getOptimalInterval(card, Rating.Hard);
      const goodInterval = fsrs.getOptimalInterval(card, Rating.Good);
      const easyInterval = fsrs.getOptimalInterval(card, Rating.Easy);

      // Should follow a reasonable progression
      expect(againInterval).toBeLessThanOrEqual(hardInterval);
      expect(hardInterval).toBeLessThanOrEqual(goodInterval);
      expect(goodInterval).toBeLessThanOrEqual(easyInterval);
    });
  });

  describe('Multiple Reviews Sequence', () => {
    it('should handle a sequence of reviews correctly', () => {
      let card = fsrs.initCard();
      let now = new Date();

      // First review - Good
      let results = fsrs.repeat(card, now);
      card = results[Rating.Good].card;
      expect(card.reps).toBe(1);
      expect(card.state).toBe(CardState.Review);

      // Second review (after interval) - Easy
      now = new Date(card.due.getTime() + 24 * 60 * 60 * 1000);
      results = fsrs.repeat(card, now);
      card = results[Rating.Easy].card;
      expect(card.reps).toBe(2);

      // Third review (after interval) - Hard
      now = new Date(card.due.getTime() + 24 * 60 * 60 * 1000);
      results = fsrs.repeat(card, now);
      card = results[Rating.Hard].card;
      expect(card.reps).toBe(3);

      // All intervals should be positive and reasonable
      expect(card.scheduledDays).toBeGreaterThan(0);
    });
  });
});
