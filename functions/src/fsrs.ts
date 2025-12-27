/**
 * FSRS (Free Spaced Repetition Scheduler) Implementation
 *
 * This is a complete implementation of the FSRS algorithm for spaced repetition.
 * Based on the FSRS-4.5 specification with comprehensive edge case handling.
 *
 * Features:
 * - Full FSRS algorithm implementation with 17 weight parameters
 * - Edge case handling for missed reviews and long delays
 * - Mean reversion for difficulty to prevent extreme values
 * - Retrieval prediction for optimal scheduling
 * - Support for personalized user parameters
 */

export enum Rating {
  Again = 1,  // Forgot/incorrect
  Hard = 2,   // Recalled with difficulty
  Good = 3,   // Recalled correctly
  Easy = 4,   // Recalled easily
}

export interface FSRSCard {
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  scheduledDays: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview?: Date;
}

export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

export interface FSRSReviewLog {
  rating: Rating;
  scheduledDays: number;
  elapsedDays: number;
  review: Date;
  state: CardState;
}

export interface FSRSParameters {
  requestRetention: number;
  maximumInterval: number;
  w: number[];
}

const DEFAULT_PARAMETERS: FSRSParameters = {
  requestRetention: 0.9,
  maximumInterval: 36500, // 100 years
  w: [
    0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05,
    0.34, 1.26, 0.29, 2.61,
  ],
};

export class FSRS {
  private p: FSRSParameters;

  constructor(parameters?: Partial<FSRSParameters>) {
    this.p = {...DEFAULT_PARAMETERS, ...parameters};
  }

  /**
   * Initialize a new card
   */
  initCard(): FSRSCard {
    return {
      due: new Date(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: CardState.New,
    };
  }

  /**
   * Get current retention probability for a card
   * Useful for understanding card difficulty
   */
  getRetention(card: FSRSCard, now: Date): number {
    if (card.stability === 0 || card.lastReview === undefined) {
      return 0;
    }
    const elapsedDays = this.dateDiff(card.lastReview, now);
    return Math.exp(Math.log(0.9) * elapsedDays / card.stability);
  }

  /**
   * Check if a card is overdue (missed review)
   */
  isOverdue(card: FSRSCard, now: Date): boolean {
    return now.getTime() >= card.due.getTime();
  }

  /**
   * Get days overdue for a card
   */
  getDaysOverdue(card: FSRSCard, now: Date): number {
    if (!this.isOverdue(card, now)) {
      return 0;
    }
    return this.dateDiff(card.due, now);
  }

  /**
   * Calculate next review schedule based on rating
   */
  repeat(card: FSRSCard, now: Date): Record<Rating, {
    card: FSRSCard;
    log: FSRSReviewLog;
  }> {
    const elapsedDays = card.lastReview ?
      Math.max(0, this.dateDiff(card.lastReview, now)) : 0;

    const result: any = {};

    for (const rating of [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy]) {
      const {nextCard, reviewLog} = this.scheduleCard(
        card,
        rating,
        now,
        elapsedDays
      );
      result[rating] = {card: nextCard, log: reviewLog};
    }

    return result;
  }

  private scheduleCard(
    card: FSRSCard,
    rating: Rating,
    now: Date,
    elapsedDays: number
  ): {nextCard: FSRSCard; reviewLog: FSRSReviewLog} {
    const nextCard = {...card};
    let nextState = card.state;

    if (card.state === CardState.New) {
      nextCard.difficulty = this.initDifficulty(rating);
      nextCard.stability = this.initStability(rating);
      nextState = CardState.Learning;
    } else {
      nextCard.difficulty = this.nextDifficulty(card.difficulty, rating);
      nextCard.stability = this.nextStability(
        card.difficulty,
        card.stability,
        rating,
        elapsedDays
      );
    }

    if (rating === Rating.Again) {
      nextCard.lapses += 1;
      nextState = CardState.Relearning;
    } else {
      nextState = CardState.Review;
    }

    const interval = this.nextInterval(nextCard.stability);
    nextCard.scheduledDays = interval;
    nextCard.due = this.addDays(now, interval);
    nextCard.reps += 1;
    nextCard.state = nextState;
    nextCard.lastReview = now;
    nextCard.elapsedDays = elapsedDays;

    const reviewLog: FSRSReviewLog = {
      rating,
      scheduledDays: interval,
      elapsedDays,
      review: now,
      state: card.state,
    };

    return {nextCard, reviewLog};
  }

  private initDifficulty(rating: Rating): number {
    return Math.min(
      Math.max(this.p.w[4] - this.p.w[5] * (rating - 3), 1),
      10
    );
  }

  private initStability(rating: Rating): number {
    return Math.max(this.p.w[rating - 1], 0.1);
  }

  private nextDifficulty(d: number, rating: Rating): number {
    const nextD = d - this.p.w[6] * (rating - 3);
    return this.meanReversion(this.p.w[4], nextD);
  }

  private meanReversion(init: number, current: number): number {
    return this.p.w[7] * init + (1 - this.p.w[7]) * current;
  }

  private nextStability(
    d: number,
    s: number,
    rating: Rating,
    elapsedDays: number
  ): number {
    const hardPenalty = rating === Rating.Hard ? this.p.w[15] : 1;
    const easyBonus = rating === Rating.Easy ? this.p.w[16] : 1;

    if (rating === Rating.Again) {
      return this.p.w[11] * Math.pow(d, -this.p.w[12]) *
        (Math.pow(s + 1, this.p.w[13]) - 1) * Math.exp(this.p.w[14] * (1 - 1));
    } else {
      // Handle edge case: prevent division by zero or negative values
      const safestability = Math.max(s, 0.1);
      const safeElapsedDays = Math.max(0, elapsedDays);

      // Calculate retrievability with bounds
      const retrievability = Math.exp(Math.log(0.9) * safeElapsedDays / safestability);

      const nextStability = safestability * (
        Math.exp(this.p.w[8]) *
        (11 - d) *
        Math.pow(safestability, -this.p.w[9]) *
        (Math.exp((1 - retrievability) * this.p.w[10]) - 1) *
        hardPenalty *
        easyBonus + 1
      );

      // Ensure stability stays within reasonable bounds
      return Math.max(Math.min(nextStability, this.p.maximumInterval), 0.1);
    }
  }

  private nextInterval(s: number): number {
    const newInterval = s / Math.log(this.p.requestRetention) * Math.log(0.9);
    return Math.min(
      Math.max(Math.round(newInterval), 1),
      this.p.maximumInterval
    );
  }

  private dateDiff(from: Date, to: Date): number {
    const diff = to.getTime() - from.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Handle missed reviews by adjusting card state appropriately
   * This prevents harsh penalties for legitimate misses
   */
  handleMissedReview(card: FSRSCard, now: Date): FSRSCard {
    const daysOverdue = this.getDaysOverdue(card, now);
    if (daysOverdue <= 0) {
      return card;
    }

    const adjustedCard = {...card};

    // For cards significantly overdue, reduce stability slightly
    // but don't immediately fail them
    if (daysOverdue > adjustedCard.scheduledDays * 2) {
      // Reduce stability by 10-20% for heavily missed reviews
      const reductionFactor = 0.85;
      adjustedCard.stability = adjustedCard.stability * reductionFactor;
    }

    // Update elapsed days to reflect actual time since last review
    if (adjustedCard.lastReview) {
      adjustedCard.elapsedDays = this.dateDiff(adjustedCard.lastReview, now);
    }

    return adjustedCard;
  }

  /**
   * Schedule a single card for a specific rating
   * Handles all edge cases including new cards and missed reviews
   */
  scheduleCardForRating(
    card: FSRSCard,
    rating: Rating,
    now: Date
  ): {card: FSRSCard; log: FSRSReviewLog} {
    // Handle missed reviews
    let processCard = this.handleMissedReview(card, now);

    const elapsedDays = processCard.lastReview ?
      Math.max(0, this.dateDiff(processCard.lastReview, now)) : 0;

    const {nextCard, reviewLog} = this.scheduleCard(processCard, rating, now, elapsedDays);
    return {card: nextCard, log: reviewLog};
  }

  /**
   * Get optimal next interval for a card based on current state
   * Takes into account difficulty and stability
   */
  getOptimalInterval(card: FSRSCard, rating: Rating): number {
    let nextStability = card.stability;

    if (card.state === CardState.New) {
      nextStability = this.initStability(rating);
    } else {
      // Use 0 elapsed days for prediction
      nextStability = this.nextStability(
        card.difficulty,
        card.stability,
        rating,
        0
      );
    }

    return this.nextInterval(nextStability);
  }
}
