import { Injectable } from '@angular/core';
import { Observable, Subject, timer, forkJoin, of } from 'rxjs';
import { take, switchMap, catchError } from 'rxjs/operators';

/**
 * Batch request configuration
 */
export interface BatchConfig {
  /** Maximum number of requests in a batch (default: 10) */
  maxBatchSize?: number;
  /** Maximum wait time in milliseconds before executing batch (default: 50ms) */
  maxWaitTime?: number;
}

/**
 * Batch request item
 */
interface BatchRequest<T> {
  id: string;
  request$: Observable<T>;
  subject: Subject<T>;
}

/**
 * AtlasBatchService
 * 
 * Provides request batching capabilities to combine multiple related API calls
 * into efficient batch operations, reducing network overhead and improving performance.
 * 
 * Features:
 * - Automatic batching of similar requests
 * - Configurable batch size and wait time
 * - Error handling per request
 * - Request deduplication
 * 
 * Requirements: 11.5
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasBatchService {
  private batches = new Map<string, BatchRequest<any>[]>();
  private batchTimers = new Map<string, any>();
  private readonly DEFAULT_MAX_BATCH_SIZE = 10;
  private readonly DEFAULT_MAX_WAIT_TIME = 50; // 50ms

  /**
   * Add a request to a batch queue
   * 
   * @param batchKey - Unique key identifying the batch group
   * @param requestId - Unique identifier for this specific request
   * @param request$ - Observable to execute
   * @param config - Batch configuration options
   * @returns Observable that emits when the batched request completes
   */
  batch<T>(
    batchKey: string,
    requestId: string,
    request$: Observable<T>,
    config?: BatchConfig
  ): Observable<T> {
    const maxBatchSize = config?.maxBatchSize ?? this.DEFAULT_MAX_BATCH_SIZE;
    const maxWaitTime = config?.maxWaitTime ?? this.DEFAULT_MAX_WAIT_TIME;

    // Create subject for this request
    const subject = new Subject<T>();

    // Get or create batch queue
    if (!this.batches.has(batchKey)) {
      this.batches.set(batchKey, []);
    }

    const batch = this.batches.get(batchKey)!;

    // Check for duplicate request ID in batch
    const existingRequest = batch.find(r => r.id === requestId);
    if (existingRequest) {
      // Return existing request's observable
      return existingRequest.subject.asObservable();
    }

    // Add request to batch
    batch.push({
      id: requestId,
      request$,
      subject
    });

    // Execute immediately if batch is full
    if (batch.length >= maxBatchSize) {
      this.executeBatch(batchKey);
    } else {
      // Schedule batch execution if not already scheduled
      if (!this.batchTimers.has(batchKey)) {
        const timer$ = timer(maxWaitTime).subscribe(() => {
          this.executeBatch(batchKey);
        });
        this.batchTimers.set(batchKey, timer$);
      }
    }

    return subject.asObservable();
  }

  /**
   * Execute all requests in a batch
   * 
   * @param batchKey - Batch key to execute
   */
  private executeBatch(batchKey: string): void {
    const batch = this.batches.get(batchKey);
    if (!batch || batch.length === 0) {
      return;
    }

    // Clear timer if exists
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      timer.unsubscribe();
      this.batchTimers.delete(batchKey);
    }

    // Remove batch from queue
    this.batches.delete(batchKey);

    // Execute all requests in parallel
    const requests$ = batch.map(item =>
      item.request$.pipe(
        take(1),
        catchError(error => {
          // Return error as value so forkJoin doesn't fail
          return of({ error, isError: true });
        })
      )
    );

    forkJoin(requests$).subscribe(results => {
      // Emit results to individual subjects
      results.forEach((result, index) => {
        const item = batch[index];
        if (result && (result as any).isError) {
          item.subject.error((result as any).error);
        } else {
          item.subject.next(result);
          item.subject.complete();
        }
      });
    });
  }

  /**
   * Execute a batch immediately without waiting
   * 
   * @param batchKey - Batch key to flush
   */
  flush(batchKey: string): void {
    this.executeBatch(batchKey);
  }

  /**
   * Execute all pending batches immediately
   */
  flushAll(): void {
    const keys = Array.from(this.batches.keys());
    keys.forEach(key => this.executeBatch(key));
  }

  /**
   * Cancel a pending batch
   * 
   * @param batchKey - Batch key to cancel
   */
  cancel(batchKey: string): void {
    const timer = this.batchTimers.get(batchKey);
    if (timer) {
      timer.unsubscribe();
      this.batchTimers.delete(batchKey);
    }

    const batch = this.batches.get(batchKey);
    if (batch) {
      // Complete all subjects without emitting
      batch.forEach(item => item.subject.complete());
      this.batches.delete(batchKey);
    }
  }

  /**
   * Cancel all pending batches
   */
  cancelAll(): void {
    const keys = Array.from(this.batches.keys());
    keys.forEach(key => this.cancel(key));
  }

  /**
   * Get statistics about pending batches
   * 
   * @returns Object with batch statistics
   */
  getStats(): { batchCount: number; totalRequests: number; batches: Record<string, number> } {
    const batches: Record<string, number> = {};
    let totalRequests = 0;

    this.batches.forEach((batch, key) => {
      batches[key] = batch.length;
      totalRequests += batch.length;
    });

    return {
      batchCount: this.batches.size,
      totalRequests,
      batches
    };
  }
}

/**
 * Batch multiple observables and execute them together
 * 
 * @param requests - Array of observables to batch
 * @returns Observable that emits array of results
 */
export function batchRequests<T>(requests: Observable<T>[]): Observable<T[]> {
  if (requests.length === 0) {
    return of([]);
  }

  return forkJoin(
    requests.map(req$ =>
      req$.pipe(
        take(1),
        catchError(error => of(null as any))
      )
    )
  );
}

/**
 * Batch requests with individual error handling
 * 
 * @param requests - Array of observables to batch
 * @returns Observable that emits array of results or errors
 */
export function batchRequestsWithErrors<T>(
  requests: Observable<T>[]
): Observable<Array<{ data?: T; error?: any }>> {
  if (requests.length === 0) {
    return of([]);
  }

  return forkJoin(
    requests.map(req$ =>
      req$.pipe(
        take(1),
        switchMap(data => of({ data })),
        catchError(error => of({ error }))
      )
    )
  );
}
