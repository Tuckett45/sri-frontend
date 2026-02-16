/**
 * Time Entry Actions
 * Defines all actions for time entry state management
 */

import { createAction, props } from '@ngrx/store';
import { TimeEntry, GeoLocation } from '../../models/time-entry.model';
import { UpdateTimeEntryDto } from '../../models/dtos/time-entry.dto';

// Clock In
export const clockIn = createAction(
  '[Time Entry] Clock In',
  props<{ jobId: string; technicianId: string; location?: GeoLocation }>()
);

export const clockInSuccess = createAction(
  '[Time Entry] Clock In Success',
  props<{ timeEntry: TimeEntry }>()
);

export const clockInFailure = createAction(
  '[Time Entry] Clock In Failure',
  props<{ error: string }>()
);

// Clock Out
export const clockOut = createAction(
  '[Time Entry] Clock Out',
  props<{ timeEntryId: string; location?: GeoLocation }>()
);

export const clockOutSuccess = createAction(
  '[Time Entry] Clock Out Success',
  props<{ timeEntry: TimeEntry }>()
);

export const clockOutFailure = createAction(
  '[Time Entry] Clock Out Failure',
  props<{ error: string }>()
);

// Load Time Entries
export const loadTimeEntries = createAction(
  '[Time Entry] Load Time Entries',
  props<{ technicianId?: string; jobId?: string; dateRange?: { startDate: Date; endDate: Date } }>()
);

export const loadTimeEntriesSuccess = createAction(
  '[Time Entry] Load Time Entries Success',
  props<{ timeEntries: TimeEntry[] }>()
);

export const loadTimeEntriesFailure = createAction(
  '[Time Entry] Load Time Entries Failure',
  props<{ error: string }>()
);

// Update Time Entry
export const updateTimeEntry = createAction(
  '[Time Entry] Update Time Entry',
  props<{ id: string; timeEntry: UpdateTimeEntryDto }>()
);

export const updateTimeEntrySuccess = createAction(
  '[Time Entry] Update Time Entry Success',
  props<{ timeEntry: TimeEntry }>()
);

export const updateTimeEntryFailure = createAction(
  '[Time Entry] Update Time Entry Failure',
  props<{ error: string }>()
);

// Load Active Entry
export const loadActiveEntry = createAction(
  '[Time Entry] Load Active Entry',
  props<{ technicianId: string }>()
);

export const loadActiveEntrySuccess = createAction(
  '[Time Entry] Load Active Entry Success',
  props<{ timeEntry: TimeEntry | null }>()
);

export const loadActiveEntryFailure = createAction(
  '[Time Entry] Load Active Entry Failure',
  props<{ error: string }>()
);

// Clear Active Entry
export const clearActiveEntry = createAction(
  '[Time Entry] Clear Active Entry'
);
