/**
 * Approval NgRx Actions
 * 
 * Defines all actions for approval state management including:
 * - Load operations (list, pending, user approvals)
 * - Request approval
 * - Record decision (approve/deny)
 * - Check authority
 * - Filter management
 * 
 * Each operation has corresponding success and failure actions.
 * 
 * Requirements: 3.2
 */

import { createAction, props } from '@ngrx/store';
import {
  ApprovalDto,
  ApprovalRequestDto,
  ApprovalDecisionDto,
  ApprovalAuthority,
  LifecycleState
} from '../../models/approval.model';
import { PagedResult } from '../../models/common.model';
import { ApprovalFilters } from './approval.state';

// ============================================================================
// Load Approvals for Deployment
// ============================================================================

/**
 * Load approvals for a specific deployment
 */
export const loadApprovalsForDeployment = createAction(
  '[Approval] Load Approvals For Deployment',
  props<{ deploymentId: string; forState?: LifecycleState }>()
);

/**
 * Approvals loaded successfully
 */
export const loadApprovalsForDeploymentSuccess = createAction(
  '[Approval] Load Approvals For Deployment Success',
  props<{ approvals: ApprovalDto[] }>()
);

/**
 * Failed to load approvals
 */
export const loadApprovalsForDeploymentFailure = createAction(
  '[Approval] Load Approvals For Deployment Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load Pending Approvals
// ============================================================================

/**
 * Load pending approvals for a deployment
 */
export const loadPendingApprovals = createAction(
  '[Approval] Load Pending Approvals',
  props<{ deploymentId: string }>()
);

/**
 * Pending approvals loaded successfully
 */
export const loadPendingApprovalsSuccess = createAction(
  '[Approval] Load Pending Approvals Success',
  props<{ approvals: ApprovalDto[] }>()
);

/**
 * Failed to load pending approvals
 */
export const loadPendingApprovalsFailure = createAction(
  '[Approval] Load Pending Approvals Failure',
  props<{ error: string }>()
);

// ============================================================================
// Load User Approvals
// ============================================================================

/**
 * Load approvals for current user with pagination
 */
export const loadUserApprovals = createAction(
  '[Approval] Load User Approvals',
  props<{ page?: number; pageSize?: number }>()
);

/**
 * User approvals loaded successfully
 */
export const loadUserApprovalsSuccess = createAction(
  '[Approval] Load User Approvals Success',
  props<{ result: PagedResult<ApprovalDto> }>()
);

/**
 * Failed to load user approvals
 */
export const loadUserApprovalsFailure = createAction(
  '[Approval] Load User Approvals Failure',
  props<{ error: string }>()
);

// ============================================================================
// Request Approval
// ============================================================================

/**
 * Request approval for a deployment state transition
 */
export const requestApproval = createAction(
  '[Approval] Request Approval',
  props<{ request: ApprovalRequestDto }>()
);

/**
 * Approval requested successfully
 */
export const requestApprovalSuccess = createAction(
  '[Approval] Request Approval Success',
  props<{ deploymentId: string; forState: LifecycleState }>()
);

/**
 * Failed to request approval
 */
export const requestApprovalFailure = createAction(
  '[Approval] Request Approval Failure',
  props<{ error: string }>()
);

// ============================================================================
// Record Decision
// ============================================================================

/**
 * Record an approval decision (approve or deny)
 */
export const recordDecision = createAction(
  '[Approval] Record Decision',
  props<{ approvalId: string; decision: ApprovalDecisionDto }>()
);

/**
 * Decision recorded successfully
 */
export const recordDecisionSuccess = createAction(
  '[Approval] Record Decision Success',
  props<{ approvalId: string; decision: ApprovalDecisionDto }>()
);

/**
 * Failed to record decision
 */
export const recordDecisionFailure = createAction(
  '[Approval] Record Decision Failure',
  props<{ error: string }>()
);

// ============================================================================
// Check Authority
// ============================================================================

/**
 * Check if user has authority to approve a state transition
 */
export const checkAuthority = createAction(
  '[Approval] Check Authority',
  props<{ deploymentId: string; forState: LifecycleState }>()
);

/**
 * Authority check completed successfully
 */
export const checkAuthoritySuccess = createAction(
  '[Approval] Check Authority Success',
  props<{ authority: ApprovalAuthority }>()
);

/**
 * Failed to check authority
 */
export const checkAuthorityFailure = createAction(
  '[Approval] Check Authority Failure',
  props<{ error: string }>()
);

// ============================================================================
// Check Sufficient Approvals
// ============================================================================

/**
 * Check if deployment has sufficient approvals for state transition
 */
export const checkSufficientApprovals = createAction(
  '[Approval] Check Sufficient Approvals',
  props<{ deploymentId: string; forState: LifecycleState }>()
);

/**
 * Sufficient approvals check completed successfully
 */
export const checkSufficientApprovalsSuccess = createAction(
  '[Approval] Check Sufficient Approvals Success',
  props<{ isSufficient: boolean; deploymentId: string; forState: LifecycleState }>()
);

/**
 * Failed to check sufficient approvals
 */
export const checkSufficientApprovalsFailure = createAction(
  '[Approval] Check Sufficient Approvals Failure',
  props<{ error: string }>()
);

// ============================================================================
// Filter Management
// ============================================================================

/**
 * Set approval filters
 */
export const setApprovalFilters = createAction(
  '[Approval] Set Filters',
  props<{ filters: ApprovalFilters }>()
);

/**
 * Clear all approval filters
 */
export const clearApprovalFilters = createAction(
  '[Approval] Clear Filters'
);

// ============================================================================
// Selection Management
// ============================================================================

/**
 * Select an approval by ID
 */
export const selectApproval = createAction(
  '[Approval] Select Approval',
  props<{ id: string }>()
);

/**
 * Clear approval selection
 */
export const clearApprovalSelection = createAction(
  '[Approval] Clear Selection'
);

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear all approval state (useful for logout or reset)
 */
export const clearApprovalState = createAction(
  '[Approval] Clear State'
);

/**
 * Refresh approvals (force reload)
 */
export const refreshApprovals = createAction(
  '[Approval] Refresh Approvals',
  props<{ deploymentId: string }>()
);
