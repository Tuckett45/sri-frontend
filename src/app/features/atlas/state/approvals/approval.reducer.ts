/**
 * Approval NgRx Reducer
 * 
 * Implements pure, immutable state transitions for all approval actions.
 * Uses NgRx Entity adapter for efficient entity management.
 * 
 * Requirements: 3.3
 */

import { createReducer, on } from '@ngrx/store';
import { ApprovalState, approvalAdapter, initialApprovalState } from './approval.state';
import * as ApprovalActions from './approval.actions';

/**
 * Approval reducer
 * 
 * Handles all approval-related actions and produces new immutable state.
 * Uses the entity adapter for normalized entity storage and efficient updates.
 */
export const approvalReducer = createReducer(
  initialApprovalState,

  // ============================================================================
  // Load Approvals for Deployment
  // ============================================================================

  on(ApprovalActions.loadApprovalsForDeployment, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, list: true },
    error: { ...state.error, list: null }
  })),

  on(ApprovalActions.loadApprovalsForDeploymentSuccess, (state, { approvals }): ApprovalState =>
    approvalAdapter.setAll(approvals, {
      ...state,
      loading: { ...state.loading, list: false },
      error: { ...state.error, list: null },
      lastLoaded: Date.now()
    })
  ),

  on(ApprovalActions.loadApprovalsForDeploymentFailure, (state, { error }): ApprovalState => ({
    ...state,
    loading: { ...state.loading, list: false },
    error: { ...state.error, list: error }
  })),

  // ============================================================================
  // Load Pending Approvals
  // ============================================================================

  on(ApprovalActions.loadPendingApprovals, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, loadingPending: true },
    error: { ...state.error, loadingPending: null }
  })),

  on(ApprovalActions.loadPendingApprovalsSuccess, (state, { approvals }): ApprovalState => ({
    ...state,
    pendingApprovals: approvals,
    loading: { ...state.loading, loadingPending: false },
    error: { ...state.error, loadingPending: null }
  })),

  on(ApprovalActions.loadPendingApprovalsFailure, (state, { error }): ApprovalState => ({
    ...state,
    loading: { ...state.loading, loadingPending: false },
    error: { ...state.error, loadingPending: error }
  })),

  // ============================================================================
  // Load User Approvals
  // ============================================================================

  on(ApprovalActions.loadUserApprovals, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, loadingUserApprovals: true },
    error: { ...state.error, loadingUserApprovals: null }
  })),

  on(ApprovalActions.loadUserApprovalsSuccess, (state, { result }): ApprovalState => ({
    ...state,
    userApprovals: {
      items: result.items,
      pagination: result.pagination
    },
    loading: { ...state.loading, loadingUserApprovals: false },
    error: { ...state.error, loadingUserApprovals: null }
  })),

  on(ApprovalActions.loadUserApprovalsFailure, (state, { error }): ApprovalState => ({
    ...state,
    loading: { ...state.loading, loadingUserApprovals: false },
    error: { ...state.error, loadingUserApprovals: error }
  })),

  // ============================================================================
  // Request Approval
  // ============================================================================

  on(ApprovalActions.requestApproval, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, requesting: true },
    error: { ...state.error, requesting: null }
  })),

  on(ApprovalActions.requestApprovalSuccess, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, requesting: false },
    error: { ...state.error, requesting: null }
  })),

  on(ApprovalActions.requestApprovalFailure, (state, { error }): ApprovalState => ({
    ...state,
    loading: { ...state.loading, requesting: false },
    error: { ...state.error, requesting: error }
  })),

  // ============================================================================
  // Record Decision
  // ============================================================================

  on(ApprovalActions.recordDecision, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, recordingDecision: true },
    error: { ...state.error, recordingDecision: null }
  })),

  on(ApprovalActions.recordDecisionSuccess, (state, { approvalId, decision }): ApprovalState => {
    // Update the approval entity with the decision
    const entities = (state as any).entities;
    const approval = entities[approvalId];
    
    if (!approval) {
      return {
        ...state,
        loading: { ...state.loading, recordingDecision: false },
        error: { ...state.error, recordingDecision: null }
      };
    }

    return approvalAdapter.updateOne(
      {
        id: approvalId,
        changes: {
          status: decision.decision as any,
          comments: decision.comments,
          approvedAt: new Date()
        }
      },
      {
        ...state,
        loading: { ...state.loading, recordingDecision: false },
        error: { ...state.error, recordingDecision: null }
      }
    );
  }),

  on(ApprovalActions.recordDecisionFailure, (state, { error }): ApprovalState => ({
    ...state,
    loading: { ...state.loading, recordingDecision: false },
    error: { ...state.error, recordingDecision: error }
  })),

  // ============================================================================
  // Check Authority
  // ============================================================================

  on(ApprovalActions.checkAuthority, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, checkingAuthority: true },
    error: { ...state.error, checkingAuthority: null }
  })),

  on(ApprovalActions.checkAuthoritySuccess, (state, { authority }): ApprovalState => ({
    ...state,
    authority: {
      isAuthorized: authority.isAuthorized,
      authorityLevel: authority.authorityLevel,
      roles: authority.roles,
      permissions: authority.permissions,
      reason: authority.reason
    },
    loading: { ...state.loading, checkingAuthority: false },
    error: { ...state.error, checkingAuthority: null }
  })),

  on(ApprovalActions.checkAuthorityFailure, (state, { error }): ApprovalState => ({
    ...state,
    loading: { ...state.loading, checkingAuthority: false },
    error: { ...state.error, checkingAuthority: error }
  })),

  // ============================================================================
  // Check Sufficient Approvals
  // ============================================================================

  on(ApprovalActions.checkSufficientApprovals, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, list: true },
    error: { ...state.error, list: null }
  })),

  on(ApprovalActions.checkSufficientApprovalsSuccess, (state): ApprovalState => ({
    ...state,
    loading: { ...state.loading, list: false },
    error: { ...state.error, list: null }
  })),

  on(ApprovalActions.checkSufficientApprovalsFailure, (state, { error }): ApprovalState => ({
    ...state,
    loading: { ...state.loading, list: false },
    error: { ...state.error, list: error }
  })),

  // ============================================================================
  // Filter Management
  // ============================================================================

  on(ApprovalActions.setApprovalFilters, (state, { filters }): ApprovalState => ({
    ...state,
    filters: { ...state.filters, ...filters }
  })),

  on(ApprovalActions.clearApprovalFilters, (state): ApprovalState => ({
    ...state,
    filters: {}
  })),

  // ============================================================================
  // Selection Management
  // ============================================================================

  on(ApprovalActions.selectApproval, (state, { id }): ApprovalState => ({
    ...state,
    selectedId: id
  })),

  on(ApprovalActions.clearApprovalSelection, (state): ApprovalState => ({
    ...state,
    selectedId: null
  })),

  // ============================================================================
  // Cache Management
  // ============================================================================

  on(ApprovalActions.clearApprovalState, (): ApprovalState => initialApprovalState),

  on(ApprovalActions.refreshApprovals, (state): ApprovalState => ({
    ...state,
    lastLoaded: null
  }))
);
