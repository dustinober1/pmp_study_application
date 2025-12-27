import { Flashcard } from '@/types/flashcard';

interface CacheEntry {
  data: Flashcard;
  syncStatus: 'synced' | 'pending';
  lastSyncedAt?: string;
}

interface SyncQueueItem {
  id: string;
  flashcardId: string;
  operation: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: string;
}

export class LocalCacheService {
  private dbName = 'pmp_study_cache';
  private dbVersion = 1;
  private flashcardsStore = 'flashcards';
  private syncQueueStore = 'sync_queue';
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create flashcards store
        if (!db.objectStoreNames.contains(this.flashcardsStore)) {
          const flashcardStore = db.createObjectStore(this.flashcardsStore, {
            keyPath: 'data.id',
          });
          flashcardStore.createIndex('userId', 'data.userId');
          flashcardStore.createIndex('syncStatus', 'syncStatus');
          flashcardStore.createIndex('domainId', 'data.domainId');
          flashcardStore.createIndex('taskId', 'data.taskId');
          flashcardStore.createIndex('nextReviewDate', 'data.nextReviewDate');
        }

        // Create sync queue store
        if (!db.objectStoreNames.contains(this.syncQueueStore)) {
          const syncQueueStore = db.createObjectStore(this.syncQueueStore, {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncQueueStore.createIndex('timestamp', 'timestamp');
        }
      };
    });
  }

  private getDb(): IDBDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  // Flashcard cache operations
  async cacheFlashcard(flashcard: Flashcard): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readwrite');
    const store = transaction.objectStore(this.flashcardsStore);

    const entry: CacheEntry = {
      data: flashcard,
      syncStatus: 'synced',
      lastSyncedAt: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async cacheFlashcards(flashcards: Flashcard[]): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readwrite');
    const store = transaction.objectStore(this.flashcardsStore);

    const promises = flashcards.map((flashcard) => {
      const entry: CacheEntry = {
        data: flashcard,
        syncStatus: 'synced',
        lastSyncedAt: new Date().toISOString(),
      };

      return new Promise<void>((resolve, reject) => {
        const request = store.put(entry);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });

    await Promise.all(promises);
  }

  async getFlashcard(flashcardId: string): Promise<Flashcard | null> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readonly');
    const store = transaction.objectStore(this.flashcardsStore);

    return new Promise((resolve, reject) => {
      const request = store.get(flashcardId);
      request.onsuccess = () => {
        const result = request.result as CacheEntry | undefined;
        resolve(result?.data ?? null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getUserFlashcards(userId: string): Promise<Flashcard[]> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readonly');
    const store = transaction.objectStore(this.flashcardsStore);
    const index = store.index('userId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(userId);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        resolve(entries.map((e) => e.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getDueFlashcards(userId: string): Promise<Flashcard[]> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readonly');
    const store = transaction.objectStore(this.flashcardsStore);
    const index = store.index('nextReviewDate');

    const now = new Date().toISOString();

    return new Promise((resolve, reject) => {
      const request = index.getAll(IDBKeyRange.upperBound(now));
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const filtered = entries.filter((e) => e.data.userId === userId);
        resolve(filtered.map((e) => e.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getFlashcardsByDomain(
    userId: string,
    domainId: string
  ): Promise<Flashcard[]> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readonly');
    const store = transaction.objectStore(this.flashcardsStore);
    const index = store.index('domainId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(domainId);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const filtered = entries.filter((e) => e.data.userId === userId);
        resolve(filtered.map((e) => e.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getFlashcardsByTask(
    userId: string,
    taskId: string
  ): Promise<Flashcard[]> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readonly');
    const store = transaction.objectStore(this.flashcardsStore);
    const index = store.index('taskId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(taskId);
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        const filtered = entries.filter((e) => e.data.userId === userId);
        resolve(filtered.map((e) => e.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateFlashcard(
    flashcard: Flashcard,
    syncStatus: 'synced' | 'pending' = 'pending'
  ): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readwrite');
    const store = transaction.objectStore(this.flashcardsStore);

    const entry: CacheEntry = {
      data: flashcard,
      syncStatus,
      lastSyncedAt:
        syncStatus === 'synced' ? new Date().toISOString() : undefined,
    };

    return new Promise((resolve, reject) => {
      const request = store.put(entry);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFlashcard(flashcardId: string): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readwrite');
    const store = transaction.objectStore(this.flashcardsStore);

    return new Promise((resolve, reject) => {
      const request = store.delete(flashcardId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getPendingSyncFlashcards(): Promise<Flashcard[]> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readonly');
    const store = transaction.objectStore(this.flashcardsStore);
    const index = store.index('syncStatus');

    return new Promise((resolve, reject) => {
      const request = index.getAll('pending');
      request.onsuccess = () => {
        const entries = request.result as CacheEntry[];
        resolve(entries.map((e) => e.data));
      };
      request.onerror = () => reject(request.error);
    });
  }

  async markFlashcardSynced(flashcardId: string): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.flashcardsStore], 'readwrite');
    const store = transaction.objectStore(this.flashcardsStore);

    const getRequest = store.get(flashcardId);

    return new Promise((resolve, reject) => {
      getRequest.onsuccess = () => {
        const entry = getRequest.result as CacheEntry;
        if (entry) {
          entry.syncStatus = 'synced';
          entry.lastSyncedAt = new Date().toISOString();
          const updateRequest = store.put(entry);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Sync queue operations
  async addToSyncQueue(
    flashcardId: string,
    operation: 'create' | 'update' | 'delete',
    data: Record<string, unknown>
  ): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.syncQueueStore], 'readwrite');
    const store = transaction.objectStore(this.syncQueueStore);

    const item: Omit<SyncQueueItem, 'id'> = {
      flashcardId,
      operation,
      data,
      timestamp: new Date().toISOString(),
    };

    return new Promise((resolve, reject) => {
      const request = store.add(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    const db = this.getDb();
    const transaction = db.transaction([this.syncQueueStore], 'readonly');
    const store = transaction.objectStore(this.syncQueueStore);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as SyncQueueItem[];
        resolve(items);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async clearSyncQueueItem(id: number): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.syncQueueStore], 'readwrite');
    const store = transaction.objectStore(this.syncQueueStore);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllSyncQueue(): Promise<void> {
    const db = this.getDb();
    const transaction = db.transaction([this.syncQueueStore], 'readwrite');
    const store = transaction.objectStore(this.syncQueueStore);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearCache(): Promise<void> {
    const db = this.getDb();

    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([this.flashcardsStore], 'readwrite');
      const store = transaction.objectStore(this.flashcardsStore);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    await this.clearAllSyncQueue();
  }
}

// Singleton instance
let cacheServiceInstance: LocalCacheService | null = null;

export async function getLocalCacheService(): Promise<LocalCacheService> {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new LocalCacheService();
    await cacheServiceInstance.init();
  }
  return cacheServiceInstance;
}
