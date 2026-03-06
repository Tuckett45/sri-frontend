/**
 * State Visualization Models
 * Models for state machines, transitions, and state history
 */

export interface StateNode {
  id: string;
  name: string;
  description?: string;
  type: 'initial' | 'intermediate' | 'final';
  metadata?: Record<string, any>;
}

export interface StateTransition {
  id: string;
  fromState: string;
  toState: string;
  trigger: string;
  timestamp: Date;
  userId: string;
  userName?: string;
  reason?: string;
  metadata?: Record<string, any>;
  requiresApproval?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
}

export interface StateMachine {
  id: string;
  name: string;
  states: StateNode[];
  transitions: StateTransitionDefinition[];
  currentState: string;
  initialState: string;
  finalStates: string[];
}

export interface StateTransitionDefinition {
  from: string;
  to: string;
  trigger: string;
  conditions?: string[];
  requiresApproval?: boolean;
  allowedRoles?: string[];
}

export interface StateHistory {
  entityId: string;
  entityType: string;
  transitions: StateTransition[];
  currentState: string;
  createdAt: Date;
  updatedAt: Date;
}

export type GraphLayout = 'horizontal' | 'vertical' | 'radial';

export interface StateVisualizationConfig {
  layout: GraphLayout;
  showTransitions: boolean;
  highlightPath: boolean;
  compactView: boolean;
}
