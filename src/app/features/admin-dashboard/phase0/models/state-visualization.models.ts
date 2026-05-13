// State Visualization Models
export interface StateNode {
  id: string;
  name: string;
  type: 'initial' | 'intermediate' | 'final' | 'error';
  metadata: Record<string, any>;
}

export interface StateTransition {
  id: string;
  fromState: string;
  toState: string;
  trigger: string;
  timestamp: Date;
  userId: string;
  userName: string;
  reason?: string;
  metadata: Record<string, any>;
}

export interface StateHistory {
  entityId: string;
  entityType: string;
  transitions: StateTransition[];
  currentState: StateNode;
  createdAt: Date;
  updatedAt: Date;
}

export type GraphLayout = 'horizontal' | 'vertical' | 'radial';

export interface StateMachineConfig {
  layout: GraphLayout;
  highlightPath: boolean;
  showTransitions: boolean;
}
