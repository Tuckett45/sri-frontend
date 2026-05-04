import { StateHistory, StateNode, StateTransition } from '../../models/state-visualization.models';

export interface StateHistoryState {
  histories: { [entityId: string]: StateHistory };
  currentState: StateNode | null;
  transitions: StateTransition[];
  loading: boolean;
  error: string | null;
  selectedEntityId: string | null;
  selectedEntityType: string | null;
}

export const initialStateHistoryState: StateHistoryState = {
  histories: {},
  currentState: null,
  transitions: [],
  loading: false,
  error: null,
  selectedEntityId: null,
  selectedEntityType: null
};
