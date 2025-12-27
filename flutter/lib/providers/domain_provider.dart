import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:riverpod/riverpod.dart';
import '../models/domain_task_model.dart';
import 'firebase_provider.dart';

/// Get all PMP domains with their tasks
final allDomainsProvider = FutureProvider<List<DomainModel>>((ref) async {
  final firestore = ref.watch(firestoreProvider);

  try {
    final domainsSnapshot = await firestore
        .collection('domains')
        .orderBy('createdAt')
        .get();

    final domains = <DomainModel>[];

    for (final domainDoc in domainsSnapshot.docs) {
      final domainData = domainDoc.data();
      final tasksSnapshot = await firestore
          .collection('tasks')
          .where('domainId', isEqualTo: domainDoc.id)
          .orderBy('createdAt')
          .get();

      final tasks = tasksSnapshot.docs
          .map((doc) => TaskModel.fromJson({...doc.data(), 'id': doc.id}))
          .toList();

      final domain = DomainModel.fromJson({
        ...domainData,
        'id': domainDoc.id,
        'tasks': tasks.map((t) => t.toJson()).toList(),
      });

      domains.add(domain);
    }

    return domains;
  } catch (e) {
    throw Exception('Failed to load domains: $e');
  }
});

/// Get a single domain by ID with its tasks
final domainProvider =
    FutureProvider.family<DomainModel?, String>((ref, domainId) async {
  final firestore = ref.watch(firestoreProvider);

  try {
    final domainDoc = await firestore
        .collection('domains')
        .doc(domainId)
        .get();

    if (!domainDoc.exists) {
      return null;
    }

    final domainData = domainDoc.data() ?? {};
    final tasksSnapshot = await firestore
        .collection('tasks')
        .where('domainId', isEqualTo: domainId)
        .orderBy('createdAt')
        .get();

    final tasks = tasksSnapshot.docs
        .map((doc) => TaskModel.fromJson({...doc.data(), 'id': doc.id}))
        .toList();

    return DomainModel.fromJson({
      ...domainData,
      'id': domainDoc.id,
      'tasks': tasks.map((t) => t.toJson()).toList(),
    });
  } catch (e) {
    throw Exception('Failed to load domain: $e');
  }
});

/// Stream of all domains (real-time updates)
final allDomainsStreamProvider =
    StreamProvider<List<DomainModel>>((ref) async* {
  final firestore = ref.watch(firestoreProvider);

  final domainsStream = firestore
      .collection('domains')
      .orderBy('createdAt')
      .snapshots();

  await for (final domainsSnapshot in domainsStream) {
    final domains = <DomainModel>[];

    for (final domainDoc in domainsSnapshot.docs) {
      final domainData = domainDoc.data();
      final tasksSnapshot = await firestore
          .collection('tasks')
          .where('domainId', isEqualTo: domainDoc.id)
          .orderBy('createdAt')
          .get();

      final tasks = tasksSnapshot.docs
          .map((doc) => TaskModel.fromJson({...doc.data(), 'id': doc.id}))
          .toList();

      final domain = DomainModel.fromJson({
        ...domainData,
        'id': domainDoc.id,
        'tasks': tasks.map((t) => t.toJson()).toList(),
      });

      domains.add(domain);
    }

    yield domains;
  }
});
