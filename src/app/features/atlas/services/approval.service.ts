import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AtlasErrorHandlerService } from './atlas-error-handler.service';
import { AtlasApprovalsService } from '../../../services/atlas-approvals.service';
import { AtlasLifecycleState } from '../../../models/atlas.models';
import {
  ApprovalAuthority,
  ApprovalRequestDto,
  ApprovalDecisionDto,
  CriticalGateDefinition,
  LifecycleState,
  PagedResult
} from '../models/approval.model';

/**
 * Service for managing approval workflows, authority validation, and critical gate definitions.
 * 
 * This service provides methods to:
 * - Check approval authority for users
 * - Request and record approval decisions
 * - Query pending and state-specific approvals
 * - Validate sufficient approvals for state transitions
 * - Retrieve critical gate definitions
 * 
 * All API calls are routed through the ATLAS API gateway at /v1/approvals
 * and include automatic error handling via AtlasErrorHandlerService.
 */
@Injectable({
  providedIn: 'root'
})
export class ApprovalService {
  constructor(
    private atlasApprovals: AtlasApprovalsService,
    private errorHandler: AtlasErrorHandlerService
  ) {}

  /**
   * Check if the current user has approval authority for a specific deployment and state.
   * 
   * @param deploymentId - The deployment ID to check authority for
   * @param forState - The lifecycle state requiring approval
   * @returns Observable of ApprovalAuthority with authorization details
   * 
   * @example
   * this.approvalService.checkAuthority('dep-123', LifecycleState.READY)
   *   .subscribe(authority => {
   *     if (authority.isAuthorized) {
   *       console.log('User can approve for READY state');
   *     }
   *   });
   */
  checkAuthority(deploymentId: string, forState: LifecycleState): Observable<ApprovalAuthority> {
    return this.atlasApprovals
      .validateApprovalAuthority(deploymentId, forState as unknown as AtlasLifecycleState)
      .pipe(
        map((r) => r as unknown as ApprovalAuthority),
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<ApprovalAuthority>(error, {
            endpoint: `/v1/approvals/authority/${deploymentId}/${forState}`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Request approval for a deployment to transition to a specific state.
   * 
   * @param request - The approval request containing deployment ID, target state, and justification
   * @returns Observable that completes when the approval request is created
   * 
   * @example
   * const request: ApprovalRequestDto = {
   *   deploymentId: 'dep-123',
   *   forState: LifecycleState.READY,
   *   justification: 'All testing completed successfully'
   * };
   * this.approvalService.requestApproval(request).subscribe();
   */
  requestApproval(request: ApprovalRequestDto): Observable<void> {
    return this.atlasApprovals
      .requestApproval(request as any)
      .pipe(
        map(() => undefined as void),
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<void>(error, {
            endpoint: '/v1/approvals/request',
            method: 'POST'
          })
        )
      );
  }

  /**
   * Record an approval decision (approve or deny) for a pending approval.
   * 
   * @param approvalId - The ID of the approval to decide on
   * @param decision - The approval decision including status, comments, and conditions
   * @returns Observable that completes when the decision is recorded
   * 
   * @example
   * const decision: ApprovalDecisionDto = {
   *   decision: ApprovalStatus.APPROVED,
   *   comments: 'Approved after review',
   *   approverRole: 'Senior Engineer'
   * };
   * this.approvalService.recordDecision('appr-456', decision).subscribe();
   */
  recordDecision(approvalId: string, decision: ApprovalDecisionDto): Observable<void> {
    return this.atlasApprovals
      .recordDecision(approvalId, decision as any)
      .pipe(
        map(() => undefined as void),
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<void>(error, {
            endpoint: `/v1/approvals/${approvalId}/decision`,
            method: 'POST'
          })
        )
      );
  }

  /**
   * Get all pending approvals for a specific deployment.
   * 
   * @param deploymentId - The deployment ID to query pending approvals for
   * @returns Observable of array of pending approval records
   * 
   * @example
   * this.approvalService.getPendingApprovals('dep-123')
   *   .subscribe(approvals => {
   *     console.log(`${approvals.length} pending approvals`);
   *   });
   */
  getPendingApprovals(deploymentId: string): Observable<any[]> {
    return this.atlasApprovals.getPendingApprovals(deploymentId).pipe(
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<any[]>(error, {
          endpoint: `/v1/approvals/deployment/${deploymentId}/pending`,
          method: 'GET'
        })
      )
    );
  }

  /**
   * Get all approvals for a specific deployment and lifecycle state.
   * 
   * @param deploymentId - The deployment ID to query approvals for
   * @param forState - The lifecycle state to filter approvals by
   * @returns Observable of array of approval records for the specified state
   * 
   * @example
   * this.approvalService.getApprovalsForState('dep-123', LifecycleState.READY)
   *   .subscribe(approvals => {
   *     console.log(`${approvals.length} approvals for READY state`);
   *   });
   */
  getApprovalsForState(deploymentId: string, forState: LifecycleState): Observable<any[]> {
    return this.atlasApprovals
      .getApprovalsForState(deploymentId, forState as unknown as AtlasLifecycleState)
      .pipe(
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<any[]>(error, {
            endpoint: `/v1/approvals/deployment/${deploymentId}/state/${forState}`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Check if a deployment has sufficient approvals to transition to a specific state.
   * 
   * @param deploymentId - The deployment ID to check
   * @param forState - The target lifecycle state
   * @returns Observable of boolean indicating if approvals are sufficient
   * 
   * @example
   * this.approvalService.checkSufficientApprovals('dep-123', LifecycleState.READY)
   *   .subscribe(isSufficient => {
   *     if (isSufficient) {
   *       console.log('Can proceed with state transition');
   *     }
   *   });
   */
  checkSufficientApprovals(deploymentId: string, forState: LifecycleState): Observable<boolean> {
    return this.atlasApprovals
      .hasSufficientApprovals(deploymentId, forState as unknown as AtlasLifecycleState)
      .pipe(
        map((r) => r.hasSufficientApprovals),
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<boolean>(error, {
            endpoint: `/v1/approvals/deployment/${deploymentId}/state/${forState}/sufficient`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Get the critical gate definition for a specific lifecycle state.
   * 
   * Critical gates define approval requirements, minimum approvals needed,
   * and whether unanimous approval is required for state transitions.
   * 
   * @param state - The lifecycle state to get gate definition for
   * @returns Observable of CriticalGateDefinition with gate requirements
   * 
   * @example
   * this.approvalService.getCriticalGate(LifecycleState.READY)
   *   .subscribe(gate => {
   *     console.log(`Gate requires ${gate.minimumApprovals} approvals`);
   *     console.log(`Unanimous required: ${gate.requiresUnanimous}`);
   *   });
   */
  getCriticalGate(state: LifecycleState): Observable<CriticalGateDefinition> {
    return this.atlasApprovals
      .getCriticalGateDefinition(state as unknown as AtlasLifecycleState)
      .pipe(
        map((r) => r as unknown as CriticalGateDefinition),
        catchError((error: HttpErrorResponse) =>
          this.errorHandler.handleError<CriticalGateDefinition>(error, {
            endpoint: `/v1/approvals/critical-gate/${state}`,
            method: 'GET'
          })
        )
      );
  }

  /**
   * Get paginated list of approvals assigned to the current user.
   * 
   * @param page - Page number (1-indexed, defaults to 1)
   * @param pageSize - Number of items per page (defaults to 50)
   * @returns Observable of PagedResult containing user's approval records
   * 
   * @example
   * this.approvalService.getUserApprovals(1, 20)
   *   .subscribe(result => {
   *     console.log(`Page ${result.pagination.currentPage} of ${result.pagination.totalPages}`);
   *     result.items.forEach(approval => console.log(approval));
   *   });
   */
  getUserApprovals(page: number = 1, pageSize: number = 50): Observable<PagedResult<any>> {
    return this.atlasApprovals.getUserApprovals(page, pageSize).pipe(
      map((r) => ({
        items: r.items,
        pagination: {
          currentPage: r.page,
          pageSize: r.pageSize,
          totalCount: r.totalCount,
          totalPages: r.totalPages
        }
      })),
      catchError((error: HttpErrorResponse) =>
        this.errorHandler.handleError<PagedResult<any>>(error, {
          endpoint: '/v1/approvals/user/approvals',
          method: 'GET'
        })
      )
    );
  }
}
