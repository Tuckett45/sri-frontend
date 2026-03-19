/**
 * Reporting Reducer Unit Tests
 * Tests all reducer logic for reporting state management
 */

import { reportingReducer, initialState } from './reporting.reducer';
import * as ReportingActions from './reporting.actions';
import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI, KPIStatus, Trend } from '../../models/reporting.model';
import { JobStatus, JobType } from '../../models/job.model';

describe('ReportingReducer', () => {
  const mockDashboard: DashboardMetrics = {
    totalActiveJobs: 25,
    totalAvailableTechnicians: 15,
    jobsByStatus: {
      [JobStatus.NotStarted]: 5,
      [JobStatus.EnRoute]: 10,
      [JobStatus.OnSite]: 8,
      [JobStatus.Completed]: 50,
      [JobStatus.Cancelled]: 2,
      [JobStatus.Issue]: 0
    },
    averageUtilization: 75.5,
    jobsRequiringAttention: [],
    recentActivity: [],
    kpis: []
  };

  const mockUtilization: UtilizationReport = {
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    technicians: [],
    averageUtilization: 72.3
  };

  const mockPerformance: PerformanceReport = {
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    totalJobsCompleted: 50,
    totalJobsOpen: 25,
    averageLaborHours: 6.5,
    scheduleAdherence: 85.2,
    jobsByType: {
      [JobType.Install]: 20,
      [JobType.PM]: 15,
      [JobType.Decom]: 10,
      [JobType.SiteSurvey]: 5
    },
    topPerformers: []
  };

  const mockKPIs: KPI[] = [
    {
      name: 'Job Completion Rate',
      value: 85,
      target: 90,
      unit: '%',
      trend: Trend.Up,
      status: KPIStatus.AtRisk
    },
    {
      name: 'Technician Utilization',
      value: 75,
      target: 80,
      unit: '%',
      trend: Trend.Stable,
      status: KPIStatus.OnTrack
    }
  ];

  const mockDateRange = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  };

  describe('Initial State', () => {
    it('should return the initial state', () => {
      const action = { type: 'Unknown' };
      const state = reportingReducer(undefined, action);

      expect(state).toEqual(initialState);
      expect(state.dashboard).toBeNull();
      expect(state.utilization).toBeNull();
      expect(state.performance).toBeNull();
      expect(state.kpis).toEqual([]);
      expect(state.dateRange).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });
  });

  describe('Load Dashboard', () => {
    it('should set loading to true on loadDashboard', () => {
      const action = ReportingActions.loadDashboard();
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set loading to true on refreshDashboard', () => {
      const action = ReportingActions.refreshDashboard();
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should clear error on loadDashboard', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const action = ReportingActions.loadDashboard();
      const state = reportingReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });

    it('should set dashboard on loadDashboardSuccess', () => {
      const action = ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.dashboard).toEqual(mockDashboard);
    });

    it('should replace existing dashboard on loadDashboardSuccess', () => {
      const oldDashboard = { ...mockDashboard, totalActiveJobs: 10 };
      const stateWithDashboard = { ...initialState, dashboard: oldDashboard };
      const action = ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard });
      const state = reportingReducer(stateWithDashboard, action);

      expect(state.dashboard).toEqual(mockDashboard);
      expect(state.dashboard?.totalActiveJobs).toBe(25);
    });

    it('should set error on loadDashboardFailure', () => {
      const error = 'Failed to load dashboard';
      const action = ReportingActions.loadDashboardFailure({ error });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('should preserve dashboard data on loadDashboardFailure', () => {
      const stateWithDashboard = { ...initialState, dashboard: mockDashboard };
      const error = 'Failed to load dashboard';
      const action = ReportingActions.loadDashboardFailure({ error });
      const state = reportingReducer(stateWithDashboard, action);

      expect(state.dashboard).toEqual(mockDashboard);
    });
  });

  describe('Load Utilization Report', () => {
    it('should set loading to true and dateRange on loadUtilization', () => {
      const action = ReportingActions.loadUtilization({ dateRange: mockDateRange });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.dateRange).toEqual(mockDateRange);
    });

    it('should clear error on loadUtilization', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const action = ReportingActions.loadUtilization({ dateRange: mockDateRange });
      const state = reportingReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });

    it('should set utilization on loadUtilizationSuccess', () => {
      const action = ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.utilization).toEqual(mockUtilization);
    });

    it('should replace existing utilization on loadUtilizationSuccess', () => {
      const oldUtilization = { ...mockUtilization, averageUtilization: 50 };
      const stateWithUtilization = { ...initialState, utilization: oldUtilization };
      const action = ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization });
      const state = reportingReducer(stateWithUtilization, action);

      expect(state.utilization).toEqual(mockUtilization);
      expect(state.utilization?.averageUtilization).toBe(72.3);
    });

    it('should set error on loadUtilizationFailure', () => {
      const error = 'Failed to load utilization report';
      const action = ReportingActions.loadUtilizationFailure({ error });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('should preserve utilization data on loadUtilizationFailure', () => {
      const stateWithUtilization = { ...initialState, utilization: mockUtilization };
      const error = 'Failed to load utilization report';
      const action = ReportingActions.loadUtilizationFailure({ error });
      const state = reportingReducer(stateWithUtilization, action);

      expect(state.utilization).toEqual(mockUtilization);
    });
  });

  describe('Load Job Performance Report', () => {
    it('should set loading to true and dateRange on loadJobPerformance', () => {
      const action = ReportingActions.loadJobPerformance({ dateRange: mockDateRange });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
      expect(state.dateRange).toEqual(mockDateRange);
    });

    it('should clear error on loadJobPerformance', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const action = ReportingActions.loadJobPerformance({ dateRange: mockDateRange });
      const state = reportingReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });

    it('should set performance on loadJobPerformanceSuccess', () => {
      const action = ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.performance).toEqual(mockPerformance);
    });

    it('should replace existing performance on loadJobPerformanceSuccess', () => {
      const oldPerformance = { ...mockPerformance, totalJobsCompleted: 30 };
      const stateWithPerformance = { ...initialState, performance: oldPerformance };
      const action = ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance });
      const state = reportingReducer(stateWithPerformance, action);

      expect(state.performance).toEqual(mockPerformance);
      expect(state.performance?.totalJobsCompleted).toBe(50);
    });

    it('should set error on loadJobPerformanceFailure', () => {
      const error = 'Failed to load job performance report';
      const action = ReportingActions.loadJobPerformanceFailure({ error });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('should preserve performance data on loadJobPerformanceFailure', () => {
      const stateWithPerformance = { ...initialState, performance: mockPerformance };
      const error = 'Failed to load job performance report';
      const action = ReportingActions.loadJobPerformanceFailure({ error });
      const state = reportingReducer(stateWithPerformance, action);

      expect(state.performance).toEqual(mockPerformance);
    });
  });

  describe('Load KPIs', () => {
    it('should set loading to true on loadKPIs', () => {
      const action = ReportingActions.loadKPIs({});
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(true);
      expect(state.error).toBeNull();
    });

    it('should set dateRange on loadKPIs when provided', () => {
      const action = ReportingActions.loadKPIs({ dateRange: mockDateRange });
      const state = reportingReducer(initialState, action);

      expect(state.dateRange).toEqual(mockDateRange);
    });

    it('should preserve existing dateRange on loadKPIs when not provided', () => {
      const stateWithDateRange = { ...initialState, dateRange: mockDateRange };
      const action = ReportingActions.loadKPIs({});
      const state = reportingReducer(stateWithDateRange, action);

      expect(state.dateRange).toEqual(mockDateRange);
    });

    it('should clear error on loadKPIs', () => {
      const stateWithError = { ...initialState, error: 'Previous error' };
      const action = ReportingActions.loadKPIs({});
      const state = reportingReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });

    it('should set kpis on loadKPIsSuccess', () => {
      const action = ReportingActions.loadKPIsSuccess({ kpis: mockKPIs });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.kpis).toEqual(mockKPIs);
    });

    it('should replace existing kpis on loadKPIsSuccess', () => {
      const oldKPIs = [mockKPIs[0]];
      const stateWithKPIs = { ...initialState, kpis: oldKPIs };
      const action = ReportingActions.loadKPIsSuccess({ kpis: mockKPIs });
      const state = reportingReducer(stateWithKPIs, action);

      expect(state.kpis).toEqual(mockKPIs);
      expect(state.kpis.length).toBe(2);
    });

    it('should set error on loadKPIsFailure', () => {
      const error = 'Failed to load KPIs';
      const action = ReportingActions.loadKPIsFailure({ error });
      const state = reportingReducer(initialState, action);

      expect(state.loading).toBe(false);
      expect(state.error).toBe(error);
    });

    it('should preserve kpis data on loadKPIsFailure', () => {
      const stateWithKPIs = { ...initialState, kpis: mockKPIs };
      const error = 'Failed to load KPIs';
      const action = ReportingActions.loadKPIsFailure({ error });
      const state = reportingReducer(stateWithKPIs, action);

      expect(state.kpis).toEqual(mockKPIs);
    });
  });

  describe('Clear Reports', () => {
    it('should reset to initial state on clearReports', () => {
      const stateWithData = {
        dashboard: mockDashboard,
        utilization: mockUtilization,
        performance: mockPerformance,
        kpis: mockKPIs,
        dateRange: mockDateRange,
        loading: false,
        error: null
      };
      const action = ReportingActions.clearReports();
      const state = reportingReducer(stateWithData, action);

      expect(state).toEqual(initialState);
      expect(state.dashboard).toBeNull();
      expect(state.utilization).toBeNull();
      expect(state.performance).toBeNull();
      expect(state.kpis).toEqual([]);
      expect(state.dateRange).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should clear error on clearReports', () => {
      const stateWithError = { ...initialState, error: 'Some error' };
      const action = ReportingActions.clearReports();
      const state = reportingReducer(stateWithError, action);

      expect(state.error).toBeNull();
    });
  });

  describe('State Immutability', () => {
    it('should not mutate original state on loadDashboardSuccess', () => {
      const originalState = { ...initialState };
      const action = ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard });
      reportingReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should not mutate original state on loadUtilizationSuccess', () => {
      const originalState = { ...initialState };
      const action = ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization });
      reportingReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should not mutate original state on loadJobPerformanceSuccess', () => {
      const originalState = { ...initialState };
      const action = ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance });
      reportingReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });

    it('should not mutate original state on loadKPIsSuccess', () => {
      const originalState = { ...initialState };
      const action = ReportingActions.loadKPIsSuccess({ kpis: mockKPIs });
      reportingReducer(initialState, action);

      expect(initialState).toEqual(originalState);
    });
  });

  describe('Multiple Actions Sequence', () => {
    it('should handle sequence of load and success actions', () => {
      let state = reportingReducer(initialState, ReportingActions.loadDashboard());
      expect(state.loading).toBe(true);

      state = reportingReducer(state, ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard }));
      expect(state.loading).toBe(false);
      expect(state.dashboard).toEqual(mockDashboard);
    });

    it('should handle sequence of load and failure actions', () => {
      let state = reportingReducer(initialState, ReportingActions.loadUtilization({ dateRange: mockDateRange }));
      expect(state.loading).toBe(true);

      state = reportingReducer(state, ReportingActions.loadUtilizationFailure({ error: 'Error' }));
      expect(state.loading).toBe(false);
      expect(state.error).toBe('Error');
    });

    it('should handle loading multiple reports', () => {
      let state = reportingReducer(initialState, ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard }));
      expect(state.dashboard).toEqual(mockDashboard);

      state = reportingReducer(state, ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization }));
      expect(state.utilization).toEqual(mockUtilization);
      expect(state.dashboard).toEqual(mockDashboard);

      state = reportingReducer(state, ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance }));
      expect(state.performance).toEqual(mockPerformance);
      expect(state.utilization).toEqual(mockUtilization);
      expect(state.dashboard).toEqual(mockDashboard);
    });

    it('should handle refresh after initial load', () => {
      let state = reportingReducer(initialState, ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard }));
      expect(state.dashboard).toEqual(mockDashboard);

      state = reportingReducer(state, ReportingActions.refreshDashboard());
      expect(state.loading).toBe(true);

      const updatedDashboard = { ...mockDashboard, totalActiveJobs: 30 };
      state = reportingReducer(state, ReportingActions.loadDashboardSuccess({ dashboard: updatedDashboard }));
      expect(state.dashboard?.totalActiveJobs).toBe(30);
    });
  });
});
