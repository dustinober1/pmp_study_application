import 'package:json_annotation/json_annotation.dart';

part 'flashcard_model.g.dart';

@JsonSerializable()
class FlashcardModel {
  final String id;
  final String userId;
  final String question;
  final String answer;
  final String domainId;
  final String taskId;

  // FSRS Fields
  final int repetitions;
  final double easeFactor;
  final int interval;
  final DateTime nextReviewDate;
  final DateTime lastReviewDate;

  // Metadata
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isFavorite;
  final List<String>? tags;

  FlashcardModel({
    required this.id,
    required this.userId,
    required this.question,
    required this.answer,
    required this.domainId,
    required this.taskId,
    this.repetitions = 0,
    this.easeFactor = 2.5,
    this.interval = 1,
    required this.nextReviewDate,
    required this.lastReviewDate,
    required this.createdAt,
    required this.updatedAt,
    this.isFavorite = false,
    this.tags,
  });

  factory FlashcardModel.fromJson(Map<String, dynamic> json) =>
      _$FlashcardModelFromJson(json);

  Map<String, dynamic> toJson() => _$FlashcardModelToJson(this);

  FlashcardModel copyWith({
    String? id,
    String? userId,
    String? question,
    String? answer,
    String? domainId,
    String? taskId,
    int? repetitions,
    double? easeFactor,
    int? interval,
    DateTime? nextReviewDate,
    DateTime? lastReviewDate,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isFavorite,
    List<String>? tags,
  }) {
    return FlashcardModel(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      question: question ?? this.question,
      answer: answer ?? this.answer,
      domainId: domainId ?? this.domainId,
      taskId: taskId ?? this.taskId,
      repetitions: repetitions ?? this.repetitions,
      easeFactor: easeFactor ?? this.easeFactor,
      interval: interval ?? this.interval,
      nextReviewDate: nextReviewDate ?? this.nextReviewDate,
      lastReviewDate: lastReviewDate ?? this.lastReviewDate,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isFavorite: isFavorite ?? this.isFavorite,
      tags: tags ?? this.tags,
    );
  }
}
