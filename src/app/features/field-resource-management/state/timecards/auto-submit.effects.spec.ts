/**
 * Auto-Submit Effects Unit Tests
 *
 * Tests all effects for the automated timecard submission workflow:
 * - triggerAutoSubmit$: calls AutoSubmitService.executeAutoSubmit, dispatches success/failure
 * - autoSubmitRetry$: retries failed auto-submits up to 3 times
 * - autoSubmitNotification$: sends notification for each successfully auto-submitted timecard
 *
 * Requirements: 3.2, 3.4, 3.6
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';

import { AutoSubmitEffects } from './auto-submit.effects';
import { AutoSubmitService } from '../../services/auto-submit.service';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';
import * as TimecardActions from './timecard.actions';
import { AutoSubmitResult } from '../../../../models/time-payroll.model';

describe('AutoSubmitEffects', () => {
  let actions$: Observable<any>;
  let effects: AutoSubmitEffects;
  let autoSubmitService: jasmine.SpyObj<AutoSubmitService>;
  let notificationService: jasmine.SpyObj<FrmNotificationAdapterService>;

  function createMockResult(overrides: Partial<AutoSubmitResult> = {}): AutoSubmitResult {
    return {
      periodId: 'period-1',
      technicianId: 'tech-1',
      success: true,
      attempt: 1,
      timestamp: new Date(),
      ...overrides
    };
  }

  beforeEach(() => {
    const autoSubmitSpy = jasmine.createSpyObj('AutoSubmitService', [
      'executeAutoSubmit',
      'retryAutoSubmit'
    ]);
    const notificationSpy = jasmine.createSpyObj('FrmNotificationAdapterService', [
      'sendTimecardAutoSubmittedNotification'
    ]);

    notificationSpy.sendTimecardAutoSubmittedNotification.and.returnValue(of({} as any));

    TestBed.configureTestingModule({
      providers: [
        AutoSubmitEffects,
        provideMockActions(() => actions$),
        { provide: AutoSubmitService, useValue: autoSubmitSpy },
        { provide: FrmNotificationAdapterService, useValue: notificationSpy }
      ]
    });

    effects = TestBed.inject(AutoSubmitEffects);
    autoSubmitService = TestBed.inject(AutoSubmitService) as jasmine.SpyObj<AutoSubmitService>;
    notificationService = TestBed.inject(FrmNotificationAdapterService) as jasmine.SpyObj<FrmNotificationAdapterService>;
  });

  describe('triggerAutoSubmit$', () => {
    it('should dispatch autoSubmitSuccess with results on successful execution', (done) => {
      const results: AutoSubmitResult[] = [
        createMockResult({ periodId: 'p1', technicianId: 't1', success: true }),
        createMockResult({ periodId: 'p2', technicianId: 't2', success: true })
      ];
      autoSubmitService.executeAutoSubmit.and.returnValue(of(results));

      actions$ = of(TimecardActions.triggerAutoSubmit());

      effects.triggerAutoSubmit$.subscribe(action => {
        expect(action).toEqual(TimecardActions.autoSubmitSuccess({ results }));
        expect(autoSubmitService.executeAutoSubmit).toHaveBeenCalled();
        done();
      });
    });

    it('should dispatch autoSubmitFailure on error', (done) => {
      autoSubmitService.executeAutoSubmit.and.returnValue(
        throwError(() => new Error('Server error'))
      );

      actions$ = of(TimecardActions.triggerAutoSubmit());

      effects.triggerAutoSubmit$.subscribe(action => {
        expect(action).toEqual(TimecardActions.autoSubmitFailure({
          periodId: 'unknown',
          error: 'Server error',
          attempt: 1
        }));
        done();
      });
    });

    it('should use default error message when error has no message', (done) => {
      autoSubmitService.executeAutoSubmit.and.returnValue(
        throwError(() => ({}))
      );

      actions$ = of(TimecardActions.triggerAutoSubmit());

      effects.triggerAutoSubmit$.subscribe(action => {
        expect(action).toEqual(TimecardActions.autoSubmitFailure({
          periodId: 'unknown',
          error: 'Auto-submit failed',
          attempt: 1
        }));
        done();
      });
    });
  });

  describe('autoSubmitRetry$', () => {
    it('should call retryAutoSubmit and dispatch autoSubmitSuccess on successful retry', (done) => {
      const retryResult = createMockResult({ periodId: 'p1', success: true, attempt: 2 });
      autoSubmitService.retryAutoSubmit.and.returnValue(of(retryResult));

      actions$ = of(TimecardActions.autoSubmitFailure({
        periodId: 'p1',
        error: 'Failed',
        attempt: 1
      }));

      effects.autoSubmitRetry$.subscribe(action => {
        expect(autoSubmitService.retryAutoSubmit).toHaveBeenCalledWith('p1', 1);
        expect(action).toEqual(TimecardActions.autoSubmitSuccess({ results: [retryResult] }));
        done();
      });
    });

    it('should dispatch autoSubmitFailure with incremented attempt on retry error', (done) => {
      autoSubmitService.retryAutoSubmit.and.returnValue(
        throwError(() => new Error('Retry failed'))
      );

      actions$ = of(TimecardActions.autoSubmitFailure({
        periodId: 'p1',
        error: 'Failed',
        attempt: 1
      }));

      effects.autoSubmitRetry$.subscribe(action => {
        expect(action).toEqual(TimecardActions.autoSubmitFailure({
          periodId: 'p1',
          error: 'Retry failed',
          attempt: 2
        }));
        done();
      });
    });

    it('should do nothing when attempt >= 3 (max retries exceeded)', (done) => {
      actions$ = of(TimecardActions.autoSubmitFailure({
        periodId: 'p1',
        error: 'Failed',
        attempt: 3
      }));

      let emitted = false;
      effects.autoSubmitRetry$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(autoSubmitService.retryAutoSubmit).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should do nothing when attempt is greater than 3', (done) => {
      actions$ = of(TimecardActions.autoSubmitFailure({
        periodId: 'p1',
        error: 'Failed',
        attempt: 5
      }));

      let emitted = false;
      effects.autoSubmitRetry$.subscribe(() => emitted = true);

      setTimeout(() => {
        expect(emitted).toBe(false);
        expect(autoSubmitService.retryAutoSubmit).not.toHaveBeenCalled();
        done();
      }, 50);
    });

    it('should retry when attempt is 2 (below max)', (done) => {
      const retryResult = createMockResult({ periodId: 'p1', success: true, attempt: 3 });
      autoSubmitService.retryAutoSubmit.and.returnValue(of(retryResult));

      actions$ = of(TimecardActions.autoSubmitFailure({
        periodId: 'p1',
        error: 'Failed',
        attempt: 2
      }));

      effects.autoSubmitRetry$.subscribe(action => {
        expect(autoSubmitService.retryAutoSubmit).toHaveBeenCalledWith('p1', 2);
        expect(action).toEqual(TimecardActions.autoSubmitSuccess({ results: [retryResult] }));
        done();
      });
    });
  });

  describe('autoSubmitNotification$', () => {
    it('should send notification for each successful result', (done) => {
      const results: AutoSubmitResult[] = [
        createMockResult({ periodId: 'p1', technicianId: 't1', success: true }),
        createMockResult({ periodId: 'p2', technicianId: 't2', success: true })
      ];

      actions$ = of(TimecardActions.autoSubmitSuccess({ results }));

      effects.autoSubmitNotification$.subscribe(() => {
        expect(notificationService.sendTimecardAutoSubmittedNotification).toHaveBeenCalledTimes(2);
        expect(notificationService.sendTimecardAutoSubmittedNotification).toHaveBeenCalledWith('t1', 'p1');
        expect(notificationService.sendTimecardAutoSubmittedNotification).toHaveBeenCalledWith('t2', 'p2');
        done();
      });
    });

    it('should NOT send notification for failed results', (done) => {
      const results: AutoSubmitResult[] = [
        createMockResult({ periodId: 'p1', technicianId: 't1', success: true }),
        createMockResult({ periodId: 'p2', technicianId: 't2', success: false, error: 'Failed' })
      ];

      actions$ = of(TimecardActions.autoSubmitSuccess({ results }));

      effects.autoSubmitNotification$.subscribe(() => {
        expect(notificationService.sendTimecardAutoSubmittedNotification).toHaveBeenCalledTimes(1);
        expect(notificationService.sendTimecardAutoSubmittedNotification).toHaveBeenCalledWith('t1', 'p1');
        done();
      });
    });

    it('should not send any notifications when all results failed', (done) => {
      const results: AutoSubmitResult[] = [
        createMockResult({ periodId: 'p1', technicianId: 't1', success: false }),
        createMockResult({ periodId: 'p2', technicianId: 't2', success: false })
      ];

      actions$ = of(TimecardActions.autoSubmitSuccess({ results }));

      effects.autoSubmitNotification$.subscribe(() => {
        expect(notificationService.sendTimecardAutoSubmittedNotification).not.toHaveBeenCalled();
        done();
      });
    });

    it('should handle empty results array', (done) => {
      actions$ = of(TimecardActions.autoSubmitSuccess({ results: [] }));

      effects.autoSubmitNotification$.subscribe(() => {
        expect(notificationService.sendTimecardAutoSubmittedNotification).not.toHaveBeenCalled();
        done();
      });
    });
  });
});
