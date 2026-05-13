/**
 * Atlas Sync Reducer
 * Manages the retry queue for ATLAS API synchronization,
 * tracking pending/failed sync operations per time entry.
 *
 * Requirements: 8.4, 8.5
 */

import { createReducer, on } from '@ngrx/store';
import { SyncStatus } from '../../../../models/time-payroll.enum';
import { PendingSyncEntry, SyncConflict } from '../../../../models/time-payroll.model';
import { serializeTimeEntry } from '../../utils/atlas-payload-serializer';
import { calculateBackoffDelay } from '../../utils/atlas-payload-serializer';
import * as AtlasSyncActions from './atlas-sync.actions';

/** Maximum number of retry attempts before marking as Failed */
const MAX_RETRY_ATTEMPTS = 3;

/** State interface for the atlas-sync slice */
export interface AtlasSyncState {
  /** Pending sync entries keyed by entryId */
  pendingSyncs: Record<string, PendingSyncEntry>;
  /** Sync status for each entry keyed by entryId */
  syncStatusMap: Record<string, SyncStatus>;
  /** Detected sync conflicts */
  conflicts: SyncConflict[];
}

/** Initial state */
export const initialState: AtlasSyncState = {
  pendingSyncs: {},
  syncStatusMap: {},
  conflicts: []
};

/** Atlas Sync Reducer */
export const atlasSyncReducer = createReducer(
  initialState,

  // syncToAtlas: set sync status to Pending for the entry
  on(AtlasSyncActions.syncToAtlas, (state, { entry }) => ({
    ...state,
    syncStatusMap: {
      ...state.syncStatusMap,
      [entry.id]: SyncStatus.Pending
    },
    pendingSyncs: {
      ...state.pendingSyncs,
      [entry.id]: {
        entryId: entry.id,
        payload: serializeTimeEntry(entry),
        attempt: 0,
        maxAttempts: MAX_RETRY_ATTEMPTS,
        nextRetryAt: new Date(),
        lastError: undefined
      }
    }
  })),

  // syncToAtlasSuccess: set sync status to Synced, remove from pending queue
  on(AtlasSyncActions.syncToAtlasSuccess, (state, { result }) => {
    const { [result.entryId]: _removed, ...remainingPendingSyncs } = state.pendingSyncs;
    return {
      ...state,
      syncStatusMap: {
        ...state.syncStatusMap,
        [result.entryId]: SyncStatus.Synced
      },
      pendingSyncs: remainingPendingSyncs
    };
  }),

  // syncToAtlasFailure: add to pending queue with retry count,
  // set status to Failed if max retries exceeded
  on(AtlasSyncActions.syncToAtlasFailure, (state, { entryId, error, attempt }) => {
    const existingPending = state.pendingSyncs[entryId];
    const currentAttempt = attempt;
    const exceededMaxRetries = currentAttempt >= MAX_RETRY_ATTEMPTS;
    const backoffDelay = calculateBackoffDelay(currentAttempt);

    if (exceededMaxRetries) {
      // Remove from pending queue and mark as Failed
      const { [entryId]: _removed, ...remainingPendingSyncs } = state.pendingSyncs;
      return {
        ...state,
        syncStatusMap: {
          ...state.syncStatusMap,
          [entryId]: SyncStatus.Failed
        },
        pendingSyncs: remainingPendingSyncs
      };
    }

    // Update pending entry with incremented retry count and next retry time
    return {
      ...state,
      syncStatusMap: {
        ...state.syncStatusMap,
        [entryId]: SyncStatus.Pending
      },
      pendingSyncs: {
        ...state.pendingSyncs,
        [entryId]: {
          ...(existingPending || {
            entryId,
            payload: {} as any,
            maxAttempts: MAX_RETRY_ATTEMPTS
          }),
          entryId,
          attempt: currentAttempt,
          maxAttempts: MAX_RETRY_ATTEMPTS,
          nextRetryAt: new Date(Date.now() + (backoffDelay! * 1000)),
          lastError: error
        }
      }
    };
  }),

  // syncConflictDetected: add to conflicts array, set status to Conflict
  on(AtlasSyncActions.syncConflictDetected, (state, { conflict }) => ({
    ...state,
    syncStatusMap: {
      ...state.syncStatusMap,
      [conflict.entryId]: SyncStatus.Conflict
    },
    conflicts: [...state.conflicts, conflict]
  }))
);
