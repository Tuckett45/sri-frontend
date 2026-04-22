import { createFeatureSelector, createSelector } from '@ngrx/store';
import { StateHistoryState } from './state-history.state';

export const selectStateHistoryState = createFeatureSelector<StateHistoryState>('stateHistory');

export const selectStateHistories = createSelector(
  selectStateHistoryState,
  (state) => state.histories
);

export const selectCurrentState = createSelector(
  selectStateHistoryState,
  (state) => state.currentState
);

export const selectStateTransitions = createSelector(
  selectStateHistoryState,
  (state) => state.transitions
);

export const selectStateHistoryLoading = createSelector(
  selectStateHistoryState,
  (state) => state.loading
);

export const selectStateHistoryError = createSelector(
  selectStateHistoryState,
  (state) => state.error
);

export const selectSelectedEntityId = createSelector(
  selectStateHistoryState,
  (state) => state.selectedEntityId
);

export const selectSelectedEntityType = createSelector(
  selectStateHistoryState,
  (state) => state.selectedEntityType
);

export const selectSelectedEntityHistory = createSelector(
  selectStateHistories,
  selectSelectedEntityId,
  (histories, entityId) => entityId ? histories[entityId] : null
);

export const selectSortedTransitions = createSelector(
  selectStateTransitions,
  (transitions) => [...transitions].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
);
