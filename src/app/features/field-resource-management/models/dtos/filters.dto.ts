/**
 * Data Transfer Objects for filtering and search operations
 */

import { TechnicianRole } from '../technician.model';
import { JobType, Priority, JobStatus } from '../job.model';
import { DateRange } from '../assignment.model';

export interface TechnicianFilters {
  searchTerm?: string;
  role?: TechnicianRole;
  skills?: string[];
  region?: string;
  isAvailable?: boolean;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface JobFilters {
  searchTerm?: string;
  status?: JobStatus;
  priority?: Priority;
  jobType?: JobType;
  client?: string;
  dateRange?: DateRange;
  startDate?: Date;
  endDate?: Date;
  technicianId?: string;
  region?: string;
  page?: number;
  pageSize?: number;
}

export interface AssignmentFilters {
  technicianId?: string;
  jobId?: string;
  dateRange?: DateRange;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface TimeEntryFilters {
  technicianId?: string;
  jobId?: string;
  dateRange?: DateRange;
  isManuallyAdjusted?: boolean;
  page?: number;
  pageSize?: number;
}
