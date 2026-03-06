/**
 * Reporting and analytics models for Field Resource Management
 */

import { Technician } from './technician.model';
import { Job, JobStatus, JobType } from './job.model';
import { DateRange } from './assignment.model';

export enum Trend {
  Up = 'Up',
  Down = 'Down',
  Stable = 'Stable'
}

export enum KPIStatus {
  OnTrack = 'OnTrack',
  AtRisk = 'AtRisk',
  BelowTarget = 'BelowTarget'
}

export interface KPI {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: Trend;
  status: KPIStatus;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  userId: string;
}

export interface DashboardMetrics {
  totalActiveJobs: number;
  totalAvailableTechnicians: number;
  jobsByStatus: Record<JobStatus, number>;
  averageUtilization: number;
  jobsRequiringAttention: Job[];
  recentActivity: ActivityItem[];
  kpis: KPI[];
}

export interface TechnicianUtilization {
  technician: Technician;
  availableHours: number;
  workedHours: number;
  utilizationRate: number;
  jobsCompleted: number;
}

export interface UtilizationReport {
  dateRange: DateRange;
  technicians: TechnicianUtilization[];
  averageUtilization: number;
}

export interface TechnicianPerformance {
  technician: Technician;
  jobsCompleted: number;
  totalHours: number;
  averageJobDuration: number;
  onTimeCompletionRate: number;
}

export interface PerformanceReport {
  dateRange: DateRange;
  totalJobsCompleted: number;
  totalJobsOpen: number;
  averageLaborHours: number;
  scheduleAdherence: number;
  jobsByType: Record<JobType, number>;
  topPerformers: TechnicianPerformance[];
}

/**
 * KPI Metrics calculated from jobs and technicians data
 */
export interface KPIMetrics {
  totalJobs: number;
  completedJobs: number;
  inProgressJobs: number;
  notStartedJobs: number;
  cancelledJobs: number;
  completionRate: number; // Percentage 0-100
  utilizationRate: number; // Percentage 0-100
  onTimeCompletionRate: number; // Percentage 0-100
  averageJobDuration: number; // Hours
  totalAvailableTechnicians: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  dateRange: DateRange;
}
