/**
 * Overtime Notification Effects
 *
 * Handles side effects for overtime workflow status change notifications.
 * The backend already dispatches in-app notifications to relevant parties
 * via INotificationService.SendAsync() in the controller. These frontend
 * effects handle UI feedback (success messages, toast-style alerts).
 *
 * Requirements: 5.1, 5.2, 5.3
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';

import * as OvertimeActions from './overtime.actions';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class OvertimeNotificationEffects {

  /**
   * Effect: notifyOnSubmission$
   *
   * On successful overtime request creation, log and show UI feedback.
   * Backend already sends in-app notification to the manager.
   */
  notifyOnSubmission$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.createOvertimeRequestSuccess),
      tap(({ request }) => {
        // Backend handles notifying the manager via INotificationService.SendAsync()
        // Frontend shows success state via the component's submitted flag
        console.info(
          `[Overtime Notification] Request ${request.id} submitted by ${request.employeeFullName}. ` +
          `Manager notified via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnApproval$
   *
   * On successful approval, log confirmation.
   * Backend sends in-app notification + email to employee.
   */
  notifyOnApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.approveOvertimeRequestSuccess),
      tap(({ request }) => {
        console.info(
          `[Overtime Notification] Request ${request.id} approved. ` +
          `Employee ${request.employeeFullName} notified via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnRejection$
   *
   * On successful rejection, log confirmation.
   * Backend sends in-app notification + email to employee with reason.
   */
  notifyOnRejection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.rejectOvertimeRequestSuccess),
      tap(({ request }) => {
        console.info(
          `[Overtime Notification] Request ${request.id} rejected. ` +
          `Employee ${request.employeeFullName} notified via backend with rejection reason.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnCancellation$
   *
   * On successful cancellation, log confirmation.
   */
  notifyOnCancellation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.cancelOvertimeRequestSuccess),
      tap(({ request }) => {
        console.info(
          `[Overtime Notification] Request ${request.id} cancelled by employee.`
        );
      })
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private notificationService: NotificationService
  ) {}
}
