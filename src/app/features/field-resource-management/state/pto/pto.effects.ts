/**
 * PTO Effects
 * Handles side effects for PTO actions (API calls)
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap, exhaustMap } from 'rxjs/operators';
import * as PtoActions from './pto.actions';
import { PtoApiService } from '../../services/pto-api.service';
import { PREDEFINED_LEAVE_TYPES } from '../../models/pto.models';

@Injectable()
export class PtoEffects {
  // Load Requests Effect
  loadRequests$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.loadRequests),
      switchMap(() =>
        this.ptoApiService.getMyRequests().pipe(
          map((requests) =>
            PtoActions.loadRequestsSuccess({ requests })
          ),
          catchError((error) =>
            of(PtoActions.loadRequestsFailure({
              error: error.message || 'Failed to load requests'
            }))
          )
        )
      )
    )
  );

  // Create Request Effect
  createRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.createRequest),
      exhaustMap(({ dto }) =>
        this.ptoApiService.createRequest(dto).pipe(
          map((request) =>
            PtoActions.createRequestSuccess({ request })
          ),
          catchError((error) =>
            of(PtoActions.createRequestFailure({
              error: error.message || 'Failed to create request'
            }))
          )
        )
      )
    )
  );

  // Cancel Request Effect
  cancelRequest$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.cancelRequest),
      exhaustMap(({ requestId }) =>
        this.ptoApiService.cancelRequest(requestId).pipe(
          map((request) =>
            PtoActions.cancelRequestSuccess({ request })
          ),
          catchError((error) =>
            of(PtoActions.cancelRequestFailure({
              requestId,
              error: error.message || 'Failed to cancel request'
            }))
          )
        )
      )
    )
  );

  // Manager Approve Effect
  managerApprove$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerApprove),
      exhaustMap(({ requestId }) =>
        this.ptoApiService.approveAsManager(requestId).pipe(
          map((request) =>
            PtoActions.managerApproveSuccess({ request })
          ),
          catchError((error) =>
            of(PtoActions.managerApproveFailure({
              error: error.message || 'Failed to approve request'
            }))
          )
        )
      )
    )
  );

  // Manager Reject Effect
  managerReject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.managerReject),
      exhaustMap(({ requestId, reason }) =>
        this.ptoApiService.rejectAsManager(requestId, reason).pipe(
          map((request) =>
            PtoActions.managerRejectSuccess({ request })
          ),
          catchError((error) =>
            of(PtoActions.managerRejectFailure({
              error: error.message || 'Failed to reject request'
            }))
          )
        )
      )
    )
  );

  // Backoffice Approve Effect
  backofficeApprove$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.backofficeApprove),
      exhaustMap(({ requestId }) =>
        this.ptoApiService.approveAsBackoffice(requestId).pipe(
          map((request) =>
            PtoActions.backofficeApproveSuccess({ request })
          ),
          catchError((error) =>
            of(PtoActions.backofficeApproveFailure({
              error: error.message || 'Failed to approve request'
            }))
          )
        )
      )
    )
  );

  // Backoffice Reject Effect
  backofficeReject$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.backofficeReject),
      exhaustMap(({ requestId, reason }) =>
        this.ptoApiService.rejectAsBackoffice(requestId, reason).pipe(
          map((request) =>
            PtoActions.backofficeRejectSuccess({ request })
          ),
          catchError((error) =>
            of(PtoActions.backofficeRejectFailure({
              error: error.message || 'Failed to reject request'
            }))
          )
        )
      )
    )
  );

  // Load Leave Types Effect
  loadLeaveTypes$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.loadLeaveTypes),
      switchMap(() =>
        this.ptoApiService.getLeaveTypes().pipe(
          map((leaveTypes) =>
            PtoActions.loadLeaveTypesSuccess({ leaveTypes })
          ),
          catchError(() =>
            of(PtoActions.loadLeaveTypesSuccess({
              leaveTypes: PREDEFINED_LEAVE_TYPES
            }))
          )
        )
      )
    )
  );

  // Load Manager Queue Effect
  loadManagerQueue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.loadManagerQueue),
      switchMap(() =>
        this.ptoApiService.getManagerQueue().pipe(
          map((requests) =>
            PtoActions.loadManagerQueueSuccess({ requests })
          ),
          catchError((error) =>
            of(PtoActions.loadManagerQueueFailure({
              error: error.message || 'Failed to load manager queue'
            }))
          )
        )
      )
    )
  );

  // Load Backoffice Queue Effect
  loadBackofficeQueue$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PtoActions.loadBackofficeQueue),
      switchMap(() =>
        this.ptoApiService.getBackofficeQueue().pipe(
          map((requests) =>
            PtoActions.loadBackofficeQueueSuccess({ requests })
          ),
          catchError((error) =>
            of(PtoActions.loadBackofficeQueueFailure({
              error: error.message || 'Failed to load backoffice queue'
            }))
          )
        )
      )
    )
  );

  constructor(
    private actions$: Actions,
    private ptoApiService: PtoApiService
  ) {}
}
