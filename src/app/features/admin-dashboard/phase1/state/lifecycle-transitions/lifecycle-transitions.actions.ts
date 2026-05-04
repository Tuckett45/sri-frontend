import { createAction, props } from '@ngrx/store';
import {
  LifecycleState,
  LifecycleTransition,
  StateTransition,
  ApprovalRequest,
  TransitionRequest,
  ValidationResult
} from '../../models/lifecycle.models';

/**
 * Lifecycle Transitions Actions
 * 
 * Requirements: 4.1, 4.7
 */

// Load Lifecycle State
export const loadLifecycleState = createAction(
  '[Lifecycle] Load Lifecycle State',
  props<{ entityType: string; entityId: string }>()
);

export const loadLifecycleStateSuccess = createAction(
  '[Lifecycle] Load Lifecycle State Success',
  props<{ entityType: string; entityId: string; state: LifecycleState }>()
);

export const loadLifecycleStateFailure = createAction(
  '[Lifecycle] Load Lifecycle State Failure',
  props<{ error: string }>()
);

// Load Available Transitions
export const loadAvailableTransitions = createAction(
  '[Lifecycle] Load Available Transitions',
  props<{ entityType: string; entityId: string }>()
);

export const loadAvailableTransitionsSuccess = createAction(
  '[Lifecycle] Load Available Transitions Success',
  props<{ entityType: string; entityId: string; transitions: LifecycleTransition[] }>()
);

export const loadAvailableTransitionsFailure = createAction(
  '[Lifecycle] Load Available Transitions Failure',
  props<{ error: string }>()
);

// Load Transition History
export const loadTransitionHistory = createAction(
  '[Lifecycle] Load Transition History',
  props<{ entityType: string; entityId: string }>()
);

export const loadTransitionHistorySuccess = createAction(
  '[Lifecycle] Load Transition History Success',
  props<{ entityType: string; entityId: string; history: StateTransition[] }>()
);

export const loadTransitionHistoryFailure = createAction(
  '[Lifecycle] Load Transition History Failure',
  props<{ error: string }>()
);

// Load Pending Approvals
export const loadPendingApprovals = createAction(
  '[Lifecycle] Load Pending Approvals',
  props<{ entityType: string; entityId: string }>()
);

export const loadPendingApprovalsSuccess = createAction(
  '[Lifecycle] Load Pending Approvals Success',
  props<{ entityType: string; entityId: string; approvals: ApprovalRequest[] }>()
);

export const loadPendingApprovalsFailure = createAction(
  '[Lifecycle] Load Pending Approvals Failure',
  props<{ error: string }>()
);

// Validate Transition
export const validateTransition = createAction(
  '[Lifecycle] Validate Transition',
  props<{ entityType: string; entityId: string; transitionId: string; data: any }>()
);

export const validateTransitionSuccess = createAction(
  '[Lifecycle] Validate Transition Success',
  props<{ result: ValidationResult }>()
);

export const validateTransitionFailure = createAction(
  '[Lifecycle] Validate Transition Failure',
  props<{ error: string }>()
);

// Execute Transition
export const executeTransition = createAction(
  '[Lifecycle] Execute Transition',
  props<{ entityType: string; entityId: string; request: TransitionRequest }>()
);

export const executeTransitionSuccess = createAction(
  '[Lifecycle] Execute Transition Success',
  props<{ entityType: string; entityId: string; transition: StateTransition }>()
);

export const executeTransitionFailure = createAction(
  '[Lifecycle] Execute Transition Failure',
  props<{ error: string }>()
);

// Request Approval
export const requestApproval = createAction(
  '[Lifecycle] Request Approval',
  props<{ 
    entityType: string; 
    entityId: string; 
    transitionId: string; 
    reason: string;
    metadata?: Record<string, any>;
  }>()
);

export const requestApprovalSuccess = createAction(
  '[Lifecycle] Request Approval Success',
  props<{ entityType: string; entityId: string; approval: ApprovalRequest }>()
);

export const requestApprovalFailure = createAction(
  '[Lifecycle] Request Approval Failure',
  props<{ error: string }>()
);

// Approve Transition
export const approveTransition = createAction(
  '[Lifecycle] Approve Transition',
  props<{ approvalId: string; reason: string }>()
);

export const approveTransitionSuccess = createAction(
  '[Lifecycle] Approve Transition Success',
  props<{ approval: ApprovalRequest }>()
);

export const approveTransitionFailure = createAction(
  '[Lifecycle] Approve Transition Failure',
  props<{ error: string }>()
);

// Reject Transition
export const rejectTransition = createAction(
  '[Lifecycle] Reject Transition',
  props<{ approvalId: string; reason: string }>()
);

export const rejectTransitionSuccess = createAction(
  '[Lifecycle] Reject Transition Success',
  props<{ approval: ApprovalRequest }>()
);

export const rejectTransitionFailure = createAction(
  '[Lifecycle] Reject Transition Failure',
  props<{ error: string }>()
);

// Clear State
export const clearLifecycleState = createAction(
  '[Lifecycle] Clear Lifecycle State'
);
