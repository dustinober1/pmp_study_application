import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/practice_models.dart';
import '../services/json_import_service.dart';
import 'practice_provider.dart';

/// State for JSON import operations
class JsonImportState {
  final bool isLoading;
  final bool isSuccess;
  final String? errorMessage;
  final int? importedCount;
  final List<String>? validationErrors;

  JsonImportState({
    this.isLoading = false,
    this.isSuccess = false,
    this.errorMessage,
    this.importedCount,
    this.validationErrors,
  });

  JsonImportState copyWith({
    bool? isLoading,
    bool? isSuccess,
    String? errorMessage,
    int? importedCount,
    List<String>? validationErrors,
  }) {
    return JsonImportState(
      isLoading: isLoading ?? this.isLoading,
      isSuccess: isSuccess ?? this.isSuccess,
      errorMessage: errorMessage ?? this.errorMessage,
      importedCount: importedCount ?? this.importedCount,
      validationErrors: validationErrors ?? this.validationErrors,
    );
  }

  void reset() {
    // This would be handled by the notifier
  }
}

/// Notifier for managing JSON import state
class JsonImportNotifier extends StateNotifier<JsonImportState> {
  final Ref ref;

  JsonImportNotifier(this.ref) : super(JsonImportState());

  /// Parse JSON file and preview questions
  Future<List<PracticeQuestionContentModel>> parseJsonFile(File file) async {
    try {
      state = state.copyWith(
        isLoading: true,
        isSuccess: false,
        errorMessage: null,
        validationErrors: null,
      );

      final questions = await JsonImportService.parseJsonFile(file);

      state = state.copyWith(
        isLoading: false,
      );

      return questions;
    } on JsonImportException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      rethrow;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unexpected error: $e',
      );
      rethrow;
    }
  }

  /// Parse JSON string and preview questions
  Future<List<PracticeQuestionContentModel>> parseJsonString(
      String jsonString) async {
    try {
      state = state.copyWith(
        isLoading: true,
        isSuccess: false,
        errorMessage: null,
        validationErrors: null,
      );

      final questions = await JsonImportService.parseJsonString(jsonString);

      state = state.copyWith(
        isLoading: false,
      );

      return questions;
    } on JsonImportException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      rethrow;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Unexpected error: $e',
      );
      rethrow;
    }
  }

  /// Validate a list of questions
  Future<List<String>> validateQuestions(
    List<PracticeQuestionContentModel> questions,
  ) async {
    final errors = <String>[];

    for (int i = 0; i < questions.length; i++) {
      final question = questions[i];

      if (!JsonImportService.isValidDomainId(question.domainId)) {
        errors.add(
          'Question ${i + 1}: Invalid domainId "${question.domainId}". Must be: people, process, or business-environment',
        );
      }

      if (!JsonImportService.isValidDifficulty(question.difficulty)) {
        errors.add(
          'Question ${i + 1}: Invalid difficulty "${question.difficulty}". Must be: easy, medium, or hard',
        );
      }

      if (question.choices.length != 4) {
        errors.add(
          'Question ${i + 1}: Must have exactly 4 choices, found ${question.choices.length}',
        );
      }

      final correctChoices =
          question.choices.where((c) => c.isCorrect).toList();
      if (correctChoices.length != 1) {
        errors.add(
          'Question ${i + 1}: Must have exactly 1 correct answer, found ${correctChoices.length}',
        );
      }

      if (question.question.trim().isEmpty) {
        errors.add('Question ${i + 1}: Question text cannot be empty');
      }

      if (question.explanation.trim().isEmpty) {
        errors.add('Question ${i + 1}: Explanation text cannot be empty');
      }
    }

    if (errors.isNotEmpty) {
      state = state.copyWith(validationErrors: errors);
    }

    return errors;
  }

  /// Import questions from file
  Future<int> importFromFile(File file) async {
    try {
      state = state.copyWith(
        isLoading: true,
        isSuccess: false,
        errorMessage: null,
        importedCount: null,
      );

      final practiceService = ref.read(practiceServiceProvider);
      final count = await practiceService.importPracticeQuestionsFromFile(file);

      state = state.copyWith(
        isLoading: false,
        isSuccess: true,
        importedCount: count,
      );

      // Refresh practice questions in provider
      ref.invalidate(practiceQuestionsProvider);

      return count;
    } on JsonImportException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      rethrow;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to import: $e',
      );
      rethrow;
    }
  }

  /// Import questions from JSON string
  Future<int> importFromString(String jsonString) async {
    try {
      state = state.copyWith(
        isLoading: true,
        isSuccess: false,
        errorMessage: null,
        importedCount: null,
      );

      final practiceService = ref.read(practiceServiceProvider);
      final count =
          await practiceService.importPracticeQuestionsFromString(jsonString);

      state = state.copyWith(
        isLoading: false,
        isSuccess: true,
        importedCount: count,
      );

      // Refresh practice questions in provider
      ref.invalidate(practiceQuestionsProvider);

      return count;
    } on JsonImportException catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.message,
      );
      rethrow;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: 'Failed to import: $e',
      );
      rethrow;
    }
  }

  /// Reset import state
  void reset() {
    state = JsonImportState();
  }
}

/// Riverpod provider for JSON import state management
final jsonImportProvider =
    StateNotifierProvider<JsonImportNotifier, JsonImportState>((ref) {
  return JsonImportNotifier(ref);
});

/// Provider for validating questions without importing
final questionValidationProvider = FutureProvider.family<
    List<String>,
    List<PracticeQuestionContentModel>>((ref, questions) async {
  final importer = ref.read(jsonImportProvider.notifier);
  return importer.validateQuestions(questions);
});
