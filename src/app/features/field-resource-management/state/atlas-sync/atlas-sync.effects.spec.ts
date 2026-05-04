/**
 * Atlas Sync Effects Unit Tests
 *
 * Tests all effects for ATLAS API synchronization state management:
 * - syncToAtlas: calls service, dispatches success/failure, detects conflicts
 * - syncToAtlasRetry: exponential backoff retry logic
 * - syncConflictNotification: triggers notification on conflict
 *
 * Requirements: 8.3, 8.4, 8.7
 */

import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';

import { AtlasSyncEffects } from './atlas-sync.effects';
import { AtlasSyncService } from '../../services/atlas-sync.service';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';
import * as AtlasSyncActions from './atlas-sync.actions';
import { TimeEntry } from '../../models/time-entry.model';
import { AtlasSyncResult, SyncConflict, AtlasTimeEntryPayload } from '../../../../models/time-payroll.model';
import { TimeCategory, PayType, SyncStatus } from '../../../../models/time-payroll.enum';

describe('AtlasSyncEffects', () => {
  let actions$: Observable<any>;
  let effects: AtlasSyncEffects;
  let atlasSyncService: jasmine.SpyObj<AtlasSyncService>;
  let notificationService: jasmine.SpyObj<FrmNotificationAdapterService>;

  const mockEntry: TimeEntry = {
    id: 'entry-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date('2024-06-01T08:00:00Z'),
    clockOutTime: new Date('2024-06-01T17:00:00Z'),
    totalHours: 9,
    regularHours: 8,
    overtimeHours: 1,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date('2024-06-01T08:00:00Z'),
    updatedAt: new Date('2024-06-01T17:00:00Z'),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Pending
  };

  const mockSyncResult: AtlasSyncResult = {
    entryId: 'entry-1',
    success: true,
    httpStatus: 200,
    payloadHash: 'abc123',
    timestamp: new Date('2024-06-01T17:05:00Z')
  };

  const mockConflict: SyncConflict = {
    entryId: 'entry-1',
    mismatchedFields: ['clockOutTime'],
    localValues: { clockOutTime: '2024-06-01T17:00:00.000Z' },
    remoteValues: { clockOutTime: '2024-06-01T16:30:00.000Z' }
  };

  const mockPayload: AtlasTimeEntryPayload = {
    id: 'entry-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: '2024-06-01T08:00:00.000Z',
    clockOutTime: '2024-06-01T17:00:00.000Z',
    timeCategory: 'OnSite',
    payType: 'Regular'
  };

  beforeEach(() => {
    const atlasSyncSpy = jasmine.createSpyObj('AtlasSyncService', [
      'syncTimeEntry',
      'detectPayloadMismatch',
      'serializeToAtlasPayload'
    ]);

    const notificationSpy = jasmine.createSpyObj('FrmNotificationAdapterService', [
      'sendConflictDetectedNotification'
    ]);

    TestBed.configureTestingModule({
      providers: [
        AtlasSyncEffects,
        provideMockActions(() => actions$),
        { provide: AtlasSyncService, useValue: atlasSyncSpy },
        { provide: FrmNotificationAdapterService, useValue: notificationSpy }
      ]
    });

    effects = TestBed.inject(AtlasSyncEffects);
    atlasSyncService = TestBed.inject(AtlasSyncService) as jasmine.SpyObj<AtlasSyncService>;
    notificationService = TestBed.inject(FrmNotificationAdapterService) as jasmine.SpyObj<FrmNotificationAdapterService>;

    // Default mock returns
    atlasSyncService.serializeToAtlasPayload.and.returnValue(mockPayload);
    atlasSyncService.detectPayloadMismatch.and.returnValue(null);
    notificationService.sendConflictDetectedNotification.and.returnValue(of({} as any));
  });

  describe('syncToAtlas$', () => {
    it('should dispatch syncToAtlasSuccess on successful sync', (done) => {
      const action = AtlasSyncActions.syncToAtlas({ entry: mockEntry });
      actions$ = of(action);
      atlasSyncService.syncTimeEntry.and.returnValue(of(mockSyncResult));

      const results: any[] = [];
      effects.syncToAtlas$.subscribe({
        next: (result) => results.push(result),
        complete: () => {
          expect(results.length).toBe(1);
          expect(results[0]).toEqual(AtlasSyncActions.syncToAtlasSuccess({ result: mockSyncResult }));
          expect(atlasSyncService.syncTimeEntry).toHaveBeenCalledWith(mockEntry);
          done();
        }
      });
    });

    it('should dispatch syncToAtlasFailure on sync error', (done) => {
      const action = AtlasSyncActions.syncToAtlas({ entry: mockEntry });
      actions$ = of(action);
      const error = new Error('Network error');
      atlasSyncService.syncTimeEntry.and.returnValue(throwError(() => error));

      effects.syncToAtlas$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlasFailure({
          entryId: 'entry-1',
          error: 'Network error',
          attempt: 0
        }));
        done();
      });
    });

    it('should dispatch syncConflictDetected when result contains a conflict', (done) => {
      const resultWithConflict: AtlasSyncResult = {
        ...mockSyncResult,
        conflict: mockConflict
      };
      const action = AtlasSyncActions.syncToAtlas({ entry: mockEntry });
      actions$ = of(action);
      atlasSyncService.syncTimeEntry.and.returnValue(of(resultWithConflict));

      const results: any[] = [];
      effects.syncToAtlas$.subscribe({
        next: (result) => results.push(result),
        complete: () => {
          expect(results.length).toBe(2);
          expect(results[0]).toEqual(AtlasSyncActions.syncToAtlasSuccess({ result: resultWithConflict }));
          expect(results[1]).toEqual(AtlasSyncActions.syncConflictDetected({ conflict: mockConflict }));
          done();
        }
      });
    });

    it('should dispatch syncConflictDetected when detectPayloadMismatch finds a conflict', (done) => {
      const action = AtlasSyncActions.syncToAtlas({ entry: mockEntry });
      actions$ = of(action);
      atlasSyncService.syncTimeEntry.and.returnValue(of(mockSyncResult));
      atlasSyncService.detectPayloadMismatch.and.returnValue(mockConflict);

      const results: any[] = [];
      effects.syncToAtlas$.subscribe({
        next: (result) => results.push(result),
        complete: () => {
          expect(results.length).toBe(2);
          expect(results[0]).toEqual(AtlasSyncActions.syncToAtlasSuccess({ result: mockSyncResult }));
          expect(results[1]).toEqual(AtlasSyncActions.syncConflictDetected({ conflict: mockConflict }));
          done();
        }
      });
    });

    it('should handle error with no message gracefully', (done) => {
      const action = AtlasSyncActions.syncToAtlas({ entry: mockEntry });
      actions$ = of(action);
      atlasSyncService.syncTimeEntry.and.returnValue(throwError(() => ({})));

      effects.syncToAtlas$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlasFailure({
          entryId: 'entry-1',
          error: 'Unknown sync error',
          attempt: 0
        }));
        done();
      });
    });
  });

  describe('syncToAtlasRetry$', () => {
    it('should dispatch retry after backoff delay for attempt 0 (2s)', fakeAsync(() => {
      const action = AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 0
      });
      actions$ = of(action);

      let result: any;
      effects.syncToAtlasRetry$.subscribe(r => result = r);

      // Before backoff delay
      tick(1999);
      expect(result).toBeUndefined();

      // After backoff delay (2s for attempt 0)
      tick(1);
      expect(result).toEqual(AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 1
      }));
    }));

    it('should dispatch retry after backoff delay for attempt 1 (4s)', fakeAsync(() => {
      const action = AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 1
      });
      actions$ = of(action);

      let result: any;
      effects.syncToAtlasRetry$.subscribe(r => result = r);

      // Before backoff delay
      tick(3999);
      expect(result).toBeUndefined();

      // After backoff delay (4s for attempt 1)
      tick(1);
      expect(result).toEqual(AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 2
      }));
    }));

    it('should dispatch retry after backoff delay for attempt 2 (8s)', fakeAsync(() => {
      const action = AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 2
      });
      actions$ = of(action);

      let result: any;
      effects.syncToAtlasRetry$.subscribe(r => result = r);

      // Before backoff delay
      tick(7999);
      expect(result).toBeUndefined();

      // After backoff delay (8s for attempt 2)
      tick(1);
      expect(result).toEqual(AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 3
      }));
    }));

    it('should not retry when attempt >= 3', fakeAsync(() => {
      const action = AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 3
      });
      actions$ = of(action);

      let emitted = false;
      effects.syncToAtlasRetry$.subscribe(() => emitted = true);

      tick(20000);
      expect(emitted).toBe(false);
    }));

    it('should not retry when attempt is 4', fakeAsync(() => {
      const action = AtlasSyncActions.syncToAtlasFailure({
        entryId: 'entry-1',
        error: 'Network error',
        attempt: 4
      });
      actions$ = of(action);

      let emitted = false;
      effects.syncToAtlasRetry$.subscribe(() => emitted = true);

      tick(20000);
      expect(emitted).toBe(false);
    }));
  });

  describe('syncConflictNotification$', () => {
    it('should call notification service with conflict details', () => {
      const action = AtlasSyncActions.syncConflictDetected({ conflict: mockConflict });
      actions$ = of(action);

      effects.syncConflictNotification$.subscribe();

      expect(notificationService.sendConflictDetectedNotification).toHaveBeenCalledWith(
        'Sync',
        'ATLAS sync conflict detected for time entry entry-1. Mismatched fields: clockOutTime'
      );
    });

    it('should include all mismatched fields in notification', () => {
      const multiFieldConflict: SyncConflict = {
        entryId: 'entry-2',
        mismatchedFields: ['clockOutTime', 'mileage', 'payType'],
        localValues: { clockOutTime: 'a', mileage: 10, payType: 'Regular' },
        remoteValues: { clockOutTime: 'b', mileage: 20, payType: 'Overtime' }
      };
      const action = AtlasSyncActions.syncConflictDetected({ conflict: multiFieldConflict });
      actions$ = of(action);

      effects.syncConflictNotification$.subscribe();

      expect(notificationService.sendConflictDetectedNotification).toHaveBeenCalledWith(
        'Sync',
        'ATLAS sync conflict detected for time entry entry-2. Mismatched fields: clockOutTime, mileage, payType'
      );
    });
  });
});
