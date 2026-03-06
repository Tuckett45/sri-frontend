/**
 * Lifecycle Management Models
 * Phase 1: Role Enforcement and Lifecycle UI
 */

export interface LifecycleState {
  id: string;
  name: string;
  description: string;
  type: 'initial' | 'active' | 'terminal';
  allowedTransitions: string[];
  requiredFields: string[];
  validations: ValidationRule[];
}

export interface LifecycleTransition {
  id: string;
  name: string;
  fromState: string;
  toState: string;
  requiresApproval: boolean;
  requiredRole?: string;
  validations: ValidationRule[];
  sideEffects?: SideEffect[];
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

export interface ApprovalRequest {
  id: string;
  transitionId: string;
  entityId: string;
  entityType: string;
  requestedBy: string;
  requestedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
  approver?: string;
  approvalDate?: Date;
  reason?: string;
}

export interface TransitionRequest {
  transitionId: string;
  entityId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'format' | 'range' | 'custom';
  params: Record<string, any>;
  message: string;
}

export interface SideEffect {
  type: string;
  action: string;
  params: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: Record<string, any>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'critical';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'warning';
}
