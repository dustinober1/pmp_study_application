import { Flashcard } from '@/types';
import { getLocalCacheService, LocalCacheService } from './localCache';
import { db } from '@/config/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';

export enum ConflictResolutionStrategy {
  // Server wins: discard local changes
  ServerWins = 'server_wins',
  // Local wins: force local changes to server
  LocalWins = 'local_wins',
  // Merge: combine both versions intelligently
  Merge = 'merge',
  // Last-write-wins: use the most recent timestamp
  LastWriteWins = 'last_write_wins',
}

export class BackgroundSyncService {
  private cacheService: LocalCacheService | null = null;
  private isOnline: boolean = navigator.onLine;
  private isSyncing: boolean = false;
  private syncListeners: Set<(isOnline: boolean) => void> = new Set();

  constructor() {
    this.initConnectivityListener();
  }

  private async getCacheService(): Promise<LocalCacheService> {
    if (!this.cacheService) {
      this.cacheService = await getLocalCacheService();
    }
    return this.cacheService;
  }

  private initConnectivityListener(): void {
    window.addEventListener('online', () => {
      const wasOnline = this.isOnline;
      this.isOnline = true;

      if (!wasOnline) {
        console.log('Connection restored, starting sync...');
        this.syncPendingChanges();
      }

      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      console.log('Connection lost');
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  addOnlineStateListener(listener: (isOnline: boolean) => void): () => void {
    this.syncListeners.add(listener);
    return () => this.syncListeners.delete(listener);
  }

  private notifyListeners(isOnline: boolean): void {
    this.syncListeners.forEach((listener) => listener(isOnline));
  }

  isConnected(): boolean {
    return this.isOnline;
  }

  async syncPendingChanges(
    strategy: ConflictResolutionStrategy = ConflictResolutionStrategy.LastWriteWins
  ): Promise<void> {
    if (this.isSyncing || !this.isOnline) return;

    this.isSyncing = true;
    try {
      const cacheService = await this.getCacheService();
      const pendingFlashcards = await cacheService.getPendingSyncFlashcards();

      for (const flashcard of pendingFlashcards) {
        try {
          await this.syncFlashcard(flashcard, strategy);
          await cacheService.markFlashcardSynced(flashcard.id);
        } catch (error) {
          console.error(
            `Error syncing flashcard ${flashcard.id}:`,
            error
          );
        }
      }

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncFlashcard(
    localFlashcard: Flashcard,
    strategy: ConflictResolutionStrategy
  ): Promise<void> {
    try {
      const flashcardRef = doc(db, 'flashcards', localFlashcard.id);
      const remoteDoc = await getDoc(flashcardRef);

      if (!remoteDoc.exists()) {
        // Remote doesn't exist, create it
        await setDoc(flashcardRef, {
          ...localFlashcard,
          createdAt: Timestamp.fromDate(new Date(localFlashcard.createdAt)),
          updatedAt: Timestamp.fromDate(new Date(localFlashcard.updatedAt)),
        });
      } else {
        // Both exist, apply conflict resolution
        const remoteFlashcard = remoteDoc.data() as Flashcard;
        const resolvedFlashcard = this.resolveConflict(
          localFlashcard,
          remoteFlashcard,
          strategy
        );

        await updateDoc(flashcardRef, {
          ...resolvedFlashcard,
          updatedAt: Timestamp.fromDate(new Date()),
        });
      }
    } catch (error) {
      console.error(
        `Sync error for flashcard ${localFlashcard.id}:`,
        error
      );
      throw error;
    }
  }

  private resolveConflict(
    local: Flashcard,
    remote: Flashcard,
    strategy: ConflictResolutionStrategy
  ): Flashcard {
    switch (strategy) {
      case ConflictResolutionStrategy.ServerWins:
        return remote;

      case ConflictResolutionStrategy.LocalWins:
        return local;

      case ConflictResolutionStrategy.LastWriteWins: {
        const localTime = new Date(local.updatedAt).getTime();
        const remoteTime = new Date(remote.updatedAt).getTime();
        return localTime > remoteTime ? local : remote;
      }

      case ConflictResolutionStrategy.Merge:
        return this.mergeFlashcards(local, remote);

      default:
        return local;
    }
  }

  private mergeFlashcards(local: Flashcard, remote: Flashcard): Flashcard {
    const localTime = new Date(local.updatedAt).getTime();
    const remoteTime = new Date(remote.updatedAt).getTime();
    const useLocalFSRS = localTime > remoteTime;

    return {
      id: local.id,
      userId: local.userId,
      contentId: useLocalFSRS ? local.contentId : remote.contentId,
      domainId: local.domainId,
      taskId: local.taskId,
      fsrs: useLocalFSRS ? local.fsrs : remote.fsrs,
      isSuspended: local.isSuspended || remote.isSuspended,
      tags: this.mergeTags(local.tags, remote.tags),
      notes: useLocalFSRS ? local.notes : remote.notes,
      createdAt: remote.createdAt, // Keep original creation time
      updatedAt: new Date(),
    };
  }

  private mergeTags(local: string[] | undefined, remote: string[] | undefined): string[] {
    if (!local && !remote) return [];
    if (!local) return remote || [];
    if (!remote) return local;

    // Combine and deduplicate tags
    const combined = new Set<string>([...local, ...remote]);
    return Array.from(combined);
  }

  async recordLocalChange(
    flashcardId: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, unknown>
  ): Promise<void> {
    const cacheService = await this.getCacheService();
    await cacheService.addToSyncQueue(flashcardId, operation, data);
  }
}

// Singleton instance
let syncServiceInstance: BackgroundSyncService | null = null;

export function getBackgroundSyncService(): BackgroundSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new BackgroundSyncService();
  }
  return syncServiceInstance;
}
