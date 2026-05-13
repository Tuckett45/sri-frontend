/**
 * Optimistic Update Service
 * Provides utilities for managing optimistic updates with rollback capability
 */

import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

export interface OptimisticUpdateConfig<T> {
  // The entity being updated
  entity: T;
  // The changes to apply optimistically
  changes: Partial<T>;
  // The action to dispatch for optimistic update
  optimisticAction: any;
  // The action to dispatch on success
  successAction: any;
  // The action to dispatch on failure (rollback)
  rollbackAction: any;
  // Optional callback on success
  onSuccess?: (result: any) => void;
  // Optional callback on failure
  onFailure?: (error: any) => void;
}

@Injectable({
  providedIn: 'root'
})
export class OptimisticUpdateService {
  constructor(private store: Store) {}

  /**
   * Execute an optimistic update with automatic rollback on failure
   * 
   * @param config Configuration for the optimistic update
   * @param apiCall The API call to execute
   * @returns Observable of the API call result
   */
  executeOptimisticUpdate<T, R>(
    config: OptimisticUpdateConfig<T>,
    apiCall: Observable<R>
  ): Observable<R> {
    // Dispatch optimistic action immediately
    this.store.dispatch(config.optimisticAction);

    // Execute API call
    return apiCall.pipe(
      tap((result) => {
        // On success, dispatch success action
        this.store.dispatch(config.successAction);
        if (config.onSuccess) {
          config.onSuccess(result);
        }
      }),
      catchError((error) => {
        // On failure, dispatch rollback action
        this.store.dispatch(config.rollbackAction);
        if (config.onFailure) {
          config.onFailure(error);
        }
        return throwError(() => error);
      })
    );
  }

  /**
   * Generate a temporary ID for optimistic creates
   * Format: temp-{timestamp}-{random}
   */
  generateTempId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `temp-${timestamp}-${random}`;
  }

  /**
   * Check if an ID is a temporary ID
   */
  isTempId(id: string): boolean {
    return id.startsWith('temp-');
  }

  /**
   * Create a deep copy of an entity for rollback purposes
   */
  cloneEntity<T>(entity: T): T {
    return JSON.parse(JSON.stringify(entity));
  }

  /**
   * Merge changes into an entity (for preview purposes)
   */
  mergeChanges<T>(entity: T, changes: Partial<T>): T {
    return { ...entity, ...changes };
  }
}
