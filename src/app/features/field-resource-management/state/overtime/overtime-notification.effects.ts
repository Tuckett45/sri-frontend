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
import { ToastrService } from 'ngx-toastr';

import * as OvertimeActions from './overtime.actions';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class OvertimeNotificationEffects {

  /**
   * Effect: notifyOnSubmission$
   *
   * On successful overtime request creation, show success toast.
   * Backend already sends in-app notification to the manager.
   */
  notifyOnSubmission$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.createOvertimeRequestSuccess),
      tap(({ request }) => {
        this.toastr.success(
          'Your overtime request has been submitted successfully.',
          'Overtime Request Submitted'
        );
        console.info(
          `[Overtime Notification] Request ${request.id} submitted by ${request.employeeFullName}. ` +
          `Manager notified via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnSubmissionFailure$
   *
   * On failed overtime request creation, show error toast.
   */
  notifyOnSubmissionFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.createOvertimeRequestFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to submit your overtime request. Please try again.',
          'Overtime Request Failed'
        );
        console.error(`[Overtime Notification] Create request failed: ${error}`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnDeleteSuccess$
   *
   * On successful overtime request deletion, show success toast.
   */
  notifyOnDeleteSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.deleteOvertimeRequestSuccess),
      tap(({ requestId }) => {
        this.toastr.success(
          'Your overtime request has been deleted.',
          'Request Deleted'
        );
        console.info(`[Overtime Notification] Request ${requestId} deleted.`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnDeleteFailure$
   *
   * On failed overtime request deletion, show error toast.
   */
  notifyOnDeleteFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.deleteOvertimeRequestFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to delete overtime request. Please try again.',
          'Delete Failed'
        );
        console.error(`[Overtime Notification] Delete request failed: ${error}`);
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
   * Effect: notifyOnApprovalFailure$
   *
   * On failed approval (e.g. 403 permission denied), show an error toast
   * with the server-provided message.
   */
  notifyOnApprovalFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.approveOvertimeRequestFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to approve the overtime request. Please try again.',
          'Approval Failed'
        );
        console.error(`[Overtime Notification] Approve request failed: ${error}`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnRejectionFailure$
   *
   * On failed rejection (e.g. 403 permission denied), show an error toast
   * with the server-provided message.
   */
  notifyOnRejectionFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.rejectOvertimeRequestFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to reject the overtime request. Please try again.',
          'Rejection Failed'
        );
        console.error(`[Overtime Notification] Reject request failed: ${error}`);
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
    private notificationService: NotificationService,
    private toastr: ToastrService
  ) {}
}
