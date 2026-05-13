/**
 * Reporting Selectors
 * Provides memoized selectors for accessing reporting state
 */

import { createFeatureSelector, createSelector } from '@ngrx/store';
import { ReportingState } from './reporting.state';
import { KPIStatus } from '../../models/reporting.model';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';
import { determineScopeType, filterJobsByScope } from '../shared/selector-helpers';

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

// Advanced calculation selectors

// Calculate total utilization hours across all technicians
// Calculate total available hours across all technicians
// Optimized: Combined into single pass
const selectUtilizationHoursTotals = createSelector(
  selectUtilizationTechnicians,
  (technicians) => {
    let totalWorked = 0;
    let totalAvailable = 0;
    
    for (const tech of technicians) {
      totalWorked += tech.workedHours;
      totalAvailable += tech.availableHours;
    }
    
    return { totalWorked, totalAvailable };
  }
);

// Calculate total utilization hours across all technicians
export const selectTotalUtilizationHours = createSelector(
  selectUtilizationHoursTotals,
  (totals) => totals.totalWorked
);

// Calculate total available hours across all technicians
export const selectTotalAvailableHours = createSelector(
  selectUtilizationHoursTotals,
  (totals) => totals.totalAvailable
);

// Calculate overall utilization rate from technician data
export const selectOverallUtilizationRate = createSelector(
  selectTotalUtilizationHours,
  selectTotalAvailableHours,
  (worked, available) => available > 0 ? (worked / available) * 100 : 0
);

// Get underutilized technicians (below 60% utilization)
export const selectUnderutilizedTechnicians = createSelector(
  selectUtilizationTechnicians,
  (technicians) => technicians.filter(tech => tech.utilizationRate < 60)
);

// Get overutilized technicians (above 90% utilization)
export const selectOverutilizedTechnicians = createSelector(
  selectUtilizationTechnicians,
  (technicians) => technicians.filter(tech => tech.utilizationRate > 90)
);

// Get optimally utilized technicians (60-90% utilization)
export const selectOptimallyUtilizedTechnicians = createSelector(
  selectUtilizationTechnicians,
  (technicians) => technicians.filter(tech => 
    tech.utilizationRate >= 60 && tech.utilizationRate <= 90
  )
);

// Calculate utilization distribution
// Optimized: Single pass through technicians array
export const selectUtilizationDistribution = createSelector(
  selectUtilizationTechnicians,
  (technicians) => {
    let underutilized = 0;
    let optimal = 0;
    let overutilized = 0;
    
    for (const tech of technicians) {
      if (tech.utilizationRate < 60) {
        underutilized++;
      } else if (tech.utilizationRate <= 90) {
        optimal++;
      } else {
        overutilized++;
      }
    }
    
    return {
      underutilized,
      optimal,
      overutilized,
      total: technicians.length
    };
  }
);

// Get top N performers by jobs completed
export const selectTopPerformersByJobsCompleted = (count: number = 5) => createSelector(
  selectTopPerformers,
  (performers) => [...performers]
    .sort((a, b) => b.jobsCompleted - a.jobsCompleted)
    .slice(0, count)
);

// Get top N performers by on-time completion rate
export const selectTopPerformersByOnTimeRate = (count: number = 5) => createSelector(
  selectTopPerformers,
  (performers) => [...performers]
    .sort((a, b) => b.onTimeCompletionRate - a.onTimeCompletionRate)
    .slice(0, count)
);

// Calculate average on-time completion rate across all performers
export const selectAverageOnTimeCompletionRate = createSelector(
  selectTopPerformers,
  (performers) => {
    if (performers.length === 0) return 0;
    const total = performers.reduce((sum, p) => sum + p.onTimeCompletionRate, 0);
    return total / performers.length;
  }
);

// Calculate total jobs (completed + open)
export const selectTotalJobs = createSelector(
  selectTotalJobsCompleted,
  selectTotalJobsOpen,
  (completed, open) => completed + open
);

// Calculate job completion percentage
export const selectJobCompletionPercentage = createSelector(
  selectTotalJobsCompleted,
  selectTotalJobs,
  (completed, total) => total > 0 ? (completed / total) * 100 : 0
);

// Get jobs by type as array for charting
export const selectJobsByTypeArray = createSelector(
  selectJobsByType,
  (jobsByType) => Object.entries(jobsByType).map(([type, count]) => ({
    type,
    count
  }))
);

// Calculate KPI summary statistics
// Optimized: Single pass through KPIs array
export const selectKPISummary = createSelector(
  selectKPIs,
  (kpis) => {
    const total = kpis.length;
    let onTrack = 0;
    let atRisk = 0;
    let belowTarget = 0;
    
    for (const kpi of kpis) {
      if (kpi.status === KPIStatus.OnTrack) onTrack++;
      else if (kpi.status === KPIStatus.AtRisk) atRisk++;
      else if (kpi.status === KPIStatus.BelowTarget) belowTarget++;
    }
    
    return {
      total,
      onTrack,
      atRisk,
      belowTarget,
      onTrackPercentage: total > 0 ? (onTrack / total) * 100 : 0,
      atRiskPercentage: total > 0 ? (atRisk / total) * 100 : 0,
      belowTargetPercentage: total > 0 ? (belowTarget / total) * 100 : 0
    };
  }
);

// Calculate average KPI achievement rate
export const selectAverageKPIAchievement = createSelector(
  selectKPIs,
  (kpis) => {
    if (kpis.length === 0) return 0;
    const totalAchievement = kpis.reduce((sum, kpi) => {
      const achievement = kpi.target > 0 ? (kpi.value / kpi.target) * 100 : 0;
      return sum + achievement;
    }, 0);
    return totalAchievement / kpis.length;
  }
);

// Get KPIs below target threshold (< 80% of target)
export const selectKPIsBelowThreshold = createSelector(
  selectKPIs,
  (kpis) => kpis.filter(kpi => {
    const achievement = kpi.target > 0 ? (kpi.value / kpi.target) * 100 : 0;
    return achievement < 80;
  })
);

// Get KPIs exceeding target
export const selectKPIsExceedingTarget = createSelector(
  selectKPIs,
  (kpis) => kpis.filter(kpi => kpi.value > kpi.target)
);

// Calculate technician efficiency score (jobs completed per hour worked)
export const selectTechnicianEfficiencyScores = createSelector(
  selectUtilizationTechnicians,
  (technicians) => technicians.map(tech => ({
    technicianId: tech.technician.id,
    technicianName: `${tech.technician.firstName} ${tech.technician.lastName}`,
    efficiencyScore: tech.workedHours > 0 ? tech.jobsCompleted / tech.workedHours : 0,
    jobsCompleted: tech.jobsCompleted,
    workedHours: tech.workedHours
  })).sort((a, b) => b.efficiencyScore - a.efficiencyScore)
);

// Get most efficient technician
export const selectMostEfficientTechnician = createSelector(
  selectTechnicianEfficiencyScores,
  (scores) => scores.length > 0 ? scores[0] : null
);

// Calculate average job duration from performance data
export const selectAverageJobDuration = createSelector(
  selectTopPerformers,
  (performers) => {
    if (performers.length === 0) return 0;
    const totalDuration = performers.reduce((sum, p) => sum + p.averageJobDuration, 0);
    return totalDuration / performers.length;
  }
);

// Get recent activity count by type
// Optimized: Single pass through activities
export const selectActivityCountByType = createSelector(
  selectRecentActivity,
  (activities) => {
    const counts: Record<string, number> = {};
    for (const activity of activities) {
      counts[activity.type] = (counts[activity.type] || 0) + 1;
    }
    return counts;
  }
);

// Get recent activity sorted by timestamp (most recent first)
export const selectRecentActivitySorted = createSelector(
  selectRecentActivity,
  (activities) => [...activities].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )
);

// Calculate capacity metrics
export const selectCapacityMetrics = createSelector(
  selectTotalAvailableTechnicians,
  selectTotalActiveJobs,
  selectAverageUtilization,
  (availableTechs, activeJobs, utilization) => ({
    availableTechnicians: availableTechs,
    activeJobs: activeJobs,
    averageUtilization: utilization,
    techsPerJob: activeJobs > 0 ? availableTechs / activeJobs : 0,
    capacityUtilization: utilization,
    hasCapacity: utilization < 85
  })
);

// Get jobs requiring attention count
export const selectJobsRequiringAttentionCount = createSelector(
  selectJobsRequiringAttention,
  (jobs) => jobs.length
);

// Calculate performance trend indicators
export const selectPerformanceTrends = createSelector(
  selectScheduleAdherence,
  selectAverageOnTimeCompletionRate,
  selectJobCompletionPercentage,
  (scheduleAdherence, onTimeRate, completionRate) => ({
    scheduleAdherence: {
      value: scheduleAdherence,
      status: scheduleAdherence >= 90 ? 'good' : scheduleAdherence >= 75 ? 'warning' : 'critical'
    },
    onTimeCompletion: {
      value: onTimeRate,
      status: onTimeRate >= 90 ? 'good' : onTimeRate >= 75 ? 'warning' : 'critical'
    },
    jobCompletion: {
      value: completionRate,
      status: completionRate >= 80 ? 'good' : completionRate >= 60 ? 'warning' : 'critical'
    }
  })
);

// Select date range from state
export const selectDateRange = createSelector(
  selectReportingState,
  (state) => state.dateRange
);

// Check if reports are stale (no date range or old data)
export const selectReportsAreStale = createSelector(
  selectDateRange,
  selectHasReports,
  (dateRange, hasReports) => {
    if (!hasReports || !dateRange) return true;
    // Consider reports stale if date range end is more than 24 hours old
    const now = new Date();
    const endDate = new Date(dateRange.endDate);
    const hoursDiff = (now.getTime() - endDate.getTime()) / (1000 * 60 * 60);
    return hoursDiff > 24;
  }
);

// ============================================================================
// SCOPE-FILTERED SELECTORS
// ============================================================================
// These selectors apply role-based data scope filtering according to the
// filterDataByScope algorithm from the design document.
//
// Reporting data contains nested entities (technicians, jobs) that need
// scope filtering applied based on user role:
// - Admin: sees all data
// - CM: sees data in their market (or all if RG market)
// - PM/Vendor: sees data in their company AND market
// - Technician: sees only their own data
//
// Usage: Components should inject DataScopeService and pass user + dataScopes
// to these selector factories.
// ============================================================================

/**
 * Select dashboard metrics with scope filtering applied
 * 
 * Filters nested data (jobsRequiringAttention) based on user's data scope
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns dashboard metrics with scoped data
 */
export const selectScopedDashboard = (user: User, dataScopes: DataScope[]) => createSelector(
  selectDashboard,
  (dashboard) => {
    if (!dashboard || !user || !dataScopes || dataScopes.length === 0) {
      return dashboard;
    }

    const scopeType = determineScopeType(dataScopes);

    // Filter jobsRequiringAttention based on scope
    const filteredJobs = filterJobsByScope(dashboard.jobsRequiringAttention, user, scopeType);

    return {
      ...dashboard,
      jobsRequiringAttention: filteredJobs
    };
  }
);

/**
 * Select utilization report with scope filtering applied
 * 
 * Filters technician utilization data based on user's data scope
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns utilization report with scoped technicians
 */
export const selectScopedUtilizationReport = (user: User, dataScopes: DataScope[]) => createSelector(
  selectUtilizationReport,
  (report) => {
    if (!report || !user || !dataScopes || dataScopes.length === 0) {
      return report;
    }

    const scopeType = determineScopeType(dataScopes);

    // Filter technicians based on scope
    const filteredTechnicians = report.technicians.filter(techUtil => {
      const tech = techUtil.technician;
      
      switch (scopeType) {
        case 'all':
          return true;

        case 'market':
          if (user.market === 'RG') {
            return true;
          }
          // Technician model uses 'region' field which maps to 'market'
          return tech.region === user.market;

        case 'company':
          // PM/Vendor: filter by market (company field not yet in Technician model)
          return tech.region === user.market;

        case 'self':
          // Technician: see only themselves
          return tech.id === user.id;

        default:
          return false;
      }
    });

    // Recalculate average utilization based on filtered technicians
    const averageUtilization = filteredTechnicians.length > 0
      ? filteredTechnicians.reduce((sum, t) => sum + t.utilizationRate, 0) / filteredTechnicians.length
      : 0;

    return {
      ...report,
      technicians: filteredTechnicians,
      averageUtilization
    };
  }
);

/**
 * Select performance report with scope filtering applied
 * 
 * Filters top performers data based on user's data scope
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns performance report with scoped data
 */
export const selectScopedPerformanceReport = (user: User, dataScopes: DataScope[]) => createSelector(
  selectPerformanceReport,
  (report) => {
    if (!report || !user || !dataScopes || dataScopes.length === 0) {
      return report;
    }

    const scopeType = determineScopeType(dataScopes);

    // Filter top performers based on scope
    const filteredPerformers = report.topPerformers.filter(performer => {
      const tech = performer.technician;
      
      switch (scopeType) {
        case 'all':
          return true;

        case 'market':
          if (user.market === 'RG') {
            return true;
          }
          return tech.region === user.market;

        case 'company':
          // PM/Vendor: filter by market (company field not yet in Technician model)
          return tech.region === user.market;

        case 'self':
          // Technician: see only themselves
          return tech.id === user.id;

        default:
          return false;
      }
    });

    return {
      ...report,
      topPerformers: filteredPerformers
    };
  }
);

/**
 * Select utilization technicians with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scoped technician utilization data
 */
export const selectScopedUtilizationTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationReport(user, dataScopes),
  (report) => report?.technicians || []
);

/**
 * Select utilization average with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns average utilization for scoped technicians
 */
export const selectScopedUtilizationAverage = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationReport(user, dataScopes),
  (report) => report?.averageUtilization || 0
);

/**
 * Select top performers with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scoped top performers
 */
export const selectScopedTopPerformers = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedPerformanceReport(user, dataScopes),
  (report) => report?.topPerformers || []
);

/**
 * Select jobs requiring attention with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scoped jobs requiring attention
 */
export const selectScopedJobsRequiringAttention = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedDashboard(user, dataScopes),
  (dashboard) => dashboard?.jobsRequiringAttention || []
);

/**
 * Select underutilized technicians with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scoped underutilized technicians
 */
export const selectScopedUnderutilizedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationTechnicians(user, dataScopes),
  (technicians) => technicians.filter(tech => tech.utilizationRate < 60)
);

/**
 * Select overutilized technicians with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scoped overutilized technicians
 */
export const selectScopedOverutilizedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationTechnicians(user, dataScopes),
  (technicians) => technicians.filter(tech => tech.utilizationRate > 90)
);

/**
 * Select optimally utilized technicians with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns scoped optimally utilized technicians
 */
export const selectScopedOptimallyUtilizedTechnicians = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationTechnicians(user, dataScopes),
  (technicians) => technicians.filter(tech => 
    tech.utilizationRate >= 60 && tech.utilizationRate <= 90
  )
);

/**
 * Select utilization distribution with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns utilization distribution for scoped technicians
 */
export const selectScopedUtilizationDistribution = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUnderutilizedTechnicians(user, dataScopes),
  selectScopedOptimallyUtilizedTechnicians(user, dataScopes),
  selectScopedOverutilizedTechnicians(user, dataScopes),
  (under, optimal, over) => ({
    underutilized: under.length,
    optimal: optimal.length,
    overutilized: over.length,
    total: under.length + optimal.length + over.length
  })
);

/**
 * Select total utilization hours with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns total utilization hours for scoped technicians
 */
export const selectScopedTotalUtilizationHours = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationTechnicians(user, dataScopes),
  (technicians) => technicians.reduce((total, tech) => total + tech.workedHours, 0)
);

/**
 * Select total available hours with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns total available hours for scoped technicians
 */
export const selectScopedTotalAvailableHours = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationTechnicians(user, dataScopes),
  (technicians) => technicians.reduce((total, tech) => total + tech.availableHours, 0)
);

/**
 * Select overall utilization rate with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns overall utilization rate for scoped technicians
 */
export const selectScopedOverallUtilizationRate = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTotalUtilizationHours(user, dataScopes),
  selectScopedTotalAvailableHours(user, dataScopes),
  (worked, available) => available > 0 ? (worked / available) * 100 : 0
);

/**
 * Select top performers by jobs completed with scope filtering
 * 
 * @param count - Number of top performers to return
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns top N performers by jobs completed within scope
 */
export const selectScopedTopPerformersByJobsCompleted = (count: number = 5, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTopPerformers(user, dataScopes),
  (performers) => [...performers]
    .sort((a, b) => b.jobsCompleted - a.jobsCompleted)
    .slice(0, count)
);

/**
 * Select top performers by on-time rate with scope filtering
 * 
 * @param count - Number of top performers to return
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns top N performers by on-time rate within scope
 */
export const selectScopedTopPerformersByOnTimeRate = (count: number = 5, user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTopPerformers(user, dataScopes),
  (performers) => [...performers]
    .sort((a, b) => b.onTimeCompletionRate - a.onTimeCompletionRate)
    .slice(0, count)
);

/**
 * Select average on-time completion rate with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns average on-time completion rate for scoped performers
 */
export const selectScopedAverageOnTimeCompletionRate = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTopPerformers(user, dataScopes),
  (performers) => {
    if (performers.length === 0) return 0;
    const total = performers.reduce((sum, p) => sum + p.onTimeCompletionRate, 0);
    return total / performers.length;
  }
);

/**
 * Select technician efficiency scores with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns efficiency scores for scoped technicians
 */
export const selectScopedTechnicianEfficiencyScores = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedUtilizationTechnicians(user, dataScopes),
  (technicians) => technicians.map(tech => ({
    technicianId: tech.technician.id,
    technicianName: `${tech.technician.firstName} ${tech.technician.lastName}`,
    efficiencyScore: tech.workedHours > 0 ? tech.jobsCompleted / tech.workedHours : 0,
    jobsCompleted: tech.jobsCompleted,
    workedHours: tech.workedHours
  })).sort((a, b) => b.efficiencyScore - a.efficiencyScore)
);

/**
 * Select most efficient technician with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns most efficient technician within scope
 */
export const selectScopedMostEfficientTechnician = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTechnicianEfficiencyScores(user, dataScopes),
  (scores) => scores.length > 0 ? scores[0] : null
);

/**
 * Select average job duration with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns average job duration for scoped performers
 */
export const selectScopedAverageJobDuration = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedTopPerformers(user, dataScopes),
  (performers) => {
    if (performers.length === 0) return 0;
    const totalDuration = performers.reduce((sum, p) => sum + p.averageJobDuration, 0);
    return totalDuration / performers.length;
  }
);

/**
 * Select jobs requiring attention count with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns count of jobs requiring attention within scope
 */
export const selectScopedJobsRequiringAttentionCount = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedJobsRequiringAttention(user, dataScopes),
  (jobs) => jobs.length
);

/**
 * Select performance trends with scope filtering
 * 
 * @param user - Current user with role, market, company
 * @param dataScopes - Data scopes for the user's role
 * @returns Selector that returns performance trends for scoped data
 */
export const selectScopedPerformanceTrends = (user: User, dataScopes: DataScope[]) => createSelector(
  selectScopedPerformanceReport(user, dataScopes),
  selectScopedAverageOnTimeCompletionRate(user, dataScopes),
  (report, onTimeRate) => {
    if (!report) {
      return {
        scheduleAdherence: { value: 0, status: 'critical' as const },
        onTimeCompletion: { value: 0, status: 'critical' as const },
        jobCompletion: { value: 0, status: 'critical' as const }
      };
    }

    const scheduleAdherence = report.scheduleAdherence;
    const completionRate = report.totalJobsCompleted + report.totalJobsOpen > 0
      ? (report.totalJobsCompleted / (report.totalJobsCompleted + report.totalJobsOpen)) * 100
      : 0;

    return {
      scheduleAdherence: {
        value: scheduleAdherence,
        status: scheduleAdherence >= 90 ? 'good' as const : scheduleAdherence >= 75 ? 'warning' as const : 'critical' as const
      },
      onTimeCompletion: {
        value: onTimeRate,
        status: onTimeRate >= 90 ? 'good' as const : onTimeRate >= 75 ? 'warning' as const : 'critical' as const
      },
      jobCompletion: {
        value: completionRate,
        status: completionRate >= 80 ? 'good' as const : completionRate >= 60 ? 'warning' as const : 'critical' as const
      }
    };
  }
);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
// Note: Helper functions (determineScopeType, filterJobsByScope) have been moved
// to shared/selector-helpers.ts to avoid code duplication across selector files.

