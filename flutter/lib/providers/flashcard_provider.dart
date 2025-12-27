import 'package:riverpod/riverpod.dart';
import '../models/flashcard_model.dart';
import '../services/firestore_service.dart';
import 'firebase_provider.dart';

// Get all flashcards for current user
final userFlashcardsProvider = StreamProvider<List<FlashcardModel>>((ref) {
  final userId = ref.watch(currentUserIdProvider);
  final firestoreService = ref.watch(firestoreServiceProvider);

  if (userId == null) {
    return const Stream.empty();
  }

  return firestoreService.getUserFlashcards(userId);
});

// Get flashcards due for review
final dueFlashcardsProvider = StreamProvider<List<FlashcardModel>>((ref) {
  final userId = ref.watch(currentUserIdProvider);
  final firestoreService = ref.watch(firestoreServiceProvider);

  if (userId == null) {
    return const Stream.empty();
  }

  return firestoreService.getDueFlashcards(userId);
});

// Get flashcards by domain
final flashcardsByDomainProvider =
    StreamProvider.family<List<FlashcardModel>, String>((ref, domainId) {
  final userId = ref.watch(currentUserIdProvider);
  final firestoreService = ref.watch(firestoreServiceProvider);

  if (userId == null) {
    return const Stream.empty();
  }

  return firestoreService.getFlashcardsByDomain(userId, domainId);
});

// Get flashcards by task
final flashcardsByTaskProvider =
    StreamProvider.family<List<FlashcardModel>, String>((ref, taskId) {
  final userId = ref.watch(currentUserIdProvider);
  final firestoreService = ref.watch(firestoreServiceProvider);

  if (userId == null) {
    return const Stream.empty();
  }

  return firestoreService.getFlashcardsByTask(userId, taskId);
});

// Notifier for flashcard operations
class FlashcardNotifier extends StateNotifier<AsyncValue<void>> {
  final FirestoreService _firestoreService;

  FlashcardNotifier(this._firestoreService) : super(const AsyncValue.data(null));

  Future<void> createFlashcard(FlashcardModel flashcard) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _firestoreService.createFlashcard(flashcard);
    });
  }

  Future<void> updateFlashcard(FlashcardModel flashcard) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _firestoreService.updateFlashcard(flashcard);
    });
  }

  Future<void> deleteFlashcard(String flashcardId) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _firestoreService.deleteFlashcard(flashcardId);
    });
  }

  Future<void> batchCreateFlashcards(List<FlashcardModel> flashcards) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _firestoreService.batchCreateFlashcards(flashcards);
    });
  }

  Future<void> batchUpdateFlashcards(List<FlashcardModel> flashcards) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _firestoreService.batchUpdateFlashcards(flashcards);
    });
  }
}

final flashcardProvider =
    StateNotifierProvider<FlashcardNotifier, AsyncValue<void>>((ref) {
  final firestoreService = ref.watch(firestoreServiceProvider);
  return FlashcardNotifier(firestoreService);
});
