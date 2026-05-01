/**
 * Atlas Sync Actions
 * Defines all actions for ATLAS API synchronization state management.
 *
 * Requirements: 8.1, 8.3, 8.4, 8.5, 8.7
 */

import { createAction, props } from '@ngrx/store';
import { TimeEntry } from '../../models/time-entry.model';
import { AtlasSyncResult, SyncConflict } from '../../../../models/time-payroll.model';

/** Initiate sync of a time entry to ATLAS */
export const syncToAtlas = createAction(
  '[Atlas Sync] Sync Time Entry',
  props<{ entry: TimeEntry }>()
);

/** Sync completed successfully */
export const syncToAtlasSuccess = createAction(
  '[Atlas Sync] Sync Success',
  props<{ result: AtlasSyncResult }>()
);

/** Sync failed — queues for retry */
export const syncToAtlasFailure = createAction(
  '[Atlas Sync] Sync Failure',
  props<{ entryId: string; error: string; attempt: number }>()
);

/** Payload mismatch detected between local and ATLAS response */
export const syncConflictDetected = createAction(
  '[Atlas Sync] Conflict Detected',
  props<{ conflict: SyncConflict }>()
);
