/**
 * Assignment-related models and enums for Field Resource Management
 */

import { Technician, Skill } from './technician.model';
import { Job } from './job.model';

export enum ConflictSeverity {
  Warning = 'Warning',
  Error = 'Error'
}

export enum AssignmentStatus {
  Assigned = 'Assigned',
  Accepted = 'Accepted',
  Rejected = 'Rejected',
  InProgress = 'In Progress',
  Completed = 'Completed'
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface Assignment {
  id: string;
  jobId: string;
  technicianId: string;
  assignedBy: string;
  assignedAt: Date;
  status: AssignmentStatus;
  isActive: boolean;
  startTime?: Date;
  endTime?: Date;
  job?: Job;
  technician?: Technician;
}

export interface Conflict {
  jobId: string;
  technicianId: string;
  conflictingJobId: string;
  conflictingJobTitle: string;
  timeRange: DateRange;
  severity: ConflictSeverity;
}

export interface TechnicianMatch {
  technician: Technician;
  matchPercentage: number;
  /** Skill names (plain strings) returned by the backend cert-matching endpoint */
  missingSkills: string[];
  /** Cert names that exist but are past their expiry date */
  expiredCertifications: string[];
  currentWorkload: number;
  hasConflicts: boolean;
  conflicts: Conflict[];
}
