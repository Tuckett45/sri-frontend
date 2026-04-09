/**
 * Time Entry Reducer Tests
 * Unit tests for time entry state reducer
 * Validates: Requirements 13.1–13.5 (NgRx state consistency)
 */

import { timeEntryReducer, initialState, timeEntryAdapter } from './time-entry.reducer';
import * as TimeEntryActions from './time-entry.actions';
import { TimeEntry, GeoLocation } from '../../models/time-entry.model';

describe('TimeEntryReducer', () => {
  const mockLocation: GeoLocation = {
    latitude: 32.7767,
    longitude: -96.7970,
    accuracy: 10
  };

  const mockTimeEntry: TimeEntry = {
    id: 'te-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date('2024-02-01T08:00:00'),
    clockInLocation: mockLocation,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date('2024-02-01T08:00:00'),
    updatedAt: new Date('2024-02-01T08:00:00')
  };

  const mockCompletedEntry: TimeEntry = {
    ...mockTimeEntry,
    id: 'te-2',
    clockOutTime: new Date('2024-02-01T17:00:00'),
    clockOutLocation: mockLocation,
    totalHours: 9,
    regularHours: 8,
    overtimeHours: 1
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' };
      const state = timeEntryReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.activeEntry).toBeNull();
    });
  });

  describe('Clock In', () => {
    it('should set loading to true on clockIn', () => {
      const action = TimeEntryActions.clockIn({
        jobId: 'job-1',
        technicianId: 'tech-1',
        location: mockLocation
      });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should add time entry and set activeEntry on clockInSuccess', () => {
      const action = TimeEntryActions.clockInSuccess({ timeEntry: mockTimeEntry });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(1);
      expect(state.entities[mockTimeEntry.id]).toEqual(mockTimeEntry);
      expect(state.activeEntry).toEqual(mockTimeEntry);
    });

    it('should not set activeEntry if entry has clockOutTime', () => {
      const action = TimeEntryActions.clockInSuccess({ timeEntry: mockCompletedEntry });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.entities[mockCompletedEntry.id]).toEqual(mockCompletedEntry);
      expect(state.activeEntry).toBeNull();
    });

    it('should set error on clockInFailure', () => {
      const error = 'Failed to clock in';
      const action = TimeEntryActions.clockInFailure({ error });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Clock Out', () => {
    let stateWithActiveEntry: any;

    beforeEach(() => {
      const clockInState = timeEntryAdapter.addOne(mockTimeEntry, {
        ...initialState,
        activeEntry: mockTimeEntry
      });
      stateWithActiveEntry = clockInState;
    });

    it('should set loading to true on clockOut', () => {
      const action = TimeEntryActions.clockOut({
        timeEntryId: mockTimeEntry.id,
        location: mockLocation
      });
      const state = timeEntryReducer(stateWithActiveEntry, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update entry and clear activeEntry on clockOutSuccess', () => {
      const completedEntry: TimeEntry = {
        ...mockTimeEntry,
        clockOutTime: new Date('2024-02-01T17:00:00'),
        clockOutLocation: mockLocation,
        totalHours: 9
      };
      const action = TimeEntryActions.clockOutSuccess({ timeEntry: completedEntry });
      const state = timeEntryReducer(stateWithActiveEntry, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.activeEntry).toBeNull();
      expect(state.entities[mockTimeEntry.id]?.clockOutTime).toEqual(completedEntry.clockOutTime);
      expect(state.entities[mockTimeEntry.id]?.totalHours).toBe(9);
    });

    it('should set error on clockOutFailure', () => {
      const error = 'Failed to clock out';
      const action = TimeEntryActions.clockOutFailure({ error });
      const state = timeEntryReducer(stateWithActiveEntry, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Load Time Entries', () => {
    it('should set loading to true on loadTimeEntries', () => {
      const action = TimeEntryActions.loadTimeEntries({ technicianId: 'tech-1' });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should upsert entries on loadTimeEntriesSuccess', () => {
      const entries = [mockTimeEntry, mockCompletedEntry];
      const action = TimeEntryActions.loadTimeEntriesSuccess({ timeEntries: entries });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.ids.length).toBe(2);
      expect(state.entities[mockTimeEntry.id]).toEqual(mockTimeEntry);
      expect(state.entities[mockCompletedEntry.id]).toEqual(mockCompletedEntry);
    });

    it('should upsert (merge) existing entries on loadTimeEntriesSuccess', () => {
      const stateWithEntry = timeEntryAdapter.addOne(mockTimeEntry, initialState);
      const updatedEntry = { ...mockTimeEntry, totalHours: 5 };
      const action = TimeEntryActions.loadTimeEntriesSuccess({ timeEntries: [updatedEntry] });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state.ids.length).toBe(1);
      expect(state.entities[mockTimeEntry.id]?.totalHours).toBe(5);
    });

    it('should set error on loadTimeEntriesFailure', () => {
      const error = 'Failed to load time entries';
      const action = TimeEntryActions.loadTimeEntriesFailure({ error });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Update Time Entry', () => {
    let stateWithEntry: any;

    beforeEach(() => {
      stateWithEntry = timeEntryAdapter.addOne(mockCompletedEntry, initialState);
    });

    it('should set loading to true on updateTimeEntry', () => {
      const action = TimeEntryActions.updateTimeEntry({
        id: mockCompletedEntry.id,
        timeEntry: { totalHours: 8 } as any
      });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should update entry on updateTimeEntrySuccess', () => {
      const updatedEntry = { ...mockCompletedEntry, totalHours: 8, mileage: 25 };
      const action = TimeEntryActions.updateTimeEntrySuccess({ timeEntry: updatedEntry });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.entities[mockCompletedEntry.id]?.totalHours).toBe(8);
      expect(state.entities[mockCompletedEntry.id]?.mileage).toBe(25);
    });

    it('should set error on updateTimeEntryFailure', () => {
      const error = 'Failed to update time entry';
      const action = TimeEntryActions.updateTimeEntryFailure({ error });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Load Active Entry', () => {
    it('should set loading to true on loadActiveEntry', () => {
      const action = TimeEntryActions.loadActiveEntry({ technicianId: 'tech-1' });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set activeEntry on loadActiveEntrySuccess', () => {
      const action = TimeEntryActions.loadActiveEntrySuccess({ timeEntry: mockTimeEntry });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.activeEntry).toEqual(mockTimeEntry);
    });

    it('should set activeEntry to null on loadActiveEntrySuccess with null', () => {
      const stateWithActive = { ...initialState, activeEntry: mockTimeEntry };
      const action = TimeEntryActions.loadActiveEntrySuccess({ timeEntry: null });
      const state = timeEntryReducer(stateWithActive, action);

      expect(state.loading).toBe(false);
      expect(state.activeEntry).toBeNull();
    });

    it('should set error on loadActiveEntryFailure', () => {
      const error = 'Failed to load active entry';
      const action = TimeEntryActions.loadActiveEntryFailure({ error });
      const state = timeEntryReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });
  });

  describe('Clear Active Entry', () => {
    it('should clear activeEntry on clearActiveEntry', () => {
      const stateWithActive = { ...initialState, activeEntry: mockTimeEntry };
      const action = TimeEntryActions.clearActiveEntry();
      const state = timeEntryReducer(stateWithActive, action);

      expect(state.activeEntry).toBeNull();
    });
  });

  describe('Loading flag resets', () => {
    it('should reset loading to false after clockInSuccess', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.clockInSuccess({ timeEntry: mockTimeEntry });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after clockInFailure', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.clockInFailure({ error: 'error' });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after clockOutSuccess', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.clockOutSuccess({ timeEntry: mockCompletedEntry });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after clockOutFailure', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.clockOutFailure({ error: 'error' });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after loadTimeEntriesSuccess', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.loadTimeEntriesSuccess({ timeEntries: [] });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after loadTimeEntriesFailure', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.loadTimeEntriesFailure({ error: 'error' });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after updateTimeEntrySuccess', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.updateTimeEntrySuccess({ timeEntry: mockCompletedEntry });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after updateTimeEntryFailure', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.updateTimeEntryFailure({ error: 'error' });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after loadActiveEntrySuccess', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.loadActiveEntrySuccess({ timeEntry: null });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });

    it('should reset loading to false after loadActiveEntryFailure', () => {
      const loadingState = { ...initialState, loading: true };
      const action = TimeEntryActions.loadActiveEntryFailure({ error: 'error' });
      const state = timeEntryReducer(loadingState, action);
      expect(state.loading).toBe(false);
    });
  });

  describe('Entity Adapter', () => {
    it('should sort time entries by clockInTime descending (newest first)', () => {
      const entry1: TimeEntry = { ...mockTimeEntry, id: '1', clockInTime: new Date('2024-02-01') };
      const entry2: TimeEntry = { ...mockTimeEntry, id: '2', clockInTime: new Date('2024-02-03') };
      const entry3: TimeEntry = { ...mockTimeEntry, id: '3', clockInTime: new Date('2024-02-02') };

      const action = TimeEntryActions.loadTimeEntriesSuccess({
        timeEntries: [entry1, entry3, entry2]
      });
      const state = timeEntryReducer(initialState, action);

      // Newest first: entry2 (Feb 3), entry3 (Feb 2), entry1 (Feb 1)
      expect(state.ids[0]).toBe('2');
      expect(state.ids[1]).toBe('3');
      expect(state.ids[2]).toBe('1');
    });
  });
});
