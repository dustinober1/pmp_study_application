/// FSRS (Free Spaced Repetition Scheduler) Implementation for Dart/Flutter
///
/// This is a complete implementation of the FSRS algorithm for spaced repetition.
/// Based on the FSRS-4.5 specification with comprehensive edge case handling.
///
/// Features:
/// - Full FSRS algorithm implementation with 17 weight parameters
/// - Edge case handling for missed reviews and long delays
/// - Mean reversion for difficulty to prevent extreme values
/// - Retrieval prediction for optimal scheduling
/// - Support for personalized user parameters

import 'package:intl/intl.dart';

/// Rating scale for card reviews (1-4)
enum Rating {
  again(1),   // Forgot/incorrect
  hard(2),    // Recalled with difficulty
  good(3),    // Recalled correctly
  easy(4);    // Recalled easily

  const Rating(this.value);
  final int value;
}

/// Card state in the FSRS algorithm
enum CardState {
  newCard(0),    // Never studied
  learning(1),   // Currently being learned
  review(2),     // In review phase
  relearning(3); // Forgotten, being relearned

  const CardState(this.value);
  final int value;
}

/// Represents a single flashcard with FSRS scheduling data
class FSRSCard {
  DateTime due;
  double stability;
  double difficulty;
  int elapsedDays;
  int scheduledDays;
  int reps;
  int lapses;
  CardState state;
  DateTime? lastReview;

  FSRSCard({
    required this.due,
    required this.stability,
    required this.difficulty,
    required this.elapsedDays,
    required this.scheduledDays,
    required this.reps,
    required this.lapses,
    required this.state,
    this.lastReview,
  });

  /// Create a copy of this card with optional updates
  FSRSCard copyWith({
    DateTime? due,
    double? stability,
    double? difficulty,
    int? elapsedDays,
    int? scheduledDays,
    int? reps,
    int? lapses,
    CardState? state,
    DateTime? lastReview,
  }) {
    return FSRSCard(
      due: due ?? this.due,
      stability: stability ?? this.stability,
      difficulty: difficulty ?? this.difficulty,
      elapsedDays: elapsedDays ?? this.elapsedDays,
      scheduledDays: scheduledDays ?? this.scheduledDays,
      reps: reps ?? this.reps,
      lapses: lapses ?? this.lapses,
      state: state ?? this.state,
      lastReview: lastReview ?? this.lastReview,
    );
  }

  /// Convert to JSON for storage
  Map<String, dynamic> toJson() {
    return {
      'due': due.toIso8601String(),
      'stability': stability,
      'difficulty': difficulty,
      'elapsedDays': elapsedDays,
      'scheduledDays': scheduledDays,
      'reps': reps,
      'lapses': lapses,
      'state': state.value,
      'lastReview': lastReview?.toIso8601String(),
    };
  }

  /// Create from JSON
  factory FSRSCard.fromJson(Map<String, dynamic> json) {
    return FSRSCard(
      due: DateTime.parse(json['due'] as String),
      stability: (json['stability'] as num).toDouble(),
      difficulty: (json['difficulty'] as num).toDouble(),
      elapsedDays: json['elapsedDays'] as int,
      scheduledDays: json['scheduledDays'] as int,
      reps: json['reps'] as int,
      lapses: json['lapses'] as int,
      state: CardState.values[json['state'] as int],
      lastReview: json['lastReview'] != null
          ? DateTime.parse(json['lastReview'] as String)
          : null,
    );
  }
}

/// Review log for a single review action
class FSRSReviewLog {
  final Rating rating;
  final int scheduledDays;
  final int elapsedDays;
  final DateTime review;
  final CardState state;

  FSRSReviewLog({
    required this.rating,
    required this.scheduledDays,
    required this.elapsedDays,
    required this.review,
    required this.state,
  });

  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'rating': rating.value,
      'scheduledDays': scheduledDays,
      'elapsedDays': elapsedDays,
      'review': review.toIso8601String(),
      'state': state.value,
    };
  }
}

/// FSRS algorithm parameters
class FSRSParameters {
  final double requestRetention;
  final int maximumInterval;
  final List<double> w;

  FSRSParameters({
    required this.requestRetention,
    required this.maximumInterval,
    required this.w,
  });

  /// Default FSRS parameters
  factory FSRSParameters.defaults() {
    return FSRSParameters(
      requestRetention: 0.9,
      maximumInterval: 36500, // 100 years
      w: [
        0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18,
        0.05, 0.34, 1.26, 0.29, 2.61,
      ],
    );
  }
}

/// Result of scheduling a card with a specific rating
class ScheduleResult {
  final FSRSCard card;
  final FSRSReviewLog log;

  ScheduleResult({
    required this.card,
    required this.log,
  });
}

/// Main FSRS scheduler class
class FSRS {
  late final FSRSParameters p;

  FSRS({FSRSParameters? parameters}) {
    p = parameters ?? FSRSParameters.defaults();
  }

  /// Initialize a new card
  FSRSCard initCard() {
    return FSRSCard(
      due: DateTime.now(),
      stability: 0,
      difficulty: 0,
      elapsedDays: 0,
      scheduledDays: 0,
      reps: 0,
      lapses: 0,
      state: CardState.newCard,
    );
  }

  /// Get current retention probability for a card
  /// Returns a value between 0 and 1
  double getRetention(FSRSCard card, DateTime now) {
    if (card.stability == 0 || card.lastReview == null) {
      return 0;
    }
    final elapsedDays = _dateDiff(card.lastReview!, now);
    return math.exp(math.log(0.9) * elapsedDays / card.stability);
  }

  /// Check if a card is overdue (missed review)
  bool isOverdue(FSRSCard card, DateTime now) {
    return now.isAfter(card.due) || now.isAtSameMomentAs(card.due);
  }

  /// Get days overdue for a card
  int getDaysOverdue(FSRSCard card, DateTime now) {
    if (!isOverdue(card, now)) {
      return 0;
    }
    return _dateDiff(card.due, now);
  }

  /// Calculate next review schedule based on all ratings
  Map<Rating, ScheduleResult> repeat(FSRSCard card, DateTime now) {
    final elapsedDays = card.lastReview != null
        ? math.max(0, _dateDiff(card.lastReview!, now))
        : 0;

    final result = <Rating, ScheduleResult>{};

    for (final rating in Rating.values) {
      final scheduleResult = _scheduleCard(card, rating, now, elapsedDays);
      result[rating] = scheduleResult;
    }

    return result;
  }

  /// Schedule a single card for a specific rating
  /// Handles all edge cases including new cards and missed reviews
  ScheduleResult scheduleCardForRating(
    FSRSCard card,
    Rating rating,
    DateTime now,
  ) {
    // Handle missed reviews
    var processCard = _handleMissedReview(card, now);

    final elapsedDays = processCard.lastReview != null
        ? math.max(0, _dateDiff(processCard.lastReview!, now))
        : 0;

    return _scheduleCard(processCard, rating, now, elapsedDays);
  }

  /// Get optimal next interval for a card based on current state
  int getOptimalInterval(FSRSCard card, Rating rating) {
    late double nextDifficulty;
    late double nextStability;

    if (card.state == CardState.newCard) {
      nextDifficulty = _initDifficulty(rating);
      nextStability = _initStability(rating);
    } else {
      nextDifficulty = _nextDifficulty(card.difficulty, rating);
      // Use 0 elapsed days for prediction
      nextStability = _nextStability(
        card.difficulty,
        card.stability,
        rating,
        0,
      );
    }

    return _nextInterval(nextStability);
  }

  /// Handle missed reviews by adjusting card state appropriately
  FSRSCard _handleMissedReview(FSRSCard card, DateTime now) {
    final daysOverdue = getDaysOverdue(card, now);
    if (daysOverdue <= 0) {
      return card;
    }

    var adjustedCard = card;

    // For cards significantly overdue, reduce stability slightly
    if (daysOverdue > adjustedCard.scheduledDays * 2) {
      // Reduce stability by 10-20% for heavily missed reviews
      const reductionFactor = 0.85;
      adjustedCard = adjustedCard.copyWith(
        stability: adjustedCard.stability * reductionFactor,
      );
    }

    // Update elapsed days to reflect actual time since last review
    if (adjustedCard.lastReview != null) {
      adjustedCard = adjustedCard.copyWith(
        elapsedDays: _dateDiff(adjustedCard.lastReview!, now),
      );
    }

    return adjustedCard;
  }

  /// Private method: Schedule a single card
  ScheduleResult _scheduleCard(
    FSRSCard card,
    Rating rating,
    DateTime now,
    int elapsedDays,
  ) {
    var nextCard = card;
    var nextState = card.state;

    if (card.state == CardState.newCard) {
      nextCard = nextCard.copyWith(
        difficulty: _initDifficulty(rating),
        stability: _initStability(rating),
      );
      nextState = CardState.learning;
    } else {
      nextCard = nextCard.copyWith(
        difficulty: _nextDifficulty(card.difficulty, rating),
        stability: _nextStability(
          card.difficulty,
          card.stability,
          rating,
          elapsedDays,
        ),
      );
    }

    if (rating == Rating.again) {
      nextCard = nextCard.copyWith(lapses: nextCard.lapses + 1);
      nextState = CardState.relearning;
    } else {
      nextState = CardState.review;
    }

    final interval = _nextInterval(nextCard.stability);
    nextCard = nextCard.copyWith(
      scheduledDays: interval,
      due: _addDays(now, interval),
      reps: nextCard.reps + 1,
      state: nextState,
      lastReview: now,
      elapsedDays: elapsedDays,
    );

    final reviewLog = FSRSReviewLog(
      rating: rating,
      scheduledDays: interval,
      elapsedDays: elapsedDays,
      review: now,
      state: card.state,
    );

    return ScheduleResult(card: nextCard, log: reviewLog);
  }

  /// Calculate initial difficulty for a new card
  double _initDifficulty(Rating rating) {
    final d = math.max(
      p.w[4] - p.w[5] * (rating.value - 3),
      1,
    );
    return math.min(d, 10);
  }

  /// Calculate initial stability for a new card
  double _initStability(Rating rating) {
    return math.max(p.w[rating.value - 1], 0.1);
  }

  /// Calculate next difficulty based on current difficulty and rating
  double _nextDifficulty(double d, Rating rating) {
    final nextD = d - p.w[6] * (rating.value - 3);
    return _meanReversion(p.w[4], nextD);
  }

  /// Mean reversion: pull extreme values back toward initial value
  double _meanReversion(double init, double current) {
    return p.w[7] * init + (1 - p.w[7]) * current;
  }

  /// Calculate next stability based on multiple factors
  double _nextStability(
    double d,
    double s,
    Rating rating,
    int elapsedDays,
  ) {
    final hardPenalty = rating == Rating.hard ? p.w[15] : 1.0;
    final easyBonus = rating == Rating.easy ? p.w[16] : 1.0;

    if (rating == Rating.again) {
      return p.w[11] *
          math.pow(d, -p.w[12]) *
          (math.pow(s + 1, p.w[13]) - 1) *
          math.exp(p.w[14] * (1 - 1));
    } else {
      // Handle edge case: prevent division by zero or negative values
      final safeStability = math.max(s, 0.1);
      final safeElapsedDays = math.max(0, elapsedDays);

      // Calculate retrievability with bounds
      final retrievability =
          math.exp(math.log(0.9) * safeElapsedDays / safeStability);

      final nextStability = safeStability *
          (math.exp(p.w[8]) *
              (11 - d) *
              math.pow(safeStability, -p.w[9]) *
              (math.exp((1 - retrievability) * p.w[10]) - 1) *
              hardPenalty *
              easyBonus +
          1);

      // Ensure stability stays within reasonable bounds
      return math.max(math.min(nextStability, p.maximumInterval.toDouble()), 0.1);
    }
  }

  /// Calculate next interval in days
  int _nextInterval(double s) {
    final newInterval =
        s / math.log(p.requestRetention) * math.log(0.9);
    return math.min(
      math.max(newInterval.round(), 1),
      p.maximumInterval,
    );
  }

  /// Calculate days between two dates
  int _dateDiff(DateTime from, DateTime to) {
    return to.difference(from).inDays;
  }

  /// Add days to a date
  DateTime _addDays(DateTime date, int days) {
    return date.add(Duration(days: days));
  }
}

// Import math functions
import 'dart:math' as math;
