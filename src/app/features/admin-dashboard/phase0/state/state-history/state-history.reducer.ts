import { createReducer, on } from '@ngrx/store';
import { StateHistoryState, initialStateHistoryState } from './state-history.state';
import * as StateHistoryActions from './state-history.actions';

export const stateHistoryReducer = createReducer(
  initialStateHistoryState,
  
  // Load State History
  on(StateHistoryActions.loadStateHistory, (state, { entityId, entityType }) => ({
    ...state,
    loading: true,
    error: null,
    selectedEntityId: entityId,
    selectedEntityType: entityType
  })),
  
  on(StateHistoryActions.loadStateHistorySuccess, (state, { history }) => ({
    ...state,
    histories: {
      ...state.histories,
      [history.entityId]: history
    },
    currentState: history.currentState,
    transitions: history.transitions,
    loading: false,
    error: null
  })),
  
  on(StateHistoryActions.loadStateHistoryFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Load State Transitions
  on(StateHistoryActions.loadStateTransitions, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  
  on(StateHistoryActions.loadStateTransitionsSuccess, (state, { transitions }) => ({
    ...state,
    transitions,
    loading: false,
    error: null
  })),
  
  on(StateHistoryActions.loadStateTransitionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  
  // Select Entity
  on(StateHistoryActions.selectEntity, (state, { entityId, entityType }) => ({
    ...state,
    selectedEntityId: entityId,
    selectedEntityType: entityType
  })),
  
  // Clear Selection
  on(StateHistoryActions.clearSelection, (state) => ({
    ...state,
    selectedEntityId: null,
    selectedEntityType: null,
    currentState: null,
    transitions: []
  }))
);
