/**
 * Reporting Effects
 * Handles side effects for reporting actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, tap, mergeMap } from 'rxjs/operators';
import * as ReportingActions from './reporting.actions';
import { ReportingService } from '../../services/reporting.service';

@Injectable()
export class ReportingEffects {
  // Load Dashboard Effect
  loadDashboard$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReportingActions.loadDashboard, ReportingActions.refreshDashboard),
      switchMap(() =>
        this.reportingService.getDashboardMetrics().pipe(
          map((dashboard) =>
            ReportingActions.loadDashboardSuccess({ dashboard })
          ),
          catchError((error) =>
            of(ReportingActions.loadDashboardFailure({ 
              error: error.message || 'Failed to load dashboard metrics' 
            }))
          )
        )
      )
    )
  );

  // Load Utilization Report Effect
  loadUtilization$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReportingActions.loadUtilization),
      switchMap(({ dateRange, technicianId, role, region }) =>
        this.reportingService.getTechnicianUtilization({
          dateRange,
          technicianId,
          role,
          region
        }).pipe(
          map((utilization) =>
            ReportingActions.loadUtilizationSuccess({ utilization })
          ),
          catchError((error) =>
            of(ReportingActions.loadUtilizationFailure({ 
              error: error.message || 'Failed to load utilization report' 
            }))
          )
        )
      )
    )
  );

  // Load Job Performance Report Effect
  loadJobPerformance$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReportingActions.loadJobPerformance),
      switchMap(({ dateRange, jobType, priority, client }) =>
        this.reportingService.getJobPerformance({
          dateRange,
          jobType,
          priority,
          client
        }).pipe(
          map((performance) =>
            ReportingActions.loadJobPerformanceSuccess({ performance })
          ),
          catchError((error) =>
            of(ReportingActions.loadJobPerformanceFailure({ 
              error: error.message || 'Failed to load job performance report' 
            }))
          )
        )
      )
    )
  );

  // Load KPIs Effect
  loadKPIs$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ReportingActions.loadKPIs),
      switchMap(() =>
        this.reportingService.getKPIs().pipe(
          map((kpis) =>
            ReportingActions.loadKPIsSuccess({ kpis })
          ),
          catchError((error) =>
            of(ReportingActions.loadKPIsFailure({ 
              error: error.message || 'Failed to load KPIs' 
            }))
          )
        )
      )
    )
  );

  // Log errors for debugging
  logErrors$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          ReportingActions.loadDashboardFailure,
          ReportingActions.loadUtilizationFailure,
          ReportingActions.loadJobPerformanceFailure,
          ReportingActions.loadKPIsFailure
        ),
        tap((action) => {
          console.error('Reporting Effect Error:', action.error);
        })
      ),
    { dispatch: false }
  );

  constructor(
    private actions$: Actions,
    private reportingService: ReportingService
  ) {}
}
