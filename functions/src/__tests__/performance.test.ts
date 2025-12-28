/**
 * Performance tests for large dataset scenarios
 * Tests app behavior with 1000+ flashcards and concurrent operations
 *
 * This test suite validates:
 * - FSRS algorithm performance with large card volumes
 * - Query efficiency with 1000+ cards
 * - Batch operation performance
 * - Memory usage patterns
 * - Session metrics calculation at scale
 * - Rating distribution analysis performance
 */

import { FSRS, Rating, CardState } from '../fsrs';

interface PerformanceMetrics {
  operationName: string;
  duration: number;
  memoryBefore: number;
  memoryAfter: number;
  memoryDelta: number;
  itemsProcessed: number;
  itemsPerSecond: number;
}

interface Card {
  id: string;
  userId: string;
  domainId: string;
  taskId: string;
  question: string;
  answer: string;
  fsrsData: any;
  createdAt: Date;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];

  measureOperation<T>(
    operationName: string,
    operation: () => T,
    itemsProcessed: number = 1
  ): T {
    const memoryBefore = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    const result = operation();

    const endTime = performance.now();
    const memoryAfter = process.memoryUsage().heapUsed;
    const duration = endTime - startTime;
    const memoryDelta = memoryAfter - memoryBefore;
    const itemsPerSecond = itemsProcessed / (duration / 1000);

    const metric: PerformanceMetrics = {
      operationName,
      duration,
      memoryBefore,
      memoryAfter,
      memoryDelta,
      itemsProcessed,
      itemsPerSecond,
    };

    this.metrics.push(metric);
    return result;
  }

  getMetrics(): PerformanceMetrics[] {
    return this.metrics;
  }

  printMetrics(): void {
    console.log('\n=== Performance Metrics ===');
    this.metrics.forEach(m => {
      console.log(`\n${m.operationName}:`);
      console.log(`  Duration: ${m.duration.toFixed(2)}ms`);
      console.log(`  Items: ${m.itemsProcessed}`);
      console.log(`  Items/sec: ${m.itemsPerSecond.toFixed(0)}`);
      console.log(`  Memory delta: ${(m.memoryDelta / 1024).toFixed(2)}KB`);
    });
  }

  clearMetrics(): void {
    this.metrics = [];
  }
}

describe('Performance Tests - Large Datasets', () => {
  let fsrs: FSRS;
  let monitor: PerformanceMonitor;
  const userId = 'perf-test-user-001';

  beforeEach(() => {
    fsrs = new FSRS();
    monitor = new PerformanceMonitor();
  });

  describe('FSRS Algorithm Performance at Scale', () => {
    it('should efficiently initialize 1000 cards', () => {
      const result = monitor.measureOperation(
        'Initialize 1000 cards',
        () => {
          const cards: any[] = [];
          for (let i = 0; i < 1000; i++) {
            cards.push(fsrs.initCard());
          }
          return cards;
        },
        1000
      );

      expect(result).toHaveLength(1000);
      expect(result[0].state).toBe(CardState.New);

      const metrics = monitor.getMetrics();
      const initMetric = metrics[metrics.length - 1];

      // Initialization should be very fast (< 50ms for 1000 cards)
      expect(initMetric.duration).toBeLessThan(50);
      // Should process at least 20k cards per second
      expect(initMetric.itemsPerSecond).toBeGreaterThan(20000);
    });

    it('should efficiently review 1000 cards', () => {
      const cards = Array.from({ length: 1000 }, (_, i) => fsrs.initCard());
      const now = new Date();

      const results = monitor.measureOperation(
        'Review 1000 cards',
        () => {
          const reviewResults: any[] = [];
          cards.forEach(card => {
            const result = fsrs.repeat(card, now);
            reviewResults.push(result[Rating.Good]);
          });
          return reviewResults;
        },
        1000
      );

      expect(results).toHaveLength(1000);
      expect(results[0].card.reps).toBe(1);

      const metrics = monitor.getMetrics();
      const reviewMetric = metrics[metrics.length - 1];

      // Should complete in reasonable time (< 500ms for 1000 cards)
      expect(reviewMetric.duration).toBeLessThan(500);
      // Should process at least 2000 cards per second
      expect(reviewMetric.itemsPerSecond).toBeGreaterThan(2000);
    });

    it('should efficiently process multiple review cycles', () => {
      const cards = Array.from({ length: 500 }, (_, i) => fsrs.initCard());
      const now = new Date();

      const results = monitor.measureOperation(
        'Process 500 cards through 3 review cycles',
        () => {
          let currentCards = cards;

          for (let cycle = 0; cycle < 3; cycle++) {
            const cycleTime = new Date(now.getTime() + cycle * 3 * 24 * 60 * 60 * 1000);
            currentCards = currentCards.map(card => {
              const result = fsrs.repeat(card, cycleTime);
              return result[Rating.Good].card;
            });
          }

          return currentCards;
        },
        500 * 3
      );

      expect(results).toHaveLength(500);
      expect(results[0].reps).toBe(3);

      const metrics = monitor.getMetrics();
      const cycleMetric = metrics[metrics.length - 1];

      // Should handle 1500 operations in reasonable time (< 800ms)
      expect(cycleMetric.duration).toBeLessThan(800);
      expect(cycleMetric.itemsPerSecond).toBeGreaterThan(1800);
    });
  });

  describe('Query Performance at Scale', () => {
    it('should efficiently filter 1000 cards by domain', () => {
      const cards: Card[] = [];
      for (let i = 0; i < 1000; i++) {
        cards.push({
          id: `card-${i}`,
          userId,
          domainId: ['people', 'process', 'business'][i % 3],
          taskId: `task-${i % 26}`,
          question: `Question ${i}`,
          answer: `Answer ${i}`,
          fsrsData: fsrs.initCard(),
          createdAt: new Date(),
        });
      }

      const results = monitor.measureOperation(
        'Filter 1000 cards by domain',
        () => {
          return cards.filter(c => c.domainId === 'people');
        },
        1000
      );

      // Should have approximately 333 cards (1000 / 3)
      expect(results.length).toBeGreaterThan(300);
      expect(results.length).toBeLessThan(400);

      const metrics = monitor.getMetrics();
      const filterMetric = metrics[metrics.length - 1];

      // Filter should be very fast (< 5ms)
      expect(filterMetric.duration).toBeLessThan(5);
    });

    it('should efficiently filter cards by due date range', () => {
      const baseDate = new Date();
      const cards: Card[] = [];

      for (let i = 0; i < 1000; i++) {
        const card = fsrs.initCard();
        card.due = new Date(baseDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        cards.push({
          id: `card-${i}`,
          userId,
          domainId: 'people',
          taskId: 'people-1',
          question: `Question ${i}`,
          answer: `Answer ${i}`,
          fsrsData: card,
          createdAt: new Date(),
        });
      }

      const rangeStart = new Date(baseDate.getTime() + 5 * 24 * 60 * 60 * 1000);
      const rangeEnd = new Date(baseDate.getTime() + 15 * 24 * 60 * 60 * 1000);

      const results = monitor.measureOperation(
        'Filter 1000 cards by due date range',
        () => {
          return cards.filter(
            c => c.fsrsData.due >= rangeStart && c.fsrsData.due <= rangeEnd
          );
        },
        1000
      );

      // Should find approximately 1/3 of cards in the 10-day range
      expect(results.length).toBeGreaterThan(200);
      expect(results.length).toBeLessThan(400);

      const metrics = monitor.getMetrics();
      const filterMetric = metrics[metrics.length - 1];

      // Filter should be very fast (< 5ms)
      expect(filterMetric.duration).toBeLessThan(5);
    });

    it('should efficiently sort 1000 cards by due date', () => {
      const baseDate = new Date();
      const cards: Card[] = [];

      for (let i = 0; i < 1000; i++) {
        const card = fsrs.initCard();
        card.due = new Date(baseDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000);
        cards.push({
          id: `card-${i}`,
          userId,
          domainId: 'people',
          taskId: 'people-1',
          question: `Question ${i}`,
          answer: `Answer ${i}`,
          fsrsData: card,
          createdAt: new Date(),
        });
      }

      const results = monitor.measureOperation(
        'Sort 1000 cards by due date',
        () => {
          return [...cards].sort((a, b) => a.fsrsData.due.getTime() - b.fsrsData.due.getTime());
        },
        1000
      );

      expect(results).toHaveLength(1000);
      // Verify sorting worked
      for (let i = 1; i < results.length; i++) {
        expect(results[i].fsrsData.due.getTime()).toBeGreaterThanOrEqual(
          results[i - 1].fsrsData.due.getTime()
        );
      }

      const metrics = monitor.getMetrics();
      const sortMetric = metrics[metrics.length - 1];

      // Sort should complete in reasonable time (< 20ms)
      expect(sortMetric.duration).toBeLessThan(20);
    });
  });

  describe('Batch Operations Performance', () => {
    it('should efficiently batch update 1000 cards', () => {
      const cards = Array.from({ length: 1000 }, (_, i) => {
        const card = fsrs.initCard();
        return {
          id: `card-${i}`,
          fsrsData: card,
        };
      });

      const now = new Date();

      const results = monitor.measureOperation(
        'Batch update 1000 cards',
        () => {
          const updates = cards.map(card => {
            const result = fsrs.repeat(card.fsrsData, now);
            return {
              id: card.id,
              newData: result[Rating.Good].card,
            };
          });
          return updates;
        },
        1000
      );

      expect(results).toHaveLength(1000);
      expect(results[0].newData.reps).toBe(1);

      const metrics = monitor.getMetrics();
      const batchMetric = metrics[metrics.length - 1];

      // Should complete in < 500ms
      expect(batchMetric.duration).toBeLessThan(500);
    });

    it('should efficiently calculate statistics for 1000 cards', () => {
      const cards = Array.from({ length: 1000 }, (_, i) => ({
        id: `card-${i}`,
        reps: Math.floor(Math.random() * 20),
        stability: Math.random() * 365,
        difficulty: Math.random() * 10,
        state: Math.floor(Math.random() * 4) as CardState,
      }));

      const stats = monitor.measureOperation(
        'Calculate statistics for 1000 cards',
        () => {
          const totalReps = cards.reduce((sum, c) => sum + c.reps, 0);
          const avgReps = totalReps / cards.length;
          const avgStability = cards.reduce((sum, c) => sum + c.stability, 0) / cards.length;
          const avgDifficulty = cards.reduce((sum, c) => sum + c.difficulty, 0) / cards.length;

          const stateDistribution = {
            new: cards.filter(c => c.state === CardState.New).length,
            learning: cards.filter(c => c.state === 1).length,
            review: cards.filter(c => c.state === 2).length,
            relearning: cards.filter(c => c.state === 3).length,
          };

          return {
            totalReps,
            avgReps,
            avgStability,
            avgDifficulty,
            stateDistribution,
          };
        },
        1000
      );

      expect(stats.totalReps).toBeGreaterThan(0);
      expect(stats.avgReps).toBeGreaterThan(0);

      const metrics = monitor.getMetrics();
      const statsMetric = metrics[metrics.length - 1];

      // Statistics calculation should be very fast (< 5ms)
      expect(statsMetric.duration).toBeLessThan(5);
    });
  });

  describe('Session Metrics at Scale', () => {
    it('should efficiently calculate session metrics for 1000 reviews', () => {
      const reviews = Array.from({ length: 1000 }, (_, i) => ({
        rating: [1, 2, 3, 4][Math.floor(Math.random() * 4)],
        elapsedMs: Math.random() * 30000 + 5000, // 5-35 seconds
      }));

      const metrics = monitor.measureOperation(
        'Calculate session metrics for 1000 reviews',
        () => {
          const sessionMetrics = {
            cardsReviewed: 0,
            ratings: {
              again: 0,
              hard: 0,
              good: 0,
              easy: 0,
            },
            durationSeconds: 0,
          };

          const ratingMap: Record<number, string> = {
            1: 'again',
            2: 'hard',
            3: 'good',
            4: 'easy',
          };

          reviews.forEach(review => {
            sessionMetrics.cardsReviewed += 1;
            const ratingKey = ratingMap[review.rating] as keyof typeof sessionMetrics.ratings;
            sessionMetrics.ratings[ratingKey] += 1;
            sessionMetrics.durationSeconds += Math.round(review.elapsedMs / 1000);
          });

          return sessionMetrics;
        },
        1000
      );

      expect(metrics.cardsReviewed).toBe(1000);
      expect(
        metrics.ratings.again +
        metrics.ratings.hard +
        metrics.ratings.good +
        metrics.ratings.easy
      ).toBe(1000);

      const metricsData = monitor.getMetrics();
      const sessionMetric = metricsData[metricsData.length - 1];

      // Metrics calculation should be very fast (< 5ms)
      expect(sessionMetric.duration).toBeLessThan(5);
    });

    it('should efficiently calculate success rates for 1000 reviews', () => {
      const ratings = {
        again: 50,
        hard: 100,
        good: 400,
        easy: 450,
      };

      const result = monitor.measureOperation(
        'Calculate success rate for 1000 reviews',
        () => {
          const totalCards = Object.values(ratings).reduce((a, b) => a + b, 0);
          const successfulReviews = ratings.good + ratings.easy;
          const successRate = (successfulReviews / totalCards * 100).toFixed(1);

          return {
            totalCards,
            successfulReviews,
            successRate: parseFloat(successRate),
          };
        },
        1000
      );

      expect(result.totalCards).toBe(1000);
      expect(result.successRate).toBeGreaterThan(80);
      expect(result.successRate).toBeLessThan(90);

      const metricsData = monitor.getMetrics();
      const calcMetric = metricsData[metricsData.length - 1];

      // Calculation should be nearly instant (< 1ms)
      expect(calcMetric.duration).toBeLessThan(1);
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should handle 5000 card initializations without memory issues', () => {
      const result = monitor.measureOperation(
        'Initialize 5000 cards',
        () => {
          const cards: any[] = [];
          for (let i = 0; i < 5000; i++) {
            cards.push(fsrs.initCard());
          }
          return cards;
        },
        5000
      );

      expect(result).toHaveLength(5000);

      const metrics = monitor.getMetrics();
      const memoryMetric = metrics[metrics.length - 1];

      // Memory delta should be reasonable (< 5MB for 5000 cards)
      expect(memoryMetric.memoryDelta / 1024 / 1024).toBeLessThan(5);
    });

    it('should handle concurrent operations efficiently', () => {
      const cardBatches = Array.from({ length: 10 }, () =>
        Array.from({ length: 100 }, () => fsrs.initCard())
      );

      const result = monitor.measureOperation(
        'Process 10 batches of 100 cards',
        () => {
          const now = new Date();
          const results: any[] = [];

          cardBatches.forEach((batch, batchIndex) => {
            batch.forEach(card => {
              const result = fsrs.repeat(card, now);
              results.push(result[Rating.Good]);
            });
          });

          return results;
        },
        1000
      );

      expect(result).toHaveLength(1000);

      const metrics = monitor.getMetrics();
      const batchMetric = metrics[metrics.length - 1];

      // Should complete in reasonable time (< 500ms)
      expect(batchMetric.duration).toBeLessThan(500);
    });
  });

  describe('Real-world Scenario: Full Study Session with 1000 Cards', () => {
    it('should handle realistic study session workflow', () => {
      const sessionCards = Array.from({ length: 100 }, (_, i) => ({
        id: `card-${i}`,
        fsrsData: fsrs.initCard(),
      }));

      const result = monitor.measureOperation(
        'Full study session: create → review 100 cards → calculate stats',
        () => {
          const now = new Date();
          const sessionMetrics = {
            cardsReviewed: 0,
            ratings: { again: 0, hard: 0, good: 0, easy: 0 },
            durationSeconds: 0,
          };

          // Simulate reviewing each card
          sessionCards.forEach(cardRef => {
            const rating = [Rating.Again, Rating.Hard, Rating.Good, Rating.Easy][
              Math.floor(Math.random() * 4)
            ];
            fsrs.repeat(cardRef.fsrsData, now);
            sessionMetrics.cardsReviewed += 1;
            const ratingMap: Record<Rating, string> = {
              [Rating.Again]: 'again',
              [Rating.Hard]: 'hard',
              [Rating.Good]: 'good',
              [Rating.Easy]: 'easy',
            };
            const ratingKey = ratingMap[rating] as keyof typeof sessionMetrics.ratings;
            sessionMetrics.ratings[ratingKey] += 1;
            sessionMetrics.durationSeconds += Math.round(Math.random() * 30000 / 1000);
          });

          // Calculate final stats
          const totalCards = sessionMetrics.cardsReviewed;
          const successRate = (
            (sessionMetrics.ratings.good + sessionMetrics.ratings.easy) /
            totalCards *
            100
          ).toFixed(1);

          return {
            sessionMetrics,
            successRate: parseFloat(successRate),
          };
        },
        100
      );

      expect(result.sessionMetrics.cardsReviewed).toBe(100);
      expect(result.successRate).toBeGreaterThanOrEqual(0);
      expect(result.successRate).toBeLessThanOrEqual(100);

      const metrics = monitor.getMetrics();
      const sessionMetric = metrics[metrics.length - 1];

      // Complete session should process in < 100ms
      expect(sessionMetric.duration).toBeLessThan(100);
      // Should achieve at least 1000 items/sec (review + calculation)
      expect(sessionMetric.itemsPerSecond).toBeGreaterThan(1000);
    });
  });

  describe('Scalability Benchmarks', () => {
    it('should demonstrate linear scalability for card reviews', () => {
      const testSizes = [100, 500, 1000];
      const results: Record<number, number> = {};

      testSizes.forEach(size => {
        const cards = Array.from({ length: size }, () => fsrs.initCard());
        const now = new Date();

        monitor.measureOperation(
          `Review ${size} cards`,
          () => {
            cards.forEach(card => {
              fsrs.repeat(card, now);
            });
          },
          size
        );

        results[size] = monitor.getMetrics()[monitor.getMetrics().length - 1].duration;
      });

      // Verify approximate linear scaling
      const ratio100to500 = results[500] / results[100];
      const ratio500to1000 = results[1000] / results[500];

      // Should scale roughly 5x and 2x respectively
      expect(ratio100to500).toBeLessThan(10); // Allow up to 10x for overhead
      expect(ratio500to1000).toBeLessThan(5); // Allow up to 5x
    });
  });

  afterEach(() => {
    monitor.printMetrics();
  });
});
