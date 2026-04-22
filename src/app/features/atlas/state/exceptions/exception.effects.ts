/**
 * Exception NgRx Effects
 * 
 * Handles side effects for exception actions including:
 * - API calls with loading, success, and error handling
 * - Automatic reload after exception approval/denial
 * - Integration with deployment state updates
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ExceptionService } from '../../services/exception.service';
import * as ExceptionActions from './exception.actions';

@Injectable()
export class ExceptionEffects {
  constructor(
    private actions$: Actions,
    private exceptionService: ExceptionService
  ) {}

  // ============================================================================
  // Load Exceptions for Deployment
  // ============================================================================

  /**
   * Load exceptions for a specific deployment with pagination
   */
  loadExceptions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.loadExceptions),
      switchMap(({ deploymentId, page = 1, pageSize = 50 }) =>
        this.exceptionService.getExceptions(deploymentId, page, pageSize).pipe(
          map((result) => ExceptionActions.loadExceptionsSuccess({ result })),
          catchError((error) =>
            of(ExceptionActions.loadExceptionsFailure({
              error: error.message || 'Failed to load exceptions'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Exception Detail
  // ============================================================================

  /**
   * Load a specific exception by ID
   */
  loadException$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.loadException),
      switchMap(({ exceptionId }) =>
        this.exceptionService.getException(exceptionId).pipe(
          map((exception) => ExceptionActions.loadExceptionSuccess({ exception })),
          catchError((error) =>
            of(ExceptionActions.loadExceptionFailure({
              error: error.message || 'Failed to load exception'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Active Exceptions
  // ============================================================================

  /**
   * Load active (approved and not expired) exceptions for a deployment
   */
  loadActiveExceptions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.loadActiveExceptions),
      switchMap(({ deploymentId }) =>
        this.exceptionService.getActiveExceptions(deploymentId).pipe(
          map((exceptions) => ExceptionActions.loadActiveExceptionsSuccess({ exceptions })),
          catchError((error) =>
            of(ExceptionActions.loadActiveExceptionsFailure({
              error: error.message || 'Failed to load active exceptions'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Create Exception
  // ============================================================================

  /**
   * Create a new exception request
   */
  createException$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.createException),
      switchMap(({ deploymentId, request }) =>
        this.exceptionService.createException(deploymentId, request).pipe(
          map((exception) => ExceptionActions.createExceptionSuccess({ exception, deploymentId })),
          catchError((error) =>
            of(ExceptionActions.createExceptionFailure({
              error: error.message || 'Failed to create exception'
            }))
          )
        )
      )
    )
  );

  /**
   * After successful exception creation, reload exceptions for deployment
   */
  createExceptionSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.createExceptionSuccess),
      map(({ deploymentId }) => ExceptionActions.loadExceptions({ deploymentId }))
    )
  );

  // ============================================================================
  // Validate Exception
  // ============================================================================

  /**
   * Validate an exception request before submission
   */
  validateException$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.validateException),
      switchMap(({ deploymentId, request }) =>
        this.exceptionService.validateException(deploymentId, request).pipe(
          map((result) => ExceptionActions.validateExceptionSuccess({ result })),
          catchError((error) =>
            of(ExceptionActions.validateExceptionFailure({
              error: error.message || 'Failed to validate exception'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Approve Exception
  // ============================================================================

  /**
   * Approve an exception request
   */
  approveException$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.approveException),
      switchMap(({ exceptionId, request }) =>
        this.exceptionService.approveException(exceptionId, request).pipe(
          map((exception) => ExceptionActions.approveExceptionSuccess({ exception })),
          catchError((error) =>
            of(ExceptionActions.approveExceptionFailure({
              error: error.message || 'Failed to approve exception'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Deny Exception
  // ============================================================================

  /**
   * Deny an exception request
   */
  denyException$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.denyException),
      switchMap(({ exceptionId, request }) =>
        this.exceptionService.denyException(exceptionId, request).pipe(
          map((exception) => ExceptionActions.denyExceptionSuccess({ exception })),
          catchError((error) =>
            of(ExceptionActions.denyExceptionFailure({
              error: error.message || 'Failed to deny exception'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Refresh Exceptions
  // ============================================================================

  /**
   * When refresh is triggered, reload exceptions for deployment
   */
  refreshExceptions$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ExceptionActions.refreshExceptions),
      map(({ deploymentId }) => ExceptionActions.loadExceptions({ deploymentId }))
    )
  );
}
