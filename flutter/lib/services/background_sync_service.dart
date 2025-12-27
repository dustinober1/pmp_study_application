import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:riverpod/riverpod.dart';
import 'package:logger/logger.dart';
import '../models/flashcard_model.dart';
import '../providers/firebase_provider.dart';
import 'local_cache_service.dart';
import 'firestore_service.dart';

enum SyncOperation {
  create,
  update,
  delete,
}

enum ConflictResolutionStrategy {
  // Server wins: discard local changes
  serverWins,
  // Local wins: force local changes to server
  localWins,
  // Merge: combine both versions intelligently
  merge,
  // Last-write-wins: use the most recent timestamp
  lastWriteWins,
}

class BackgroundSyncService {
  final LocalCacheService _cacheService;
  final FirestoreService _firestoreService;
  final Connectivity _connectivity;
  final Logger _logger;

  late Stream<List<ConnectivityResult>> _connectivityStream;
  bool _isOnline = false;
  bool _isSyncing = false;

  BackgroundSyncService(
    this._cacheService,
    this._firestoreService,
    this._connectivity,
  ) : _logger = Logger() {
    _connectivityStream = _connectivity.onConnectivityChanged;
    _initConnectivityListener();
  }

  void _initConnectivityListener() {
    _connectivityStream.listen((result) {
      final wasOnline = _isOnline;
      _isOnline = !result.contains(ConnectivityResult.none);

      if (!wasOnline && _isOnline) {
        _logger.i('Connection restored, starting sync...');
        syncPendingChanges();
      }
    });
  }

  Future<bool> isOnline() async {
    final result = await _connectivity.checkConnectivity();
    _isOnline = !result.contains(ConnectivityResult.none);
    return _isOnline;
  }

  Future<void> syncPendingChanges({
    ConflictResolutionStrategy strategy = ConflictResolutionStrategy.lastWriteWins,
  }) async {
    if (_isSyncing || !_isOnline) return;

    _isSyncing = true;
    try {
      final pendingFlashcards = await _cacheService.getPendingSyncFlashcards();

      for (final flashcard in pendingFlashcards) {
        try {
          await _syncFlashcard(flashcard, strategy);
          await _cacheService.markFlashcardSynced(flashcard.id);
        } catch (e) {
          _logger.e('Error syncing flashcard ${flashcard.id}: $e');
        }
      }

      _logger.i('Sync completed successfully');
    } catch (e) {
      _logger.e('Error during sync: $e');
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _syncFlashcard(
    FlashcardModel localFlashcard,
    ConflictResolutionStrategy strategy,
  ) async {
    try {
      final remoteFlashcard =
          await _firestoreService.getFlashcard(localFlashcard.id);

      if (remoteFlashcard == null) {
        // Remote doesn't exist, create it
        await _firestoreService.createFlashcard(localFlashcard);
      } else {
        // Both exist, apply conflict resolution
        final resolvedFlashcard = _resolveConflict(
          localFlashcard,
          remoteFlashcard,
          strategy,
        );
        await _firestoreService.updateFlashcard(resolvedFlashcard);
      }
    } catch (e) {
      _logger.e('Sync error for flashcard ${localFlashcard.id}: $e');
      rethrow;
    }
  }

  FlashcardModel _resolveConflict(
    FlashcardModel local,
    FlashcardModel remote,
    ConflictResolutionStrategy strategy,
  ) {
    switch (strategy) {
      case ConflictResolutionStrategy.serverWins:
        return remote;

      case ConflictResolutionStrategy.localWins:
        return local;

      case ConflictResolutionStrategy.lastWriteWins:
        return local.updatedAt.isAfter(remote.updatedAt) ? local : remote;

      case ConflictResolutionStrategy.merge:
        return _mergeFlashcards(local, remote);
    }
  }

  FlashcardModel _mergeFlashcards(
    FlashcardModel local,
    FlashcardModel remote,
  ) {
    // Use the most recent data for FSRS fields (what users care about)
    final useLocalFSRS = local.updatedAt.isAfter(remote.updatedAt);

    // For other fields, use server if it's newer to prevent overwrites
    return FlashcardModel(
      id: local.id,
      userId: local.userId,
      question: useLocalFSRS ? local.question : remote.question,
      answer: useLocalFSRS ? local.answer : remote.answer,
      domainId: local.domainId,
      taskId: local.taskId,
      repetitions: useLocalFSRS ? local.repetitions : remote.repetitions,
      easeFactor: useLocalFSRS ? local.easeFactor : remote.easeFactor,
      interval: useLocalFSRS ? local.interval : remote.interval,
      nextReviewDate:
          useLocalFSRS ? local.nextReviewDate : remote.nextReviewDate,
      lastReviewDate:
          useLocalFSRS ? local.lastReviewDate : remote.lastReviewDate,
      createdAt: remote.createdAt, // Keep original creation time
      updatedAt: DateTime.now(),
      isFavorite: local.isFavorite || remote.isFavorite, // Merge favorites
      tags: _mergeTags(local.tags, remote.tags),
    );
  }

  List<String>? _mergeTags(List<String>? local, List<String>? remote) {
    if (local == null && remote == null) return null;
    if (local == null) return remote;
    if (remote == null) return local;

    // Combine and deduplicate tags
    final combined = <String>{...local, ...remote};
    return combined.toList();
  }

  Future<void> recordLocalChange(
    String flashcardId,
    SyncOperation operation,
    Map<String, dynamic> data,
  ) async {
    await _cacheService.addToSyncQueue(
      flashcardId,
      operation.toString().split('.').last,
      data,
    );
  }
}

// Riverpod provider
final backgroundSyncServiceProvider =
    Provider<BackgroundSyncService>((ref) {
  final cacheService = ref.watch(localCacheServiceProvider);
  final firestoreService = ref.watch(firestoreServiceProvider);
  return BackgroundSyncService(
    cacheService,
    firestoreService,
    Connectivity(),
  );
});

// Provider for connectivity state
final connectivityProvider = StreamProvider<bool>((ref) async* {
  final connectivity = Connectivity();
  await for (final result in connectivity.onConnectivityChanged) {
    yield !result.contains(ConnectivityResult.none);
  }
});
