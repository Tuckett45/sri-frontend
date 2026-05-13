/**
 * Auto-Submit Effects
 *
 * Handles side effects for the automated timecard submission workflow:
 * - triggerAutoSubmit$: calls AutoSubmitService.executeAutoSubmit, dispatches success/failure
 * - autoSubmitRetry$: retries failed auto-submits up to 3 times via AutoSubmitService.retryAutoSubmit
 * - autoSubmitNotification$: sends notification for each successfully auto-submitted timecard
 *
 * Requirements: 3.2, 3.4, 3.6
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, EMPTY } from 'rxjs';
import { map, catchError, switchMap, tap, mergeMap } from 'rxjs/operators';

import * as TimecardActions from './timecard.actions';
import { AutoSubmitService } from '../../services/auto-submit.service';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';

/** Maximum number of retry attempts for a failed auto-submit */
const MAX_AUTO_SUBMIT_RETRIES = 3;

@Injectable()
export class AutoSubmitEffects {

  /**
   * Effect: triggerAutoSubmit$
   *
   * Listens for triggerAutoSubmit action, calls AutoSubmitService.executeAutoSubmit(),
   * and dispatches autoSubmitSuccess with the results on success.
   * On error, dispatches autoSubmitFailure for each failed period.
   *
   * Requirement 3.2
   */
  triggerAutoSubmit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.triggerAutoSubmit),
      switchMap(() =>
        this.autoSubmitService.executeAutoSubmit().pipe(
          map(results => TimecardActions.autoSubmitSuccess({ results })),
          catchError(error =>
            of(TimecardActions.autoSubmitFailure({
              periodId: 'unknown',
              error: error.message || 'Auto-submit failed',
              attempt: 1
            }))
          )
        )
      )
    )
  );

  /**
   * Effect: autoSubmitRetry$
   *
   * Listens for autoSubmitFailure action. If the attempt count is below
   * the maximum (3), calls AutoSubmitService.retryAutoSubmit with the
   * periodId and attempt number. On success, dispatches autoSubmitSuccess.
   * On error, dispatches autoSubmitFailure with incremented attempt.
   * If attempt >= 3, does nothing (max retries exceeded).
   *
   * Requirement 3.6
   */
  autoSubmitRetry$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.autoSubmitFailure),
      mergeMap(({ periodId, error, attempt }) => {
        if (attempt >= MAX_AUTO_SUBMIT_RETRIES) {
          return EMPTY;
        }

        return this.autoSubmitService.retryAutoSubmit(periodId, attempt).pipe(
          map(result => TimecardActions.autoSubmitSuccess({ results: [result] })),
          catchError(retryError =>
            of(TimecardActions.autoSubmitFailure({
              periodId,
              error: retryError.message || 'Auto-submit retry failed',
              attempt: attempt + 1
            }))
          )
        );
      })
    )
  );

  /**
   * Effect: autoSubmitNotification$
   *
   * Listens for autoSubmitSuccess action. For each successful result,
   * calls sendTimecardAutoSubmittedNotification to notify the technician.
   * This is a non-dispatching effect.
   *
   * Requirement 3.4
   */
  autoSubmitNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.autoSubmitSuccess),
      tap(({ results }) => {
        for (const result of results) {
          if (result.success) {
            this.notificationService.sendTimecardAutoSubmittedNotification(
              result.technicianId,
              result.periodId
            ).subscribe();
          }
        }
      })
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private autoSubmitService: AutoSubmitService,
    private notificationService: FrmNotificationAdapterService
  ) {}
}
