import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod/riverpod.dart';
import '../models/domain_task_model.dart';
import 'firebase_provider.dart';

/// Get all tasks
final allTasksProvider = FutureProvider<List<TaskModel>>((ref) async {
  final firestore = ref.watch(firestoreProvider);

  try {
    final tasksSnapshot = await firestore
        .collection('tasks')
        .orderBy('createdAt')
        .get();

    return tasksSnapshot.docs
        .map((doc) => TaskModel.fromJson({...doc.data(), 'id': doc.id}))
        .toList();
  } catch (e) {
    throw Exception('Failed to load tasks: $e');
  }
});

/// Get tasks by domain ID
final tasksByDomainProvider =
    FutureProvider.family<List<TaskModel>, String>((ref, domainId) async {
  final firestore = ref.watch(firestoreProvider);

  try {
    final tasksSnapshot = await firestore
        .collection('tasks')
        .where('domainId', isEqualTo: domainId)
        .orderBy('createdAt')
        .get();

    return tasksSnapshot.docs
        .map((doc) => TaskModel.fromJson({...doc.data(), 'id': doc.id}))
        .toList();
  } catch (e) {
    throw Exception('Failed to load tasks for domain: $e');
  }
});

/// Get a single task by ID
final taskProvider =
    FutureProvider.family<TaskModel?, String>((ref, taskId) async {
  final firestore = ref.watch(firestoreProvider);

  try {
    final taskDoc = await firestore
        .collection('tasks')
        .doc(taskId)
        .get();

    if (!taskDoc.exists) {
      return null;
    }

    return TaskModel.fromJson({...taskDoc.data() ?? {}, 'id': taskDoc.id});
  } catch (e) {
    throw Exception('Failed to load task: $e');
  }
});

/// Stream of all tasks (real-time updates)
final allTasksStreamProvider = StreamProvider<List<TaskModel>>((ref) {
  final firestore = ref.watch(firestoreProvider);

  return firestore
      .collection('tasks')
      .orderBy('createdAt')
      .snapshots()
      .map((snapshot) {
    return snapshot.docs
        .map((doc) => TaskModel.fromJson({...doc.data(), 'id': doc.id}))
        .toList();
  });
});

/// Stream of tasks by domain (real-time updates)
final tasksByDomainStreamProvider =
    StreamProvider.family<List<TaskModel>, String>((ref, domainId) {
  final firestore = ref.watch(firestoreProvider);

  return firestore
      .collection('tasks')
      .where('domainId', isEqualTo: domainId)
      .orderBy('createdAt')
      .snapshots()
      .map((snapshot) {
    return snapshot.docs
        .map((doc) => TaskModel.fromJson({...doc.data(), 'id': doc.id}))
        .toList();
  });
});
