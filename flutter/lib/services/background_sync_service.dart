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

enum SyncStatus {
  idle,
  syncing,
  success,
  error,
  retrying,
}

class SyncStatusUpdate {
  final SyncStatus status;
  final String? message;
  final int? pendingCount;

  SyncStatusUpdate({
    required this.status,
    this.message,
    this.pendingCount,
  });
}

class BackgroundSyncService {
  final LocalCacheService _cacheService;
  final FirestoreService _firestoreService;
  final Connectivity _connectivity;
  final Logger _logger;

  late Stream<List<ConnectivityResult>> _connectivityStream;
  bool _isOnline = false;
  bool _isSyncing = false;

  // Retry configuration
  int _retryCount = 0;
  static const int _maxRetries = 3;
  static const Duration _initialRetryDelay = Duration(seconds: 5);
  static const double _retryBackoffMultiplier = 2.0;

  // Callbacks for status updates
  void Function(SyncStatusUpdate)? onSyncStatusChanged;

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
        _logger.i('Connection restored, resetting retry counter and starting sync...');
        _retryCount = 0;
        syncPendingChanges();
      } else if (!_isOnline) {
        _logger.w('Lost connection - sync will retry when connection restored');
        _notifySyncStatus(
          SyncStatus.idle,
          message: 'Offline - waiting for connection',
        );
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
    if (_isSyncing) return;
    if (!_isOnline) {
      _logger.w('Cannot sync - offline');
      return;
    }

    _isSyncing = true;
    try {
      final pendingFlashcards = await _cacheService.getPendingSyncFlashcards();

      if (pendingFlashcards.isEmpty) {
        _logger.i('No pending changes to sync');
        _notifySyncStatus(
          SyncStatus.success,
          message: 'All changes synced',
          pendingCount: 0,
        );
        return;
      }

      _notifySyncStatus(
        SyncStatus.syncing,
        message: 'Syncing ${pendingFlashcards.length} items...',
        pendingCount: pendingFlashcards.length,
      );

      int syncedCount = 0;
      int failedCount = 0;

      for (final flashcard in pendingFlashcards) {
        try {
          await _syncFlashcard(flashcard, strategy);
          await _cacheService.markFlashcardSynced(flashcard.id);
          syncedCount++;
        } catch (e) {
          _logger.e('Error syncing flashcard ${flashcard.id}: $e');
          failedCount++;
        }
      }

      if (failedCount == 0) {
        _logger.i('Sync completed successfully - $syncedCount items synced');
        _retryCount = 0;
        _notifySyncStatus(
          SyncStatus.success,
          message: '$syncedCount items synced',
          pendingCount: 0,
        );
      } else {
        _logger.w('Sync partially completed - $syncedCount synced, $failedCount failed');
        await _scheduleRetry(strategy);
      }
    } catch (e) {
      _logger.e('Error during sync: $e');
      await _scheduleRetry(strategy);
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _scheduleRetry(ConflictResolutionStrategy strategy) async {
    if (_retryCount >= _maxRetries) {
      _logger.e('Max retries exceeded');
      _notifySyncStatus(
        SyncStatus.error,
        message: 'Sync failed after $_maxRetries attempts',
      );
      return;
    }

    _retryCount++;
    final delayMs = (_initialRetryDelay.inMilliseconds *
            (_retryBackoffMultiplier * (_retryCount - 1)).toInt())
        .round();
    final delay = Duration(milliseconds: delayMs);

    _logger.i('Scheduling retry ${_retryCount} in ${delay.inSeconds} seconds...');
    _notifySyncStatus(
      SyncStatus.retrying,
      message: 'Retrying in ${delay.inSeconds}s (attempt $_retryCount/$_maxRetries)',
    );

    Future.delayed(delay, () {
      if (_isOnline) {
        _logger.i('Retrying sync (attempt $_retryCount/$_maxRetries)');
        syncPendingChanges(strategy: strategy);
      } else {
        _logger.i('Still offline, will retry when connection restored');
      }
    });
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
    _logger.i('Recorded local change for $flashcardId: ${operation.toString().split('.').last}');
  }

  void _notifySyncStatus(
    SyncStatus status, {
    String? message,
    int? pendingCount,
  }) {
    onSyncStatusChanged?.call(
      SyncStatusUpdate(
        status: status,
        message: message,
        pendingCount: pendingCount,
      ),
    );
  }

  void setSyncStatusCallback(void Function(SyncStatusUpdate) callback) {
    onSyncStatusChanged = callback;
  }

  Future<int> getPendingSyncCount() async {
    final pending = await _cacheService.getPendingSyncFlashcards();
    return pending.length;
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
