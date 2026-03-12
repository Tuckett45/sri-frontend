import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import * as TimecardActions from './timecard.actions';
import { TimecardService } from '../../services/timecard.service';
import { TimecardPeriod, TimecardStatus } from '../../models/time-entry.model';

/**
 * Timecard Effects
 * 
 * Handles side effects for timecard state management including:
 * - Loading timecard periods
 * - Loading lock configuration
 * - Managing expenses
 * - Handling unlock requests
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
        // Return default lock configuration
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
   */
  loadTimecardPeriod$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TimecardActions.loadTimecardPeriod),
      switchMap(({ technicianId, startDate, endDate }) => {
        // Create a mock period for now
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
  
  constructor(
    private actions$: Actions,
    private timecardService: TimecardService
  ) {}
}
