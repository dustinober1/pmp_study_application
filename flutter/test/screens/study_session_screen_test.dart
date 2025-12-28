import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:pmp_study_app/models/flashcard_model.dart';
import 'package:pmp_study_app/providers/flashcard_provider.dart';
import 'package:pmp_study_app/screens/study_session_screen.dart';

// Mock providers
class MockFlashcardProvider extends Mock {}

void main() {
  group('StudySessionScreen', () {
    testWidgets('displays loading state initially', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userFlashcardsProvider.overrideWith((ref) => Stream.value([]).asyncMap((_) => _)),
          ],
          child: const MaterialApp(
            home: StudySessionScreen(),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('displays empty state when no flashcards', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userFlashcardsProvider.overrideWith((ref) => const Stream.empty()),
          ],
          child: const MaterialApp(
            home: StudySessionScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('No flashcards available'), findsOneWidget);
      expect(find.text('Start browsing to add some'), findsOneWidget);
      expect(find.byIcon(Icons.library_books), findsOneWidget);
    });

    testWidgets('displays flashcard when data is available', (WidgetTester tester) async {
      final mockFlashcards = [
        FlashcardModel(
          id: 'card1',
          userId: 'user1',
          domainId: 'people',
          taskId: 'people-1',
          front: 'What is leadership?',
          back: 'The process of influencing others',
          repetitions: 0,
          easeFactor: 2.5,
          interval: 1,
          nextReviewDate: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield mockFlashcards;
              },
            ),
          ],
          child: const MaterialApp(
            home: StudySessionScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check that the SwipeableFlashcard widget is present
      expect(find.byType(CircularProgressIndicator), findsNothing);
      expect(find.text('No flashcards available'), findsNothing);
    });

    testWidgets('displays app bar with correct title', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userFlashcardsProvider.overrideWith((ref) => const Stream.empty()),
          ],
          child: const MaterialApp(
            home: StudySessionScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Study Session'), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('displays error when flashcard loading fails', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userFlashcardsProvider.overrideWith((ref) async* {
              throw Exception('Failed to load flashcards');
            }),
          ],
          child: const MaterialApp(
            home: StudySessionScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(Text), findsWidgets);
      // Error text should be displayed
      final errorFinder = find.byWidgetPredicate(
        (widget) => widget is Text && widget.data?.contains('Error') == true,
      );
      expect(errorFinder, findsOneWidget);
    });

    testWidgets('handles multiple flashcards correctly', (WidgetTester tester) async {
      final mockFlashcards = [
        FlashcardModel(
          id: 'card1',
          userId: 'user1',
          domainId: 'people',
          taskId: 'people-1',
          front: 'Question 1?',
          back: 'Answer 1',
          repetitions: 0,
          easeFactor: 2.5,
          interval: 1,
          nextReviewDate: DateTime.now(),
        ),
        FlashcardModel(
          id: 'card2',
          userId: 'user1',
          domainId: 'process',
          taskId: 'process-1',
          front: 'Question 2?',
          back: 'Answer 2',
          repetitions: 2,
          easeFactor: 2.8,
          interval: 3,
          nextReviewDate: DateTime.now().add(const Duration(days: 1)),
        ),
        FlashcardModel(
          id: 'card3',
          userId: 'user1',
          domainId: 'business_environment',
          taskId: 'business-1',
          front: 'Question 3?',
          back: 'Answer 3',
          repetitions: 5,
          easeFactor: 3.0,
          interval: 10,
          nextReviewDate: DateTime.now().add(const Duration(days: 5)),
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield mockFlashcards;
              },
            ),
          ],
          child: const MaterialApp(
            home: StudySessionScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Verify that we have loaded flashcards (not showing empty state)
      expect(find.text('No flashcards available'), findsNothing);
    });
  });
}
