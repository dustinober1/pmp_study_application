import 'package:riverpod/riverpod.dart';
import '../models/practice_models.dart';
import '../services/practice_service.dart';
import 'firebase_provider.dart';

// Get all practice sessions for current user
final userPracticeSessionsProvider =
    StreamProvider<List<PracticeSessionModel>>((ref) {
  final userId = ref.watch(currentUserIdProvider);
  final practiceService = ref.watch(practiceServiceProvider);

  if (userId == null) {
    return const Stream.empty();
  }

  return practiceService.getUserPracticeSessions(userId);
});

// Get practice attempts for current user
final userPracticeAttemptsProvider =
    StreamProvider<List<PracticeAttemptModel>>((ref) {
  final userId = ref.watch(currentUserIdProvider);
  final practiceService = ref.watch(practiceServiceProvider);

  if (userId == null) {
    return const Stream.empty();
  }

  return practiceService.getUserPracticeAttempts(userId);
});

// Get a single practice session by ID
final practiceSessionProvider =
    FutureProvider.family<PracticeSessionModel?, String>((ref, sessionId) {
  final practiceService = ref.watch(practiceServiceProvider);
  return practiceService.getPracticeSession(sessionId);
});

// Get attempts for a specific session
final sessionAttemptsProvider =
    FutureProvider.family<List<PracticeAttemptModel>, String>((ref, sessionId) {
  final practiceService = ref.watch(practiceServiceProvider);
  return practiceService.getSessionAttempts(sessionId);
});

// Get attempts for a specific question
final questionAttemptsProvider = FutureProvider.family<List<PracticeAttemptModel>,
    ({String userId, String contentId})>((ref, params) {
  final practiceService = ref.watch(practiceServiceProvider);
  return practiceService.getQuestionAttempts(params.userId, params.contentId);
});

// Get all practice questions by domain
final practiceQuestionsByDomainProvider =
    StreamProvider.family<List<PracticeQuestionContentModel>, String>(
        (ref, domainId) {
  final practiceService = ref.watch(practiceServiceProvider);
  return practiceService.getPracticeQuestionsByDomain(domainId);
});

// Get all practice questions by task
final practiceQuestionsByTaskProvider =
    StreamProvider.family<List<PracticeQuestionContentModel>, String>(
        (ref, taskId) {
  final practiceService = ref.watch(practiceServiceProvider);
  return practiceService.getPracticeQuestionsByTask(taskId);
});

// Get all practice questions
final allPracticeQuestionsProvider =
    StreamProvider<List<PracticeQuestionContentModel>>((ref) {
  final practiceService = ref.watch(practiceServiceProvider);
  return practiceService.getAllPracticeQuestions();
});

// ============================================================================
// PRACTICE SESSION OPERATIONS
// ============================================================================

/// Notifier for practice session operations (create, update, end)
class PracticeSessionNotifier extends StateNotifier<AsyncValue<void>> {
  final PracticeService _practiceService;

  PracticeSessionNotifier(this._practiceService)
      : super(const AsyncValue.data(null));

  /// Create a new practice session
  Future<String> createSession({
    required String userId,
    required String type,
    String? domainId,
    String? taskId,
  }) async {
    state = const AsyncValue.loading();
    return await AsyncValue.guard(() async {
      return await _practiceService.createPracticeSession(
        userId: userId,
        type: type,
        domainId: domainId,
        taskId: taskId,
      );
    }).then(
      (asyncValue) => asyncValue.when(
        data: (sessionId) {
          state = const AsyncValue.data(null);
          return sessionId;
        },
        loading: () => throw StateError('Still loading'),
        error: (error, stackTrace) {
          state = AsyncValue.error(error, stackTrace);
          throw error;
        },
      ),
    );
  }

  /// End a practice session
  Future<void> endSession(String sessionId) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _practiceService.endPracticeSession(sessionId);
    });
  }

  /// Update practice session metrics
  Future<void> updateSessionMetrics({
    required String sessionId,
    required int questionsPresented,
    required int questionsAnswered,
    required int questionsSkipped,
    required int correctAnswers,
    required int incorrectAnswers,
    List<String>? questionIds,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _practiceService.updatePracticeSessionMetrics(
        sessionId: sessionId,
        questionsPresented: questionsPresented,
        questionsAnswered: questionsAnswered,
        questionsSkipped: questionsSkipped,
        correctAnswers: correctAnswers,
        incorrectAnswers: incorrectAnswers,
        questionIds: questionIds,
      );
    });
  }

  /// Delete a practice session (cleanup)
  Future<void> deleteSession(String sessionId) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _practiceService.deletePracticeSession(sessionId);
    });
  }
}

final practiceSessionNotifierProvider =
    StateNotifierProvider<PracticeSessionNotifier, AsyncValue<void>>((ref) {
  final practiceService = ref.watch(practiceServiceProvider);
  return PracticeSessionNotifier(practiceService);
});

// ============================================================================
// PRACTICE ATTEMPT OPERATIONS
// ============================================================================

/// Notifier for recording practice attempts
class PracticeAttemptNotifier extends StateNotifier<AsyncValue<void>> {
  final PracticeService _practiceService;

  PracticeAttemptNotifier(this._practiceService)
      : super(const AsyncValue.data(null));

  /// Submit a practice attempt
  Future<void> submitAttempt({
    required String userId,
    required String contentId,
    required String domainId,
    required String taskId,
    required String sessionId,
    required String selectedChoice,
    required bool isCorrect,
    required int timeSpent,
    required int attemptNumber,
    required bool skipped,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _practiceService.createPracticeAttempt(
        userId: userId,
        contentId: contentId,
        domainId: domainId,
        taskId: taskId,
        sessionId: sessionId,
        selectedChoice: selectedChoice,
        isCorrect: isCorrect,
        timeSpent: timeSpent,
        attemptNumber: attemptNumber,
        skipped: skipped,
      );
    });
  }

  /// Create a practice attempt history record
  Future<void> submitAttemptWithHistory({
    required String userId,
    required String contentId,
    required String domainId,
    required String taskId,
    required String sessionId,
    required String selectedChoice,
    required String correctChoice,
    required bool isCorrect,
    required int timeSpent,
    required int attemptNumber,
    required bool skipped,
  }) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() async {
      await _practiceService.createPracticeAttempt(
        userId: userId,
        contentId: contentId,
        domainId: domainId,
        taskId: taskId,
        sessionId: sessionId,
        selectedChoice: selectedChoice,
        isCorrect: isCorrect,
        timeSpent: timeSpent,
        attemptNumber: attemptNumber,
        skipped: skipped,
      );

      await _practiceService.createPracticeAttemptHistory(
        userId: userId,
        contentId: contentId,
        sessionId: sessionId,
        domainId: domainId,
        taskId: taskId,
        selectedChoice: selectedChoice,
        correctChoice: correctChoice,
        isCorrect: isCorrect,
        timeSpent: timeSpent,
        attemptNumber: attemptNumber,
        skipped: skipped,
      );
    });
  }
}

final practiceAttemptNotifierProvider =
    StateNotifierProvider<PracticeAttemptNotifier, AsyncValue<void>>((ref) {
  final practiceService = ref.watch(practiceServiceProvider);
  return PracticeAttemptNotifier(practiceService);
});

// ============================================================================
// SESSION STATE MANAGEMENT
// ============================================================================

/// Current practice session ID
final currentPracticeSessionProvider = StateProvider<String?>((ref) => null);

/// Current question index in session
final currentQuestionIndexProvider = StateProvider<int>((ref) => 0);

/// Timer for current question (in seconds)
final questionTimerProvider = StateProvider<int>((ref) => 0);

/// Session metrics tracking
final practiceSessionMetricsProvider = StateProvider<
    ({
      int presented,
      int answered,
      int skipped,
      int correct,
      int incorrect
    })>((ref) => (presented: 0, answered: 0, skipped: 0, correct: 0, incorrect: 0));

// Deprecated alias for backward compatibility
final practiceProvider = practiceSessionNotifierProvider;
