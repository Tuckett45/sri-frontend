/**
 * Data Transfer Objects for Assignment API requests
 */

export interface AssignmentDto {
  jobId: string;
  technicianId: string;
  overrideConflicts?: boolean;
  justification?: string;
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
