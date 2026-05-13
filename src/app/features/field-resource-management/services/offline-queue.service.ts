import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { fromEvent, merge, of } from 'rxjs';
import { map, startWith } from 'rxjs/operators';

/**
 * Queued action to be synced when online
 */
export interface QueuedAction {
  id: string;
  action: any;
  timestamp: Date;
  retryCount: number;
}

/**
 * Offline Queue Service
 * Manages offline action queue using IndexedDB
 * Syncs queued actions when connection is restored
 */
@Injectable({
  providedIn: 'root'
})
export class OfflineQueueService {
  private readonly DB_NAME = 'frm-offline-queue';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'actions';
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;

  constructor(private store: Store) {
    this.initDatabase();
    this.monitorOnlineStatus();
  }

  /**
   * Initializes IndexedDB database
   */
  private async initDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result;
        
        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const objectStore = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          console.log('IndexedDB object store created');
        }
      };
    });
  }

  /**
   * Monitors online/offline status and syncs when online
   */
  private monitorOnlineStatus(): void {
    const online$ = fromEvent(window, 'online').pipe(map(() => true));
    const offline$ = fromEvent(window, 'offline').pipe(map(() => false));
    
    merge(online$, offline$, of(navigator.onLine))
      .pipe(startWith(navigator.onLine))
      .subscribe(isOnline => {
        this.isOnline = isOnline;
        console.log(`Network status: ${isOnline ? 'online' : 'offline'}`);
        
        if (isOnline) {
          this.syncQueuedActions();
        }
      });
  }

  /**
   * Checks if currently online
   */
  isCurrentlyOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Queues an action to be synced when online
   * @param action NgRx action to queue
   */
  async queueAction(action: any): Promise<void> {
    if (!this.db) {
      console.error('IndexedDB not initialized');
      return;
    }

    const queuedAction: QueuedAction = {
      id: this.generateId(),
      action,
      timestamp: new Date(),
      retryCount: 0
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.add(queuedAction);

      request.onsuccess = () => {
        console.log('Action queued for offline sync', queuedAction);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to queue action', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Gets all queued actions
   */
  async getQueuedActions(): Promise<QueuedAction[]> {
    if (!this.db) {
      console.error('IndexedDB not initialized');
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error('Failed to get queued actions', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Removes a queued action
   * @param id Action ID
   */
  async removeQueuedAction(id: string): Promise<void> {
    if (!this.db) {
      console.error('IndexedDB not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.delete(id);

      request.onsuccess = () => {
        console.log('Queued action removed', id);
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to remove queued action', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Syncs all queued actions when online
   */
  async syncQueuedActions(): Promise<void> {
    if (!this.isOnline) {
      console.log('Cannot sync - offline');
      return;
    }

    try {
      const queuedActions = await this.getQueuedActions();
      
      if (queuedActions.length === 0) {
        console.log('No queued actions to sync');
        return;
      }

      console.log(`Syncing ${queuedActions.length} queued actions`);

      // Sort by timestamp (oldest first)
      queuedActions.sort((a, b) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      // Dispatch actions to store
      for (const queuedAction of queuedActions) {
        try {
          this.store.dispatch(queuedAction.action);
          await this.removeQueuedAction(queuedAction.id);
          console.log('Synced queued action', queuedAction.id);
        } catch (error) {
          console.error('Failed to sync queued action', queuedAction.id, error);
          // Keep action in queue for retry
        }
      }

      console.log('Sync complete');
    } catch (error) {
      console.error('Failed to sync queued actions', error);
    }
  }

  /**
   * Clears all queued actions
   */
  async clearQueue(): Promise<void> {
    if (!this.db) {
      console.error('IndexedDB not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const objectStore = transaction.objectStore(this.STORE_NAME);
      const request = objectStore.clear();

      request.onsuccess = () => {
        console.log('Queue cleared');
        resolve();
      };

      request.onerror = () => {
        console.error('Failed to clear queue', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Generates a unique ID for queued actions
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
