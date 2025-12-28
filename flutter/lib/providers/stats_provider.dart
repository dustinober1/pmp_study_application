import 'package:riverpod/riverpod.dart';
import '../models/flashcard_model.dart';
import 'flashcard_provider.dart';
import 'firebase_provider.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

class DomainStats {
  final String domainId;
  final String domainName;
  final int totalCards;
  final int masteredCards;
  final int learningCards;
  final int reviewCards;
  final int newCards;
  final double masteryPercentage;
  final int cardsReviewed;
  final int accuracy;

  DomainStats({
    required this.domainId,
    required this.domainName,
    required this.totalCards,
    required this.masteredCards,
    required this.learningCards,
    required this.reviewCards,
    required this.newCards,
    required this.masteryPercentage,
    required this.cardsReviewed,
    required this.accuracy,
  });
}

class OverallStats {
  final int totalReviewed;
  final double avgEase;
  final int accuracy;
  final int currentStreak;
  final int sessionsThisWeek;
  final int avgSessionDuration;
  final int cardsDueToday;
  final int cardsDueTomorrow;
  final List<DomainStats> domainStats;

  OverallStats({
    required this.totalReviewed,
    required this.avgEase,
    required this.accuracy,
    required this.currentStreak,
    required this.sessionsThisWeek,
    required this.avgSessionDuration,
    required this.cardsDueToday,
    required this.cardsDueTomorrow,
    required this.domainStats,
  });
}

// Get overall statistics
final overallStatsProvider = FutureProvider<OverallStats>((ref) async {
  final userId = ref.watch(currentUserIdProvider);
  final flashcards = ref.watch(userFlashcardsProvider);
  final firestore = ref.watch(firestoreProvider);

  if (userId == null) {
    return OverallStats(
      totalReviewed: 0,
      avgEase: 0,
      accuracy: 0,
      currentStreak: 0,
      sessionsThisWeek: 0,
      avgSessionDuration: 0,
      cardsDueToday: 0,
      cardsDueTomorrow: 0,
      domainStats: [],
    );
  }

  return flashcards.when(
    data: (cards) async {
      // Calculate total reviewed
      final totalReviewed = cards.fold<int>(0, (sum, card) => sum + card.repetitions);

      // Calculate average ease
      final avgEase = cards.isEmpty
          ? 0.0
          : cards.fold<double>(0, (sum, card) => sum + card.easeFactor) / cards.length;

      // Calculate accuracy (proportion of cards that are mastered)
      final masteredCount = cards
          .where((c) => c.repetitions >= 5 && c.easeFactor >= 2.5)
          .length;
      final accuracy = cards.isEmpty ? 0 : ((masteredCount / cards.length) * 100).toInt();

      // Get session data for streak and weekly stats
      final now = DateTime.now();
      final oneWeekAgo = now.subtract(const Duration(days: 7));

      final sessionsRef = firestore.collection('studySessions');
      final sessionsQuery = await sessionsRef
          .where('userId', isEqualTo: userId)
          .where('startedAt', isGreaterThanOrEqualTo: oneWeekAgo)
          .get();

      final sessionsThisWeek = sessionsQuery.docs.length;
      final avgSessionDuration = sessionsThisWeek > 0
          ? sessionsQuery.docs
                  .fold<int>(0, (sum, doc) => sum + (doc['durationSeconds'] as int? ?? 0)) ~/
              sessionsThisWeek
          : 0;

      // Calculate streak
      int currentStreak = 0;
      if (sessionsQuery.docs.isNotEmpty) {
        final studyDates = <String>{};
        for (final doc in sessionsQuery.docs) {
          final startedAt = doc['startedAt'] as Timestamp?;
          if (startedAt != null) {
            final date = startedAt.toDate();
            studyDates.add('${date.year}-${date.month}-${date.day}');
          }
        }

        if (studyDates.isNotEmpty) {
          final sortedDates = studyDates.toList()..sort();
          final today = DateTime.now();
          final todayStr = '${today.year}-${today.month}-${today.day}';

          // Start counting from today
          if (studyDates.contains(todayStr)) {
            currentStreak = 1;
            for (int i = 1; i < sortedDates.length; i++) {
              final currentDate = DateTime.parse(sortedDates[i]);
              final previousDate = DateTime.parse(sortedDates[i - 1]);
              final dayDiff =
                  previousDate.difference(currentDate).inDays;

              if (dayDiff == 1) {
                currentStreak++;
              } else {
                break;
              }
            }
          }
        }
      }

      // Count cards due today and tomorrow
      final nowDate = DateTime.now();
      final today = DateTime(nowDate.year, nowDate.month, nowDate.day);
      final tomorrow = today.add(const Duration(days: 1));

      final cardsDueToday = cards.where((c) => c.nextReviewDate.isBefore(tomorrow)).length;
      final cardsDueTomorrow =
          cards.where((c) => c.nextReviewDate.isBefore(tomorrow.add(const Duration(days: 1))) &&
              c.nextReviewDate.isAfter(tomorrow)).length;

      // Calculate per-domain statistics
      final domainMap = <String, List<FlashcardModel>>{};
      for (final card in cards) {
        domainMap.putIfAbsent(card.domainId, () => []).add(card);
      }

      final domainStats = <DomainStats>[];
      final domainNames = {
        'people': 'People',
        'process': 'Process',
        'business_environment': 'Business Environment',
      };

      for (final entry in domainMap.entries) {
        final domainId = entry.key;
        final domainCards = entry.value;

        final masteredCards = domainCards
            .where((c) => c.repetitions >= 5 && c.easeFactor >= 2.5)
            .length;
        final learningCards = domainCards
            .where((c) => c.repetitions > 0 && c.repetitions < 5)
            .length;
        final reviewCards = domainCards
            .where((c) => c.repetitions >= 5 && c.easeFactor < 2.5)
            .length;
        final newCards = domainCards.where((c) => c.repetitions == 0).length;

        final masteryPercentage = domainCards.isEmpty
            ? 0.0
            : (masteredCards / domainCards.length) * 100;

        final cardsReviewedDomain =
            domainCards.fold<int>(0, (sum, card) => sum + card.repetitions);
        final accuracyDomain = domainCards.isEmpty
            ? 0
            : ((masteredCards / domainCards.length) * 100).toInt();

        domainStats.add(DomainStats(
          domainId: domainId,
          domainName: domainNames[domainId] ?? domainId,
          totalCards: domainCards.length,
          masteredCards: masteredCards,
          learningCards: learningCards,
          reviewCards: reviewCards,
          newCards: newCards,
          masteryPercentage: masteryPercentage,
          cardsReviewed: cardsReviewedDomain,
          accuracy: accuracyDomain,
        ));
      }

      return OverallStats(
        totalReviewed: totalReviewed,
        avgEase: double.parse(avgEase.toStringAsFixed(2)),
        accuracy: accuracy,
        currentStreak: currentStreak,
        sessionsThisWeek: sessionsThisWeek,
        avgSessionDuration: avgSessionDuration,
        cardsDueToday: cardsDueToday,
        cardsDueTomorrow: cardsDueTomorrow,
        domainStats: domainStats,
      );
    },
    loading: () async => OverallStats(
      totalReviewed: 0,
      avgEase: 0,
      accuracy: 0,
      currentStreak: 0,
      sessionsThisWeek: 0,
      avgSessionDuration: 0,
      cardsDueToday: 0,
      cardsDueTomorrow: 0,
      domainStats: [],
    ),
    error: (_, __) async => OverallStats(
      totalReviewed: 0,
      avgEase: 0,
      accuracy: 0,
      currentStreak: 0,
      sessionsThisWeek: 0,
      avgSessionDuration: 0,
      cardsDueToday: 0,
      cardsDueTomorrow: 0,
      domainStats: [],
    ),
  );
});
