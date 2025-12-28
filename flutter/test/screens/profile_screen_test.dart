import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';
import 'package:pmp_study_app/models/flashcard_model.dart';
import 'package:pmp_study_app/models/user_model.dart';
import 'package:pmp_study_app/providers/auth_provider.dart';
import 'package:pmp_study_app/providers/flashcard_provider.dart';
import 'package:pmp_study_app/providers/user_provider.dart';
import 'package:pmp_study_app/screens/profile_screen.dart';

// Mock User
class MockUser extends Mock implements User {
  @override
  String get email => 'test@example.com';

  @override
  String? get displayName => 'John Doe';

  @override
  String get uid => 'user123';
}

void main() {
  group('ProfileScreen', () {
    testWidgets('displays loading state initially', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => null,
            ),
            userFlashcardsProvider.overrideWith((ref) => const Stream.empty()),
            authProvider.overrideWith(
              (ref) => StateNotifier(const AuthState()),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsWidgets);
    });

    testWidgets('displays app bar with correct title', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Profile'), findsOneWidget);
      expect(find.byType(AppBar), findsOneWidget);
    });

    testWidgets('displays settings icon in app bar', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byIcon(Icons.settings), findsOneWidget);
    });

    testWidgets('displays user avatar with initials', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.byType(CircleAvatar), findsOneWidget);
      expect(find.text('JD'), findsOneWidget); // John Doe initials
    });

    testWidgets('displays user name and email', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'john@example.com',
        name: 'John Smith',
        createdAt: DateTime.now(),
      );

      final mockAuthUser = MockUser();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: mockAuthUser),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('John Smith'), findsOneWidget);
      expect(find.text('john@example.com'), findsOneWidget);
    });

    testWidgets('displays quick stats section', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      final mockFlashcards = [
        FlashcardModel(
          id: 'card1',
          userId: 'user123',
          domainId: 'people',
          taskId: 'people-1',
          front: 'Question 1?',
          back: 'Answer 1',
          repetitions: 6,
          easeFactor: 2.6,
          interval: 10,
          nextReviewDate: DateTime.now(),
        ),
        FlashcardModel(
          id: 'card2',
          userId: 'user123',
          domainId: 'process',
          taskId: 'process-1',
          front: 'Question 2?',
          back: 'Answer 2',
          repetitions: 2,
          easeFactor: 2.4,
          interval: 3,
          nextReviewDate: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield mockFlashcards;
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Total Cards'), findsOneWidget);
      expect(find.text('Mastered'), findsOneWidget);
      expect(find.text('2'), findsWidgets); // 2 total cards
      expect(find.text('1'), findsOneWidget); // 1 mastered card (6 reps, 2.6 ease)
    });

    testWidgets('displays account section menu items', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Account'), findsOneWidget);
      expect(find.text('Edit Profile'), findsOneWidget);
      expect(find.text('Change Password'), findsOneWidget);
      expect(find.text('Notifications'), findsOneWidget);
    });

    testWidgets('displays study settings section', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Study Settings'), findsOneWidget);
      expect(find.text('Daily Goal'), findsOneWidget);
      expect(find.text('Theme'), findsOneWidget);
      expect(find.text('Language'), findsOneWidget);
    });

    testWidgets('displays help & support section', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Help & Support'), findsOneWidget);
      expect(find.text('Help Center'), findsOneWidget);
      expect(find.text('About'), findsOneWidget);
      expect(find.text('Contact Us'), findsOneWidget);
    });

    testWidgets('displays logout button', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Logout'), findsOneWidget);
      expect(find.byIcon(Icons.logout), findsOneWidget);
    });

    testWidgets('displays version info', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Version 1.0.0'), findsOneWidget);
    });

    testWidgets('displays error when user profile loading fails', (WidgetTester tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async {
                throw Exception('Failed to load profile');
              },
            ),
            userFlashcardsProvider.overrideWith((ref) => const Stream.empty()),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
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

    testWidgets('scrolls to show all content', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Scroll down to see more content
      await tester.drag(find.byType(SingleChildScrollView), const Offset(0, -500));
      await tester.pumpAndSettle();

      // Verify sections are accessible
      expect(find.text('Help & Support'), findsOneWidget);
      expect(find.text('Logout'), findsOneWidget);
    });

    testWidgets('generates correct initials from name', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'Alice Elizabeth Brown',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Should use first and second name initials: A and E
      expect(find.text('AE'), findsOneWidget);
    });

    testWidgets('generates default initial when name is empty', (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: '',
        createdAt: DateTime.now(),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield [];
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('U'), findsOneWidget);
    });

    testWidgets('displays card stats correctly with mastered cards',
        (WidgetTester tester) async {
      final mockUser = UserModel(
        id: 'user123',
        email: 'test@example.com',
        name: 'John Doe',
        createdAt: DateTime.now(),
      );

      final mockFlashcards = [
        // 3 mastered cards (reps >= 5, ease >= 2.5)
        FlashcardModel(
          id: 'card1',
          userId: 'user123',
          domainId: 'people',
          taskId: 'people-1',
          front: 'Q1?',
          back: 'A1',
          repetitions: 5,
          easeFactor: 2.5,
          interval: 10,
          nextReviewDate: DateTime.now(),
        ),
        FlashcardModel(
          id: 'card2',
          userId: 'user123',
          domainId: 'people',
          taskId: 'people-2',
          front: 'Q2?',
          back: 'A2',
          repetitions: 6,
          easeFactor: 2.8,
          interval: 15,
          nextReviewDate: DateTime.now(),
        ),
        FlashcardModel(
          id: 'card3',
          userId: 'user123',
          domainId: 'process',
          taskId: 'process-1',
          front: 'Q3?',
          back: 'A3',
          repetitions: 7,
          easeFactor: 3.0,
          interval: 20,
          nextReviewDate: DateTime.now(),
        ),
        // 2 learning cards
        FlashcardModel(
          id: 'card4',
          userId: 'user123',
          domainId: 'process',
          taskId: 'process-2',
          front: 'Q4?',
          back: 'A4',
          repetitions: 2,
          easeFactor: 2.3,
          interval: 3,
          nextReviewDate: DateTime.now(),
        ),
        FlashcardModel(
          id: 'card5',
          userId: 'user123',
          domainId: 'business_environment',
          taskId: 'business-1',
          front: 'Q5?',
          back: 'A5',
          repetitions: 1,
          easeFactor: 2.2,
          interval: 1,
          nextReviewDate: DateTime.now(),
        ),
      ];

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            userProfileProvider.overrideWith(
              (ref) async => mockUser,
            ),
            userFlashcardsProvider.overrideWith(
              (ref) async* {
                yield mockFlashcards;
              },
            ),
            authProvider.overrideWith(
              (ref) => StateNotifier(
                AuthState(user: MockUser()),
              ),
            ),
          ],
          child: const MaterialApp(
            home: ProfileScreen(),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('5'), findsOneWidget); // 5 total cards
      expect(find.text('3'), findsOneWidget); // 3 mastered cards
    });
  });
}
