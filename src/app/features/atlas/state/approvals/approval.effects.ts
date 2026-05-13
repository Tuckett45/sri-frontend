/**
 * Approval NgRx Effects
 * 
 * Handles side effects for approval actions including:
 * - API calls with loading, success, and error handling
 * - Automatic reload after approval decisions
 * - Integration with deployment state updates
 * 
 * Requirements: 3.4, 3.5, 3.6, 3.7
 */

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ApprovalService } from '../../services/approval.service';
import * as ApprovalActions from './approval.actions';

@Injectable()
export class ApprovalEffects {
  constructor(
    private actions$: Actions,
    private approvalService: ApprovalService
  ) {}

  // ============================================================================
  // Load Approvals for Deployment
  // ============================================================================

  /**
   * Load approvals for a specific deployment
   */
  loadApprovalsForDeployment$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.loadApprovalsForDeployment),
      switchMap(({ deploymentId, forState }) =>
        this.approvalService.getApprovalsForState(deploymentId, forState!).pipe(
          map((approvals) => ApprovalActions.loadApprovalsForDeploymentSuccess({ approvals })),
          catchError((error) =>
            of(ApprovalActions.loadApprovalsForDeploymentFailure({
              error: error.message || 'Failed to load approvals'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load Pending Approvals
  // ============================================================================

  /**
   * Load pending approvals for a deployment
   */
  loadPendingApprovals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.loadPendingApprovals),
      switchMap(({ deploymentId }) =>
        this.approvalService.getPendingApprovals(deploymentId).pipe(
          map((approvals) => ApprovalActions.loadPendingApprovalsSuccess({ approvals })),
          catchError((error) =>
            of(ApprovalActions.loadPendingApprovalsFailure({
              error: error.message || 'Failed to load pending approvals'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Load User Approvals
  // ============================================================================

  /**
   * Load approvals for current user with pagination
   */
  loadUserApprovals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.loadUserApprovals),
      switchMap(({ page = 1, pageSize = 50 }) =>
        this.approvalService.getUserApprovals(page, pageSize).pipe(
          map((result) => ApprovalActions.loadUserApprovalsSuccess({ result })),
          catchError((error) =>
            of(ApprovalActions.loadUserApprovalsFailure({
              error: error.message || 'Failed to load user approvals'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Request Approval
  // ============================================================================

  /**
   * Request approval for a deployment state transition
   */
  requestApproval$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.requestApproval),
      switchMap(({ request }) =>
        this.approvalService.requestApproval(request).pipe(
          map(() => ApprovalActions.requestApprovalSuccess({
            deploymentId: request.deploymentId,
            forState: request.forState
          })),
          catchError((error) =>
            of(ApprovalActions.requestApprovalFailure({
              error: error.message || 'Failed to request approval'
            }))
          )
        )
      )
    )
  );

  /**
   * After successful approval request, reload pending approvals
   */
  requestApprovalSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.requestApprovalSuccess),
      map(({ deploymentId }) => ApprovalActions.loadPendingApprovals({ deploymentId }))
    )
  );

  // ============================================================================
  // Record Decision
  // ============================================================================

  /**
   * Record an approval decision (approve or deny)
   */
  recordDecision$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.recordDecision),
      switchMap(({ approvalId, decision }) =>
        this.approvalService.recordDecision(approvalId, decision).pipe(
          map(() => ApprovalActions.recordDecisionSuccess({ approvalId, decision })),
          catchError((error) =>
            of(ApprovalActions.recordDecisionFailure({
              error: error.message || 'Failed to record decision'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Check Authority
  // ============================================================================

  /**
   * Check if user has authority to approve a state transition
   */
  checkAuthority$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.checkAuthority),
      switchMap(({ deploymentId, forState }) =>
        this.approvalService.checkAuthority(deploymentId, forState).pipe(
          map((authority) => ApprovalActions.checkAuthoritySuccess({ authority })),
          catchError((error) =>
            of(ApprovalActions.checkAuthorityFailure({
              error: error.message || 'Failed to check authority'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Check Sufficient Approvals
  // ============================================================================

  /**
   * Check if deployment has sufficient approvals for state transition
   */
  checkSufficientApprovals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.checkSufficientApprovals),
      switchMap(({ deploymentId, forState }) =>
        this.approvalService.checkSufficientApprovals(deploymentId, forState).pipe(
          map((isSufficient) => ApprovalActions.checkSufficientApprovalsSuccess({
            isSufficient,
            deploymentId,
            forState
          })),
          catchError((error) =>
            of(ApprovalActions.checkSufficientApprovalsFailure({
              error: error.message || 'Failed to check sufficient approvals'
            }))
          )
        )
      )
    )
  );

  // ============================================================================
  // Refresh Approvals
  // ============================================================================

  /**
   * When refresh is triggered, reload approvals for deployment
   */
  refreshApprovals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(ApprovalActions.refreshApprovals),
      map(({ deploymentId }) => ApprovalActions.loadPendingApprovals({ deploymentId }))
    )
  );
}
