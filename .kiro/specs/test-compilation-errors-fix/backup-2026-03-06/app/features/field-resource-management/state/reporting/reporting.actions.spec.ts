/**
 * Reporting Actions Unit Tests
 * Tests all actions for reporting state management
 */

import * as ReportingActions from './reporting.actions';
import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI, KPIStatus, Trend } from '../../models/reporting.model';
import { JobStatus, JobType, Priority } from '../../models/job.model';
import { TechnicianRole } from '../../models/technician.model';

describe('Reporting Actions', () => {
  const mockDashboard: DashboardMetrics = {
    totalActiveJobs: 25,
    totalAvailableTechnicians: 15,
    jobsByStatus: {
      [JobStatus.Pending]: 5,
      [JobStatus.Scheduled]: 10,
      [JobStatus.InProgress]: 8,
      [JobStatus.Completed]: 50,
      [JobStatus.Cancelled]: 2,
      [JobStatus.OnHold]: 0
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
      [JobType.Installation]: 20,
      [JobType.Maintenance]: 15,
      [JobType.Repair]: 10,
      [JobType.Inspection]: 5
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

  describe('Load Dashboard Actions', () => {
    it('should create loadDashboard action', () => {
      const action = ReportingActions.loadDashboard();
      expect(action.type).toBe('[Reporting] Load Dashboard');
    });

    it('should create loadDashboardSuccess action', () => {
      const action = ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard });
      expect(action.type).toBe('[Reporting] Load Dashboard Success');
      expect(action.dashboard).toEqual(mockDashboard);
    });

    it('should create loadDashboardFailure action', () => {
      const error = 'Failed to load dashboard';
      const action = ReportingActions.loadDashboardFailure({ error });
      expect(action.type).toBe('[Reporting] Load Dashboard Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Load Utilization Actions', () => {
    it('should create loadUtilization action with all parameters', () => {
      const action = ReportingActions.loadUtilization({
        dateRange: mockDateRange,
        technicianId: 'tech-123',
        role: TechnicianRole.Installer,
        region: 'DALLAS'
      });
      expect(action.type).toBe('[Reporting] Load Utilization');
      expect(action.dateRange).toEqual(mockDateRange);
      expect(action.technicianId).toBe('tech-123');
      expect(action.role).toBe(TechnicianRole.Installer);
      expect(action.region).toBe('DALLAS');
    });

    it('should create loadUtilization action with only dateRange', () => {
      const action = ReportingActions.loadUtilization({
        dateRange: mockDateRange
      });
      expect(action.type).toBe('[Reporting] Load Utilization');
      expect(action.dateRange).toEqual(mockDateRange);
      expect(action.technicianId).toBeUndefined();
      expect(action.role).toBeUndefined();
      expect(action.region).toBeUndefined();
    });

    it('should create loadUtilizationSuccess action', () => {
      const action = ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization });
      expect(action.type).toBe('[Reporting] Load Utilization Success');
      expect(action.utilization).toEqual(mockUtilization);
    });

    it('should create loadUtilizationFailure action', () => {
      const error = 'Failed to load utilization report';
      const action = ReportingActions.loadUtilizationFailure({ error });
      expect(action.type).toBe('[Reporting] Load Utilization Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Load Job Performance Actions', () => {
    it('should create loadJobPerformance action with all parameters', () => {
      const action = ReportingActions.loadJobPerformance({
        dateRange: mockDateRange,
        jobType: JobType.Installation,
        priority: Priority.High,
        client: 'ACME Corp'
      });
      expect(action.type).toBe('[Reporting] Load Job Performance');
      expect(action.dateRange).toEqual(mockDateRange);
      expect(action.jobType).toBe(JobType.Installation);
      expect(action.priority).toBe(Priority.High);
      expect(action.client).toBe('ACME Corp');
    });

    it('should create loadJobPerformance action with only dateRange', () => {
      const action = ReportingActions.loadJobPerformance({
        dateRange: mockDateRange
      });
      expect(action.type).toBe('[Reporting] Load Job Performance');
      expect(action.dateRange).toEqual(mockDateRange);
      expect(action.jobType).toBeUndefined();
      expect(action.priority).toBeUndefined();
      expect(action.client).toBeUndefined();
    });

    it('should create loadJobPerformanceSuccess action', () => {
      const action = ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance });
      expect(action.type).toBe('[Reporting] Load Job Performance Success');
      expect(action.performance).toEqual(mockPerformance);
    });

    it('should create loadJobPerformanceFailure action', () => {
      const error = 'Failed to load job performance report';
      const action = ReportingActions.loadJobPerformanceFailure({ error });
      expect(action.type).toBe('[Reporting] Load Job Performance Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Load KPIs Actions', () => {
    it('should create loadKPIs action with dateRange and markets', () => {
      const action = ReportingActions.loadKPIs({
        dateRange: mockDateRange,
        markets: ['DALLAS', 'AUSTIN']
      });
      expect(action.type).toBe('[Reporting] Load KPIs');
      expect(action.dateRange).toEqual(mockDateRange);
      expect(action.markets).toEqual(['DALLAS', 'AUSTIN']);
    });

    it('should create loadKPIs action without parameters', () => {
      const action = ReportingActions.loadKPIs({});
      expect(action.type).toBe('[Reporting] Load KPIs');
      expect(action.dateRange).toBeUndefined();
      expect(action.markets).toBeUndefined();
    });

    it('should create loadKPIsSuccess action', () => {
      const action = ReportingActions.loadKPIsSuccess({ kpis: mockKPIs });
      expect(action.type).toBe('[Reporting] Load KPIs Success');
      expect(action.kpis).toEqual(mockKPIs);
    });

    it('should create loadKPIsFailure action', () => {
      const error = 'Failed to load KPIs';
      const action = ReportingActions.loadKPIsFailure({ error });
      expect(action.type).toBe('[Reporting] Load KPIs Failure');
      expect(action.error).toBe(error);
    });
  });

  describe('Refresh Dashboard Action', () => {
    it('should create refreshDashboard action', () => {
      const action = ReportingActions.refreshDashboard();
      expect(action.type).toBe('[Reporting] Refresh Dashboard');
    });
  });

  describe('Clear Reports Action', () => {
    it('should create clearReports action', () => {
      const action = ReportingActions.clearReports();
      expect(action.type).toBe('[Reporting] Clear Reports');
    });
  });

  describe('Action Type Uniqueness', () => {
    it('should have unique action types', () => {
      const actionTypes = [
        ReportingActions.loadDashboard().type,
        ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard }).type,
        ReportingActions.loadDashboardFailure({ error: 'error' }).type,
        ReportingActions.loadUtilization({ dateRange: mockDateRange }).type,
        ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization }).type,
        ReportingActions.loadUtilizationFailure({ error: 'error' }).type,
        ReportingActions.loadJobPerformance({ dateRange: mockDateRange }).type,
        ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance }).type,
        ReportingActions.loadJobPerformanceFailure({ error: 'error' }).type,
        ReportingActions.loadKPIs({}).type,
        ReportingActions.loadKPIsSuccess({ kpis: mockKPIs }).type,
        ReportingActions.loadKPIsFailure({ error: 'error' }).type,
        ReportingActions.refreshDashboard().type,
        ReportingActions.clearReports().type
      ];

      const uniqueTypes = new Set(actionTypes);
      expect(uniqueTypes.size).toBe(actionTypes.length);
    });
  });
});
