import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cloud_functions/cloud_functions.dart';
import '../models/flashcard_model.dart';
import '../providers/flashcard_provider.dart';
import '../providers/firebase_provider.dart';
import '../widgets/swipeable_flashcard.dart';

class StudySessionScreen extends ConsumerStatefulWidget {
  const StudySessionScreen({Key? key}) : super(key: key);

  @override
  ConsumerState<StudySessionScreen> createState() => _StudySessionScreenState();
}

class _StudySessionScreenState extends ConsumerState<StudySessionScreen> {
  int _currentIndex = 0;
  String? _currentSessionId;
  String? _error;
  bool _isInitializing = true;
  Map<String, DateTime> _cardStartTimes = {};

  @override
  void initState() {
    super.initState();
    _initializeSession();
  }

  Future<void> _initializeSession() async {
    try {
      setState(() {
        _isInitializing = true;
        _error = null;
      });

      final functions = FirebaseFunctions.instance;
      final result = await functions.httpsCallable('createStudySession').call({
        'scope': {'type': 'all'},
        'platform': 'ios', // Could be dynamic based on platform
      });

      setState(() {
        _currentSessionId = result.data['sessionId'];
        _isInitializing = false;
      });
    } catch (e) {
      if (mounted) {
        final errorMessage = 'Failed to initialize study session: ${e.toString()}';
        setState(() {
          _error = errorMessage;
          _isInitializing = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  void _handleCardRating(RatingType rating) {
    final flashcards = ref.read(userFlashcardsProvider).whenData((cards) => cards).value;
    if (flashcards == null || flashcards.isEmpty || _currentSessionId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Study session not ready')),
      );
      return;
    }

    final currentCard = flashcards[_currentIndex];
    _reviewCard(currentCard, rating);
  }

  Future<void> _reviewCard(FlashcardModel flashcard, RatingType rating) async {
    try {
      final functions = FirebaseFunctions.instance;

      // Map RatingType to numeric rating (1-4)
      final ratingValue = _getRatingValue(rating);

      // Calculate elapsed time in milliseconds
      final cardStartTime = _cardStartTimes[flashcard.id] ?? DateTime.now();
      final elapsedMs = DateTime.now().difference(cardStartTime).inMilliseconds;

      // Call the Cloud Function
      final result = await functions.httpsCallable('reviewCardInSession').call({
        'sessionId': _currentSessionId,
        'flashcardId': flashcard.id,
        'rating': ratingValue,
        'elapsedMs': elapsedMs,
      });

      if (result.data['success'] == true) {
        // Clear the start time for this card
        _cardStartTimes.remove(flashcard.id);

        // Show feedback if needed
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                'Card scheduled for ${result.data['review']['scheduledDays']} days',
              ),
              duration: const Duration(milliseconds: 800),
              backgroundColor: Colors.green,
            ),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        final errorMessage = 'Error recording review: ${e.toString()}';
        setState(() {
          _error = errorMessage;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(errorMessage),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  int _getRatingValue(RatingType rating) {
    switch (rating) {
      case RatingType.again:
        return 1; // Complete blackout, wrong answer
      case RatingType.hard:
        return 2; // Wrong answer, but remembered something
      case RatingType.good:
        return 3; // Correct answer with effort
      case RatingType.easy:
        return 4; // Perfect answer, effortless recall
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
      body: Column(
        children: [
          // Error banner
          if (_error != null)
            Material(
              color: Colors.red[50],
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(Icons.error, color: Colors.red[700]),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _error!,
                        style: TextStyle(color: Colors.red[700]),
                      ),
                    ),
                    IconButton(
                      icon: Icon(Icons.close, color: Colors.red[700]),
                      onPressed: () {
                        setState(() {
                          _error = null;
                        });
                      },
                    ),
                  ],
                ),
              ),
            ),
          // Main content
          Expanded(
            child: _isInitializing
                ? const Center(child: CircularProgressIndicator())
                : _currentSessionId == null
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              Icons.error_outline,
                              size: 80,
                              color: Colors.red[300],
                            ),
                            const SizedBox(height: 24),
                            Text(
                              'Failed to Start Study Session',
                              style: Theme.of(context).textTheme.headlineSmall,
                            ),
                            const SizedBox(height: 12),
                            Text(
                              _error ?? 'Please check your connection and try again',
                              style: Theme.of(context).textTheme.bodyMedium,
                              textAlign: TextAlign.center,
                            ),
                            const SizedBox(height: 24),
                            ElevatedButton(
                              onPressed: _initializeSession,
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      )
                    : flashcardsAsync.when(
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

                          // Track when this card is first displayed
                          final currentCard = flashcards[_currentIndex];
                          if (!_cardStartTimes.containsKey(currentCard.id)) {
                            _cardStartTimes[currentCard.id] = DateTime.now();
                          }

                          return SwipeableFlashcard(
                            flashcard: currentCard,
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
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.error_outline,
                                size: 80,
                                color: Colors.red[300],
                              ),
                              const SizedBox(height: 24),
                              Text(
                                'Error Loading Flashcards',
                                style: Theme.of(context).textTheme.headlineSmall,
                              ),
                              const SizedBox(height: 12),
                              Text(
                                error.toString(),
                                style: Theme.of(context).textTheme.bodyMedium,
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}
