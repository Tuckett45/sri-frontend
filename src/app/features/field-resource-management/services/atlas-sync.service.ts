import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { TimeEntry } from '../models/time-entry.model';
import {
  AtlasTimeEntryPayload,
  AtlasSyncResult,
  SyncConflict,
  PendingSyncEntry
} from '../../../models/time-payroll.model';
import { ValidationResult } from '../validators/payroll-validators';
import { TIMECARD_ENDPOINTS } from '../api/api-endpoints';
import {
  serializeTimeEntry,
  validateAtlasPayload as validatePayload,
  detectMismatch
} from '../utils/atlas-payload-serializer';
import { syncToAtlasFailure } from '../state/atlas-sync/atlas-sync.actions';
import {
  AuditLoggingService,
  AuditAction,
  AuditResource
} from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';

/**
 * Atlas Sync Service
 *
 * Handles reliable serialization and synchronization of time entries
 * with the ATLAS backend API. Delegates pure serialization and
 * validation logic to the AtlasPayloadSerializer utility functions,
 * and manages HTTP communication, error handling, retry queuing
 * (via NgRx), and audit logging.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */
@Injectable({
  providedIn: 'root'
})
export class AtlasSyncService {

  constructor(
    private http: HttpClient,
    private store: Store,
    private auditLoggingService: AuditLoggingService,
    private authService: AuthService
  ) {}

  // ─── Serialization & Validation ────────────────────────────────────

  /**
   * Serialize a TimeEntry to the ATLAS API payload format.
   *
   * Delegates to the pure `serializeTimeEntry` utility function.
   *
   * Requirement 8.1
   */
  serializeToAtlasPayload(entry: TimeEntry): AtlasTimeEntryPayload {
    return serializeTimeEntry(entry);
  }

  /**
   * Validate a serialized payload against the ATLAS API schema.
   *
   * Delegates to the pure `validateAtlasPayload` utility function.
   *
   * Requirement 8.2
   */
  validateAtlasPayload(payload: AtlasTimeEntryPayload): ValidationResult {
    return validatePayload(payload);
  }

  // ─── Sync Operations ──────────────────────────────────────────────

  /**
   * Sync a time entry to ATLAS.
   *
   * Serializes the entry, validates the payload, makes an HTTP POST
   * to the sync endpoint, logs the attempt to the audit log, and
   * returns the sync result. On error, logs the failure and re-throws
   * a descriptive error including the HTTP status code and error detail.
   *
   * Requirements: 8.1, 8.2, 8.3, 8.6
   */
  syncTimeEntry(entry: TimeEntry): Observable<AtlasSyncResult> {
    const payload = this.serializeToAtlasPayload(entry);
    const validation = this.validateAtlasPayload(payload);

    if (!validation.valid) {
      return throwError(() => new Error(
        `Payload validation failed: ${validation.message}`
      ));
    }

    const user = this.authService.getUser();
    const payloadHash = this.hashPayload(payload);

    return this.http.post<any>(
      TIMECARD_ENDPOINTS.syncTimeEntry(entry.id),
      payload
    ).pipe(
      map(response => this.mapSyncResult(response, entry.id, payloadHash)),
      tap(result => {
        this.auditLoggingService.logBudgetAdjustment(
          user?.id ?? 'system',
          user?.name ?? 'System',
          `TimeEntry:${entry.id}`,
          0,
          `ATLAS sync ${result.success ? 'succeeded' : 'failed'}. ` +
          `Entry: ${entry.id}, ` +
          `HTTP status: ${result.httpStatus ?? 'N/A'}, ` +
          `Payload hash: ${payloadHash}, ` +
          `Timestamp: ${result.timestamp.toISOString()}`,
          0,
          0
        );
      }),
      catchError((error: HttpErrorResponse) => {
        this.auditLoggingService.logBudgetAdjustment(
          user?.id ?? 'system',
          user?.name ?? 'System',
          `TimeEntry:${entry.id}`,
          0,
          `ATLAS sync failed. ` +
          `Entry: ${entry.id}, ` +
          `HTTP status: ${error.status}, ` +
          `Error: ${this.extractErrorDetail(error)}, ` +
          `Payload hash: ${payloadHash}, ` +
          `Timestamp: ${new Date().toISOString()}`,
          0,
          0
        );
        return this.handleError('syncTimeEntry')(error);
      })
    );
  }

  // ─── Retry Queue ──────────────────────────────────────────────────

  /**
   * Queue a failed sync for retry by dispatching an NgRx action.
   *
   * Dispatches `syncToAtlasFailure` which adds the entry to the
   * retry queue managed by the atlas-sync NgRx state slice.
   *
   * Requirement 8.4
   */
  queueForRetry(entry: TimeEntry, attempt: number): void {
    this.store.dispatch(syncToAtlasFailure({
      entryId: entry.id,
      error: `Sync failed, queued for retry (attempt ${attempt})`,
      attempt
    }));
  }

  /**
   * Get all pending sync operations.
   *
   * Requirement 8.5
   */
  getPendingSyncs(): Observable<PendingSyncEntry[]> {
    return this.http.get<any>(TIMECARD_ENDPOINTS.getPendingSyncs()).pipe(
      map(response => this.extractArray(response).map(raw => this.mapPendingSyncEntry(raw))),
      catchError(this.handleError('getPendingSyncs'))
    );
  }

  // ─── Conflict Detection ───────────────────────────────────────────

  /**
   * Detect payload mismatch between a local TimeEntry and an ATLAS
   * API response.
   *
   * Uses the pure `detectMismatch` utility to compare fields. If any
   * fields differ, returns a `SyncConflict` with the mismatched field
   * names and their local/remote values. Returns `null` if no
   * mismatch is found.
   *
   * Requirement 8.7
   */
  detectPayloadMismatch(local: TimeEntry, atlasResponse: AtlasTimeEntryPayload): SyncConflict | null {
    const mismatchedFields = detectMismatch(local, atlasResponse);

    if (mismatchedFields.length === 0) {
      return null;
    }

    const localPayload = this.serializeToAtlasPayload(local);
    const localValues: Record<string, any> = {};
    const remoteValues: Record<string, any> = {};

    for (const field of mismatchedFields) {
      localValues[field] = (localPayload as any)[field];
      remoteValues[field] = (atlasResponse as any)[field];
    }

    return {
      entryId: local.id,
      mismatchedFields,
      localValues,
      remoteValues
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────

  /**
   * Map a raw API response to an AtlasSyncResult model.
   */
  private mapSyncResult(raw: any, entryId: string, payloadHash: string): AtlasSyncResult {
    return {
      entryId: raw?.entryId || raw?.EntryId || entryId,
      success: raw?.success ?? raw?.Success ?? true,
      httpStatus: raw?.httpStatus ?? raw?.HttpStatus ?? 200,
      errorDetail: raw?.errorDetail || raw?.ErrorDetail || undefined,
      payloadHash: raw?.payloadHash || raw?.PayloadHash || payloadHash,
      timestamp: new Date(raw?.timestamp || raw?.Timestamp || new Date()),
      conflict: raw?.conflict || raw?.Conflict || undefined
    };
  }

  /**
   * Map a raw API response to a PendingSyncEntry model.
   */
  private mapPendingSyncEntry(raw: any): PendingSyncEntry {
    return {
      entryId: raw?.entryId || raw?.EntryId || '',
      payload: raw?.payload || raw?.Payload || {} as AtlasTimeEntryPayload,
      attempt: raw?.attempt ?? raw?.Attempt ?? 0,
      maxAttempts: raw?.maxAttempts ?? raw?.MaxAttempts ?? 3,
      nextRetryAt: new Date(raw?.nextRetryAt || raw?.NextRetryAt || new Date()),
      lastError: raw?.lastError || raw?.LastError || undefined
    };
  }

  /**
   * Extract an array from various API response shapes.
   */
  private extractArray(response: any): any[] {
    if (Array.isArray(response)) return response;
    if (response?.$values) return response.$values;
    if (response?.data) return response.data;
    if (response?.items) return response.items;
    return [];
  }

  /**
   * Generate a simple hash of the payload for audit logging.
   */
  private hashPayload(payload: AtlasTimeEntryPayload): string {
    const str = JSON.stringify(payload);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Extract a human-readable error detail from an HTTP error response.
   */
  private extractErrorDetail(error: HttpErrorResponse): string {
    if (error.error?.message) return error.error.message;
    if (error.error?.detail) return error.error.detail;
    if (typeof error.error === 'string') return error.error;
    return error.message || 'Unknown error';
  }

  /**
   * Centralized error handler following the project pattern.
   */
  private handleError(operation: string) {
    return (error: any): Observable<never> => {
      let message = 'An error occurred';
      if (error.error instanceof ErrorEvent) {
        message = error.error.message;
      } else if (error.status) {
        console.error(`AtlasSyncService [${operation}] — response body:`,
          JSON.stringify(error.error, null, 2));
        console.error(`AtlasSyncService [${operation}] — status:`,
          error.status, 'url:', error.url);

        switch (error.status) {
          case 400: message = `Invalid request in ${operation}`; break;
          case 404: message = `Resource not found in ${operation}`; break;
          case 409: message = error.error?.message || `Conflict in ${operation}`; break;
          default:  message = `Server error (${error.status}) in ${operation}`;
        }
      }
      console.error(`AtlasSyncService [${operation}] error:`, message, error);
      return throwError(() => new Error(message));
    };
  }
}
