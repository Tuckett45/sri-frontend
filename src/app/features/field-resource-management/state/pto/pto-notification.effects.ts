/**
 * PTO Notification Effects
 *
 * Handles side effects for PTO workflow status change notifications.
 * The backend dispatches in-app notifications to relevant parties
 * via INotificationService.SendAsync() in the PtoRequestsController.
 * These frontend effects provide UI feedback and logging.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { tap } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';

import * as PtoActions from './pto.actions';
import { NotificationService } from '../../services/notification.service';

@Injectable()
export class PtoNotificationEffects {

  /**
   * Effect: notifyOnSubmission$
   *
   * On successful PTO request creation, the backend notifies the manager.
   * Frontend shows success toast and logs the event.
   *
   * Requirement 6.1
   */
  notifyOnSubmission$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.createRequestSuccess),
      tap(({ request }) => {
        this.toastr.success(
          'Your time off request has been submitted successfully.',
          'PTO Request Submitted'
        );
        console.info(
          `[PTO Notification] Request ${request.id} submitted by ${request.employeeName}. ` +
          `Manager ${request.managerName} (${request.managerId}) notified via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnSubmissionFailure$
   *
   * On failed PTO request creation, show error toast.
   */
  notifyOnSubmissionFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.createRequestFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to submit your time off request. Please try again.',
          'PTO Request Failed'
        );
        console.error(`[PTO Notification] Create request failed: ${error}`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnDeleteSuccess$
   *
   * On successful PTO request deletion, show success toast.
   */
  notifyOnDeleteSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.deleteRequestSuccess),
      tap(({ requestId }) => {
        this.toastr.success(
          'Your PTO request has been deleted.',
          'Request Deleted'
        );
        console.info(`[PTO Notification] Request ${requestId} deleted.`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnDeleteFailure$
   *
   * On failed PTO request deletion, show error toast.
   */
  notifyOnDeleteFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.deleteRequestFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to delete PTO request. Please try again.',
          'Delete Failed'
        );
        console.error(`[PTO Notification] Delete request failed: ${error}`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnManagerApproval$
   *
   * On successful manager approval, backoffice users are notified via backend.
   *
   * Requirement 6.2
   */
  notifyOnManagerApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerApproveSuccess),
      tap(({ request }) => {
        console.info(
          `[PTO Notification] Request ${request.id} approved by manager. ` +
          `Backoffice users notified for final review via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnManagerRejection$
   *
   * On successful manager rejection, the employee is notified via backend
   * (in-app notification + email with rejection reason).
   *
   * Requirement 6.3
   */
  notifyOnManagerRejection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerRejectSuccess),
      tap(({ request }) => {
        console.info(
          `[PTO Notification] Request ${request.id} rejected by manager. ` +
          `Employee ${request.employeeName} (${request.employeeId}) notified with reason via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnApprovalFailure$
   *
   * On failed manager/backoffice approval (e.g. 403 permission denied),
   * show an error toast with the server-provided message.
   */
  notifyOnApprovalFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerApproveFailure, PtoActions.backofficeApproveFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to approve the PTO request. Please try again.',
          'Approval Failed'
        );
        console.error(`[PTO Notification] Approve request failed: ${error}`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnRejectionFailure$
   *
   * On failed manager/backoffice rejection (e.g. 403 permission denied),
   * show an error toast with the server-provided message.
   */
  notifyOnRejectionFailure$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerRejectFailure, PtoActions.backofficeRejectFailure),
      tap(({ error }) => {
        this.toastr.error(
          error || 'Failed to reject the PTO request. Please try again.',
          'Rejection Failed'
        );
        console.error(`[PTO Notification] Reject request failed: ${error}`);
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnBackofficeApproval$
   *
   * On successful backoffice approval (final approval), employee and manager
   * are notified via backend (in-app + email).
   *
   * Requirement 6.4
   */
  notifyOnBackofficeApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.backofficeApproveSuccess),
      tap(({ request }) => {
        console.info(
          `[PTO Notification] Request ${request.id} approved by backoffice (final). ` +
          `Employee ${request.employeeName} and Manager ${request.managerName} notified via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnBackofficeRejection$
   *
   * On successful backoffice rejection, employee and manager are notified
   * via backend (in-app + email with rejection reason).
   *
   * Requirement 6.3
   */
  notifyOnBackofficeRejection$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.backofficeRejectSuccess),
      tap(({ request }) => {
        console.info(
          `[PTO Notification] Request ${request.id} rejected by backoffice. ` +
          `Employee ${request.employeeName} and Manager ${request.managerName} notified via backend.`
        );
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: notifyOnCancellation$
   *
   * On successful cancellation, manager and backoffice are notified via backend.
   *
   * Requirement 6.3
   */
  notifyOnCancellation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.cancelRequestSuccess),
      tap(({ request }) => {
        console.info(
          `[PTO Notification] Request ${request.id} cancelled by employee ${request.employeeName}. ` +
          `Manager ${request.managerName} notified via backend.`
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
