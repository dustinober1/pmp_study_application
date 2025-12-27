import 'package:json_annotation/json_annotation.dart';

part 'domain_task_model.g.dart';

/// PMP Domain (People, Process, Business Environment)
@JsonSerializable()
class DomainModel {
  final String id;
  final String name;
  final String? description;
  final int percentageOfExam;
  final List<TaskModel> tasks;
  final DateTime createdAt;
  final DateTime updatedAt;

  DomainModel({
    required this.id,
    required this.name,
    this.description,
    required this.percentageOfExam,
    required this.tasks,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DomainModel.fromJson(Map<String, dynamic> json) =>
      _$DomainModelFromJson(json);

  Map<String, dynamic> toJson() => _$DomainModelToJson(this);

  DomainModel copyWith({
    String? id,
    String? name,
    String? description,
    int? percentageOfExam,
    List<TaskModel>? tasks,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return DomainModel(
      id: id ?? this.id,
      name: name ?? this.name,
      description: description ?? this.description,
      percentageOfExam: percentageOfExam ?? this.percentageOfExam,
      tasks: tasks ?? this.tasks,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// PMP Task (26 total across 3 domains)
@JsonSerializable()
class TaskModel {
  final String id;
  final String domainId;
  final String name;
  final String? description;
  final List<String> keywords;
  final DateTime createdAt;
  final DateTime updatedAt;

  TaskModel({
    required this.id,
    required this.domainId,
    required this.name,
    this.description,
    required this.keywords,
    required this.createdAt,
    required this.updatedAt,
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) =>
      _$TaskModelFromJson(json);

  Map<String, dynamic> toJson() => _$TaskModelToJson(this);

  TaskModel copyWith({
    String? id,
    String? domainId,
    String? name,
    String? description,
    List<String>? keywords,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return TaskModel(
      id: id ?? this.id,
      domainId: domainId ?? this.domainId,
      name: name ?? this.name,
      description: description ?? this.description,
      keywords: keywords ?? this.keywords,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}
