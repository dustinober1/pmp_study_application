import 'dart:convert';
import 'dart:io';
import 'package:flutter/services.dart';
import '../models/practice_models.dart';

/// Exception thrown during JSON import operations
class JsonImportException implements Exception {
  final String message;
  final dynamic originalError;

  JsonImportException(this.message, [this.originalError]);

  @override
  String toString() => 'JsonImportException: $message${originalError != null ? '\nCause: $originalError' : ''}';
}

/// Service for importing practice questions from JSON files
class JsonImportService {
  /// Parse JSON file content and return list of practice questions
  ///
  /// Expects JSON format:
  /// ```json
  /// {
  ///   "questions": [
  ///     {
  ///       "domainId": "people",
  ///       "taskId": "people-1",
  ///       "question": "Question text?",
  ///       "choices": [
  ///         {"letter": "A", "text": "Choice A", "isCorrect": true},
  ///         {"letter": "B", "text": "Choice B", "isCorrect": false},
  ///         {"letter": "C", "text": "Choice C", "isCorrect": false},
  ///         {"letter": "D", "text": "Choice D", "isCorrect": false}
  ///       ],
  ///       "explanation": "Why the answer is correct...",
  ///       "references": ["PMBOK 7th Edition, Section X.X"],
  ///       "difficulty": "medium",
  ///       "tags": ["tag1", "tag2"],
  ///       "version": 1
  ///     }
  ///   ]
  /// }
  /// ```
  static Future<List<PracticeQuestionContentModel>> parseJsonFile(
    File file,
  ) async {
    try {
      final content = await file.readAsString();
      return parseJsonString(content);
    } catch (e) {
      throw JsonImportException('Failed to read file: ${file.path}', e);
    }
  }

  /// Parse JSON string and return list of practice questions
  static Future<List<PracticeQuestionContentModel>> parseJsonString(
    String jsonString,
  ) async {
    try {
      final json = jsonDecode(jsonString);

      if (json is! Map<String, dynamic>) {
        throw JsonImportException(
          'Root JSON must be an object',
        );
      }

      final questionsList = json['questions'];
      if (questionsList is! List) {
        throw JsonImportException(
          'JSON must contain a "questions" array at the root level',
        );
      }

      final questions = <PracticeQuestionContentModel>[];

      for (int i = 0; i < questionsList.length; i++) {
        try {
          final questionData = questionsList[i];
          if (questionData is! Map<String, dynamic>) {
            throw JsonImportException(
              'Question at index $i is not an object',
            );
          }

          final question = _parseQuestion(questionData, i);
          questions.add(question);
        } catch (e) {
          if (e is JsonImportException) {
            rethrow;
          }
          throw JsonImportException(
            'Error parsing question at index $i: $e',
            e,
          );
        }
      }

      if (questions.isEmpty) {
        throw JsonImportException('No valid questions found in JSON');
      }

      return questions;
    } catch (e) {
      if (e is JsonImportException) {
        rethrow;
      }
      throw JsonImportException('Invalid JSON format: $e', e);
    }
  }

  /// Parse a single question object from JSON
  static PracticeQuestionContentModel _parseQuestion(
    Map<String, dynamic> data,
    int index,
  ) {
    // Required fields
    final domainId = _getRequiredString(data, 'domainId', index);
    final taskId = _getRequiredString(data, 'taskId', index);
    final question = _getRequiredString(data, 'question', index);
    final explanation = _getRequiredString(data, 'explanation', index);

    // Parse choices
    final choicesData = data['choices'];
    if (choicesData is! List) {
      throw JsonImportException(
        'Question at index $index: "choices" must be an array',
      );
    }

    if (choicesData.length != 4) {
      throw JsonImportException(
        'Question at index $index: must have exactly 4 choices, found ${choicesData.length}',
      );
    }

    final choices = <AnswerChoice>[];
    bool hasCorrectAnswer = false;

    for (int i = 0; i < choicesData.length; i++) {
      final choiceData = choicesData[i];
      if (choiceData is! Map<String, dynamic>) {
        throw JsonImportException(
          'Question at index $index, choice $i: not an object',
        );
      }

      try {
        final choice = AnswerChoice.fromJson(choiceData);
        choices.add(choice);

        if (choice.isCorrect) {
          if (hasCorrectAnswer) {
            throw JsonImportException(
              'Question at index $index: multiple correct answers found',
            );
          }
          hasCorrectAnswer = true;
        }
      } catch (e) {
        if (e is JsonImportException) {
          rethrow;
        }
        throw JsonImportException(
          'Question at index $index, choice $i: invalid choice format - $e',
          e,
        );
      }
    }

    if (!hasCorrectAnswer) {
      throw JsonImportException(
        'Question at index $index: no correct answer marked',
      );
    }

    // Optional fields
    final references = data['references'] is List
        ? List<String>.from(data['references'] as List)
        : null;
    final difficulty = data['difficulty'] ?? 'medium';
    final tags = data['tags'] is List
        ? List<String>.from(data['tags'] as List)
        : <String>[];
    final version = data['version'] ?? 1;

    final now = DateTime.now();

    return PracticeQuestionContentModel(
      id: '', // Will be set by Firestore
      domainId: domainId,
      taskId: taskId,
      question: question,
      choices: choices,
      explanation: explanation,
      references: references,
      difficulty: difficulty as String,
      tags: tags,
      version: version as int,
      stats: PracticeQuestionStats(),
      isActive: data['isActive'] ?? true,
      createdAt: now,
      updatedAt: now,
    );
  }

  /// Get a required string field from JSON
  static String _getRequiredString(
    Map<String, dynamic> data,
    String field,
    int questionIndex,
  ) {
    final value = data[field];
    if (value is! String || value.trim().isEmpty) {
      throw JsonImportException(
        'Question at index $questionIndex: "$field" is required and must be a non-empty string',
      );
    }
    return value;
  }

  /// Validate domain IDs (should match known PMP domains)
  static bool isValidDomainId(String domainId) {
    const validDomains = {'people', 'process', 'business-environment'};
    return validDomains.contains(domainId);
  }

  /// Validate difficulty level
  static bool isValidDifficulty(String difficulty) {
    const validDifficulties = {'easy', 'medium', 'hard'};
    return validDifficulties.contains(difficulty);
  }

  /// Load sample questions from JSON asset
  static Future<List<PracticeQuestionContentModel>> loadSampleQuestions() async {
    try {
      final jsonString = await rootBundle.loadString(
        'assets/data/sample-questions.json',
      );
      return parseJsonString(jsonString);
    } catch (e) {
      throw JsonImportException(
        'Failed to load sample questions from assets',
        e,
      );
    }
  }
}
