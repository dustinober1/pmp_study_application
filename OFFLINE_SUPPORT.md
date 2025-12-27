# Offline Support Implementation

## Overview

This document describes the offline support system for the PMP Study App, implemented across both Flutter (mobile) and Next.js (web) platforms. The system enables users to work offline and automatically syncs changes when connectivity is restored.

## Architecture

### Flutter (Mobile)

#### Local Caching - SQLite
- **Service**: `flutter/lib/services/local_cache_service.dart`
- **Database**: SQLite with sqflite
- **Storage**: Local device storage via `path_provider`
- **Tables**:
  - `flashcards`: Stores flashcard data with sync status
  - `sync_queue`: Tracks pending operations for batch sync

**Key Features**:
- Indexed queries by userId, domainId, taskId, nextReviewDate
- Sync status tracking (synced/pending)
- Last sync timestamp tracking
- Efficient batch operations

**Dependencies Added**:
- `sqflite: ^2.4.0`
- `path: ^1.10.0`
- `path_provider: ^2.1.0`
- `connectivity_plus: ^5.0.0`

#### Background Sync Service
- **Service**: `flutter/lib/services/background_sync_service.dart`
- **Connectivity Monitoring**: Uses `connectivity_plus` to track connection changes
- **Auto-sync**: Automatically triggers sync when connection is restored

**Conflict Resolution Strategies**:
1. **ServerWins**: Remote data takes precedence
2. **LocalWins**: Local changes override server data
3. **LastWriteWins**: Most recent timestamp wins (default)
4. **Merge**: Intelligently combines local and remote data
   - Keeps original creation timestamp from server
   - Uses more recent FSRS data
   - Merges tags from both versions
   - Combines favorite flags (OR operation)

#### Provider Integration
- `localCacheServiceProvider`: Access to cache service
- `backgroundSyncServiceProvider`: Access to sync service
- `connectivityProvider`: Stream provider for connection state

### Web (Next.js)

#### Local Caching - IndexedDB
- **Service**: `web/src/lib/localCache.ts`
- **Database**: Browser IndexedDB API
- **Storage**: Local browser storage
- **Stores**:
  - `flashcards`: Stores flashcard data with sync status
  - `sync_queue`: Tracks pending operations

**Indexes**:
- userId
- syncStatus
- domainId
- taskId
- nextReviewDate

**Key Features**:
- Asynchronous operations with Promise-based API
- Automatic sync status tracking
- Efficient batch operations
- Transaction support

#### Background Sync Service
- **Service**: `web/src/lib/backgroundSync.ts`
- **Connectivity**: Uses browser online/offline events
- **Auto-sync**: Triggers sync when connection restored

**Conflict Resolution**: Same strategies as Flutter
- ServerWins
- LocalWins
- LastWriteWins (default)
- Merge

#### Offline-Aware Flashcard Service
- **Service**: `web/src/lib/offlineFlashcardService.ts`
- **Purpose**: Unified data layer that handles both cache and Firebase
- **Cache-First Strategy**:
  1. Query local IndexedDB cache
  2. If online, verify/update with Firebase
  3. On network error, fall back to cache
  4. Automatic sync of pending changes when online

**Implemented Methods**:
- `createFlashcard(flashcard)`
- `updateFlashcard(flashcard)`
- `deleteFlashcard(flashcardId)`
- `getFlashcard(flashcardId)`
- `getUserFlashcards(userId?)`
- `getDueFlashcards(userId?)`
- `getFlashcardsByDomain(domainId)`
- `getFlashcardsByTask(taskId)`
- `batchCreateFlashcards(flashcards[])`
- `batchUpdateFlashcards(flashcards[])`
- `clearCache()`

## Usage

### Flutter

#### Initialize Local Cache
```dart
final cacheService = ref.watch(localCacheServiceProvider);
await cacheService.cacheFlashcard(flashcard);
```

#### Monitor Connectivity
```dart
final connectivity = ref.watch(connectivityProvider);
connectivity.whenData((isOnline) {
  if (isOnline) {
    // User is online
  }
});
```

#### Sync Pending Changes
```dart
final syncService = ref.watch(backgroundSyncServiceProvider);
await syncService.syncPendingChanges(
  strategy: ConflictResolutionStrategy.lastWriteWins,
);
```

### Web

#### Initialize Services
```typescript
import { getOfflineFlashcardService } from '@/lib/offlineFlashcardService';
import { getBackgroundSyncService } from '@/lib/backgroundSync';

const flashcardService = await getOfflineFlashcardService();
const syncService = getBackgroundSyncService();
```

#### Use Offline-Aware Service
```typescript
// Automatically uses cache, syncs if online
const flashcards = await flashcardService.getUserFlashcards();

// Create with offline support
await flashcardService.createFlashcard(flashcard);

// Automatically syncs when connection restored
```

#### Monitor Connection State
```typescript
const syncService = getBackgroundSyncService();

syncService.addOnlineStateListener((isOnline) => {
  if (isOnline) {
    console.log('Connected!');
  } else {
    console.log('Offline');
  }
});
```

## Conflict Resolution

When syncing encounters conflicting versions of the same flashcard:

### Last-Write-Wins (Default)
- Compare `updatedAt` timestamps
- Use the version with the most recent timestamp

### Merge Strategy
- Combines best of both versions
- Uses more recent FSRS fields (study progress matters most)
- Merges tags from both versions
- Combines favorite flags (OR operation)
- Preserves original creation timestamp from server

## Data Flow

### Write Operations

#### Offline Scenario:
1. User creates/updates flashcard
2. Immediately saved to local cache (pending status)
3. Operation queued in sync_queue
4. UI updated immediately (optimistic update)

#### When Connection Restored:
1. BackgroundSyncService detects connection
2. Fetches all pending flashcards
3. For each pending flashcard:
   - Check if remote version exists
   - Apply conflict resolution if both exist
   - Upload to Firebase
   - Mark as synced in cache
4. Sync queue cleared

### Read Operations

#### Offline Scenario:
1. Query local cache first
2. Return cached data immediately
3. User can work with cached data

#### Online Scenario:
1. Query local cache
2. If cache miss and online:
   - Fetch from Firebase
   - Cache the result
   - Return to user
3. Periodic sync of pending changes

## Database Schema

### Flutter - SQLite

**flashcards table**:
```sql
CREATE TABLE flashcards (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  domainId TEXT NOT NULL,
  taskId TEXT NOT NULL,
  repetitions INTEGER DEFAULT 0,
  easeFactor REAL DEFAULT 2.5,
  interval INTEGER DEFAULT 1,
  nextReviewDate TEXT NOT NULL,
  lastReviewDate TEXT NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  isFavorite INTEGER DEFAULT 0,
  tags TEXT,
  syncStatus TEXT DEFAULT 'synced',
  lastSyncedAt TEXT
)
```

**Indexes**:
- userId
- syncStatus

### Web - IndexedDB

**flashcards object store**:
- keyPath: `data.id`
- Indexes:
  - userId
  - syncStatus
  - domainId
  - taskId
  - nextReviewDate

**sync_queue object store**:
- keyPath: `id` (auto-increment)
- Indexes:
  - timestamp

## Testing

### Flutter
```dart
// Test cache operations
test('Cache flashcard offline', () async {
  final cacheService = LocalCacheService();
  final flashcard = FlashcardModel(...);

  await cacheService.cacheFlashcard(flashcard);
  final cached = await cacheService.getFlashcard(flashcard.id);

  expect(cached, equals(flashcard));
});

// Test sync
test('Sync pending changes', () async {
  final syncService = BackgroundSyncService(...);
  await syncService.syncPendingChanges();
  // Verify all pending items synced
});
```

### Web
```typescript
// Test cache operations
test('Cache flashcard offline', async () => {
  const cacheService = await getLocalCacheService();
  const flashcard = {...};

  await cacheService.cacheFlashcard(flashcard);
  const cached = await cacheService.getFlashcard(flashcard.id);

  expect(cached).toEqual(flashcard);
});

// Test offline service
test('Use cache when offline', async () => {
  const service = await getOfflineFlashcardService();
  // Simulate offline
  window.dispatchEvent(new Event('offline'));

  const flashcard = await service.getFlashcard(id);
  // Should return from cache
});
```

## Performance Considerations

1. **Batch Operations**: Use batch methods for multiple flashcards
2. **Indexing**: Queries use indexed fields for efficiency
3. **Lazy Loading**: Cache only loaded data
4. **Sync Optimization**: Only syncs changed items (pending status)

## Future Enhancements

1. **Selective Sync**: Allow users to choose sync strategy
2. **Compression**: Compress cached data for large collections
3. **Cleanup**: Automatically clean old sync queue entries
4. **Incremental Sync**: Only sync changed fields
5. **Conflict UI**: Show conflict resolution options to user
6. **Bandwidth Optimization**: Queue large operations, download delta updates
7. **PWA Support**: Better offline support for web app

## Troubleshooting

### Cache Not Updating
- Ensure sync status is 'pending' after local changes
- Check connectivity listener is working
- Verify sync doesn't have errors in logs

### Conflicts Not Resolving
- Check strategy parameter is correct
- Verify timestamps are being updated properly
- Review merge logic for your use case

### Sync Hanging
- Check for network errors in logs
- Verify Firebase credentials are valid
- Ensure batch operations aren't too large

## References

- Flutter SQLite: https://pub.dev/packages/sqflite
- IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- Firestore Offline: https://firebase.google.com/docs/firestore/manage-data/enable-offline
