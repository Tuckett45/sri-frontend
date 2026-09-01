/**
 * Team Requests Effects
 * Handles side effects for team PTO and overtime request actions.
 * Resolves direct reports via ManagerTeamService, then fetches requests for those employees.
 * Includes a 10-second timeout on hierarchy calls per requirement 6.1.
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, timeout } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import * as TeamRequestsActions from './team-requests.actions';
import { ManagerTeamService } from '../../services/manager-team.service';
import { PtoApiService } from '../../services/pto-api.service';
import { OvertimeApiService } from '../../services/overtime-api.service';
import { TimeoutError } from 'rxjs';

@Injectable()
export class TeamRequestsEffects {
  /** Timeout duration for hierarchy API calls (10 seconds per requirement 6.1) */
  private readonly HIERARCHY_TIMEOUT_MS = 10_000;

  /**
   * Maps a hierarchy-resolution error to a user-friendly message.
   * A 404 means the current user isn't set up as a manager (no team hierarchy),
   * so we show a clear explanation rather than a raw HTTP error.
   */
  private resolveHierarchyErrorMessage(error: unknown): string {
    if (error instanceof TimeoutError) {
      return 'Team hierarchy request timed out. Please try again.';
    }
    if (error instanceof HttpErrorResponse && error.status === 404) {
      return "You don't have any direct reports. Team view is only available to managers.";
    }
    return (error as { message?: string })?.message || 'Failed to load team hierarchy';
  }

  /**
   * Effect: Load Team PTO Requests
   *
   * Flow:
   * 1. On loadTeamPtoRequests action, call ManagerTeamService.getDirectReports(managerId)
   * 2. Apply 10-second timeout on hierarchy call
   * 3. On success, combine managerId with directReport IDs and call PtoApiService.getTeamRequests
   * 4. Dispatch success or failure actions accordingly
   *
   * Requirements: 6.1, 6.2, 6.4, 6.5
   */
  loadTeamPto$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TeamRequestsActions.loadTeamPtoRequests),
      switchMap(({ managerId }) =>
        this.managerTeamService.getDirectReports(managerId).pipe(
          timeout(this.HIERARCHY_TIMEOUT_MS),
          switchMap(response => {
            if (response.directReports.length === 0) {
              return of(TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests: [] }));
            }
            const employeeIds = [
              managerId,
              ...response.directReports.map(dr => dr.id)
            ];
            return this.ptoApiService.getTeamRequests(employeeIds).pipe(
              map(requests => TeamRequestsActions.loadTeamPtoRequestsSuccess({ requests })),
              catchError(error =>
                of(TeamRequestsActions.loadTeamPtoRequestsFailure({
                  error: error.message || 'Failed to load team PTO requests'
                }))
              )
            );
          }),
          catchError(error =>
            of(TeamRequestsActions.loadTeamPtoRequestsFailure({
              error: this.resolveHierarchyErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  /**
   * Effect: Load Team Overtime Requests
   *
   * Flow:
   * 1. On loadTeamOvertimeRequests action, call ManagerTeamService.getDirectReports(managerId)
   * 2. Apply 10-second timeout on hierarchy call
   * 3. On success, combine managerId with directReport IDs and call OvertimeApiService.getTeamRequests
   * 4. Dispatch success or failure actions accordingly
   *
   * Requirements: 6.1, 6.2, 6.4, 6.5
   */
  loadTeamOvertime$ = createEffect(() =>
    this.actions$.pipe(
      ofType(TeamRequestsActions.loadTeamOvertimeRequests),
      switchMap(({ managerId }) =>
        this.managerTeamService.getDirectReports(managerId).pipe(
          timeout(this.HIERARCHY_TIMEOUT_MS),
          switchMap(response => {
            if (response.directReports.length === 0) {
              return of(TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests: [] }));
            }
            const employeeIds = [
              managerId,
              ...response.directReports.map(dr => dr.id)
            ];
            return this.overtimeApiService.getTeamRequests(employeeIds).pipe(
              map(requests => TeamRequestsActions.loadTeamOvertimeRequestsSuccess({ requests })),
              catchError(error =>
                of(TeamRequestsActions.loadTeamOvertimeRequestsFailure({
                  error: error.message || 'Failed to load team overtime requests'
                }))
              )
            );
          }),
          catchError(error =>
            of(TeamRequestsActions.loadTeamOvertimeRequestsFailure({
              error: this.resolveHierarchyErrorMessage(error)
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private managerTeamService: ManagerTeamService,
    private ptoApiService: PtoApiService,
    private overtimeApiService: OvertimeApiService
  ) {}
}
