/**
 * Deployment models for ATLAS deployment lifecycle management
 * These models support deployment CRUD operations, state transitions,
 * evidence management, and audit trails
 * 
 * Requirements: 1.5
 */

// Import and re-export shared enums from approval model
import { LifecycleState } from './approval.model';
export { LifecycleState };

/**
 * Deployment type classification
 * Categorizes deployments by their purpose
 */
export enum DeploymentType {
  /** Standard deployment */
  STANDARD = 'STANDARD',
  
  /** Emergency deployment */
  EMERGENCY = 'EMERGENCY',
  
  /** Maintenance deployment */
  MAINTENANCE = 'MAINTENANCE',
  
  /** Upgrade deployment */
  UPGRADE = 'UPGRADE',
  
  /** Rollback deployment */
  ROLLBACK = 'ROLLBACK'
}

/**
 * State transition result
 * Indicates the outcome of a state transition attempt
 */
export enum TransitionResult {
  /** Transition completed successfully */
  SUCCESS = 'SUCCESS',
  
  /** Transition failed */
  FAILED = 'FAILED',
  
  /** Transition was rejected */
  REJECTED = 'REJECTED',
  
  /** Transition is pending approval */
  PENDING = 'PENDING'
}

/**
 * Evidence type classification
 * Categorizes evidence by its purpose
 */
export enum EvidenceType {
  DOCUMENT = 'DOCUMENT',
  DOCUMENTATION = 'DOCUMENTATION',
  TEST_RESULT = 'TEST_RESULT',
  TEST_RESULTS = 'TEST_RESULTS',
  APPROVAL_RECORD = 'APPROVAL_RECORD',
  CONFIGURATION_FILE = 'CONFIGURATION_FILE',
  DEPLOYMENT_PLAN = 'DEPLOYMENT_PLAN',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  COMPLIANCE_CERTIFICATE = 'COMPLIANCE_CERTIFICATE',
  TECHNICAL_SPECIFICATION = 'TECHNICAL_SPECIFICATION'
}

/**
 * Evidence status
 * Indicates the current status of evidence
 */
export enum EvidenceStatus {
  PENDING = 'PENDING',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  EXPIRED = 'EXPIRED'
}

/**
 * Deployment data transfer object
 * Represents basic deployment information
 */
export interface DeploymentDto {
  /** Unique deployment identifier */
  id: string;
  
  /** Deployment title */
  title?: string;
  
  /** Deployment type */
  type: DeploymentType;
  
  /** Current lifecycle state */
  currentState: LifecycleState;
  
  /** Client identifier */
  clientId: string;
  
  /** User who created the deployment */
  createdBy: string;
  
  /** When the deployment was created */
  createdAt: Date;
  
  /** When the deployment was last updated */
  updatedAt: Date;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Deployment detail data transfer object
 * Extends DeploymentDto with related entities
 */
export interface DeploymentDetailDto extends DeploymentDto {
  /** State transition history */
  transitionHistory?: StateTransitionDto[];
  
  /** Evidence submissions */
  evidence?: EvidenceDto[];
  
  /** Approvals */
  approvals?: any[];
  
  /** Exceptions */
  exceptions?: any[];
}

/**
 * Create deployment request
 * Used to create a new deployment
 */
export interface CreateDeploymentRequest {
  /** Deployment title */
  title: string;
  
  /** Deployment type */
  type: DeploymentType;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Update deployment request
 * Used to update an existing deployment
 */
export interface UpdateDeploymentRequest {
  /** Updated title */
  title?: string;
  
  /** Updated type */
  type?: DeploymentType;
  
  /** Updated metadata */
  metadata?: Record<string, any>;
}

/**
 * State transition request
 * Used to request a state transition
 */
export interface StateTransitionRequest {
  /** Target state to transition to */
  targetState: LifecycleState;
  
  /** Reason for the transition */
  reason: string;
}

/**
 * State transition data transfer object
 * Represents a state transition in the deployment history
 */
export interface StateTransitionDto {
  /** Unique transition identifier */
  id: string;
  
  /** State transitioning from */
  fromState: LifecycleState;
  
  /** State transitioning to */
  toState: LifecycleState;
  
  /** User who initiated the transition */
  initiatedBy: string;
  
  /** When the transition occurred */
  timestamp: Date;
  
  /** Reason for the transition */
  reason?: string;
  
  /** Result of the transition */
  result: TransitionResult;
}

/**
 * Evidence data transfer object
 * Represents evidence submitted for a deployment
 */
export interface EvidenceDto {
  /** Unique evidence identifier */
  id: string;
  
  /** Evidence type */
  type: EvidenceType;
  
  /** Evidence title */
  title: string;
  
  /** Evidence description */
  description?: string;
  
  /** User who submitted the evidence */
  submittedBy: string;
  
  /** When the evidence was submitted */
  submittedAt: Date;
  
  /** Current evidence status */
  status: EvidenceStatus;
}

/**
 * Evidence submission request
 * Used to submit new evidence for a deployment
 */
export interface EvidenceSubmissionRequest {
  /** Evidence type */
  type: EvidenceType;
  
  /** Evidence title */
  title: string;
  
  /** Evidence description */
  description?: string;
  
  /** Evidence content */
  content: string;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

