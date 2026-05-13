import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LifecycleTransitionsState } from './lifecycle-transitions.reducer';

/**
 * Lifecycle Transitions Selectors
 * 
 * Requirements: 4.1, 4.7
 */

// Feature selector
export const selectLifecycleTransitionsState = createFeatureSelector<LifecycleTransitionsState>(
  'lifecycleTransitions'
);

// Helper function to create entity key
function getEntityKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

// Base selectors
export const selectCurrentStates = createSelector(
  selectLifecycleTransitionsState,
  (state) => state.currentStates
);

export const selectAvailableTransitionsMap = createSelector(
  selectLifecycleTransitionsState,
  (state) => state.availableTransitions
);

export const selectTransitionHistoryMap = createSelector(
  selectLifecycleTransitionsState,
  (state) => state.transitionHistory
);

export const selectPendingApprovalsMap = createSelector(
  selectLifecycleTransitionsState,
  (state) => state.pendingApprovals
);

export const selectValidationResult = createSelector(
  selectLifecycleTransitionsState,
  (state) => state.validationResult
);

export const selectLoading = createSelector(
  selectLifecycleTransitionsState,
  (state) => state.loading
);

export const selectError = createSelector(
  selectLifecycleTransitionsState,
  (state) => state.error
);

// Entity-specific selectors (factory functions)
export const selectCurrentState = (entityType: string, entityId: string) =>
  createSelector(
    selectCurrentStates,
    (states) => {
      const key = getEntityKey(entityType, entityId);
      return states[key] || null;
    }
  );

export const selectAvailableTransitions = (entityType: string, entityId: string) =>
  createSelector(
    selectAvailableTransitionsMap,
    (transitions) => {
      const key = getEntityKey(entityType, entityId);
      return transitions[key] || [];
    }
  );

export const selectTransitionHistory = (entityType: string, entityId: string) =>
  createSelector(
    selectTransitionHistoryMap,
    (history) => {
      const key = getEntityKey(entityType, entityId);
      return history[key] || [];
    }
  );

export const selectPendingApprovals = (entityType: string, entityId: string) =>
  createSelector(
    selectPendingApprovalsMap,
    (approvals) => {
      const key = getEntityKey(entityType, entityId);
      return approvals[key] || [];
    }
  );

// Computed selectors
export const selectHasPendingApprovals = (entityType: string, entityId: string) =>
  createSelector(
    selectPendingApprovals(entityType, entityId),
    (approvals) => approvals.some(a => a.status === 'pending')
  );

export const selectLatestTransition = (entityType: string, entityId: string) =>
  createSelector(
    selectTransitionHistory(entityType, entityId),
    (history) => history.length > 0 ? history[0] : null
  );

export const selectTransitionCount = (entityType: string, entityId: string) =>
  createSelector(
    selectTransitionHistory(entityType, entityId),
    (history) => history.length
  );
