import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { EMPTY, of } from 'rxjs';
import { catchError, filter, map, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';
import { AuthService } from '../../../../services/auth.service';
import * as AssignmentActions from '../assignments/assignment.actions';
import * as JobActions from '../jobs/job.actions';
import * as CrewActions from '../crews/crew.actions';
import * as TimecardActions from '../timecards/timecard.actions';
import * as NotificationActions from './notification.actions';
import { JobStatus } from '../../models/job.model';
import { Notification, NotificationType } from '../../models/notification.model';

/**
 * Cross-cutting effects that fire notifications whenever key domain events succeed.
 *
 * Pattern: listen to success actions → call FrmNotificationAdapterService → dispatch
 * addNotification so the in-app bell updates immediately, regardless of whether
 * the backend SignalR push arrives first.
 *
 * All sends are fire-and-forget (errors are swallowed so they never break the
 * primary action flow).  The actual delivery (email, push, in-app persistence)
 * happens server-side; we only dispatch a local store entry here for instant
 * in-app feedback.
 */
@Injectable()
export class FrmNotificationTriggerEffects {

  // ─── ASSIGNMENT: Technician assigned to a job ────────────────────────────

  notifyOnAssignTechnician$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.assignTechnicianSuccess),
      switchMap(({ assignment }) =>
        this.notificationAdapter
          .sendJobAssignedNotification(assignment.jobId, assignment.technicianId)
          .pipe(
            map(sent => NotificationActions.addNotification({
              notification: this.toLocalNotification(
                `assign-${assignment.id}`,
                NotificationType.JobAssignment,
                `You have been assigned to job ${assignment.jobId}`,
                assignment.technicianId,
                assignment.jobId,
                'job'
              )
            })),
            catchError(() => EMPTY)
          )
      )
    )
  );

  // ─── ASSIGNMENT: Job reassigned ──────────────────────────────────────────

  notifyOnReassignJob$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AssignmentActions.reassignJobSuccess),
      switchMap(({ newAssignment }) =>
        this.notificationAdapter
          .sendJobReassignedNotification(
            newAssignment.jobId,
            '',
            newAssignment.technicianId
          )
          .pipe(
            map(() => NotificationActions.addNotification({
              notification: this.toLocalNotification(
                `reassign-${newAssignment.id}`,
                NotificationType.JobAssignment,
                `Job ${newAssignment.jobId} has been reassigned to you`,
                newAssignment.technicianId,
                newAssignment.jobId,
                'job'
              )
            })),
            catchError(() => EMPTY)
          )
      )
    )
  );

  // ─── JOB: Status changed ─────────────────────────────────────────────────

  notifyOnJobStatusChange$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobStatusSuccess),
      switchMap(({ job }) => {
        const user = this.authService.getUser();
        if (!user) return EMPTY;

        const isCancelled = job.status === JobStatus.Cancelled;
        const send$ = isCancelled
          ? this.notificationAdapter.sendJobCancelledNotification(job.id, 'Job cancelled')
          : this.notificationAdapter.sendJobStatusChangedNotification(job.id, '', job.status);

        return send$.pipe(
          map(() => NotificationActions.addNotification({
            notification: this.toLocalNotification(
              `status-${job.id}-${Date.now()}`,
              NotificationType.JobStatusChange,
              isCancelled
                ? `Job ${job.jobId} has been cancelled`
                : `Job ${job.jobId} status changed to ${job.status}`,
              user.id,
              job.id,
              'job'
            )
          })),
          catchError(() => EMPTY)
        );
      })
    )
  );

  // ─── JOB: Job completed (high priority) ──────────────────────────────────

  notifyOnJobCompleted$ = createEffect(() =>
    this.actions$.pipe(
      ofType(JobActions.updateJobStatusSuccess),
      filter(({ job }) => job.status === JobStatus.Completed),
      tap(({ job }) => {
        const user = this.authService.getUser();
        if (!user) return;
        // Notify the technician/crew lead that the job they worked is complete
        this.notificationAdapter
          .sendJobStatusChangedNotification(job.id, JobStatus.OnSite, JobStatus.Completed)
          .pipe(catchError(() => EMPTY))
          .subscribe();
      })
    ),
    { dispatch: false }
  );

  // ─── JOB: Job assigned to crew ────────────────────────────────────────────

  notifyOnJobAssignedToCrew$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.assignJobToCrewSuccess),
      switchMap(({ crew }) => {
        const user = this.authService.getUser();
        if (!user || !crew.activeJobId) return EMPTY;

        // Notify all crew members
        const memberIds = [crew.leadTechnicianId, ...crew.memberIds].filter(Boolean);
        const sends = memberIds.map(memberId =>
          this.notificationAdapter
            .sendJobAssignedNotification(crew.activeJobId!, memberId)
            .pipe(catchError(() => EMPTY))
        );

        return of(NotificationActions.addNotification({
          notification: this.toLocalNotification(
            `crew-job-${crew.id}-${Date.now()}`,
            NotificationType.JobAssignment,
            `Crew "${crew.name}" has been assigned a new job`,
            user.id,
            crew.activeJobId,
            'job'
          )
        })).pipe(
          tap(() => sends.forEach(s => s.subscribe()))
        );
      })
    )
  );

  // ─── CREW: Member added ───────────────────────────────────────────────────

  notifyOnCrewMemberAdded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(CrewActions.addCrewMemberSuccess),
      switchMap(({ crew, technicianId }) =>
        this.notificationAdapter
          .sendCrewMemberAddedNotification(technicianId, crew.id, crew.name)
          .pipe(
            map(() => NotificationActions.addNotification({
              notification: this.toLocalNotification(
                `crew-member-${crew.id}-${technicianId}`,
                NotificationType.SystemAlert,
                `You have been added to crew "${crew.name}"`,
                technicianId,
                crew.id,
                'crew'
              )
            })),
            catchError(() => EMPTY)
          )
      )
    )
  );

  // ─── TIMECARD: Submitted ──────────────────────────────────────────────────

  notifyOnTimecardSubmitted$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.submitTimecardSuccess),
      switchMap(({ period }) => {
        const user = this.authService.getUser();
        // Send to manager/admin — fall back to same user if no manager context
        const managerId = user?.managerId || user?.id;
        if (!managerId) return EMPTY;

        return this.notificationAdapter
          .sendTimecardSubmittedNotification(period, managerId)
          .pipe(
            map(() => NotificationActions.addNotification({
              notification: this.toLocalNotification(
                `timecard-submit-${period.id}`,
                NotificationType.TimeEntryReminder,
                `Your timecard has been submitted for review`,
                period.technicianId,
                period.id,
                'timeEntry'
              )
            })),
            catchError(() => EMPTY)
          );
      })
    )
  );

  // ─── TIMECARD: Approved ───────────────────────────────────────────────────

  notifyOnTimecardApproved$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.approveTimecardSuccess),
      switchMap(({ period }) =>
        this.notificationAdapter
          .sendTimecardApprovedNotification(period)
          .pipe(
            map(() => NotificationActions.addNotification({
              notification: this.toLocalNotification(
                `timecard-approved-${period.id}`,
                NotificationType.TimeEntryReminder,
                `Your timecard has been approved`,
                period.technicianId,
                period.id,
                'timeEntry'
              )
            })),
            catchError(() => EMPTY)
          )
      )
    )
  );

  // ─── EXPENSE: Added ───────────────────────────────────────────────────────

  notifyOnExpenseAdded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.addExpenseSuccess),
      switchMap(({ expense }) => {
        const user = this.authService.getUser();
        const managerId = user?.managerId || user?.id;
        if (!managerId) return EMPTY;

        return this.notificationAdapter
          .sendExpenseSubmittedNotification(expense, managerId)
          .pipe(
            map(() => NotificationActions.addNotification({
              notification: this.toLocalNotification(
                `expense-${expense.id}`,
                NotificationType.SystemAlert,
                `Expense of $${expense.amount.toFixed(2)} submitted for ${expense.type}`,
                expense.technicianId,
                expense.jobId,
                'job'
              )
            })),
            catchError(() => EMPTY)
          );
      })
    )
  );

  constructor(
    private actions$: Actions,
    private notificationAdapter: FrmNotificationAdapterService,
    private authService: AuthService,
    private store: Store
  ) {}

  private toLocalNotification(
    id: string,
    type: NotificationType,
    message: string,
    userId: string,
    relatedEntityId?: string,
    relatedEntityType?: 'job' | 'technician' | 'assignment' | 'timeEntry' | 'crew'
  ): Notification {
    const now = new Date();
    return {
      id,
      type,
      message,
      isRead: false,
      createdAt: now,
      timestamp: now,
      userId,
      relatedEntityId,
      relatedEntityType
    };
  }
}
