/**
 * Timecard Notification Effects
 *
 * Handles side effects for timecard status notifications including:
 * - Deadline proximity reminders (24-hour warning for Draft timecards)
 * - Period inactivity reminders (no entries within 24 hours of period start)
 * - Status change notifications (rejected, approved, locked)
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { tap, withLatestFrom, filter } from 'rxjs/operators';

import * as TimecardActions from './timecard.actions';
import { selectLockConfig } from './timecard.selectors';
import { TimecardPeriod, TimecardStatus, TimecardLockConfig } from '../../models/time-entry.model';
import { TimecardService } from '../../services/timecard.service';
import { FrmNotificationAdapterService } from '../../services/frm-notification-adapter.service';

/** 24 hours in milliseconds */
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TimecardNotificationEffects {

  /**
   * Effect: deadlineProximityReminder$
   *
   * Listens for loadTimecardPeriodSuccess. When the loaded period is in Draft
   * status and the lock deadline is within 24 hours, sends a "Not Submitted"
   * reminder notification to the technician.
   *
   * Requirement 4.1
   */
  deadlineProximityReminder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.loadTimecardPeriodSuccess),
      withLatestFrom(this.store.select(selectLockConfig)),
      filter(([{ period }, lockConfig]) => {
        if (!lockConfig || !lockConfig.enabled) {
          return false;
        }
        if (period.status !== TimecardStatus.Draft) {
          return false;
        }
        const lockTime = this.timecardService.calculateLockTime(period.endDate, lockConfig);
        const now = new Date();
        const timeUntilLock = lockTime.getTime() - now.getTime();
        return timeUntilLock > 0 && timeUntilLock <= TWENTY_FOUR_HOURS_MS;
      }),
      tap(([{ period }, lockConfig]) => {
        const lockTime = this.timecardService.calculateLockTime(period.endDate, lockConfig!);
        this.notificationService.sendTimecardNotSubmittedReminder(
          period.technicianId,
          period.id,
          lockTime
        ).subscribe();
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: periodInactivityReminder$
   *
   * Listens for loadTimecardPeriodSuccess. When the loaded period has no time
   * entries and the period start was more than 24 hours ago, sends a "Not Started"
   * reminder notification to the technician.
   *
   * Requirement 4.3
   */
  periodInactivityReminder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.loadTimecardPeriodSuccess),
      filter(({ period }) => {
        const hasNoEntries = !period.timeEntries || period.timeEntries.length === 0;
        const now = new Date();
        const periodStartTime = new Date(period.startDate).getTime();
        const timeSinceStart = now.getTime() - periodStartTime;
        return hasNoEntries && timeSinceStart > TWENTY_FOUR_HOURS_MS;
      }),
      tap(({ period }) => {
        this.notificationService.sendTimecardNotStartedReminder(
          period.technicianId,
          period.id,
          new Date(period.startDate)
        ).subscribe();
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: timecardRejectedNotification$
   *
   * Listens for updateTimecardPeriodSuccess. When the updated period has a
   * status of Rejected, sends a rejection notification to the technician
   * including the rejection reason.
   *
   * Requirement 4.4
   */
  timecardRejectedNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.updateTimecardPeriodSuccess),
      filter(({ period }) => period.status === TimecardStatus.Rejected),
      tap(({ period }) => {
        this.notificationService.sendTimecardRejectedNotification(
          period.technicianId,
          period.id,
          period.rejectionReason || 'No reason provided'
        ).subscribe();
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: timecardApprovedNotification$
   *
   * Listens for approveTimecardSuccess. Sends an approval confirmation
   * notification to the technician.
   *
   * Requirement 4.5
   */
  timecardApprovedNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.approveTimecardSuccess),
      tap(({ period }) => {
        this.notificationService.sendTimecardApprovedNotification(
          period.technicianId,
          period.id
        ).subscribe();
      })
    ),
    { dispatch: false }
  );

  /**
   * Effect: timecardLockedNotification$
   *
   * Listens for updateTimecardPeriodSuccess. When the updated period is locked,
   * sends a locked notification to the technician.
   *
   * Requirement 4.2
   */
  timecardLockedNotification$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.updateTimecardPeriodSuccess),
      filter(({ period }) => period.isLocked === true),
      tap(({ period }) => {
        this.notificationService.sendTimecardLockedNotification(
          period.technicianId,
          period.id
        ).subscribe();
      })
    ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private store: Store,
    private timecardService: TimecardService,
    private notificationService: FrmNotificationAdapterService
  ) {}
}
