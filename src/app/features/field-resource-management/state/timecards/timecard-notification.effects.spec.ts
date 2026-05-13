/**
 * Timecard Notification Effects Unit Tests
 *
 * Tests all effects for timecard status notification triggers:
 * - deadlineProximityReminder$: sends reminder when Draft period lock deadline is within 24h
 * - periodInactivityReminder$: sends reminder when no entries exist 24h after period start
 * - timecardRejectedNotification$: sends notification on period rejection
 * - timecardApprovedNotification$: sends notification on period approval
 * - timecardLockedNotification$: sends notification when period is locked
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Observable, of } from 'rxjs';

import { TimecardNotificationEffects } from './timecard-notification.effects';
import { TimecardService } from '../../services/timecard.service';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';
import * as TimecardActions from './timecard.actions';
import { selectLockConfig } from './timecard.selectors';
import { TimecardPeriod, TimecardStatus, TimecardLockConfig } from '../../models/time-entry.model';

describe('TimecardNotificationEffects', () => {
  let actions$: Observable<any>;
  let effects: TimecardNotificationEffects;
  let store: MockStore;
  let timecardService: jasmine.SpyObj<TimecardService>;
  let notificationService: jasmine.SpyObj<FrmNotificationAdapterService>;

  const mockLockConfig: TimecardLockConfig = {
    enabled: true,
    lockDay: 'Friday',
    lockTime: '17:00',
    gracePeriodHours: 2,
    allowManagerUnlock: true,
    requireUnlockReason: true,
    autoRelockAfterHours: 24
  };

  function createMockPeriod(overrides: Partial<TimecardPeriod> = {}): TimecardPeriod {
    return {
      id: 'period-1',
      technicianId: 'tech-1',
      startDate: new Date('2024-06-03T00:00:00Z'),
      endDate: new Date('2024-06-09T23:59:59Z'),
      periodType: 'weekly',
      status: TimecardStatus.Draft,
      isLocked: false,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      totalExpenses: 0,
      timeEntries: [],
      expenses: [],
      driveTimeHours: 0,
      onSiteHours: 0,
      holidayHours: 0,
      ptoHours: 0,
      totalBillableAmount: 0,
      totalLaborCost: 0,
      isAutoSubmitted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  beforeEach(() => {
    const timecardSpy = jasmine.createSpyObj('TimecardService', ['calculateLockTime']);
    const notificationSpy = jasmine.createSpyObj('FrmNotificationAdapterService', [
      'sendTimecardNotSubmittedReminder',
      'sendTimecardNotStartedReminder',
      'sendTimecardRejectedNotification',
      'sendTimecardApprovedNotification',
      'sendTimecardLockedNotification'
    ]);

    // Default: all notification methods return an observable
    notificationSpy.sendTimecardNotSubmittedReminder.and.returnValue(of({} as any));
    notificationSpy.sendTimecardNotStartedReminder.and.returnValue(of({} as any));
    notificationSpy.sendTimecardRejectedNotification.and.returnValue(of({} as any));
    notificationSpy.sendTimecardApprovedNotification.and.returnValue(of({} as any));
    notificationSpy.sendTimecardLockedNotification.and.returnValue(of({} as any));

    TestBed.configureTestingModule({
      providers: [
        TimecardNotificationEffects,
        provideMockActions(() => actions$),
        provideMockStore({
          selectors: [
            { selector: selectLockConfig, value: mockLockConfig }
          ]
        }),
        { provide: TimecardService, useValue: timecardSpy },
        { provide: FrmNotificationAdapterService, useValue: notificationSpy }
      ]
    });

    effects = TestBed.inject(TimecardNotificationEffects);
    store = TestBed.inject(MockStore);
    timecardService = TestBed.inject(TimecardService) as jasmine.SpyObj<TimecardService>;
    notificationService = TestBed.inject(FrmNotificationAdapterService) as jasmine.SpyObj<FrmNotificationAdapterService>;
  });

  afterEach(() => {
    store.resetSelectors();
  });

  describe('deadlineProximityReminder$', () => {
    it('should send reminder when Draft period lock deadline is within 24 hours', (done) => {
      // Lock time is 12 hours from now
      const lockTime = new Date(Date.now() + 12 * 60 * 60 * 1000);
      timecardService.calculateLockTime.and.returnValue(lockTime);

      const period = createMockPeriod({ status: TimecardStatus.Draft });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      effects.deadlineProximityReminder$.subscribe(() => {
        expect(notificationService.sendTimecardNotSubmittedReminder).toHaveBeenCalledWith(
          'tech-1',
          'period-1',
          lockTime
        );
        done();
      });
    });

    it('should NOT send reminder when period is not Draft', (done) => {
      const lockTime = new Date(Date.now() + 12 * 60 * 60 * 1000);
      timecardService.calculateLockTime.and.returnValue(lockTime);

      const period = createMockPeriod({ status: TimecardStatus.Submitted });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.deadlineProximityReminder$.subscribe(() => emitted = true);

      // Give it a tick to process
      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardNotSubmittedReminder).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should NOT send reminder when lock deadline is more than 24 hours away', (done) => {
      // Lock time is 48 hours from now
      const lockTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
      timecardService.calculateLockTime.and.returnValue(lockTime);

      const period = createMockPeriod({ status: TimecardStatus.Draft });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.deadlineProximityReminder$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardNotSubmittedReminder).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should NOT send reminder when lock deadline has already passed', (done) => {
      // Lock time was 1 hour ago
      const lockTime = new Date(Date.now() - 1 * 60 * 60 * 1000);
      timecardService.calculateLockTime.and.returnValue(lockTime);

      const period = createMockPeriod({ status: TimecardStatus.Draft });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.deadlineProximityReminder$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardNotSubmittedReminder).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should NOT send reminder when lock config is disabled', (done) => {
      store.overrideSelector(selectLockConfig, { ...mockLockConfig, enabled: false });
      store.refreshState();

      const lockTime = new Date(Date.now() + 12 * 60 * 60 * 1000);
      timecardService.calculateLockTime.and.returnValue(lockTime);

      const period = createMockPeriod({ status: TimecardStatus.Draft });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.deadlineProximityReminder$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardNotSubmittedReminder).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should NOT send reminder when lock config is null', (done) => {
      store.overrideSelector(selectLockConfig, null);
      store.refreshState();

      const period = createMockPeriod({ status: TimecardStatus.Draft });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.deadlineProximityReminder$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardNotSubmittedReminder).not.toHaveBeenCalled();
        done();
      }, 50);
    });
  });

  describe('periodInactivityReminder$', () => {
    it('should send reminder when period has no entries and started more than 24h ago', (done) => {
      // Period started 48 hours ago
      const periodStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const period = createMockPeriod({
        startDate: periodStart,
        timeEntries: []
      });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      effects.periodInactivityReminder$.subscribe(() => {
        expect(notificationService.sendTimecardNotStartedReminder).toHaveBeenCalledWith(
          'tech-1',
          'period-1',
          periodStart
        );
        done();
      });
    });

    it('should NOT send reminder when period has time entries', (done) => {
      const periodStart = new Date(Date.now() - 48 * 60 * 60 * 1000);
      const period = createMockPeriod({
        startDate: periodStart,
        timeEntries: [{
          id: 'entry-1',
          jobId: 'job-1',
          technicianId: 'tech-1',
          clockInTime: new Date(),
          totalHours: 8,
          isManuallyAdjusted: false,
          isLocked: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          timeCategory: 'OnSite' as any,
          payType: 'Regular' as any,
          syncStatus: 'Synced' as any
        }] as any
      });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.periodInactivityReminder$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardNotStartedReminder).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should NOT send reminder when period started less than 24 hours ago', (done) => {
      // Period started 12 hours ago
      const periodStart = new Date(Date.now() - 12 * 60 * 60 * 1000);
      const period = createMockPeriod({
        startDate: periodStart,
        timeEntries: []
      });
      actions$ = of(TimecardActions.loadTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.periodInactivityReminder$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardNotStartedReminder).not.toHaveBeenCalled();
        done();
      }, 50);
    });
  });

  describe('timecardRejectedNotification$', () => {
    it('should send rejection notification when period status is Rejected', (done) => {
      const period = createMockPeriod({
        status: TimecardStatus.Rejected,
        rejectionReason: 'Missing entries for Monday'
      });
      actions$ = of(TimecardActions.updateTimecardPeriodSuccess({ period }));

      effects.timecardRejectedNotification$.subscribe(() => {
        expect(notificationService.sendTimecardRejectedNotification).toHaveBeenCalledWith(
          'tech-1',
          'period-1',
          'Missing entries for Monday'
        );
        done();
      });
    });

    it('should use default reason when rejectionReason is not provided', (done) => {
      const period = createMockPeriod({
        status: TimecardStatus.Rejected,
        rejectionReason: undefined
      });
      actions$ = of(TimecardActions.updateTimecardPeriodSuccess({ period }));

      effects.timecardRejectedNotification$.subscribe(() => {
        expect(notificationService.sendTimecardRejectedNotification).toHaveBeenCalledWith(
          'tech-1',
          'period-1',
          'No reason provided'
        );
        done();
      });
    });

    it('should NOT send rejection notification for non-rejected status', (done) => {
      const period = createMockPeriod({ status: TimecardStatus.Approved });
      actions$ = of(TimecardActions.updateTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.timecardRejectedNotification$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardRejectedNotification).not.toHaveBeenCalled();
        done();
      }, 50);
    });
  });

  describe('timecardApprovedNotification$', () => {
    it('should send approval notification on approveTimecardSuccess', (done) => {
      const period = createMockPeriod({ status: TimecardStatus.Approved });
      actions$ = of(TimecardActions.approveTimecardSuccess({ period }));

      effects.timecardApprovedNotification$.subscribe(() => {
        expect(notificationService.sendTimecardApprovedNotification).toHaveBeenCalledWith(
          'tech-1',
          'period-1'
        );
        done();
      });
    });
  });

  describe('timecardLockedNotification$', () => {
    it('should send locked notification when period is locked', (done) => {
      const period = createMockPeriod({ isLocked: true });
      actions$ = of(TimecardActions.updateTimecardPeriodSuccess({ period }));

      effects.timecardLockedNotification$.subscribe(() => {
        expect(notificationService.sendTimecardLockedNotification).toHaveBeenCalledWith(
          'tech-1',
          'period-1'
        );
        done();
      });
    });

    it('should NOT send locked notification when period is not locked', (done) => {
      const period = createMockPeriod({ isLocked: false });
      actions$ = of(TimecardActions.updateTimecardPeriodSuccess({ period }));

      let emitted = false;
      effects.timecardLockedNotification$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(notificationService.sendTimecardLockedNotification).not.toHaveBeenCalled();
        done();
      }, 50);
    });
  });
});
