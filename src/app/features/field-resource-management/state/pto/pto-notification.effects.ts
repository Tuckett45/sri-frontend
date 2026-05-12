/**
 * PTO Notification Effects
 *
 * Handles side effects for PTO workflow status change notifications.
 * Dispatches notifications to relevant parties when PTO requests
 * transition through the approval workflow.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';

import * as PtoActions from './pto.actions';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class PtoNotificationEffects {

  /**
   * Effect: notifyOnSubmission$
   *
   * On successful PTO request creation, the manager should be notified
   * that a new request requires their approval.
   *
   * Requirement 6.1
   */
  notifyOnSubmission$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.createRequestSuccess),
      tap(({ request }) => {
        // TODO: In production, call NotificationService to notify the manager.
        // Currently logging since the manager's userId is available on the request payload.
        console.log(
          `[PTO Notification] Request ${request.id} submitted by ${request.employeeName}. ` +
          `Manager ${request.managerName} (${request.managerId}) should be notified.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnManagerApproval$
   *
   * On successful manager approval, backoffice users should be notified
   * that a request is ready for their review.
   *
   * Requirement 6.2
   */
  notifyOnManagerApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerApproveSuccess),
      tap(({ request }) => {
        // TODO: In production, call NotificationService to notify backoffice users.
        console.log(
          `[PTO Notification] Request ${request.id} approved by manager. ` +
          `Backoffice users should be notified for final review.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnManagerRejection$
   *
   * On successful manager rejection, the employee should be notified
   * that their request was rejected.
   *
   * Requirement 6.3
   */
  notifyOnManagerRejection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerRejectSuccess),
      tap(({ request }) => {
        // TODO: In production, call NotificationService to notify the employee.
        console.log(
          `[PTO Notification] Request ${request.id} rejected by manager. ` +
          `Employee ${request.employeeName} (${request.employeeId}) should be notified of rejection.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnBackofficeApproval$
   *
   * On successful backoffice approval, the employee and manager should be
   * notified of the final approval.
   *
   * Requirement 6.4
   */
  notifyOnBackofficeApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.backofficeApproveSuccess),
      tap(({ request }) => {
        // TODO: In production, call NotificationService to notify employee and manager.
        console.log(
          `[PTO Notification] Request ${request.id} approved by backoffice. ` +
          `Employee ${request.employeeName} (${request.employeeId}) and ` +
          `Manager ${request.managerName} (${request.managerId}) should be notified of final approval.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnBackofficeRejection$
   *
   * On successful backoffice rejection, the employee and manager should be
   * notified of the rejection.
   *
   * Requirement 6.3
   */
  notifyOnBackofficeRejection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.backofficeRejectSuccess),
      tap(({ request }) => {
        // TODO: In production, call NotificationService to notify employee and manager.
        console.log(
          `[PTO Notification] Request ${request.id} rejected by backoffice. ` +
          `Employee ${request.employeeName} (${request.employeeId}) and ` +
          `Manager ${request.managerName} (${request.managerId}) should be notified of rejection.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnCancellation$
   *
   * On successful cancellation, the manager and backoffice should be
   * notified that the request was cancelled.
   *
   * Requirement 6.3
   */
  notifyOnCancellation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.cancelRequestSuccess),
      tap(({ request }) => {
        // TODO: In production, call NotificationService to notify manager and backoffice.
        console.log(
          `[PTO Notification] Request ${request.id} cancelled by employee ${request.employeeName}. ` +
          `Manager ${request.managerName} (${request.managerId}) and backoffice should be notified.`
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
