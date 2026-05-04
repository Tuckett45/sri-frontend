/**
 * Atlas Sync Reducer & Selectors Tests
 * Unit tests for atlas-sync state slice.
 *
 * Validates: Requirements 8.4, 8.5
 */

import { atlasSyncReducer, initialState, AtlasSyncState } from './atlas-sync.reducer';
import * as AtlasSyncActions from './atlas-sync.actions';
import * as AtlasSyncSelectors from './atlas-sync.selectors';
import { TimeEntry, GeoLocation } from '../../models/time-entry.model';
import { SyncStatus, TimeCategory, PayType } from '../../../../models/time-payroll.enum';
import { AtlasSyncResult, SyncConflict } from '../../../../models/time-payroll.model';

describe('AtlasSyncReducer', () => {
  const mockLocation: GeoLocation = {
    latitude: 32.7767,
    longitude: -96.7970,
    accuracy: 10
  };

  const mockTimeEntry: TimeEntry = {
    id: 'te-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date('2024-02-01T08:00:00Z'),
    clockOutTime: new Date('2024-02-01T17:00:00Z'),
    clockInLocation: mockLocation,
    clockOutLocation: mockLocation,
    totalHours: 9,
    regularHours: 8,
    overtimeHours: 1,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date('2024-02-01T08:00:00Z'),
    updatedAt: new Date('2024-02-01T08:00:00Z'),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Pending
  };

  const mockSyncResult: AtlasSyncResult = {
    entryId: 'te-1',
    success: true,
    httpStatus: 200,
    payloadHash: 'abc123',
    timestamp: new Date('2024-02-01T17:05:00Z')
  };

  const mockConflict: SyncConflict = {
    entryId: 'te-1',
    mismatchedFields: ['clockOutTime'],
    localValues: { clockOutTime: '2024-02-01T17:00:00.000Z' },
    remoteValues: { clockOutTime: '2024-02-01T16:30:00.000Z' }
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' };
      const state = atlasSyncReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.pendingSyncs).toEqual({});
      expect(state.syncStatusMap).toEqual({});
      expect(state.conflicts).toEqual([]);
    });
  });

  describe('syncToAtlas', () => {
    it('should set sync status to Pending for the entry', () => {
      const action = AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry });
      const state = atlasSyncReducer(initialState, action);

      expect(state.syncStatusMap['te-1']).toBe(SyncStatus.Pending);
    });

    it('should add entry to pending syncs queue', () => {
      const action = AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry });
      const state = atlasSyncReducer(initialState, action);

      expect(state.pendingSyncs['te-1']).toBeDefined();
      expect(state.pendingSyncs['te-1'].entryId).toBe('te-1');
      expect(state.pendingSyncs['te-1'].attempt).toBe(0);
      expect(state.pendingSyncs['te-1'].maxAttempts).toBe(3);
    });

    it('should serialize the entry payload', () => {
      const action = AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry });
      const state = atlasSyncReducer(initialState, action);

      const pending = state.pendingSyncs['te-1'];
      expect(pending.payload.jobId).toBe('job-1');
      expect(pending.payload.technicianId).toBe('tech-1');
      expect(pending.payload.clockInTime).toBe(mockTimeEntry.clockInTime.toISOString());
    });

    it('should handle multiple entries independently', () => {
      const entry2: TimeEntry = { ...mockTimeEntry, id: 'te-2', jobId: 'job-2' };

      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlas({ entry: entry2 }));

      expect(state.syncStatusMap['te-1']).toBe(SyncStatus.Pending);
      expect(state.syncStatusMap['te-2']).toBe(SyncStatus.Pending);
      expect(Object.keys(state.pendingSyncs).length).toBe(2);
    });
  });

  describe('syncToAtlasSuccess', () => {
    it('should set sync status to Synced', () => {
      // First add a pending entry
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      // Then mark as success
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasSuccess({ result: mockSyncResult }));

      expect(state.syncStatusMap['te-1']).toBe(SyncStatus.Synced);
    });

    it('should remove entry from pending syncs queue', () => {
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasSuccess({ result: mockSyncResult }));

      expect(state.pendingSyncs['te-1']).toBeUndefined();
    });

    it('should not affect other pending entries', () => {
      const entry2: TimeEntry = { ...mockTimeEntry, id: 'te-2' };
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlas({ entry: entry2 }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasSuccess({ result: mockSyncResult }));

      expect(state.pendingSyncs['te-1']).toBeUndefined();
      expect(state.pendingSyncs['te-2']).toBeDefined();
    });
  });

  describe('syncToAtlasFailure', () => {
    it('should keep status as Pending when retries remain (attempt < 3)', () => {
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasFailure({
        entryId: 'te-1',
        error: 'Network error',
        attempt: 1
      }));

      expect(state.syncStatusMap['te-1']).toBe(SyncStatus.Pending);
    });

    it('should update retry count in pending syncs', () => {
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasFailure({
        entryId: 'te-1',
        error: 'Network error',
        attempt: 1
      }));

      expect(state.pendingSyncs['te-1'].attempt).toBe(1);
      expect(state.pendingSyncs['te-1'].lastError).toBe('Network error');
    });

    it('should set status to Failed when max retries exceeded (attempt >= 3)', () => {
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasFailure({
        entryId: 'te-1',
        error: 'Server error',
        attempt: 3
      }));

      expect(state.syncStatusMap['te-1']).toBe(SyncStatus.Failed);
    });

    it('should remove from pending queue when max retries exceeded', () => {
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasFailure({
        entryId: 'te-1',
        error: 'Server error',
        attempt: 3
      }));

      expect(state.pendingSyncs['te-1']).toBeUndefined();
    });

    it('should set nextRetryAt with backoff delay', () => {
      const beforeTime = Date.now();
      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncToAtlasFailure({
        entryId: 'te-1',
        error: 'Timeout',
        attempt: 0
      }));

      const nextRetry = new Date(state.pendingSyncs['te-1'].nextRetryAt).getTime();
      // Attempt 0 -> backoff = 2^(0+1) = 2 seconds
      expect(nextRetry).toBeGreaterThanOrEqual(beforeTime + 2000 - 100);
    });

    it('should handle failure for entry not previously in pending queue', () => {
      const state = atlasSyncReducer(initialState, AtlasSyncActions.syncToAtlasFailure({
        entryId: 'te-new',
        error: 'Network error',
        attempt: 0
      }));

      expect(state.syncStatusMap['te-new']).toBe(SyncStatus.Pending);
      expect(state.pendingSyncs['te-new']).toBeDefined();
      expect(state.pendingSyncs['te-new'].attempt).toBe(0);
      expect(state.pendingSyncs['te-new'].lastError).toBe('Network error');
    });
  });

  describe('syncConflictDetected', () => {
    it('should set sync status to Conflict', () => {
      const action = AtlasSyncActions.syncConflictDetected({ conflict: mockConflict });
      const state = atlasSyncReducer(initialState, action);

      expect(state.syncStatusMap['te-1']).toBe(SyncStatus.Conflict);
    });

    it('should add conflict to conflicts array', () => {
      const action = AtlasSyncActions.syncConflictDetected({ conflict: mockConflict });
      const state = atlasSyncReducer(initialState, action);

      expect(state.conflicts.length).toBe(1);
      expect(state.conflicts[0]).toEqual(mockConflict);
    });

    it('should accumulate multiple conflicts', () => {
      const conflict2: SyncConflict = {
        entryId: 'te-2',
        mismatchedFields: ['mileage'],
        localValues: { mileage: 50 },
        remoteValues: { mileage: 45 }
      };

      let state = atlasSyncReducer(initialState, AtlasSyncActions.syncConflictDetected({ conflict: mockConflict }));
      state = atlasSyncReducer(state, AtlasSyncActions.syncConflictDetected({ conflict: conflict2 }));

      expect(state.conflicts.length).toBe(2);
      expect(state.syncStatusMap['te-1']).toBe(SyncStatus.Conflict);
      expect(state.syncStatusMap['te-2']).toBe(SyncStatus.Conflict);
    });
  });
});

describe('AtlasSyncSelectors', () => {
  const buildState = (atlasSyncState: AtlasSyncState): any => ({
    atlasSync: atlasSyncState
  });

  describe('selectPendingSyncs', () => {
    it('should return empty array when no pending syncs', () => {
      const state = buildState(initialState);
      const result = AtlasSyncSelectors.selectPendingSyncs.projector(state.atlasSync);

      expect(result).toEqual([]);
    });

    it('should return all pending sync entries as array', () => {
      const stateWithPending: AtlasSyncState = {
        ...initialState,
        pendingSyncs: {
          'te-1': {
            entryId: 'te-1',
            payload: { jobId: 'j1', technicianId: 't1', clockInTime: '2024-01-01T00:00:00Z' },
            attempt: 0,
            maxAttempts: 3,
            nextRetryAt: new Date()
          },
          'te-2': {
            entryId: 'te-2',
            payload: { jobId: 'j2', technicianId: 't2', clockInTime: '2024-01-02T00:00:00Z' },
            attempt: 1,
            maxAttempts: 3,
            nextRetryAt: new Date()
          }
        }
      };
      const result = AtlasSyncSelectors.selectPendingSyncs.projector(stateWithPending);

      expect(result.length).toBe(2);
    });
  });

  describe('selectSyncStatusByEntryId', () => {
    it('should return null for unknown entry', () => {
      const statusMap = {};
      const result = AtlasSyncSelectors.selectSyncStatusByEntryId('unknown').projector(statusMap);

      expect(result).toBeNull();
    });

    it('should return correct status for known entry', () => {
      const statusMap: Record<string, SyncStatus> = {
        'te-1': SyncStatus.Synced,
        'te-2': SyncStatus.Failed
      };

      expect(AtlasSyncSelectors.selectSyncStatusByEntryId('te-1').projector(statusMap)).toBe(SyncStatus.Synced);
      expect(AtlasSyncSelectors.selectSyncStatusByEntryId('te-2').projector(statusMap)).toBe(SyncStatus.Failed);
    });
  });

  describe('selectFailedSyncs', () => {
    it('should return empty array when no failed syncs', () => {
      const result = AtlasSyncSelectors.selectFailedSyncs.projector(initialState);

      expect(result).toEqual([]);
    });

    it('should return only entry IDs with Failed status', () => {
      const stateWithMixed: AtlasSyncState = {
        ...initialState,
        syncStatusMap: {
          'te-1': SyncStatus.Synced,
          'te-2': SyncStatus.Failed,
          'te-3': SyncStatus.Pending,
          'te-4': SyncStatus.Failed,
          'te-5': SyncStatus.Conflict
        }
      };
      const result = AtlasSyncSelectors.selectFailedSyncs.projector(stateWithMixed);

      expect(result.length).toBe(2);
      expect(result).toContain('te-2');
      expect(result).toContain('te-4');
    });
  });

  describe('selectConflicts', () => {
    it('should return empty array when no conflicts', () => {
      const result = AtlasSyncSelectors.selectConflicts.projector(initialState);

      expect(result).toEqual([]);
    });

    it('should return all conflicts', () => {
      const stateWithConflicts: AtlasSyncState = {
        ...initialState,
        conflicts: [
          {
            entryId: 'te-1',
            mismatchedFields: ['clockOutTime'],
            localValues: { clockOutTime: '2024-02-01T17:00:00Z' },
            remoteValues: { clockOutTime: '2024-02-01T16:30:00Z' }
          },
          {
            entryId: 'te-2',
            mismatchedFields: ['mileage'],
            localValues: { mileage: 50 },
            remoteValues: { mileage: 45 }
          }
        ]
      };
      const result = AtlasSyncSelectors.selectConflicts.projector(stateWithConflicts);

      expect(result.length).toBe(2);
    });
  });

  describe('selectPendingSyncCount', () => {
    it('should return 0 when no pending syncs', () => {
      const result = AtlasSyncSelectors.selectPendingSyncCount.projector([]);

      expect(result).toBe(0);
    });

    it('should return correct count', () => {
      const pendingSyncs: any[] = [
        { entryId: 'te-1', payload: {}, attempt: 0, maxAttempts: 3, nextRetryAt: new Date() },
        { entryId: 'te-2', payload: {}, attempt: 1, maxAttempts: 3, nextRetryAt: new Date() }
      ];
      const result = AtlasSyncSelectors.selectPendingSyncCount.projector(pendingSyncs);

      expect(result).toBe(2);
    });
  });

  describe('selectPendingSyncByEntryId', () => {
    it('should return null for unknown entry', () => {
      const result = AtlasSyncSelectors.selectPendingSyncByEntryId('unknown').projector(initialState);

      expect(result).toBeNull();
    });

    it('should return the pending sync entry for a known entry', () => {
      const stateWithPending: AtlasSyncState = {
        ...initialState,
        pendingSyncs: {
          'te-1': {
            entryId: 'te-1',
            payload: { jobId: 'j1', technicianId: 't1', clockInTime: '2024-01-01T00:00:00Z' },
            attempt: 1,
            maxAttempts: 3,
            nextRetryAt: new Date()
          }
        }
      };
      const result = AtlasSyncSelectors.selectPendingSyncByEntryId('te-1').projector(stateWithPending);

      expect(result).toBeDefined();
      expect(result!.entryId).toBe('te-1');
      expect(result!.attempt).toBe(1);
    });
  });
});
