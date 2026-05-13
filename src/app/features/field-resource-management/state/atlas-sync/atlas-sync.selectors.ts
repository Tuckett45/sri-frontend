/**
 * Atlas Sync Selectors
 * Provides memoized selectors for accessing atlas-sync state.
 *
 * Requirements: 8.4, 8.5
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SyncStatus } from '../../../../models/time-payroll.enum';
import { AtlasSyncState } from './atlas-sync.reducer';

// Feature selector
export const selectAtlasSyncState = createFeatureSelector<AtlasSyncState>('atlasSync');

// Select all pending sync entries as an array
export const selectPendingSyncs = createSelector(
  selectAtlasSyncState,
  (state) => Object.values(state.pendingSyncs)
);

// Select the full sync status map
export const selectSyncStatusMap = createSelector(
  selectAtlasSyncState,
  (state) => state.syncStatusMap
);

// Select sync status for a specific entry by ID
export const selectSyncStatusByEntryId = (entryId: string) => createSelector(
  selectSyncStatusMap,
  (statusMap) => statusMap[entryId] ?? null
);

// Select all entries with Failed status
export const selectFailedSyncs = createSelector(
  selectAtlasSyncState,
  (state) => {
    const failedEntryIds = Object.entries(state.syncStatusMap)
      .filter(([_, status]) => status === SyncStatus.Failed)
      .map(([entryId]) => entryId);
    return failedEntryIds;
  }
);

// Select all sync conflicts
export const selectConflicts = createSelector(
  selectAtlasSyncState,
  (state) => state.conflicts
);

// Select pending sync entry by entry ID
export const selectPendingSyncByEntryId = (entryId: string) => createSelector(
  selectAtlasSyncState,
  (state) => state.pendingSyncs[entryId] ?? null
);

// Select count of pending syncs
export const selectPendingSyncCount = createSelector(
  selectPendingSyncs,
  (pendingSyncs) => pendingSyncs.length
);

// Select count of failed syncs
export const selectFailedSyncCount = createSelector(
  selectFailedSyncs,
  (failedSyncs) => failedSyncs.length
);

// Select count of conflicts
export const selectConflictCount = createSelector(
  selectConflicts,
  (conflicts) => conflicts.length
);
