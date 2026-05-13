/**
 * Approval workflow models
 * These models support the ATLAS approval workflow including authority validation,
 * approval requests, decisions, and critical gate definitions
 * 
 * Requirements: 1.5
 */

// Re-export types from other models for convenience
export { PagedResult } from './common.model';

/**
 * Lifecycle state enum
 * Represents the various states in a deployment lifecycle
 */
export enum LifecycleState {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  INTAKE_REVIEW = 'INTAKE_REVIEW',
  PLANNING = 'PLANNING',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  EXECUTION_COMPLETE = 'EXECUTION_COMPLETE',
  QA_REVIEW = 'QA_REVIEW',
  APPROVED_FOR_CLOSEOUT = 'APPROVED_FOR_CLOSEOUT',
  CLOSED = 'CLOSED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
  REWORK_REQUIRED = 'REWORK_REQUIRED'
}

/**
 * Deployment type enum
 * Represents the type of deployment
 */
export enum DeploymentType {
  STANDARD = 'STANDARD',
  EMERGENCY = 'EMERGENCY',
  MAINTENANCE = 'MAINTENANCE',
  UPGRADE = 'UPGRADE',
  ROLLBACK = 'ROLLBACK'
}

/**
 * Approval status enum
 * Represents the status of an approval
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DENIED = 'DENIED',
  EXPIRED = 'EXPIRED'
}

/**
 * Approval data transfer object
 * Represents an approval in the system
 */
export interface ApprovalDto {
  /** Unique approval identifier */
  id: string;
  
  /** State that requires approval */
  forState: LifecycleState;
  
  /** Current approval status */
  status: ApprovalStatus;
  
  /** ID of the user who approved/denied */
  approverId?: string | null;
  
  /** Timestamp when approval was granted/denied */
  approvedAt?: Date | string | null;
  
  /** Comments from the approver */
  comments?: string | null;
}

/**
 * Approval request data transfer object
 * Used to request approval for a deployment state transition
 */
export interface ApprovalRequestDto {
  /** Deployment identifier requiring approval */
  deploymentId: string;
  
  /** State that requires approval */
  forState: LifecycleState;
  
  /** Optional justification for the approval request */
  justification?: string;
  
  /** Additional context information */
  context?: Record<string, any>;
}

/**
 * Approval decision data transfer object
 * Used to record an approval decision (approve or deny)
 */
export interface ApprovalDecisionDto {
  /** The approval decision (APPROVED or DENIED) */
  decision: 'APPROVED' | 'DENIED' | 'PENDING' | 'EXPIRED';
  
  /** Optional comments from the approver */
  comments?: string;
  
  /** Role of the approver */
  approverRole?: string;
  
  /** Authority level of the approver */
  approverAuthority?: string;
  
  /** Optional conditions attached to the approval */
  conditions?: Record<string, any>;
}

/**
 * Approval authority validation result
 * Indicates whether a user has authority to approve a specific state transition
 */
export interface ApprovalAuthority {
  /** User identifier being checked */
  userId: string;
  
  /** Whether the user is authorized to approve */
  isAuthorized: boolean;
  
  /** Authority level of the user */
  authorityLevel?: string;
  
  /** User's roles */
  roles?: string[];
  
  /** User's permissions */
  permissions?: string[];
  
  /** Client identifier */
  clientId: string;
  
  /** States the user is authorized to approve */
  authorizedStates?: LifecycleState[];
  
  /** Reason for authorization status (especially if not authorized) */
  reason?: string;
}

/**
 * Critical gate definition
 * Defines requirements for critical approval gates in the deployment lifecycle
 */
export interface CriticalGateDefinition {
  /** Lifecycle state this gate applies to */
  state: LifecycleState;
  
  /** Name of the critical gate */
  gateName?: string;
  
  /** Description of the gate's purpose */
  description?: string;
  
  /** Whether this gate is critical */
  isCritical: boolean;
  
  /** Required authority level to pass this gate */
  requiredAuthority?: string;
  
  /** Minimum number of approvals required */
  minimumApprovals: number;
  
  /** Whether all approvals must be unanimous */
  requiresUnanimous: boolean;
  
  /** Additional requirements for this gate */
  additionalRequirements?: string[];
  
  /** Client-specific overrides for this gate */
  clientOverrides?: Record<string, any>;
}
