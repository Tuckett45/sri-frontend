import { createAction, props } from '@ngrx/store';
import { StateHistory, StateNode, StateTransition } from '../../models/state-visualization.models';

// Load State History
export const loadStateHistory = createAction(
  '[State History] Load State History',
  props<{ entityId: string; entityType: string }>()
);

export const loadStateHistorySuccess = createAction(
  '[State History] Load State History Success',
  props<{ history: StateHistory }>()
);

export const loadStateHistoryFailure = createAction(
  '[State History] Load State History Failure',
  props<{ error: string }>()
);

// Load State Transitions
export const loadStateTransitions = createAction(
  '[State History] Load State Transitions',
  props<{ entityId: string; entityType: string }>()
);

export const loadStateTransitionsSuccess = createAction(
  '[State History] Load State Transitions Success',
  props<{ transitions: StateTransition[] }>()
);

export const loadStateTransitionsFailure = createAction(
  '[State History] Load State Transitions Failure',
  props<{ error: string }>()
);

// Select Entity
export const selectEntity = createAction(
  '[State History] Select Entity',
  props<{ entityId: string; entityType: string }>()
);

// Clear Selection
export const clearSelection = createAction(
  '[State History] Clear Selection'
);
