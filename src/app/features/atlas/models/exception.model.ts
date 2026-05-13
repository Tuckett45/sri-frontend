/**
 * Exception and waiver request models
 * These models support the ATLAS exception management workflow including
 * exception requests, validation, approval, and denial
 * 
 * Requirements: 1.5
 */

/**
 * Exception status enumeration
 * Represents the current status of an exception request
 */
export enum ExceptionStatus {
  /** Exception request is pending review */
  PENDING = 'PENDING',
  
  /** Exception request has been approved */
  APPROVED = 'APPROVED',
  
  /** Exception request has been denied */
  DENIED = 'DENIED',
  
  /** Exception has expired */
  EXPIRED = 'EXPIRED'
}

/**
 * Exception data transfer object
 * Represents an exception or waiver request for a deployment
 */
export interface ExceptionDto {
  /** Unique identifier for the exception */
  id: string;
  
  /** Type of exception being requested */
  exceptionType?: string;
  
  /** Current status of the exception */
  status: ExceptionStatus;
  
  /** User who requested the exception */
  requestedBy: string;
  
  /** Timestamp when the exception was requested */
  requestedAt: Date;
  
  /** Optional expiration date for the exception */
  expiresAt?: Date;
  
  /** Justification for the exception request */
  justification?: string;
}

/**
 * Create exception request
 * Used to create a new exception or waiver request
 */
export interface CreateExceptionRequest {
  /** Type of exception being requested */
  exceptionType?: string;
  
  /** Justification for the exception */
  justification?: string;
  
  /** User requesting the exception */
  requestedBy: string;
  
  /** Optional expiration date for the exception */
  expiresAt?: Date;
  
  /** Supporting evidence for the exception request */
  supportingEvidence?: string[];
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Approve exception request
 * Used to approve an exception request
 */
export interface ApproveExceptionRequest {
  /** User approving the exception */
  approverId: string;
  
  /** Additional requirements or conditions for the approval */
  additionalRequirements?: string[];
}

/**
 * Deny exception request
 * Used to deny an exception request
 */
export interface DenyExceptionRequest {
  /** User denying the exception */
  approverId: string;
  
  /** Reason for denying the exception */
  denialReason?: string;
}

/**
 * Exception validation result
 * Result of validating an exception request before submission
 */
export interface ExceptionValidationResult {
  /** Whether the exception is approved/valid */
  isApproved: boolean;
  
  /** Optional message about the validation result */
  message?: string;
  
  /** List of validation errors if any */
  validationErrors?: string[];
  
  /** Alternative paths or solutions if exception is not approved */
  alternativePaths?: string[];
  
  /** Additional requirements needed for approval */
  additionalRequirements?: string[];
  
  /** Timestamp when validation was performed */
  validatedAt: Date;
}
