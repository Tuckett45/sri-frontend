/**
 * Reporting Selectors
 * Provides memoized selectors for accessing reporting state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ReportingState } from './reporting.state';
import { KPIStatus } from '../../models/reporting.model';

// Feature selector
export const selectReportingState = createFeatureSelector<ReportingState>('reporting');

// Select dashboard
export const selectDashboard = createSelector(
  selectReportingState,
  (state) => state.dashboard
);

// Select utilization report
export const selectUtilizationReport = createSelector(
  selectReportingState,
  (state) => state.utilization
);

// Select performance report
export const selectPerformanceReport = createSelector(
  selectReportingState,
  (state) => state.performance
);

// Select KPIs
export const selectKPIs = createSelector(
  selectReportingState,
  (state) => state.kpis
);

// Select loading state
export const selectReportingLoading = createSelector(
  selectReportingState,
  (state) => state.loading
);

// Select error state
export const selectReportingError = createSelector(
  selectReportingState,
  (state) => state.error
);

// Dashboard-specific selectors
export const selectTotalActiveJobs = createSelector(
  selectDashboard,
  (dashboard) => dashboard?.totalActiveJobs || 0
);

export const selectTotalAvailableTechnicians = createSelector(
  selectDashboard,
  (dashboard) => dashboard?.totalAvailableTechnicians || 0
);

export const selectJobsByStatus = createSelector(
  selectDashboard,
  (dashboard) => dashboard?.jobsByStatus || {}
);

export const selectAverageUtilization = createSelector(
  selectDashboard,
  (dashboard) => dashboard?.averageUtilization || 0
);

export const selectJobsRequiringAttention = createSelector(
  selectDashboard,
  (dashboard) => dashboard?.jobsRequiringAttention || []
);

export const selectRecentActivity = createSelector(
  selectDashboard,
  (dashboard) => dashboard?.recentActivity || []
);

export const selectDashboardKPIs = createSelector(
  selectDashboard,
  (dashboard) => dashboard?.kpis || []
);

// Utilization report selectors
export const selectUtilizationTechnicians = createSelector(
  selectUtilizationReport,
  (report) => report?.technicians || []
);

export const selectUtilizationAverage = createSelector(
  selectUtilizationReport,
  (report) => report?.averageUtilization || 0
);

export const selectUtilizationDateRange = createSelector(
  selectUtilizationReport,
  (report) => report?.dateRange
);

// Performance report selectors
export const selectTotalJobsCompleted = createSelector(
  selectPerformanceReport,
  (report) => report?.totalJobsCompleted || 0
);

export const selectTotalJobsOpen = createSelector(
  selectPerformanceReport,
  (report) => report?.totalJobsOpen || 0
);

export const selectAverageLaborHours = createSelector(
  selectPerformanceReport,
  (report) => report?.averageLaborHours || 0
);

export const selectScheduleAdherence = createSelector(
  selectPerformanceReport,
  (report) => report?.scheduleAdherence || 0
);

export const selectJobsByType = createSelector(
  selectPerformanceReport,
  (report) => report?.jobsByType || {}
);

export const selectTopPerformers = createSelector(
  selectPerformanceReport,
  (report) => report?.topPerformers || []
);

export const selectPerformanceDateRange = createSelector(
  selectPerformanceReport,
  (report) => report?.dateRange
);

// KPI selectors
export const selectKPIByName = (name: string) => createSelector(
  selectKPIs,
  (kpis) => kpis.find(kpi => kpi.name === name)
);

export const selectKPIsOnTrack = createSelector(
  selectKPIs,
  (kpis) => kpis.filter(kpi => kpi.status === KPIStatus.OnTrack)
);

export const selectKPIsAtRisk = createSelector(
  selectKPIs,
  (kpis) => kpis.filter(kpi => kpi.status === KPIStatus.AtRisk)
);

export const selectKPIsBelowTarget = createSelector(
  selectKPIs,
  (kpis) => kpis.filter(kpi => kpi.status === KPIStatus.BelowTarget)
);

export const selectKPIsCount = createSelector(
  selectKPIs,
  (kpis) => kpis.length
);

// Computed selectors
export const selectJobCompletionRate = createSelector(
  selectTotalJobsCompleted,
  selectTotalJobsOpen,
  (completed, open) => {
    const total = completed + open;
    return total > 0 ? (completed / total) * 100 : 0;
  }
);

export const selectHasReports = createSelector(
  selectDashboard,
  selectUtilizationReport,
  selectPerformanceReport,
  (dashboard, utilization, performance) => 
    dashboard !== null || utilization !== null || performance !== null
);
