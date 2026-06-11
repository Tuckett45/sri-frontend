/**
 * Data Transfer Objects for Assignment API requests
 */

export interface AssignmentDto {
  jobId: string;
  technicianId: string;
  overrideConflicts?: boolean;
  overrideCertifications?: boolean;
  justification?: string;
}

/** Certification issue returned by the 422 cert-gate response */
export interface CertificationIssue {
  skill: string;
  issue: 'Missing certification' | 'Certification expired';
  expiredAt?: string;
}

/** Structured 422 response from POST /scheduling/assign */
export interface CertGateConflict {
  message: string;
  missingCertifications: CertificationIssue[];
}

export interface BulkAssignmentDto {
  assignments: AssignmentDto[];
}

export interface ReassignmentDto {
  jobId: string;
  fromTechnicianId: string;
  toTechnicianId: string;
  reason?: string;
}
