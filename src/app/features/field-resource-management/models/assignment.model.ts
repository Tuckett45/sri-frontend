/**
 * Assignment-related models and enums for Field Resource Management
 */

import { Technician, Skill } from './technician.model';
import { Job } from './job.model';

export enum ConflictSeverity {
  Warning = 'Warning',
  Error = 'Error'
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
  isActive: boolean;
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
  missingSkills: Skill[];
  currentWorkload: number;
  hasConflicts: boolean;
  conflicts: Conflict[];
}
