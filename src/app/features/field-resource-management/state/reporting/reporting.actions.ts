/**
 * Reporting Actions
 * Defines all actions for reporting state management
 */

import { createAction, props } from '@ngrx/store';
import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI } from '../../models/reporting.model';
import { DateRange } from '../../models/assignment.model';
import { TechnicianRole } from '../../models/technician.model';
import { JobType, Priority } from '../../models/job.model';

// Load Dashboard
export const loadDashboard = createAction(
  '[Reporting] Load Dashboard'
);

export const loadDashboardSuccess = createAction(
  '[Reporting] Load Dashboard Success',
  props<{ dashboard: DashboardMetrics }>()
);

export const loadDashboardFailure = createAction(
  '[Reporting] Load Dashboard Failure',
  props<{ error: string }>()
);

// Load Utilization Report
export const loadUtilization = createAction(
  '[Reporting] Load Utilization',
  props<{ dateRange: DateRange; technicianId?: string; role?: TechnicianRole; region?: string }>()
);

export const loadUtilizationSuccess = createAction(
  '[Reporting] Load Utilization Success',
  props<{ utilization: UtilizationReport }>()
);

export const loadUtilizationFailure = createAction(
  '[Reporting] Load Utilization Failure',
  props<{ error: string }>()
);

// Load Job Performance Report
export const loadJobPerformance = createAction(
  '[Reporting] Load Job Performance',
  props<{ dateRange: DateRange; jobType?: JobType; priority?: Priority; client?: string }>()
);

export const loadJobPerformanceSuccess = createAction(
  '[Reporting] Load Job Performance Success',
  props<{ performance: PerformanceReport }>()
);

export const loadJobPerformanceFailure = createAction(
  '[Reporting] Load Job Performance Failure',
  props<{ error: string }>()
);

// Load KPIs
export const loadKPIs = createAction(
  '[Reporting] Load KPIs',
  props<{ dateRange?: DateRange; markets?: string[] }>()
);

export const loadKPIsSuccess = createAction(
  '[Reporting] Load KPIs Success',
  props<{ kpis: KPI[] }>()
);

export const loadKPIsFailure = createAction(
  '[Reporting] Load KPIs Failure',
  props<{ error: string }>()
);

// Refresh Dashboard
export const refreshDashboard = createAction(
  '[Reporting] Refresh Dashboard'
);

// Clear Reports
export const clearReports = createAction(
  '[Reporting] Clear Reports'
);
