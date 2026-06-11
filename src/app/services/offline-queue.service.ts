import { Injectable, NgZone, Signal, signal, effect } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject, of, from, timer, EMPTY } from 'rxjs';
import { catchError, concatMap, tap, switchMap, filter, takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import { OfflineCacheService } from './offline-cache.service';
import { PreliminaryPunchList } from '../models/preliminary-punch-list.model';
import { environment } from '../../environments/environments';

export interface QueuedPunchList {
  id: string;
  punchList: PreliminaryPunchList;
  action: 'create' | 'update';
  queuedAt: string;
  retryCount: number;
  lastError?: string;
}

@Injectable({ providedIn: 'root' })
export class OfflineQueueService {
  private static readonly DB_NAME = 'sri-offline-queue';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'pendingSubmissions';

  private readonly queueState = signal<QueuedPunchList[]>([]);
  private readonly syncingState = signal<boolean>(false);
  private readonly dbPromise: Promise<IDBDatabase> | null;
  private readonly syncTrigger$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  /** Reactive read-only signals for UI consumption */
  readonly queue: Signal<QueuedPunchList[]> = this.queueState.asReadonly();
  readonly queueCount = signal<number>(0);
  readonly isSyncing: Signal<boolean> = this.syncingState.asReadonly();

  private httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
  };

  constructor(
    private http: HttpClient,
    private zone: NgZone,
    private toastr: ToastrService,
    private offlineCache: OfflineCacheService
  ) {
    this.dbPromise = this.isBrowser() && typeof indexedDB !== 'undefined'
      ? this.openDatabase()
      : null;

    // Hydrate queue on startup
    this.hydrateQueue();

    // Watch for connectivity changes - sync when back online
    effect(() => {
      const isOnline = this.offlineCache.online();
      if (isOnline) {
        this.triggerSync();
      }
    });

    // Listen for sync triggers and process sequentially
    this.syncTrigger$.pipe(
      filter(() => this.offlineCache.isOnline() && !this.syncingState()),
      switchMap(() => this.processQueue()),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  /** Check if the device is currently offline */
  isOffline(): boolean {
    return !this.offlineCache.isOnline();
  }

  /** Add a punch list submission to the offline queue */
  async enqueue(punchList: PreliminaryPunchList, action: 'create' | 'update'): Promise<void> {
    const item: QueuedPunchList = {
      id: punchList.id,
      punchList,
      action,
      queuedAt: new Date().toISOString(),
      retryCount: 0
    };

    // Save to IndexedDB
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        await this.writeToStore(db, item);
      } catch (e) {
        console.warn('Failed to persist to offline queue IndexedDB, using memory only', e);
      }
    }

    // Update in-memory state
    this.zone.run(() => {
      this.queueState.update(q => [...q.filter(i => i.id !== item.id), item]);
      this.queueCount.set(this.queueState().length);
    });
  }

  /** Remove an item from the queue (after successful sync or manual removal) */
  async dequeue(id: string): Promise<void> {
    if (this.dbPromise) {
      try {
        const db = await this.dbPromise;
        await this.deleteFromStore(db, id);
      } catch (e) {
        console.warn('Failed to remove from offline queue IndexedDB', e);
      }
    }

    this.zone.run(() => {
      this.queueState.update(q => q.filter(i => i.id !== id));
      this.queueCount.set(this.queueState().length);
    });
  }

  /** Manually trigger a sync attempt */
  triggerSync(): void {
    this.syncTrigger$.next();
  }

  /** Process all queued items sequentially */
  private processQueue(): Observable<any> {
    const items = [...this.queueState()];
    if (items.length === 0) return EMPTY;

    this.zone.run(() => this.syncingState.set(true));

    // Process items one at a time in order they were queued
    return from(items).pipe(
      concatMap(item => this.submitItem(item)),
      tap({
        complete: () => {
          this.zone.run(() => this.syncingState.set(false));
          const remaining = this.queueState().length;
          if (remaining === 0) {
            this.toastr.success('All queued punch lists have been submitted successfully.', 'Sync Complete');
          }
        },
        error: () => {
          this.zone.run(() => this.syncingState.set(false));
        }
      }),
      catchError(() => {
        this.zone.run(() => this.syncingState.set(false));
        return EMPTY;
      })
    );
  }

  /** Submit a single queued item to the server */
  private submitItem(item: QueuedPunchList): Observable<any> {
    if (!this.offlineCache.isOnline()) {
      return EMPTY; // Stop processing if we went offline again
    }

    const punchList = item.punchList;
    let request$: Observable<any>;

    if (item.action === 'create') {
      request$ = this.http.post(`${environment.apiUrl}/PunchList`, punchList, this.httpOptions);
    } else {
      request$ = this.http.put(`${environment.apiUrl}/PunchList/${punchList.id}`, punchList, this.httpOptions);
    }

    return request$.pipe(
      tap(() => {
        // Success - remove from queue
        this.dequeue(item.id);
        this.toastr.success(
          `"${punchList.segmentId}" punch list synced.`,
          'Offline Item Synced'
        );
      }),
      catchError(err => {
        const status = err?.status;
        // 409 Conflict = already exists, treat as success
        if (status === 409) {
          this.dequeue(item.id);
          return of(null);
        }
        // 4xx errors (except 409) are permanent failures - don't retry
        if (status >= 400 && status < 500) {
          this.markFailed(item, err?.error || err?.message || 'Client error');
          return of(null);
        }
        // 5xx or network errors - increment retry, keep in queue for next sync
        this.incrementRetry(item, err?.message || 'Server error');
        return of(null);
      })
    );
  }

  /** Mark an item as permanently failed */
  private async markFailed(item: QueuedPunchList, error: string): Promise<void> {
    const errorMsg = typeof error === 'string' ? error : JSON.stringify(error);
    const updated: QueuedPunchList = {
      ...item,
      lastError: errorMsg,
      retryCount: item.retryCount + 1
    };

    if (item.retryCount >= 3) {
      // After 3 failures, remove from queue and notify user
      await this.dequeue(item.id);
      this.toastr.error(
        `Punch list "${item.punchList.segmentId}" could not be submitted after multiple attempts. Please try submitting it manually.`,
        'Sync Failed',
        { timeOut: 15000, closeButton: true }
      );
    } else {
      // Update the item in the queue with error info
      await this.updateInStore(updated);
      this.zone.run(() => {
        this.queueState.update(q => q.map(i => i.id === item.id ? updated : i));
      });
    }
  }

  /** Increment retry count for transient failures */
  private async incrementRetry(item: QueuedPunchList, error: string): Promise<void> {
    const updated: QueuedPunchList = {
      ...item,
      retryCount: item.retryCount + 1,
      lastError: error
    };

    await this.updateInStore(updated);
    this.zone.run(() => {
      this.queueState.update(q => q.map(i => i.id === item.id ? updated : i));
    });
  }

  /** Load queue from IndexedDB on service initialization */
  private async hydrateQueue(): Promise<void> {
    if (!this.dbPromise) return;

    try {
      const db = await this.dbPromise;
      const items = await this.readAllFromStore(db);
      this.zone.run(() => {
        this.queueState.set(items);
        this.queueCount.set(items.length);
      });

      // If there are pending items and we're online, try to sync immediately
      if (items.length > 0 && this.offlineCache.isOnline()) {
        // Small delay to let the app fully initialize
        setTimeout(() => this.triggerSync(), 3000);
      }
    } catch (e) {
      console.warn('Failed to hydrate offline queue', e);
    }
  }

  // ========================
  // IndexedDB operations
  // ========================

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(OfflineQueueService.DB_NAME, OfflineQueueService.DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(OfflineQueueService.STORE_NAME)) {
          db.createObjectStore(OfflineQueueService.STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open offline queue DB'));
    });
  }

  private writeToStore(db: IDBDatabase, item: QueuedPunchList): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OfflineQueueService.STORE_NAME, 'readwrite');
      const store = tx.objectStore(OfflineQueueService.STORE_NAME);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private deleteFromStore(db: IDBDatabase, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OfflineQueueService.STORE_NAME, 'readwrite');
      const store = tx.objectStore(OfflineQueueService.STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private readAllFromStore(db: IDBDatabase): Promise<QueuedPunchList[]> {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OfflineQueueService.STORE_NAME, 'readonly');
      const store = tx.objectStore(OfflineQueueService.STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result ?? []);
      request.onerror = () => reject(request.error);
    });
  }

  private async updateInStore(item: QueuedPunchList): Promise<void> {
    if (!this.dbPromise) return;
    try {
      const db = await this.dbPromise;
      await this.writeToStore(db, item);
    } catch (e) {
      console.warn('Failed to update offline queue item', e);
    }
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined';
  }
}
