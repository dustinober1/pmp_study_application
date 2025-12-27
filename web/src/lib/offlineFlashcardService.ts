import { Flashcard } from '@/types';
import { getLocalCacheService, LocalCacheService } from './localCache';
import { getBackgroundSyncService, BackgroundSyncService } from './backgroundSync';
import {
  db,
  auth,
} from '@/config/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

/**
 * Offline-aware flashcard service that handles both local caching and cloud sync
 */
export class OfflineFlashcardService {
  private cacheService: LocalCacheService | null = null;
  private syncService: BackgroundSyncService | null = null;

  async init(): Promise<void> {
    this.cacheService = await getLocalCacheService();
    this.syncService = getBackgroundSyncService();
  }

  private async getCacheService(): Promise<LocalCacheService> {
    if (!this.cacheService) {
      await this.init();
    }
    return this.cacheService!;
  }

  private async getSyncService(): Promise<BackgroundSyncService> {
    if (!this.syncService) {
      await this.init();
    }
    return this.syncService!;
  }

  private async getUserId(): Promise<string> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.uid;
  }

  // Flashcard operations
  async createFlashcard(flashcard: Flashcard): Promise<void> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    // Save to local cache immediately with pending status
    await cache.updateFlashcard(flashcard, 'pending');

    // If online, sync to Firebase
    if (sync.isConnected()) {
      try {
        const flashcardRef = doc(db, 'flashcards', flashcard.id);
        await setDoc(flashcardRef, {
          ...flashcard,
          createdAt: Timestamp.fromDate(new Date(flashcard.createdAt)),
          updatedAt: Timestamp.fromDate(new Date(flashcard.updatedAt)),
        });
        await cache.markFlashcardSynced(flashcard.id);
      } catch (error) {
        console.error('Error creating flashcard on server:', error);
        // Keep in pending state for later sync
      }
    }
  }

  async updateFlashcard(flashcard: Flashcard): Promise<void> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    // Update local cache first
    await cache.updateFlashcard(flashcard, 'pending');

    // If online, sync to Firebase
    if (sync.isConnected()) {
      try {
        const flashcardRef = doc(db, 'flashcards', flashcard.id);
        await updateDoc(flashcardRef, {
          ...flashcard,
          updatedAt: Timestamp.fromDate(new Date(flashcard.updatedAt)),
        });
        await cache.markFlashcardSynced(flashcard.id);
      } catch (error) {
        console.error('Error updating flashcard on server:', error);
        // Keep in pending state for later sync
      }
    }
  }

  async deleteFlashcard(flashcardId: string): Promise<void> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    // Remove from local cache
    await cache.deleteFlashcard(flashcardId);

    // If online, delete from Firebase
    if (sync.isConnected()) {
      try {
        const flashcardRef = doc(db, 'flashcards', flashcardId);
        await deleteDoc(flashcardRef);
      } catch (error) {
        console.error('Error deleting flashcard on server:', error);
      }
    }
  }

  async getFlashcard(flashcardId: string): Promise<Flashcard | null> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    // Try cache first
    let flashcard = await cache.getFlashcard(flashcardId);

    // If online and cache miss, fetch from Firebase and cache it
    if (!flashcard && sync.isConnected()) {
      try {
        const docSnap = await getDocs(
          query(collection(db, 'flashcards'), where('id', '==', flashcardId))
        );

        if (!docSnap.empty) {
          const data = docSnap.docs[0].data() as Flashcard;
          await cache.cacheFlashcard(data);
          return data;
        }
      } catch (error) {
        console.error('Error fetching flashcard from server:', error);
      }
    }

    return flashcard;
  }

  async getUserFlashcards(userId?: string): Promise<Flashcard[]> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    const targetUserId = userId || (await this.getUserId());

    // Try cache first
    let flashcards = await cache.getUserFlashcards(targetUserId);

    // If online, sync with server
    if (sync.isConnected()) {
      try {
        const q = query(
          collection(db, 'flashcards'),
          where('userId', '==', targetUserId)
        );
        const querySnapshot = await getDocs(q);
        const serverFlashcards = querySnapshot.docs.map((doc) => doc.data() as Flashcard);

        // Update cache with fresh data
        await cache.cacheFlashcards(serverFlashcards);

        // Trigger sync for any pending changes
        await sync.syncPendingChanges();

        return serverFlashcards;
      } catch (error) {
        console.error('Error fetching flashcards from server:', error);
        // Return cached data if server fetch fails
        return flashcards;
      }
    }

    return flashcards;
  }

  async getDueFlashcards(userId?: string): Promise<Flashcard[]> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    const targetUserId = userId || (await this.getUserId());

    // Try cache first
    let flashcards = await cache.getDueFlashcards(targetUserId);

    // If online, verify with server
    if (sync.isConnected()) {
      try {
        const now = new Date();
        const q = query(
          collection(db, 'flashcards'),
          where('userId', '==', targetUserId),
          where('fsrs.due', '<=', Timestamp.fromDate(now))
        );
        const querySnapshot = await getDocs(q);
        const serverFlashcards = querySnapshot.docs.map((doc) => doc.data() as Flashcard);

        // Update cache
        await cache.cacheFlashcards(serverFlashcards);

        return serverFlashcards;
      } catch (error) {
        console.error('Error fetching due flashcards from server:', error);
        return flashcards;
      }
    }

    return flashcards;
  }

  async getFlashcardsByDomain(domainId: string): Promise<Flashcard[]> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();
    const userId = await this.getUserId();

    // Try cache first
    let flashcards = await cache.getFlashcardsByDomain(userId, domainId);

    // If online, sync with server
    if (sync.isConnected()) {
      try {
        const q = query(
          collection(db, 'flashcards'),
          where('userId', '==', userId),
          where('domainId', '==', domainId)
        );
        const querySnapshot = await getDocs(q);
        const serverFlashcards = querySnapshot.docs.map((doc) => doc.data() as Flashcard);

        // Update cache
        await cache.cacheFlashcards(serverFlashcards);

        return serverFlashcards;
      } catch (error) {
        console.error('Error fetching domain flashcards from server:', error);
        return flashcards;
      }
    }

    return flashcards;
  }

  async getFlashcardsByTask(taskId: string): Promise<Flashcard[]> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();
    const userId = await this.getUserId();

    // Try cache first
    let flashcards = await cache.getFlashcardsByTask(userId, taskId);

    // If online, sync with server
    if (sync.isConnected()) {
      try {
        const q = query(
          collection(db, 'flashcards'),
          where('userId', '==', userId),
          where('taskId', '==', taskId)
        );
        const querySnapshot = await getDocs(q);
        const serverFlashcards = querySnapshot.docs.map((doc) => doc.data() as Flashcard);

        // Update cache
        await cache.cacheFlashcards(serverFlashcards);

        return serverFlashcards;
      } catch (error) {
        console.error('Error fetching task flashcards from server:', error);
        return flashcards;
      }
    }

    return flashcards;
  }

  async batchCreateFlashcards(flashcards: Flashcard[]): Promise<void> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    // Save all to local cache with pending status
    await Promise.all(
      flashcards.map((fc) => cache.updateFlashcard(fc, 'pending'))
    );

    // If online, sync to Firebase
    if (sync.isConnected()) {
      try {
        const batch = writeBatch(db);
        for (const flashcard of flashcards) {
          const flashcardRef = doc(db, 'flashcards', flashcard.id);
          batch.set(flashcardRef, {
            ...flashcard,
            createdAt: Timestamp.fromDate(new Date(flashcard.createdAt)),
            updatedAt: Timestamp.fromDate(new Date(flashcard.updatedAt)),
          });
        }
        await batch.commit();

        // Mark all as synced
        await Promise.all(
          flashcards.map((fc) => cache.markFlashcardSynced(fc.id))
        );
      } catch (error) {
        console.error('Error batch creating flashcards on server:', error);
        // Keep in pending state for later sync
      }
    }
  }

  async batchUpdateFlashcards(flashcards: Flashcard[]): Promise<void> {
    const cache = await this.getCacheService();
    const sync = await this.getSyncService();

    // Update all in local cache
    await Promise.all(
      flashcards.map((fc) => cache.updateFlashcard(fc, 'pending'))
    );

    // If online, sync to Firebase
    if (sync.isConnected()) {
      try {
        const batch = writeBatch(db);
        for (const flashcard of flashcards) {
          const flashcardRef = doc(db, 'flashcards', flashcard.id);
          batch.update(flashcardRef, {
            ...flashcard,
            updatedAt: Timestamp.fromDate(new Date(flashcard.updatedAt)),
          });
        }
        await batch.commit();

        // Mark all as synced
        await Promise.all(
          flashcards.map((fc) => cache.markFlashcardSynced(fc.id))
        );
      } catch (error) {
        console.error('Error batch updating flashcards on server:', error);
        // Keep in pending state for later sync
      }
    }
  }

  async clearCache(): Promise<void> {
    const cache = await this.getCacheService();
    await cache.clearCache();
  }
}

// Singleton instance
let serviceInstance: OfflineFlashcardService | null = null;

export async function getOfflineFlashcardService(): Promise<OfflineFlashcardService> {
  if (!serviceInstance) {
    serviceInstance = new OfflineFlashcardService();
    await serviceInstance.init();
  }
  return serviceInstance;
}
