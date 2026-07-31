/**
 * Overtime Effects
 * Handles side effects for overtime actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, exhaustMap } from 'rxjs/operators';
import * as OvertimeActions from './overtime.actions';
import { OvertimeApiService } from '../../services/overtime-api.service';

@Injectable()
export class OvertimeEffects {
  // Load Requests Effect
  loadRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.loadOvertimeRequests),
      switchMap(() =>
        this.overtimeApiService.getMyRequests().pipe(
          map((requests) =>
            OvertimeActions.loadOvertimeRequestsSuccess({ requests })
          ),
          catchError((error) =>
            of(OvertimeActions.loadOvertimeRequestsFailure({
              error: error.message || 'Failed to load overtime requests'
            }))
          )
        )
      )
    )
  );

  // Create Request Effect
  createRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.createOvertimeRequest),
      exhaustMap(({ dto }) =>
        this.overtimeApiService.createRequest(dto).pipe(
          map((request) =>
            OvertimeActions.createOvertimeRequestSuccess({ request })
          ),
          catchError((error) =>
            of(OvertimeActions.createOvertimeRequestFailure({
              error: error.message || 'Failed to create overtime request'
            }))
          )
        )
      )
    )
  );

  // Cancel Request Effect
  cancelRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.cancelOvertimeRequest),
      exhaustMap(({ requestId }) =>
        this.overtimeApiService.cancelRequest(requestId).pipe(
          map((request) =>
            OvertimeActions.cancelOvertimeRequestSuccess({ request })
          ),
          catchError((error) =>
            of(OvertimeActions.cancelOvertimeRequestFailure({
              requestId,
              error: error.message || 'Failed to cancel overtime request'
            }))
          )
        )
      )
    )
  );

  // Approve Effect
  approveRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.approveOvertimeRequest),
      exhaustMap(({ requestId }) =>
        this.overtimeApiService.approve(requestId).pipe(
          map((request) =>
            OvertimeActions.approveOvertimeRequestSuccess({ request })
          ),
          catchError((error) =>
            of(OvertimeActions.approveOvertimeRequestFailure({
              error: error.message || 'Failed to approve overtime request'
            }))
          )
        )
      )
    )
  );

  // Reject Effect
  rejectRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.rejectOvertimeRequest),
      exhaustMap(({ requestId, reason }) =>
        this.overtimeApiService.reject(requestId, reason).pipe(
          map((request) =>
            OvertimeActions.rejectOvertimeRequestSuccess({ request })
          ),
          catchError((error) =>
            of(OvertimeActions.rejectOvertimeRequestFailure({
              error: error.message || 'Failed to reject overtime request'
            }))
          )
        )
      )
    )
  );

  // Load Manager Queue Effect
  loadManagerQueue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(OvertimeActions.loadOvertimeManagerQueue),
      switchMap(() =>
        this.overtimeApiService.getManagerQueue().pipe(
          map((requests) =>
            OvertimeActions.loadOvertimeManagerQueueSuccess({ requests })
          ),
          catchError((error) =>
            of(OvertimeActions.loadOvertimeManagerQueueFailure({
              error: error.message || 'Failed to load manager queue'
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private overtimeApiService: OvertimeApiService
  ) {}
}
