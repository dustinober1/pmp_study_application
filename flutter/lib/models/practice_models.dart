import 'package:json_annotation/json_annotation.dart';

part 'practice_models.g.dart';

/// Answer choice for a multiple choice question
@JsonSerializable()
class AnswerChoice {
  final String letter;      // 'A', 'B', 'C', or 'D'
  final String text;        // Choice text
  final bool isCorrect;     // Whether this is the correct answer

  AnswerChoice({
    required this.letter,
    required this.text,
    required this.isCorrect,
  });

  factory AnswerChoice.fromJson(Map<String, dynamic> json) =>
      _$AnswerChoiceFromJson(json);

  Map<String, dynamic> toJson() => _$AnswerChoiceToJson(this);

  AnswerChoice copyWith({
    String? letter,
    String? text,
    bool? isCorrect,
  }) {
    return AnswerChoice(
      letter: letter ?? this.letter,
      text: text ?? this.text,
      isCorrect: isCorrect ?? this.isCorrect,
    );
  }
}

/// Stats for a practice question content
@JsonSerializable()
class PracticeQuestionStats {
  final int totalAttempts;
  final int correctAttempts;
  final double successRate;

  PracticeQuestionStats({
    this.totalAttempts = 0,
    this.correctAttempts = 0,
    this.successRate = 0.0,
  });

  factory PracticeQuestionStats.fromJson(Map<String, dynamic> json) =>
      _$PracticeQuestionStatsFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeQuestionStatsToJson(this);

  PracticeQuestionStats copyWith({
    int? totalAttempts,
    int? correctAttempts,
    double? successRate,
  }) {
    return PracticeQuestionStats(
      totalAttempts: totalAttempts ?? this.totalAttempts,
      correctAttempts: correctAttempts ?? this.correctAttempts,
      successRate: successRate ?? this.successRate,
    );
  }
}

/// Master practice question content (admin-managed)
@JsonSerializable()
class PracticeQuestionContentModel {
  final String id;
  final String domainId;
  final String taskId;
  final String question;
  final List<AnswerChoice> choices;
  final String explanation;
  final List<String>? references;
  final String difficulty;  // 'easy', 'medium', 'hard'
  final List<String> tags;
  final int version;
  final PracticeQuestionStats stats;
  final bool isActive;
  final DateTime createdAt;
  final DateTime updatedAt;

  PracticeQuestionContentModel({
    required this.id,
    required this.domainId,
    required this.taskId,
    required this.question,
    required this.choices,
    required this.explanation,
    this.references,
    this.difficulty = 'medium',
    this.tags = const [],
    this.version = 1,
    required this.stats,
    this.isActive = true,
    required this.createdAt,
    required this.updatedAt,
  });

  factory PracticeQuestionContentModel.fromJson(Map<String, dynamic> json) =>
      _$PracticeQuestionContentModelFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeQuestionContentModelToJson(this);

  PracticeQuestionContentModel copyWith({
    String? id,
    String? domainId,
    String? taskId,
    String? question,
    List<AnswerChoice>? choices,
    String? explanation,
    List<String>? references,
    String? difficulty,
    List<String>? tags,
    int? version,
    PracticeQuestionStats? stats,
    bool? isActive,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return PracticeQuestionContentModel(
      id: id ?? this.id,
      domainId: domainId ?? this.domainId,
      taskId: taskId ?? this.taskId,
      question: question ?? this.question,
      choices: choices ?? this.choices,
      explanation: explanation ?? this.explanation,
      references: references ?? this.references,
      difficulty: difficulty ?? this.difficulty,
      tags: tags ?? this.tags,
      version: version ?? this.version,
      stats: stats ?? this.stats,
      isActive: isActive ?? this.isActive,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Find the correct answer choice
  AnswerChoice? getCorrectChoice() {
    try {
      return choices.firstWhere((choice) => choice.isCorrect);
    } catch (e) {
      return null;
    }
  }
}

/// User practice session
@JsonSerializable()
class PracticeSessionModel {
  final String id;
  final String userId;
  final DateTime startedAt;
  final DateTime? endedAt;
  final int durationSeconds;
  final PracticeSessionScope scope;
  final int questionsPresented;
  final int questionsAnswered;
  final int questionsSkipped;
  final int correctAnswers;
  final int incorrectAnswers;
  final double successRate;
  final List<String> questionIds;
  final String platform;  // 'android', 'ios', 'web'
  final DateTime createdAt;

  PracticeSessionModel({
    required this.id,
    required this.userId,
    required this.startedAt,
    this.endedAt,
    this.durationSeconds = 0,
    required this.scope,
    this.questionsPresented = 0,
    this.questionsAnswered = 0,
    this.questionsSkipped = 0,
    this.correctAnswers = 0,
    this.incorrectAnswers = 0,
    this.successRate = 0.0,
    this.questionIds = const [],
    required this.platform,
    required this.createdAt,
  });

  factory PracticeSessionModel.fromJson(Map<String, dynamic> json) =>
      _$PracticeSessionModelFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeSessionModelToJson(this);

  PracticeSessionModel copyWith({
    String? id,
    String? userId,
    DateTime? startedAt,
    DateTime? endedAt,
    int? durationSeconds,
    PracticeSessionScope? scope,
    int? questionsPresented,
    int? questionsAnswered,
    int? questionsSkipped,
    int? correctAnswers,
    int? incorrectAnswers,
    double? successRate,
    List<String>? questionIds,
    String? platform,
    DateTime? createdAt,
  }) {
    return PracticeSessionModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      startedAt: startedAt ?? this.startedAt,
      endedAt: endedAt ?? this.endedAt,
      durationSeconds: durationSeconds ?? this.durationSeconds,
      scope: scope ?? this.scope,
      questionsPresented: questionsPresented ?? this.questionsPresented,
      questionsAnswered: questionsAnswered ?? this.questionsAnswered,
      questionsSkipped: questionsSkipped ?? this.questionsSkipped,
      correctAnswers: correctAnswers ?? this.correctAnswers,
      incorrectAnswers: incorrectAnswers ?? this.incorrectAnswers,
      successRate: successRate ?? this.successRate,
      questionIds: questionIds ?? this.questionIds,
      platform: platform ?? this.platform,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// Practice session scope
@JsonSerializable()
class PracticeSessionScope {
  final String type;        // 'all', 'domain', or 'task'
  final String? domainId;
  final String? taskId;

  PracticeSessionScope({
    required this.type,
    this.domainId,
    this.taskId,
  });

  factory PracticeSessionScope.fromJson(Map<String, dynamic> json) =>
      _$PracticeSessionScopeFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeSessionScopeToJson(this);

  PracticeSessionScope copyWith({
    String? type,
    String? domainId,
    String? taskId,
  }) {
    return PracticeSessionScope(
      type: type ?? this.type,
      domainId: domainId ?? this.domainId,
      taskId: taskId ?? this.taskId,
    );
  }
}

/// User's practice attempt for a single question
@JsonSerializable()
class PracticeAttemptModel {
  final String id;
  final String userId;
  final String contentId;
  final String domainId;
  final String taskId;
  final String sessionId;
  final String selectedChoice;
  final bool isCorrect;
  final int timeSpent;           // Seconds
  final int attempt;             // Attempt number
  final bool skipped;
  final DateTime attemptedAt;
  final DateTime createdAt;

  PracticeAttemptModel({
    required this.id,
    required this.userId,
    required this.contentId,
    required this.domainId,
    required this.taskId,
    required this.sessionId,
    required this.selectedChoice,
    required this.isCorrect,
    required this.timeSpent,
    required this.attempt,
    required this.skipped,
    required this.attemptedAt,
    required this.createdAt,
  });

  factory PracticeAttemptModel.fromJson(Map<String, dynamic> json) =>
      _$PracticeAttemptModelFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeAttemptModelToJson(this);

  PracticeAttemptModel copyWith({
    String? id,
    String? userId,
    String? contentId,
    String? domainId,
    String? taskId,
    String? sessionId,
    String? selectedChoice,
    bool? isCorrect,
    int? timeSpent,
    int? attempt,
    bool? skipped,
    DateTime? attemptedAt,
    DateTime? createdAt,
  }) {
    return PracticeAttemptModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      contentId: contentId ?? this.contentId,
      domainId: domainId ?? this.domainId,
      taskId: taskId ?? this.taskId,
      sessionId: sessionId ?? this.sessionId,
      selectedChoice: selectedChoice ?? this.selectedChoice,
      isCorrect: isCorrect ?? this.isCorrect,
      timeSpent: timeSpent ?? this.timeSpent,
      attempt: attempt ?? this.attempt,
      skipped: skipped ?? this.skipped,
      attemptedAt: attemptedAt ?? this.attemptedAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}

/// Practice attempt history record
@JsonSerializable()
class PracticeAttemptHistoryModel {
  final String id;
  final String userId;
  final String contentId;
  final String sessionId;
  final String domainId;
  final String taskId;
  final String selectedChoice;
  final String correctChoice;
  final bool isCorrect;
  final int timeSpent;           // Seconds
  final int attempt;             // Attempt number
  final bool skipped;
  final DateTime attemptedAt;
  final DateTime createdAt;

  PracticeAttemptHistoryModel({
    required this.id,
    required this.userId,
    required this.contentId,
    required this.sessionId,
    required this.domainId,
    required this.taskId,
    required this.selectedChoice,
    required this.correctChoice,
    required this.isCorrect,
    required this.timeSpent,
    required this.attempt,
    required this.skipped,
    required this.attemptedAt,
    required this.createdAt,
  });

  factory PracticeAttemptHistoryModel.fromJson(Map<String, dynamic> json) =>
      _$PracticeAttemptHistoryModelFromJson(json);

  Map<String, dynamic> toJson() => _$PracticeAttemptHistoryModelToJson(this);

  PracticeAttemptHistoryModel copyWith({
    String? id,
    String? userId,
    String? contentId,
    String? sessionId,
    String? domainId,
    String? taskId,
    String? selectedChoice,
    String? correctChoice,
    bool? isCorrect,
    int? timeSpent,
    int? attempt,
    bool? skipped,
    DateTime? attemptedAt,
    DateTime? createdAt,
  }) {
    return PracticeAttemptHistoryModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      contentId: contentId ?? this.contentId,
      sessionId: sessionId ?? this.sessionId,
      domainId: domainId ?? this.domainId,
      taskId: taskId ?? this.taskId,
      selectedChoice: selectedChoice ?? this.selectedChoice,
      correctChoice: correctChoice ?? this.correctChoice,
      isCorrect: isCorrect ?? this.isCorrect,
      timeSpent: timeSpent ?? this.timeSpent,
      attempt: attempt ?? this.attempt,
      skipped: skipped ?? this.skipped,
      attemptedAt: attemptedAt ?? this.attemptedAt,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
