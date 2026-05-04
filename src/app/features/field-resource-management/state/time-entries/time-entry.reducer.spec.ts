/**
 * Time Entry Reducer Tests
 * Unit tests for time entry state reducer
 * Validates: Requirements 1.2, 2.1, 8.5, 13.1–13.5 (NgRx state consistency)
 */

import { timeEntryReducer, initialState, timeEntryAdapter } from './time-entry.reducer';
import * as TimeEntryActions from './time-entry.actions';
import * as AtlasSyncActions from '../atlas-sync/atlas-sync.actions';
import { TimeEntry, GeoLocation } from '../../models/time-entry.model';
import { TimeCategory, PayType, SyncStatus } from '../../../../models/time-payroll.enum';

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
    updatedAt: new Date('2024-02-01T08:00:00'),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Pending
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

  describe('Set Time Category', () => {
    let stateWithEntry: any;

    beforeEach(() => {
      stateWithEntry = timeEntryAdapter.addOne(mockTimeEntry, initialState);
    });

    it('should update timeCategory on setTimeCategory', () => {
      const action = TimeEntryActions.setTimeCategory({
        entryId: 'te-1',
        category: TimeCategory.DriveTime,
        previousCategory: TimeCategory.OnSite
      });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state.entities['te-1']?.timeCategory).toBe(TimeCategory.DriveTime);
    });

    it('should not modify state if entry does not exist', () => {
      const action = TimeEntryActions.setTimeCategory({
        entryId: 'non-existent',
        category: TimeCategory.DriveTime,
        previousCategory: TimeCategory.OnSite
      });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state).toBe(stateWithEntry);
    });

    it('should preserve other entry fields when updating timeCategory', () => {
      const action = TimeEntryActions.setTimeCategory({
        entryId: 'te-1',
        category: TimeCategory.DriveTime,
        previousCategory: TimeCategory.OnSite
      });
      const state = timeEntryReducer(stateWithEntry, action);

      const entry = state.entities['te-1']!;
      expect(entry.jobId).toBe('job-1');
      expect(entry.technicianId).toBe('tech-1');
      expect(entry.payType).toBe(PayType.Regular);
      expect(entry.syncStatus).toBe(SyncStatus.Pending);
    });
  });

  describe('Classify Pay Type', () => {
    let stateWithEntry: any;

    beforeEach(() => {
      stateWithEntry = timeEntryAdapter.addOne(mockTimeEntry, initialState);
    });

    it('should update payType on classifyPayType', () => {
      const action = TimeEntryActions.classifyPayType({
        entryId: 'te-1',
        payType: PayType.Holiday
      });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state.entities['te-1']?.payType).toBe(PayType.Holiday);
    });

    it('should handle all PayType values', () => {
      for (const pt of [PayType.Regular, PayType.Overtime, PayType.Holiday, PayType.PTO]) {
        const action = TimeEntryActions.classifyPayType({
          entryId: 'te-1',
          payType: pt
        });
        const state = timeEntryReducer(stateWithEntry, action);
        expect(state.entities['te-1']?.payType).toBe(pt);
      }
    });

    it('should not modify state if entry does not exist', () => {
      const action = TimeEntryActions.classifyPayType({
        entryId: 'non-existent',
        payType: PayType.Overtime
      });
      const state = timeEntryReducer(stateWithEntry, action);

      expect(state).toBe(stateWithEntry);
    });

    it('should preserve other entry fields when updating payType', () => {
      const action = TimeEntryActions.classifyPayType({
        entryId: 'te-1',
        payType: PayType.PTO
      });
      const state = timeEntryReducer(stateWithEntry, action);

      const entry = state.entities['te-1']!;
      expect(entry.timeCategory).toBe(TimeCategory.OnSite);
      expect(entry.syncStatus).toBe(SyncStatus.Pending);
    });
  });

  describe('Atlas Sync Status Updates', () => {
    let stateWithEntry: any;

    beforeEach(() => {
      stateWithEntry = timeEntryAdapter.addOne(
        { ...mockTimeEntry, syncStatus: SyncStatus.Pending },
        initialState
      );
    });

    describe('syncToAtlasSuccess', () => {
      it('should set syncStatus to Synced on success', () => {
        const action = AtlasSyncActions.syncToAtlasSuccess({
          result: {
            entryId: 'te-1',
            success: true,
            payloadHash: 'abc123',
            timestamp: new Date('2024-02-01T10:00:00')
          }
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncStatus).toBe(SyncStatus.Synced);
      });

      it('should update lastSyncAttempt timestamp on success', () => {
        const timestamp = new Date('2024-02-01T10:00:00');
        const action = AtlasSyncActions.syncToAtlasSuccess({
          result: {
            entryId: 'te-1',
            success: true,
            payloadHash: 'abc123',
            timestamp
          }
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.lastSyncAttempt).toEqual(timestamp);
      });

      it('should reset syncRetryCount to 0 on success', () => {
        const stateWithRetries = timeEntryAdapter.updateOne(
          { id: 'te-1', changes: { syncRetryCount: 2 } },
          stateWithEntry
        );
        const action = AtlasSyncActions.syncToAtlasSuccess({
          result: {
            entryId: 'te-1',
            success: true,
            payloadHash: 'abc123',
            timestamp: new Date()
          }
        });
        const state = timeEntryReducer(stateWithRetries, action);

        expect(state.entities['te-1']?.syncRetryCount).toBe(0);
      });

      it('should not modify state if entry does not exist', () => {
        const action = AtlasSyncActions.syncToAtlasSuccess({
          result: {
            entryId: 'non-existent',
            success: true,
            payloadHash: 'abc123',
            timestamp: new Date()
          }
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state).toBe(stateWithEntry);
      });
    });

    describe('syncToAtlasFailure', () => {
      it('should set syncStatus to Pending when attempt < 3', () => {
        const action = AtlasSyncActions.syncToAtlasFailure({
          entryId: 'te-1',
          error: 'Network error',
          attempt: 1
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncStatus).toBe(SyncStatus.Pending);
      });

      it('should set syncStatus to Pending when attempt is 2', () => {
        const action = AtlasSyncActions.syncToAtlasFailure({
          entryId: 'te-1',
          error: 'Network error',
          attempt: 2
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncStatus).toBe(SyncStatus.Pending);
      });

      it('should set syncStatus to Failed when attempt >= 3', () => {
        const action = AtlasSyncActions.syncToAtlasFailure({
          entryId: 'te-1',
          error: 'Network error',
          attempt: 3
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncStatus).toBe(SyncStatus.Failed);
      });

      it('should set syncStatus to Failed when attempt > 3', () => {
        const action = AtlasSyncActions.syncToAtlasFailure({
          entryId: 'te-1',
          error: 'Network error',
          attempt: 5
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncStatus).toBe(SyncStatus.Failed);
      });

      it('should update syncRetryCount to the attempt number', () => {
        const action = AtlasSyncActions.syncToAtlasFailure({
          entryId: 'te-1',
          error: 'Network error',
          attempt: 2
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncRetryCount).toBe(2);
      });

      it('should not modify state if entry does not exist', () => {
        const action = AtlasSyncActions.syncToAtlasFailure({
          entryId: 'non-existent',
          error: 'Network error',
          attempt: 1
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state).toBe(stateWithEntry);
      });
    });

    describe('syncConflictDetected', () => {
      it('should set syncStatus to Conflict', () => {
        const action = AtlasSyncActions.syncConflictDetected({
          conflict: {
            entryId: 'te-1',
            mismatchedFields: ['clockOutTime'],
            localValues: { clockOutTime: '2024-02-01T17:00:00' },
            remoteValues: { clockOutTime: '2024-02-01T16:30:00' }
          }
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncStatus).toBe(SyncStatus.Conflict);
      });

      it('should store conflict details as JSON string', () => {
        const mismatchedFields = ['clockOutTime', 'totalHours'];
        const action = AtlasSyncActions.syncConflictDetected({
          conflict: {
            entryId: 'te-1',
            mismatchedFields,
            localValues: { clockOutTime: '2024-02-01T17:00:00', totalHours: 9 },
            remoteValues: { clockOutTime: '2024-02-01T16:30:00', totalHours: 8.5 }
          }
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state.entities['te-1']?.syncConflictDetails).toBe(JSON.stringify(mismatchedFields));
      });

      it('should not modify state if entry does not exist', () => {
        const action = AtlasSyncActions.syncConflictDetected({
          conflict: {
            entryId: 'non-existent',
            mismatchedFields: ['clockOutTime'],
            localValues: {},
            remoteValues: {}
          }
        });
        const state = timeEntryReducer(stateWithEntry, action);

        expect(state).toBe(stateWithEntry);
      });
    });
  });
});
