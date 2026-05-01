/**
 * Time Entry Reducer
 * Manages time entry state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { TimeEntry } from '../../models/time-entry.model';
import { TimeEntryState } from './time-entry.state';
import { SyncStatus } from '../../../../models/time-payroll.enum';
import * as TimeEntryActions from './time-entry.actions';
import * as AtlasSyncActions from '../atlas-sync/atlas-sync.actions';

// Entity adapter for normalized state management
export const timeEntryAdapter: EntityAdapter<TimeEntry> = createEntityAdapter<TimeEntry>({
  selectId: (timeEntry: TimeEntry) => timeEntry.id,
  sortComparer: (a: TimeEntry, b: TimeEntry) => 
    new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime()
});

// Initial state
export const initialState: TimeEntryState = timeEntryAdapter.getInitialState({
  activeEntry: null,
  loading: false,
  error: null
});

// Reducer
export const timeEntryReducer = createReducer(
  initialState,

  // Clock In
  on(TimeEntryActions.clockIn, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimeEntryActions.clockInSuccess, (state, { timeEntry }) =>
    timeEntryAdapter.addOne(timeEntry, {
      ...state,
      // Only set as active entry if it's actually open (no clockOutTime)
      activeEntry: !timeEntry.clockOutTime ? timeEntry : state.activeEntry,
      loading: false,
      error: null
    })
  ),

  on(TimeEntryActions.clockInFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clock Out
  on(TimeEntryActions.clockOut, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimeEntryActions.clockOutSuccess, (state, { timeEntry }) =>
    timeEntryAdapter.updateOne(
      { id: timeEntry.id, changes: timeEntry },
      {
        ...state,
        activeEntry: null,
        loading: false,
        error: null
      }
    )
  ),

  on(TimeEntryActions.clockOutFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Time Entries
  on(TimeEntryActions.loadTimeEntries, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimeEntryActions.loadTimeEntriesSuccess, (state, { timeEntries }) =>
    timeEntryAdapter.upsertMany(timeEntries, {
      ...state,
      loading: false,
      error: null
    })
  ),

  on(TimeEntryActions.loadTimeEntriesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Update Time Entry
  on(TimeEntryActions.updateTimeEntry, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimeEntryActions.updateTimeEntrySuccess, (state, { timeEntry }) =>
    timeEntryAdapter.updateOne(
      { id: timeEntry.id, changes: timeEntry },
      {
        ...state,
        loading: false,
        error: null
      }
    )
  ),

  on(TimeEntryActions.updateTimeEntryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Active Entry
  on(TimeEntryActions.loadActiveEntry, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(TimeEntryActions.loadActiveEntrySuccess, (state, { timeEntry }) => ({
    ...state,
    activeEntry: timeEntry,
    loading: false,
    error: null
  })),

  on(TimeEntryActions.loadActiveEntryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear Active Entry
  on(TimeEntryActions.clearActiveEntry, (state) => ({
    ...state,
    activeEntry: null
  })),

  // Set Time Category (Requirements: 1.2)
  on(TimeEntryActions.setTimeCategory, (state, { entryId, category }) => {
    const entry = state.entities[entryId];
    if (!entry) {
      return state;
    }
    return timeEntryAdapter.updateOne(
      { id: entryId, changes: { timeCategory: category } },
      state
    );
  }),

  // Classify Pay Type (Requirements: 2.1)
  on(TimeEntryActions.classifyPayType, (state, { entryId, payType }) => {
    const entry = state.entities[entryId];
    if (!entry) {
      return state;
    }
    return timeEntryAdapter.updateOne(
      { id: entryId, changes: { payType } },
      state
    );
  }),

  // Sync to ATLAS Success — set syncStatus to Synced (Requirements: 8.5)
  on(AtlasSyncActions.syncToAtlasSuccess, (state, { result }) => {
    const entry = state.entities[result.entryId];
    if (!entry) {
      return state;
    }
    return timeEntryAdapter.updateOne(
      { id: result.entryId, changes: { syncStatus: SyncStatus.Synced, lastSyncAttempt: result.timestamp, syncRetryCount: 0 } },
      state
    );
  }),

  // Sync to ATLAS Failure — set syncStatus to Pending or Failed (Requirements: 8.5)
  on(AtlasSyncActions.syncToAtlasFailure, (state, { entryId, error, attempt }) => {
    const entry = state.entities[entryId];
    if (!entry) {
      return state;
    }
    const syncStatus = attempt >= 3 ? SyncStatus.Failed : SyncStatus.Pending;
    return timeEntryAdapter.updateOne(
      { id: entryId, changes: { syncStatus, syncRetryCount: attempt, lastSyncAttempt: new Date() } },
      state
    );
  }),

  // Sync Conflict Detected — set syncStatus to Conflict (Requirements: 8.5)
  on(AtlasSyncActions.syncConflictDetected, (state, { conflict }) => {
    const entry = state.entities[conflict.entryId];
    if (!entry) {
      return state;
    }
    return timeEntryAdapter.updateOne(
      { id: conflict.entryId, changes: {
        syncStatus: SyncStatus.Conflict,
        syncConflictDetails: JSON.stringify(conflict.mismatchedFields)
      }},
      state
    );
  })
);
