/**
 * Reporting Models
 * 
 * Models for comprehensive job cost reporting and analytics
 */

import { BudgetStatus } from './budget.model';

/**
 * Technician labor cost
 */
export interface TechnicianLaborCost {
  technicianId: string;
  technicianName: string;
  hours: number;
  roundedHours: number;
  hourlyRate: number;
  totalCost: number;
}

/**
 * Labor costs breakdown
 */
export interface LaborCosts {
  totalHours: number;
  totalRoundedHours: number;
  averageHourlyRate: number;
  totalCost: number;
  byTechnician: TechnicianLaborCost[];
}

/**
 * Material cost item
 */
export interface MaterialCostItem {
  materialId: string;
  materialName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

/**
 * Material costs breakdown
 */
export interface MaterialCosts {
  totalCost: number;
  byMaterial: MaterialCostItem[];
}

/**
 * Technician travel cost
 */
export interface TechnicianTravelCost {
  technicianId: string;
  technicianName: string;
  distanceMiles: number;
  perDiemAmount: number;
}

/**
 * Travel costs breakdown
 */
export interface TravelCosts {
  totalCost: number;
  byTechnician: TechnicianTravelCost[];
}

/**
 * Job cost breakdown
 */
export interface JobCostBreakdown {
  jobId: string;
  laborCosts: LaborCosts;
  materialCosts: MaterialCosts;
  travelCosts: TravelCosts;
  totalCosts: number;
  budgetVariance: number;
  budgetVariancePercent: number;
}

/**
 * Budget comparison
 */
export interface BudgetComparison {
  allocatedBudget: number;
  actualCost: number;
  variance: number;
  variancePercent: number;
  status: BudgetStatus;
}

/**
 * Budget variance item for dashboard
 */
export interface BudgetVarianceItem {
  jobId: string;
  jobName: string;
  allocatedHours: number;
  consumedHours: number;
  remainingHours: number;
  variancePercent: number;
  status: BudgetStatus;
}

/**
 * Budget variance report
 */
export interface BudgetVarianceReport {
  items: BudgetVarianceItem[];
  totalAllocated: number;
  totalConsumed: number;
  averageVariancePercent: number;
  jobsOverBudget: number;
  jobsAtRisk: number;
}

/**
 * Travel cost report
 */
export interface TravelCostReport {
  totalCost: number;
  byTechnician: TechnicianTravelCost[];
  byJob: { jobId: string; jobName: string; totalCost: number }[];
}

/**
 * Material usage report
 */
export interface MaterialUsageReport {
  totalCost: number;
  byMaterial: MaterialCostItem[];
  byJob: { jobId: string; jobName: string; totalCost: number }[];
  topMaterials: MaterialCostItem[];
}

import { Technician } from './technician.model';
import { Job, JobStatus, JobType } from './job.model';
import { DateRange } from './assignment.model';

/**
 * KPI trend direction
 */
export enum Trend {
  Up = 'up',
  Down = 'down',
  Stable = 'stable'
}

/**
 * KPI status
 */
export enum KPIStatus {
  OnTrack = 'on-track',
  AtRisk = 'at-risk',
  BelowTarget = 'below-target'
}

/**
 * Key Performance Indicator
 */
export interface KPI {
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: Trend;
  status: KPIStatus;
}

/**
 * Activity item for dashboard feed
 */
export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  userId: string;
}

/**
 * Dashboard metrics summary
 */
export interface DashboardMetrics {
  totalActiveJobs: number;
  totalAvailableTechnicians: number;
  jobsByStatus: Record<JobStatus, number>;
  averageUtilization: number;
  jobsRequiringAttention: Job[];
  recentActivity: ActivityItem[];
  kpis: KPI[];
}

/**
 * Technician utilization data
 */
export interface TechnicianUtilization {
  technician: Technician;
  availableHours: number;
  workedHours: number;
  utilizationRate: number;
  jobsCompleted: number;
}

/**
 * Utilization report
 */
export interface UtilizationReport {
  dateRange: DateRange;
  technicians: TechnicianUtilization[];
  averageUtilization: number;
}

/**
 * Technician performance data
 */
export interface TechnicianPerformance {
  technician: Technician;
  jobsCompleted: number;
  totalHours: number;
  averageJobDuration: number;
  onTimeCompletionRate: number;
}

/**
 * Performance report
 */
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
 * KPI metrics calculated from jobs and technicians
 */
export interface KPIMetrics {
  totalJobs: number;
  completedJobs: number;
  inProgressJobs: number;
  notStartedJobs: number;
  cancelledJobs: number;
  completionRate: number;
  utilizationRate: number;
  onTimeCompletionRate: number;
  averageJobDuration: number;
  totalAvailableTechnicians: number;
  totalEstimatedHours: number;
  totalActualHours: number;
  dateRange: DateRange;
}
