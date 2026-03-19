/**
 * Time Entry Reducer
 * Manages time entry state updates using EntityAdapter for normalized state
 */

import { createReducer, on } from '@ngrx/store';
import { EntityAdapter, createEntityAdapter } from '@ngrx/entity';
import { TimeEntry } from '../../models/time-entry.model';
import { TimeEntryState } from './time-entry.state';
import * as TimeEntryActions from './time-entry.actions';

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
      activeEntry: timeEntry,
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
    timeEntryAdapter.setAll(timeEntries, {
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
  }))
);
