import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:pmp_study_app/providers/stats_provider.dart';
import 'package:pmp_study_app/screens/stats_screen.dart';

void main() {
  group('StatsScreen', () {
    testWidgets('displays loading state initially', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async {
              // Simulate loading
              await Future.delayed(const Duration(seconds: 1));
              return _createMockStats();
            }),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('displays app bar with correct title', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => _createMockStats()),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Statistics'), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('displays overview card with stats', (WidgetTester tester) async {
      final mockStats = _createMockStats();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check for overview card elements
      expect(find.text('Total Reviewed'), findsOneWidget);
      expect(find.text('Avg. Ease'), findsOneWidget);
      expect(find.text('Accuracy'), findsOneWidget);

      // Check for stats values
      expect(find.text(mockStats.totalReviewed.toString()), findsOneWidget);
      expect(find.text('${mockStats.accuracy}%'), findsOneWidget);
    });

    testWidgets('displays performance by domain section', (WidgetTester tester) async {
      final mockStats = _createMockStats();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Performance by Domain'), findsOneWidget);

      // Check for domain names
      for (final domain in mockStats.domainStats) {
        expect(find.text(domain.domainName), findsOneWidget);
      }
    });

    testWidgets('displays study activity section', (WidgetTester tester) async {
      final mockStats = _createMockStats();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Study Activity'), findsOneWidget);
      expect(find.text('Current Streak'), findsOneWidget);
      expect(find.text('This Week'), findsOneWidget);

      // Check for streak value
      expect(find.text('${mockStats.currentStreak} days'), findsOneWidget);
      expect(find.text('${mockStats.sessionsThisWeek} sessions'), findsOneWidget);
    });

    testWidgets('displays due for review section', (WidgetTester tester) async {
      final mockStats = _createMockStats();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Due for Review'), findsOneWidget);
      expect(find.text('${mockStats.cardsDueToday} cards due today'), findsOneWidget);
      expect(find.text('${mockStats.cardsDueTomorrow} more tomorrow'), findsOneWidget);
    });

    testWidgets('displays all domain cards with progress bars', (WidgetTester tester) async {
      final mockStats = OverallStats(
        totalReviewed: 45,
        avgEase: 2.6,
        accuracy: 75,
        currentStreak: 5,
        sessionsThisWeek: 3,
        avgSessionDuration: 1200,
        cardsDueToday: 8,
        cardsDueTomorrow: 12,
        domainStats: [
          DomainStats(
            domainId: 'people',
            domainName: 'People',
            totalCards: 50,
            masteredCards: 30,
            learningCards: 15,
            reviewCards: 5,
            newCards: 0,
            masteryPercentage: 60.0,
            cardsReviewed: 30,
            accuracy: 70,
          ),
          DomainStats(
            domainId: 'process',
            domainName: 'Process',
            totalCards: 60,
            masteredCards: 40,
            learningCards: 15,
            reviewCards: 5,
            newCards: 0,
            masteryPercentage: 67.0,
            cardsReviewed: 40,
            accuracy: 80,
          ),
          DomainStats(
            domainId: 'business_environment',
            domainName: 'Business Environment',
            totalCards: 30,
            masteredCards: 25,
            learningCards: 5,
            reviewCards: 0,
            newCards: 0,
            masteryPercentage: 83.0,
            cardsReviewed: 25,
            accuracy: 85,
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check all domain names appear
      expect(find.text('People'), findsWidgets);
      expect(find.text('Process'), findsWidgets);
      expect(find.text('Business Environment'), findsOneWidget);

      // Check for progress indicators (LinearProgressIndicator)
      expect(find.byType(LinearProgressIndicator), findsWidgets);
    });

    testWidgets('displays error when stats loading fails', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async {
              throw Exception('Failed to load stats');
            }),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(Text), findsWidgets);
      final errorFinder = find.byWidgetPredicate(
        (widget) => widget is Text && widget.data?.contains('Error') == true,
      );
      expect(errorFinder, findsOneWidget);
    });

    testWidgets('displays correct streak message when streak is zero',
        (WidgetTester tester) async {
      final mockStats = OverallStats(
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

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(
        find.text('Start your studying streak today!'),
        findsOneWidget,
      );
    });

    testWidgets('displays correct streak message when streak is active',
        (WidgetTester tester) async {
      final mockStats = _createMockStats();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Keep up the momentum!'), findsOneWidget);
    });

    testWidgets('scrolls to show all content', (WidgetTester tester) async {
      final mockStats = OverallStats(
        totalReviewed: 100,
        avgEase: 2.7,
        accuracy: 80,
        currentStreak: 10,
        sessionsThisWeek: 7,
        avgSessionDuration: 1800,
        cardsDueToday: 20,
        cardsDueTomorrow: 30,
        domainStats: [
          DomainStats(
            domainId: 'people',
            domainName: 'People',
            totalCards: 100,
            masteredCards: 75,
            learningCards: 20,
            reviewCards: 5,
            newCards: 0,
            masteryPercentage: 75.0,
            cardsReviewed: 75,
            accuracy: 80,
          ),
        ],
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            overallStatsProvider.overrideWith((ref) async => mockStats),
          ],
          child: const MaterialApp(
            home: StatsScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Scroll to the bottom
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -500));
      await tester.pumpAndSettle();

      // Verify all sections are accessible
      expect(find.text('Due for Review'), findsOneWidget);
      expect(find.byType(ElevatedButton), findsWidgets);
    });
  });
}

OverallStats _createMockStats() {
  return OverallStats(
    totalReviewed: 50,
    avgEase: 2.65,
    accuracy: 75,
    currentStreak: 5,
    sessionsThisWeek: 3,
    avgSessionDuration: 1500,
    cardsDueToday: 10,
    cardsDueTomorrow: 15,
    domainStats: [
      DomainStats(
        domainId: 'people',
        domainName: 'People',
        totalCards: 50,
        masteredCards: 30,
        learningCards: 15,
        reviewCards: 5,
        newCards: 0,
        masteryPercentage: 60.0,
        cardsReviewed: 30,
        accuracy: 70,
      ),
      DomainStats(
        domainId: 'process',
        domainName: 'Process',
        totalCards: 60,
        masteredCards: 40,
        learningCards: 15,
        reviewCards: 5,
        newCards: 0,
        masteryPercentage: 67.0,
        cardsReviewed: 40,
        accuracy: 80,
      ),
    ],
  );
}
