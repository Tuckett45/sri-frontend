import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap, mergeMap, withLatestFrom, filter } from 'rxjs/operators';
import * as TimecardActions from './timecard.actions';
import * as BudgetActions from '../budgets/budget.actions';
import { selectCurrentPeriod } from './timecard.selectors';
import { TimecardService } from '../../services/timecard.service';
import { TimecardRoundingService } from '../../services/timecard-rounding.service';
import { TimecardPeriod, TimecardStatus, TimeEntry } from '../../models/time-entry.model';

/**
 * Timecard Effects
 * 
 * Handles side effects for timecard state management including:
 * - Loading timecard periods
 * - Loading lock configuration
 * - Managing expenses
 * - Handling unlock requests
 * - Budget integration on timecard submission/approval
 */
@Injectable()
export class TimecardEffects {
  
  /**
   * Load lock configuration
   */
  loadLockConfig$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.loadLockConfig),
      switchMap(() => {
        const config = this.timecardService.getDefaultLockConfig();
        return of(TimecardActions.loadLockConfigSuccess({ config }));
      }),
      catchError(error => 
        of(TimecardActions.loadLockConfigFailure({ 
          error: error.message || 'Failed to load lock configuration' 
        }))
      )
    )
  );
  
  /**
   * Load timecard period
   * If a period is already seeded (e.g. from mock data), keep it.
   */
  loadTimecardPeriod$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.loadTimecardPeriod),
      withLatestFrom(this.store.select(selectCurrentPeriod)),
      switchMap(([{ technicianId, startDate, endDate }, existingPeriod]) => {
        // If a period already exists in the store, don't overwrite it
        if (existingPeriod) {
          return of(TimecardActions.loadTimecardPeriodSuccess({ period: existingPeriod }));
        }

        // TODO: Replace with real API call
        const period: TimecardPeriod = {
          id: `period-${Date.now()}`,
          technicianId,
          startDate,
          endDate,
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
          updatedAt: new Date()
        };
        
        return of(TimecardActions.loadTimecardPeriodSuccess({ period }));
      }),
      catchError(error => 
        of(TimecardActions.loadTimecardPeriodFailure({ 
          error: error.message || 'Failed to load timecard period' 
        }))
      )
    )
  );

  /**
   * On timecard submission success, trigger budget deductions for each time entry.
   * Uses rounded hours from TimecardRoundingService for budget calculations.
   * Requirements: 3.6, 3.7, 8.1, 8.2
   */
  submitTimecardBudgetDeduction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.submitTimecardSuccess),
      mergeMap(({ period }) => {
        const deductionActions = this.createBudgetDeductionsForPeriod(period);
        return deductionActions;
      })
    )
  );

  /**
   * On timecard approval success, trigger budget deductions for each time entry.
   * This handles the case where budget deduction happens at approval rather than submission.
   * Requirements: 8.1, 8.2, 8.4
   */
  approveTimecardBudgetDeduction$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.approveTimecardSuccess),
      mergeMap(({ period }) => {
        const deductionActions = this.createBudgetDeductionsForPeriod(period);
        return deductionActions;
      })
    )
  );

  /**
   * Dispatch a confirmation action after budget deduction is triggered
   */
  budgetDeductionConfirmation$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.triggerBudgetDeduction),
      map(({ jobId, roundedHours, timecardEntryId }) =>
        TimecardActions.budgetDeductionTriggered({ jobId, roundedHours, timecardEntryId })
      )
    )
  );

  constructor(
    private actions$: Actions,
    private timecardService: TimecardService,
    private roundingService: TimecardRoundingService,
    private store: Store
  ) {}

  /**
   * Creates budget deduction actions for all time entries in a period.
   * Groups entries by jobId and calculates rounded hours for each.
   * 
   * @param period The timecard period containing time entries
   * @returns Array of budget deduction actions
   */
  private createBudgetDeductionsForPeriod(period: TimecardPeriod): any[] {
    if (!period.timeEntries || period.timeEntries.length === 0) {
      return [TimecardActions.budgetDeductionTriggered({ 
        jobId: '', 
        roundedHours: 0, 
        timecardEntryId: period.id 
      })];
    }

    // Process each time entry: calculate rounded hours and dispatch budget deduction
    const actions: any[] = [];
    
    for (const entry of period.timeEntries) {
      if (!entry.clockInTime || !entry.clockOutTime) {
        continue;
      }

      const { roundedHours } = this.roundingService.processTimecardEntry(
        new Date(entry.clockInTime),
        new Date(entry.clockOutTime)
      );

      if (roundedHours > 0 && entry.jobId) {
        // Dispatch budget deduction with rounded hours
        actions.push(
          BudgetActions.deductHours({
            jobId: entry.jobId,
            hours: roundedHours,
            timecardEntryId: entry.id
          })
        );
      }
    }

    // If no valid entries produced deductions, emit a no-op confirmation
    if (actions.length === 0) {
      return [TimecardActions.budgetDeductionTriggered({ 
        jobId: '', 
        roundedHours: 0, 
        timecardEntryId: period.id 
      })];
    }

    return actions;
  }
}
