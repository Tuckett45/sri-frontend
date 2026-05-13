import { createReducer, on } from '@ngrx/store';
import {
  LifecycleState,
  LifecycleTransition,
  StateTransition,
  ApprovalRequest,
  ValidationResult
} from '../../models/lifecycle.models';
import * as LifecycleActions from './lifecycle-transitions.actions';

/**
 * Lifecycle Transitions State
 * 
 * Requirements: 4.1, 4.7
 */
export interface LifecycleTransitionsState {
  // Entity-specific state (keyed by entityType:entityId)
  currentStates: Record<string, LifecycleState>;
  availableTransitions: Record<string, LifecycleTransition[]>;
  transitionHistory: Record<string, StateTransition[]>;
  pendingApprovals: Record<string, ApprovalRequest[]>;
  
  // Validation
  validationResult: ValidationResult | null;
  
  // UI state
  loading: boolean;
  error: string | null;
}

export const initialState: LifecycleTransitionsState = {
  currentStates: {},
  availableTransitions: {},
  transitionHistory: {},
  pendingApprovals: {},
  validationResult: null,
  loading: false,
  error: null
};

/**
 * Helper function to create entity key
 */
function getEntityKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export const lifecycleTransitionsReducer = createReducer(
  initialState,

  // Load Lifecycle State
  on(LifecycleActions.loadLifecycleState, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.loadLifecycleStateSuccess, (state, { entityType, entityId, state: lifecycleState }) => {
    const key = getEntityKey(entityType, entityId);
    return {
      ...state,
      currentStates: {
        ...state.currentStates,
        [key]: lifecycleState
      },
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.loadLifecycleStateFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Available Transitions
  on(LifecycleActions.loadAvailableTransitions, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.loadAvailableTransitionsSuccess, (state, { entityType, entityId, transitions }) => {
    const key = getEntityKey(entityType, entityId);
    return {
      ...state,
      availableTransitions: {
        ...state.availableTransitions,
        [key]: transitions
      },
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.loadAvailableTransitionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Transition History
  on(LifecycleActions.loadTransitionHistory, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.loadTransitionHistorySuccess, (state, { entityType, entityId, history }) => {
    const key = getEntityKey(entityType, entityId);
    return {
      ...state,
      transitionHistory: {
        ...state.transitionHistory,
        [key]: history
      },
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.loadTransitionHistoryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Load Pending Approvals
  on(LifecycleActions.loadPendingApprovals, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.loadPendingApprovalsSuccess, (state, { entityType, entityId, approvals }) => {
    const key = getEntityKey(entityType, entityId);
    return {
      ...state,
      pendingApprovals: {
        ...state.pendingApprovals,
        [key]: approvals
      },
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.loadPendingApprovalsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Validate Transition
  on(LifecycleActions.validateTransition, (state) => ({
    ...state,
    loading: true,
    error: null,
    validationResult: null
  })),

  on(LifecycleActions.validateTransitionSuccess, (state, { result }) => ({
    ...state,
    validationResult: result,
    loading: false,
    error: null
  })),

  on(LifecycleActions.validateTransitionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Execute Transition
  on(LifecycleActions.executeTransition, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.executeTransitionSuccess, (state, { entityType, entityId, transition }) => {
    const key = getEntityKey(entityType, entityId);
    const currentHistory = state.transitionHistory[key] || [];
    
    return {
      ...state,
      transitionHistory: {
        ...state.transitionHistory,
        [key]: [transition, ...currentHistory]
      },
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.executeTransitionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Request Approval
  on(LifecycleActions.requestApproval, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.requestApprovalSuccess, (state, { entityType, entityId, approval }) => {
    const key = getEntityKey(entityType, entityId);
    const currentApprovals = state.pendingApprovals[key] || [];
    
    return {
      ...state,
      pendingApprovals: {
        ...state.pendingApprovals,
        [key]: [approval, ...currentApprovals]
      },
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.requestApprovalFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Approve Transition
  on(LifecycleActions.approveTransition, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.approveTransitionSuccess, (state, { approval }) => {
    // Update the approval in all entity approval lists
    const updatedApprovals: Record<string, ApprovalRequest[]> = {};
    
    Object.keys(state.pendingApprovals).forEach(key => {
      updatedApprovals[key] = state.pendingApprovals[key].map(a =>
        a.id === approval.id ? approval : a
      );
    });
    
    return {
      ...state,
      pendingApprovals: updatedApprovals,
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.approveTransitionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Reject Transition
  on(LifecycleActions.rejectTransition, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(LifecycleActions.rejectTransitionSuccess, (state, { approval }) => {
    // Update the approval in all entity approval lists
    const updatedApprovals: Record<string, ApprovalRequest[]> = {};
    
    Object.keys(state.pendingApprovals).forEach(key => {
      updatedApprovals[key] = state.pendingApprovals[key].map(a =>
        a.id === approval.id ? approval : a
      );
    });
    
    return {
      ...state,
      pendingApprovals: updatedApprovals,
      loading: false,
      error: null
    };
  }),

  on(LifecycleActions.rejectTransitionFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),

  // Clear State
  on(LifecycleActions.clearLifecycleState, () => initialState)
);
