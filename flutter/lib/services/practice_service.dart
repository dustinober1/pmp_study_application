import 'dart:io';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod/riverpod.dart';
import '../models/practice_models.dart';
import '../providers/firebase_provider.dart';
import 'json_import_service.dart';

class PracticeService {
  final FirebaseFirestore _firestore;

  PracticeService(this._firestore);

  // ============================================================================
  // PRACTICE QUESTION CONTENT (Master/Admin-managed)
  // ============================================================================

  /// Get a single practice question by ID
  Future<PracticeQuestionContentModel?> getPracticeQuestion(
      String questionId) async {
    final doc = await _firestore
        .collection('practiceQuestions')
        .doc(questionId)
        .get();
    if (doc.exists) {
      return PracticeQuestionContentModel.fromJson(doc.data() ?? {});
    }
    return null;
  }

  /// Get practice questions by domain
  Stream<List<PracticeQuestionContentModel>> getPracticeQuestionsByDomain(
      String domainId) {
    return _firestore
        .collection('practiceQuestions')
        .where('domainId', isEqualTo: domainId)
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => PracticeQuestionContentModel.fromJson(doc.data()))
          .toList();
    });
  }

  /// Get practice questions by task
  Stream<List<PracticeQuestionContentModel>> getPracticeQuestionsByTask(
      String taskId) {
    return _firestore
        .collection('practiceQuestions')
        .where('taskId', isEqualTo: taskId)
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => PracticeQuestionContentModel.fromJson(doc.data()))
          .toList();
    });
  }

  /// Get all active practice questions
  Stream<List<PracticeQuestionContentModel>> getAllPracticeQuestions() {
    return _firestore
        .collection('practiceQuestions')
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => PracticeQuestionContentModel.fromJson(doc.data()))
          .toList();
    });
  }

  // ============================================================================
  // PRACTICE SESSIONS
  // ============================================================================

  /// Create a new practice session
  Future<String> createPracticeSession({
    required String userId,
    required String type, // 'all', 'domain', or 'task'
    String? domainId,
    String? taskId,
  }) async {
    final doc = _firestore.collection('practiceSessions').doc();
    final now = DateTime.now();

    await doc.set({
      'id': doc.id,
      'userId': userId,
      'startedAt': now,
      'durationSeconds': 0,
      'scope': {
        'type': type,
        if (domainId != null) 'domainId': domainId,
        if (taskId != null) 'taskId': taskId,
      },
      'questionsPresented': 0,
      'questionsAnswered': 0,
      'questionsSkipped': 0,
      'correctAnswers': 0,
      'incorrectAnswers': 0,
      'successRate': 0.0,
      'questionIds': [],
      'platform': 'android', // TODO: Detect platform dynamically
      'createdAt': now,
    });

    return doc.id;
  }

  /// Get a practice session
  Future<PracticeSessionModel?> getPracticeSession(String sessionId) async {
    final doc = await _firestore
        .collection('practiceSessions')
        .doc(sessionId)
        .get();
    if (doc.exists) {
      return PracticeSessionModel.fromJson(doc.data() ?? {});
    }
    return null;
  }

  /// Update practice session metrics
  Future<void> updatePracticeSessionMetrics({
    required String sessionId,
    required int questionsPresented,
    required int questionsAnswered,
    required int questionsSkipped,
    required int correctAnswers,
    required int incorrectAnswers,
    List<String>? questionIds,
  }) async {
    final successRate = questionsAnswered > 0
        ? correctAnswers / questionsAnswered
        : 0.0;

    await _firestore
        .collection('practiceSessions')
        .doc(sessionId)
        .update({
      'questionsPresented': questionsPresented,
      'questionsAnswered': questionsAnswered,
      'questionsSkipped': questionsSkipped,
      'correctAnswers': correctAnswers,
      'incorrectAnswers': incorrectAnswers,
      'successRate': successRate,
      if (questionIds != null) 'questionIds': questionIds,
    });
  }

  /// End a practice session
  Future<void> endPracticeSession(String sessionId) async {
    final session = await getPracticeSession(sessionId);
    if (session == null) return;

    final now = DateTime.now();
    final durationSeconds = now
        .difference(session.startedAt)
        .inSeconds;

    await _firestore
        .collection('practiceSessions')
        .doc(sessionId)
        .update({
      'endedAt': now,
      'durationSeconds': durationSeconds,
    });
  }

  /// Get user's practice sessions
  Stream<List<PracticeSessionModel>> getUserPracticeSessions(String userId) {
    return _firestore
        .collection('practiceSessions')
        .where('userId', isEqualTo: userId)
        .orderBy('startedAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => PracticeSessionModel.fromJson(doc.data()))
          .toList();
    });
  }

  // ============================================================================
  // PRACTICE ATTEMPTS
  // ============================================================================

  /// Create a practice attempt
  Future<String> createPracticeAttempt({
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
    final doc = _firestore.collection('practiceAttempts').doc();
    final now = DateTime.now();

    await doc.set({
      'id': doc.id,
      'userId': userId,
      'contentId': contentId,
      'domainId': domainId,
      'taskId': taskId,
      'sessionId': sessionId,
      'selectedChoice': selectedChoice,
      'isCorrect': isCorrect,
      'timeSpent': timeSpent,
      'attempt': attemptNumber,
      'skipped': skipped,
      'attemptedAt': now,
      'createdAt': now,
    });

    return doc.id;
  }

  /// Get practice attempts for a session
  Future<List<PracticeAttemptModel>> getSessionAttempts(
      String sessionId) async {
    final snapshot = await _firestore
        .collection('practiceAttempts')
        .where('sessionId', isEqualTo: sessionId)
        .get();

    return snapshot.docs
        .map((doc) => PracticeAttemptModel.fromJson(doc.data()))
        .toList();
  }

  /// Get practice attempts for a user
  Stream<List<PracticeAttemptModel>> getUserPracticeAttempts(
      String userId) {
    return _firestore
        .collection('practiceAttempts')
        .where('userId', isEqualTo: userId)
        .orderBy('attemptedAt', descending: true)
        .snapshots()
        .map((snapshot) {
      return snapshot.docs
          .map((doc) => PracticeAttemptModel.fromJson(doc.data()))
          .toList();
    });
  }

  /// Get practice attempts for a specific question
  Future<List<PracticeAttemptModel>> getQuestionAttempts(
    String userId,
    String contentId,
  ) async {
    final snapshot = await _firestore
        .collection('practiceAttempts')
        .where('userId', isEqualTo: userId)
        .where('contentId', isEqualTo: contentId)
        .orderBy('attemptedAt', descending: true)
        .get();

    return snapshot.docs
        .map((doc) => PracticeAttemptModel.fromJson(doc.data()))
        .toList();
  }

  // ============================================================================
  // PRACTICE ATTEMPT HISTORY
  // ============================================================================

  /// Create a practice attempt history record
  Future<String> createPracticeAttemptHistory({
    required String userId,
    required String contentId,
    required String sessionId,
    required String domainId,
    required String taskId,
    required String selectedChoice,
    required String correctChoice,
    required bool isCorrect,
    required int timeSpent,
    required int attemptNumber,
    required bool skipped,
  }) async {
    final doc = _firestore.collection('practiceAttemptHistory').doc();
    final now = DateTime.now();

    await doc.set({
      'id': doc.id,
      'userId': userId,
      'contentId': contentId,
      'sessionId': sessionId,
      'domainId': domainId,
      'taskId': taskId,
      'selectedChoice': selectedChoice,
      'correctChoice': correctChoice,
      'isCorrect': isCorrect,
      'timeSpent': timeSpent,
      'attempt': attemptNumber,
      'skipped': skipped,
      'attemptedAt': now,
      'createdAt': now,
    });

    return doc.id;
  }

  // ============================================================================
  // BATCH OPERATIONS
  // ============================================================================

  /// Batch create practice questions (admin use)
  Future<void> batchCreatePracticeQuestions(
      List<PracticeQuestionContentModel> questions) async {
    final batch = _firestore.batch();
    for (final question in questions) {
      batch.set(
        _firestore.collection('practiceQuestions').doc(question.id),
        question.toJson(),
      );
    }
    await batch.commit();
  }

  /// Batch import practice questions from JSON raw data
  Future<void> importPracticeQuestions(
      List<Map<String, dynamic>> questionData) async {
    final batch = _firestore.batch();
    for (final data in questionData) {
      final doc = _firestore.collection('practiceQuestions').doc();
      final question = PracticeQuestionContentModel.fromJson({
        'id': doc.id,
        ...data,
        'isActive': data['isActive'] ?? true,
        'createdAt': DateTime.now(),
        'updatedAt': DateTime.now(),
        'stats': {
          'totalAttempts': 0,
          'correctAttempts': 0,
          'successRate': 0.0,
        },
      });
      batch.set(doc, question.toJson());
    }
    await batch.commit();
  }

  /// Import practice questions from a JSON file
  ///
  /// Parses the JSON file and validates all questions before importing.
  /// Returns the number of questions successfully imported.
  /// Throws [JsonImportException] if validation fails.
  Future<int> importPracticeQuestionsFromFile(File jsonFile) async {
    // Parse and validate questions
    final questions = await JsonImportService.parseJsonFile(jsonFile);

    // Additional validation if needed
    for (final question in questions) {
      if (!JsonImportService.isValidDomainId(question.domainId)) {
        throw JsonImportException(
          'Invalid domainId: ${question.domainId}. Must be one of: people, process, business-environment',
        );
      }
      if (!JsonImportService.isValidDifficulty(question.difficulty)) {
        throw JsonImportException(
          'Invalid difficulty: ${question.difficulty}. Must be one of: easy, medium, hard',
        );
      }
    }

    // Batch write to Firestore
    final batch = _firestore.batch();
    for (final question in questions) {
      final doc = _firestore.collection('practiceQuestions').doc();
      final questionWithId = question.copyWith(id: doc.id);
      batch.set(doc, questionWithId.toJson());
    }
    await batch.commit();

    return questions.length;
  }

  /// Import practice questions from JSON string
  ///
  /// Parses the JSON string and validates all questions before importing.
  /// Returns the number of questions successfully imported.
  /// Throws [JsonImportException] if validation fails.
  Future<int> importPracticeQuestionsFromString(String jsonString) async {
    // Parse and validate questions
    final questions = await JsonImportService.parseJsonString(jsonString);

    // Batch write to Firestore
    final batch = _firestore.batch();
    for (final question in questions) {
      final doc = _firestore.collection('practiceQuestions').doc();
      final questionWithId = question.copyWith(id: doc.id);
      batch.set(doc, questionWithId.toJson());
    }
    await batch.commit();

    return questions.length;
  }

  /// Import a list of already-parsed practice questions
  ///
  /// Useful when questions have been validated separately.
  /// Returns the number of questions successfully imported.
  Future<int> importParsedPracticeQuestions(
    List<PracticeQuestionContentModel> questions,
  ) async {
    final batch = _firestore.batch();
    for (final question in questions) {
      final doc = _firestore.collection('practiceQuestions').doc();
      final questionWithId = question.copyWith(id: doc.id);
      batch.set(doc, questionWithId.toJson());
    }
    await batch.commit();

    return questions.length;
  }

  /// Delete a practice session (cleanup)
  Future<void> deletePracticeSession(String sessionId) async {
    // Delete all attempts for this session
    final attempts = await getSessionAttempts(sessionId);
    final batch = _firestore.batch();

    for (final attempt in attempts) {
      batch.delete(
        _firestore.collection('practiceAttempts').doc(attempt.id),
      );
    }

    // Delete the session
    batch.delete(
      _firestore.collection('practiceSessions').doc(sessionId),
    );

    await batch.commit();
  }
}

final practiceServiceProvider = Provider<PracticeService>((ref) {
  final firestore = ref.watch(firestoreProvider);
  return PracticeService(firestore);
});
