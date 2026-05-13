/**
 * Time Entry Effects Unit Tests
 *
 * Tests the ATLAS sync integration effects that dispatch syncToAtlas
 * after successful time entry create/update operations.
 *
 * Requirements: 8.1, 8.3, 8.5, 8.6
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';

import { TimeEntryEffects } from './time-entry.effects';
import { TimeTrackingService } from '../../services/time-tracking.service';
import { GeolocationService } from '../../services/geolocation.service';
import * as TimeEntryActions from './time-entry.actions';
import * as AtlasSyncActions from '../atlas-sync/atlas-sync.actions';
import { TimeEntry } from '../../models/time-entry.model';
import { TimeCategory, PayType, SyncStatus } from '../../../../models/time-payroll.enum';

describe('TimeEntryEffects', () => {
  let actions$: Observable<any>;
  let effects: TimeEntryEffects;
  let timeTrackingService: jasmine.SpyObj<TimeTrackingService>;
  let geolocationService: jasmine.SpyObj<GeolocationService>;
  let store: MockStore;

  const mockTimeEntry: TimeEntry = {
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

  const mockClockInEntry: TimeEntry = {
    ...mockTimeEntry,
    id: 'entry-new',
    clockOutTime: undefined,
    totalHours: undefined,
    regularHours: undefined,
    overtimeHours: undefined
  };

  beforeEach(() => {
    const timeTrackingSpy = jasmine.createSpyObj('TimeTrackingService', [
      'clockIn',
      'clockOut',
      'getTimeEntries',
      'updateTimeEntry',
      'getActiveTimeEntry'
    ]);

    const geolocationSpy = jasmine.createSpyObj('GeolocationService', [
      'calculateDistance'
    ]);

    TestBed.configureTestingModule({
      providers: [
        TimeEntryEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          initialState: {
            timeEntries: {
              ids: ['entry-1'],
              entities: { 'entry-1': mockTimeEntry },
              activeEntry: null,
              loading: false,
              error: null
            }
          }
        }),
        { provide: TimeTrackingService, useValue: timeTrackingSpy },
        { provide: GeolocationService, useValue: geolocationSpy }
      ]
    });

    effects = TestBed.inject(TimeEntryEffects);
    timeTrackingService = TestBed.inject(TimeTrackingService) as jasmine.SpyObj<TimeTrackingService>;
    geolocationService = TestBed.inject(GeolocationService) as jasmine.SpyObj<GeolocationService>;
    store = TestBed.inject(MockStore);
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('clockIn$', () => {
    it('should dispatch clockInSuccess on successful clock in', (done) => {
      const action = TimeEntryActions.clockIn({
        jobId: 'job-1',
        technicianId: 'tech-1'
      });
      actions$ = of(action);
      timeTrackingService.clockIn.and.returnValue(of(mockClockInEntry));

      effects.clockIn$.subscribe((result) => {
        expect(result).toEqual(TimeEntryActions.clockInSuccess({ timeEntry: mockClockInEntry }));
        expect(timeTrackingService.clockIn).toHaveBeenCalledWith('job-1', 'tech-1', undefined);
        done();
      });
    });

    it('should dispatch clockInFailure on error', (done) => {
      const action = TimeEntryActions.clockIn({
        jobId: 'job-1',
        technicianId: 'tech-1'
      });
      actions$ = of(action);
      timeTrackingService.clockIn.and.returnValue(throwError(() => new Error('Network error')));

      effects.clockIn$.subscribe((result) => {
        expect(result).toEqual(TimeEntryActions.clockInFailure({ error: 'Network error' }));
        done();
      });
    });
  });

  describe('updateTimeEntry$', () => {
    it('should dispatch updateTimeEntrySuccess on successful update', (done) => {
      const changes = { adjustmentReason: 'Corrected hours' };
      const action = TimeEntryActions.updateTimeEntry({ id: 'entry-1', timeEntry: changes });
      actions$ = of(action);
      timeTrackingService.updateTimeEntry.and.returnValue(of(mockTimeEntry));

      effects.updateTimeEntry$.subscribe((result) => {
        expect(result).toEqual(TimeEntryActions.updateTimeEntrySuccess({ timeEntry: mockTimeEntry }));
        expect(timeTrackingService.updateTimeEntry).toHaveBeenCalledWith('entry-1', changes);
        done();
      });
    });

    it('should dispatch updateTimeEntryFailure on error', (done) => {
      const changes = { adjustmentReason: 'Corrected hours' };
      const action = TimeEntryActions.updateTimeEntry({ id: 'entry-1', timeEntry: changes });
      actions$ = of(action);
      timeTrackingService.updateTimeEntry.and.returnValue(throwError(() => new Error('Server error')));

      effects.updateTimeEntry$.subscribe((result) => {
        expect(result).toEqual(TimeEntryActions.updateTimeEntryFailure({ error: 'Server error' }));
        done();
      });
    });
  });

  describe('syncAfterClockIn$ (Requirement 8.1, 8.3)', () => {
    it('should dispatch syncToAtlas after clockInSuccess', (done) => {
      const action = TimeEntryActions.clockInSuccess({ timeEntry: mockClockInEntry });
      actions$ = of(action);

      effects.syncAfterClockIn$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlas({ entry: mockClockInEntry }));
        done();
      });
    });

    it('should pass the full time entry to syncToAtlas', (done) => {
      const entryWithLocation: TimeEntry = {
        ...mockClockInEntry,
        clockInLocation: { latitude: 40.7128, longitude: -74.0060, accuracy: 10 }
      };
      const action = TimeEntryActions.clockInSuccess({ timeEntry: entryWithLocation });
      actions$ = of(action);

      effects.syncAfterClockIn$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlas({ entry: entryWithLocation }));
        done();
      });
    });
  });

  describe('syncAfterClockOut$ (Requirement 8.1, 8.3)', () => {
    it('should dispatch syncToAtlas after clockOutSuccess', (done) => {
      const action = TimeEntryActions.clockOutSuccess({ timeEntry: mockTimeEntry });
      actions$ = of(action);

      effects.syncAfterClockOut$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
        done();
      });
    });

    it('should pass the updated time entry with clock-out data to syncToAtlas', (done) => {
      const completedEntry: TimeEntry = {
        ...mockTimeEntry,
        clockOutTime: new Date('2024-06-01T17:30:00Z'),
        totalHours: 9.5,
        clockOutLocation: { latitude: 40.7580, longitude: -73.9855, accuracy: 5 },
        mileage: 12.5
      };
      const action = TimeEntryActions.clockOutSuccess({ timeEntry: completedEntry });
      actions$ = of(action);

      effects.syncAfterClockOut$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlas({ entry: completedEntry }));
        done();
      });
    });
  });

  describe('syncAfterUpdate$ (Requirement 8.1, 8.3)', () => {
    it('should dispatch syncToAtlas after updateTimeEntrySuccess', (done) => {
      const action = TimeEntryActions.updateTimeEntrySuccess({ timeEntry: mockTimeEntry });
      actions$ = of(action);

      effects.syncAfterUpdate$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlas({ entry: mockTimeEntry }));
        done();
      });
    });

    it('should pass the updated time entry to syncToAtlas after manual adjustment', (done) => {
      const adjustedEntry: TimeEntry = {
        ...mockTimeEntry,
        isManuallyAdjusted: true,
        adjustedBy: 'manager-1',
        adjustmentReason: 'Corrected clock-out time',
        clockOutTime: new Date('2024-06-01T18:00:00Z'),
        totalHours: 10
      };
      const action = TimeEntryActions.updateTimeEntrySuccess({ timeEntry: adjustedEntry });
      actions$ = of(action);

      effects.syncAfterUpdate$.subscribe((result) => {
        expect(result).toEqual(AtlasSyncActions.syncToAtlas({ entry: adjustedEntry }));
        done();
      });
    });
  });
});
