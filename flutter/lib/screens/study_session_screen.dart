import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/flashcard_model.dart';
import '../providers/flashcard_provider.dart';
import '../widgets/swipeable_flashcard.dart';

class StudySessionScreen extends ConsumerStatefulWidget {
  const StudySessionScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<StudySessionScreen> createState() => _StudySessionScreenState();
}

class _StudySessionScreenState extends ConsumerState<StudySessionScreen> {
  int _currentIndex = 0;

  void _handleCardRating(RatingType rating) {
    // TODO: Implement FSRS rating and update flashcard
    switch (rating) {
      case RatingType.again:
        // Re-schedule for immediate re-review
        break;
      case RatingType.hard:
        // Difficult - shorter interval
        break;
      case RatingType.good:
        // Normal - standard interval
        break;
      case RatingType.easy:
        // Easy - longer interval
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final flashcardsAsync = ref.watch(userFlashcardsProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Study Session'),
        elevation: 0,
      ),
      body: flashcardsAsync.when(
        data: (flashcards) {
          if (flashcards.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.library_books,
                    size: 80,
                    color: Colors.grey[300],
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'No flashcards available',
                    style: Theme.of(context).textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Start browsing to add some',
                    style: Theme.of(context).textTheme.bodyMedium,
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            );
          }

          return SwipeableFlashcard(
            flashcard: flashcards[_currentIndex],
            currentIndex: _currentIndex,
            totalCards: flashcards.length,
            onNext: () {
              if (_currentIndex < flashcards.length - 1) {
                setState(() {
                  _currentIndex++;
                });
              }
            },
            onPrevious: _currentIndex > 0
                ? () {
                    setState(() {
                      _currentIndex--;
                    });
                  }
                : null,
            onRate: _handleCardRating,
          );
        },
        loading: () => const Center(
          child: CircularProgressIndicator(),
        ),
        error: (error, stackTrace) => Center(
          child: Text('Error: $error'),
        ),
      ),
    );
  }
}
