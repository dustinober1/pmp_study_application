/**
 * SuperMemo SM-2 Spaced Repetition Algorithm
 *
 * Based on the original algorithm by SuperMemo:
 * - Quality: 0-5 rating from user (5=perfect, 0=complete blackout)
 * - Ease Factor: Starts at 2.5, decreases with poor responses
 * - Interval: Days until next review
 */

export interface SM2Progress {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_review_date?: string;
  last_quality?: number;
}

export interface SM2ReviewResult {
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
}

/**
 * Calculate next review parameters using SuperMemo SM-2 algorithm
 *
 * Quality ratings:
 * - 5: Perfect response, no hesitation
 * - 4: Correct response after hesitation
 * - 3: Correct response recalled with serious difficulty
 * - 2: Incorrect response; where the correct one seemed easy to recall
 * - 1: Incorrect response; the correct one remembered
 * - 0: Complete blackout
 */
export function calculateSM2(
  quality: number,
  previousProgress?: Partial<SM2Progress>
): SM2ReviewResult {
  // Validate quality is in range 0-5
  if (quality < 0 || quality > 5) {
    throw new Error('Quality must be between 0 and 5');
  }

  const ease_factor = previousProgress?.ease_factor ?? 2.5;
  const interval = previousProgress?.interval ?? 0;
  const repetitions = previousProgress?.repetitions ?? 0;

  let newEaseFactor = ease_factor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    // Correct response - calculate next interval
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(newInterval * newEaseFactor);
    }
    newRepetitions += 1;
  } else {
    // Incorrect response - reset repetitions
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor based on response quality
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  newEaseFactor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));

  // Ease factor minimum is 1.3
  newEaseFactor = Math.max(1.3, newEaseFactor);

  // Calculate next review date
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + newInterval);

  return {
    ease_factor: Number(newEaseFactor.toFixed(2)),
    interval: newInterval,
    repetitions: newRepetitions,
    next_review_date: nextReviewDate.toISOString(),
  };
}

/**
 * Check if a flashcard is due for review
 */
export function isCardDue(nextReviewDate: string): boolean {
  return new Date(nextReviewDate) <= new Date();
}

/**
 * Get cards due for review from a list
 */
export function getDueCards(
  cards: Array<{ id: number; progress?: SM2Progress }>
): Array<{ id: number; progress?: SM2Progress }> {
  return cards.filter(
    (card) =>
      !card.progress?.next_review_date || isCardDue(card.progress.next_review_date)
  );
}

/**
 * Get the number of cards due for review
 */
export function getDueCardCount(
  cards: Array<{ id: number; progress?: SM2Progress }>
): number {
  return getDueCards(cards).length;
}

/**
 * Calculate the percentage of cards mastered
 * A card is considered mastered if ease_factor >= 2.5 and repetitions >= 3
 */
export function getMasteryPercentage(
  cards: Array<{ id: number; progress?: SM2Progress }>
): number {
  if (cards.length === 0) return 0;

  const mastered = cards.filter(
    (card) =>
      card.progress &&
      card.progress.ease_factor >= 2.5 &&
      card.progress.repetitions >= 3
  );

  return Math.round((mastered.length / cards.length) * 100);
}

/**
 * Get a human-readable description of the next review date
 */
export function getNextReviewDescription(nextReviewDate: string): string {
  const now = new Date();
  const reviewDate = new Date(nextReviewDate);
  const diffDays = Math.ceil((reviewDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'Due now';
  if (diffDays === 0) return 'Due today';
  if (diffDays === 1) return 'Due tomorrow';
  if (diffDays < 7) return `Due in ${diffDays} days`;
  if (diffDays < 30) return `Due in ${Math.round(diffDays / 7)} weeks`;
  return `Due in ${Math.round(diffDays / 30)} months`;
}

/**
 * Initialize a new card with default SM-2 values
 */
export function initializeCard(): SM2Progress {
  return {
    ease_factor: 2.5,
    interval: 0,
    repetitions: 0,
    next_review_date: new Date().toISOString(),
  };
}
