/**
 * Reporting Effects Unit Tests
 * Tests all effects for reporting state management
 */

import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { Observable, of, throwError } from 'rxjs';
import { ReportingEffects } from './reporting.effects';
import { ReportingService } from '../../services/reporting.service';
import * as ReportingActions from './reporting.actions';
import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI, KPIStatus, Trend } from '../../models/reporting.model';
import { JobStatus, JobType, Priority } from '../../models/job.model';
import { TechnicianRole } from '../../models/technician.model';

describe('ReportingEffects', () => {
  let actions$: Observable<any>;
  let effects: ReportingEffects;
  let reportingService: jasmine.SpyObj<ReportingService>;

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

  beforeEach(() => {
    const reportingServiceSpy = jasmine.createSpyObj('ReportingService', [
      'getDashboardMetrics',
      'getTechnicianUtilization',
      'getJobPerformance',
      'getKPIs'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ReportingEffects,
        provideMockActions(() => actions$),
        { provide: ReportingService, useValue: reportingServiceSpy }
      ]
    });

    effects = TestBed.inject(ReportingEffects);
    reportingService = TestBed.inject(ReportingService) as jasmine.SpyObj<ReportingService>;
  });

  describe('loadDashboard$', () => {
    it('should return loadDashboardSuccess action on successful load', (done) => {
      const action = ReportingActions.loadDashboard();
      const outcome = ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard });

      actions$ = of(action);
      reportingService.getDashboardMetrics.and.returnValue(of(mockDashboard));

      effects.loadDashboard$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getDashboardMetrics).toHaveBeenCalled();
        done();
      });
    });

    it('should return loadDashboardFailure action on error', (done) => {
      const action = ReportingActions.loadDashboard();
      const error = new Error('Failed to load dashboard metrics');
      const outcome = ReportingActions.loadDashboardFailure({ 
        error: 'Failed to load dashboard metrics' 
      });

      actions$ = of(action);
      reportingService.getDashboardMetrics.and.returnValue(throwError(() => error));

      effects.loadDashboard$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getDashboardMetrics).toHaveBeenCalled();
        done();
      });
    });

    it('should handle refreshDashboard action', (done) => {
      const action = ReportingActions.refreshDashboard();
      const outcome = ReportingActions.loadDashboardSuccess({ dashboard: mockDashboard });

      actions$ = of(action);
      reportingService.getDashboardMetrics.and.returnValue(of(mockDashboard));

      effects.loadDashboard$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getDashboardMetrics).toHaveBeenCalled();
        done();
      });
    });

    it('should handle error without message', (done) => {
      const action = ReportingActions.loadDashboard();
      const error = new Error();
      const outcome = ReportingActions.loadDashboardFailure({ 
        error: 'Failed to load dashboard metrics' 
      });

      actions$ = of(action);
      reportingService.getDashboardMetrics.and.returnValue(throwError(() => error));

      effects.loadDashboard$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle network errors', (done) => {
      const action = ReportingActions.loadDashboard();
      const error = new Error('Network error');
      const outcome = ReportingActions.loadDashboardFailure({ 
        error: 'Network error' 
      });

      actions$ = of(action);
      reportingService.getDashboardMetrics.and.returnValue(throwError(() => error));

      effects.loadDashboard$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadUtilization$', () => {
    it('should return loadUtilizationSuccess action on successful load', (done) => {
      const action = ReportingActions.loadUtilization({ 
        dateRange: mockDateRange 
      });
      const outcome = ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization });

      actions$ = of(action);
      reportingService.getTechnicianUtilization.and.returnValue(of(mockUtilization));

      effects.loadUtilization$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getTechnicianUtilization).toHaveBeenCalledWith({
          dateRange: mockDateRange,
          technicianId: undefined,
          role: undefined,
          region: undefined
        });
        done();
      });
    });

    it('should pass all parameters to service', (done) => {
      const action = ReportingActions.loadUtilization({ 
        dateRange: mockDateRange,
        technicianId: 'tech-123',
        role: TechnicianRole.Installer,
        region: 'DALLAS'
      });
      const outcome = ReportingActions.loadUtilizationSuccess({ utilization: mockUtilization });

      actions$ = of(action);
      reportingService.getTechnicianUtilization.and.returnValue(of(mockUtilization));

      effects.loadUtilization$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getTechnicianUtilization).toHaveBeenCalledWith({
          dateRange: mockDateRange,
          technicianId: 'tech-123',
          role: TechnicianRole.Installer,
          region: 'DALLAS'
        });
        done();
      });
    });

    it('should return loadUtilizationFailure action on error', (done) => {
      const action = ReportingActions.loadUtilization({ 
        dateRange: mockDateRange 
      });
      const error = new Error('Failed to load utilization report');
      const outcome = ReportingActions.loadUtilizationFailure({ 
        error: 'Failed to load utilization report' 
      });

      actions$ = of(action);
      reportingService.getTechnicianUtilization.and.returnValue(throwError(() => error));

      effects.loadUtilization$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getTechnicianUtilization).toHaveBeenCalled();
        done();
      });
    });

    it('should handle error without message', (done) => {
      const action = ReportingActions.loadUtilization({ 
        dateRange: mockDateRange 
      });
      const error = new Error();
      const outcome = ReportingActions.loadUtilizationFailure({ 
        error: 'Failed to load utilization report' 
      });

      actions$ = of(action);
      reportingService.getTechnicianUtilization.and.returnValue(throwError(() => error));

      effects.loadUtilization$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle permission errors', (done) => {
      const action = ReportingActions.loadUtilization({ 
        dateRange: mockDateRange 
      });
      const error = new Error('Access denied. You do not have permission to perform this action.');
      const outcome = ReportingActions.loadUtilizationFailure({ 
        error: 'Access denied. You do not have permission to perform this action.' 
      });

      actions$ = of(action);
      reportingService.getTechnicianUtilization.and.returnValue(throwError(() => error));

      effects.loadUtilization$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadJobPerformance$', () => {
    it('should return loadJobPerformanceSuccess action on successful load', (done) => {
      const action = ReportingActions.loadJobPerformance({ 
        dateRange: mockDateRange 
      });
      const outcome = ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance });

      actions$ = of(action);
      reportingService.getJobPerformance.and.returnValue(of(mockPerformance));

      effects.loadJobPerformance$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getJobPerformance).toHaveBeenCalledWith({
          dateRange: mockDateRange,
          jobType: undefined,
          priority: undefined,
          client: undefined
        });
        done();
      });
    });

    it('should pass all parameters to service', (done) => {
      const action = ReportingActions.loadJobPerformance({ 
        dateRange: mockDateRange,
        jobType: JobType.Install,
        priority: Priority.P1,
        client: 'ACME Corp'
      });
      const outcome = ReportingActions.loadJobPerformanceSuccess({ performance: mockPerformance });

      actions$ = of(action);
      reportingService.getJobPerformance.and.returnValue(of(mockPerformance));

      effects.loadJobPerformance$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getJobPerformance).toHaveBeenCalledWith({
          dateRange: mockDateRange,
          jobType: JobType.Install,
          priority: Priority.P1,
          client: 'ACME Corp'
        });
        done();
      });
    });

    it('should return loadJobPerformanceFailure action on error', (done) => {
      const action = ReportingActions.loadJobPerformance({ 
        dateRange: mockDateRange 
      });
      const error = new Error('Failed to load job performance report');
      const outcome = ReportingActions.loadJobPerformanceFailure({ 
        error: 'Failed to load job performance report' 
      });

      actions$ = of(action);
      reportingService.getJobPerformance.and.returnValue(throwError(() => error));

      effects.loadJobPerformance$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getJobPerformance).toHaveBeenCalled();
        done();
      });
    });

    it('should handle error without message', (done) => {
      const action = ReportingActions.loadJobPerformance({ 
        dateRange: mockDateRange 
      });
      const error = new Error();
      const outcome = ReportingActions.loadJobPerformanceFailure({ 
        error: 'Failed to load job performance report' 
      });

      actions$ = of(action);
      reportingService.getJobPerformance.and.returnValue(throwError(() => error));

      effects.loadJobPerformance$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle validation errors', (done) => {
      const action = ReportingActions.loadJobPerformance({ 
        dateRange: mockDateRange 
      });
      const error = new Error('Invalid date range');
      const outcome = ReportingActions.loadJobPerformanceFailure({ 
        error: 'Invalid date range' 
      });

      actions$ = of(action);
      reportingService.getJobPerformance.and.returnValue(throwError(() => error));

      effects.loadJobPerformance$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('loadKPIs$', () => {
    it('should return loadKPIsSuccess action on successful load', (done) => {
      const action = ReportingActions.loadKPIs({});
      const outcome = ReportingActions.loadKPIsSuccess({ kpis: mockKPIs });

      actions$ = of(action);
      reportingService.getKPIs.and.returnValue(of(mockKPIs));

      effects.loadKPIs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getKPIs).toHaveBeenCalled();
        done();
      });
    });

    it('should return loadKPIsFailure action on error', (done) => {
      const action = ReportingActions.loadKPIs({});
      const error = new Error('Failed to load KPIs');
      const outcome = ReportingActions.loadKPIsFailure({ 
        error: 'Failed to load KPIs' 
      });

      actions$ = of(action);
      reportingService.getKPIs.and.returnValue(throwError(() => error));

      effects.loadKPIs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(reportingService.getKPIs).toHaveBeenCalled();
        done();
      });
    });

    it('should handle error without message', (done) => {
      const action = ReportingActions.loadKPIs({});
      const error = new Error();
      const outcome = ReportingActions.loadKPIsFailure({ 
        error: 'Failed to load KPIs' 
      });

      actions$ = of(action);
      reportingService.getKPIs.and.returnValue(throwError(() => error));

      effects.loadKPIs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle empty KPIs array', (done) => {
      const action = ReportingActions.loadKPIs({});
      const outcome = ReportingActions.loadKPIsSuccess({ kpis: [] });

      actions$ = of(action);
      reportingService.getKPIs.and.returnValue(of([]));

      effects.loadKPIs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        expect(result.kpis.length).toBe(0);
        done();
      });
    });

    it('should handle network errors', (done) => {
      const action = ReportingActions.loadKPIs({});
      const error = new Error('Network error');
      const outcome = ReportingActions.loadKPIsFailure({ 
        error: 'Network error' 
      });

      actions$ = of(action);
      reportingService.getKPIs.and.returnValue(throwError(() => error));

      effects.loadKPIs$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });

  describe('logErrors$', () => {
    it('should log dashboard errors without dispatching actions', (done) => {
      spyOn(console, 'error');
      const error = 'Dashboard error';
      const action = ReportingActions.loadDashboardFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Reporting Effect Error:', error);
        done();
      });
    });

    it('should log utilization errors', (done) => {
      spyOn(console, 'error');
      const error = 'Utilization error';
      const action = ReportingActions.loadUtilizationFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Reporting Effect Error:', error);
        done();
      });
    });

    it('should log job performance errors', (done) => {
      spyOn(console, 'error');
      const error = 'Performance error';
      const action = ReportingActions.loadJobPerformanceFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Reporting Effect Error:', error);
        done();
      });
    });

    it('should log KPI errors', (done) => {
      spyOn(console, 'error');
      const error = 'KPI error';
      const action = ReportingActions.loadKPIsFailure({ error });

      actions$ = of(action);

      effects.logErrors$.subscribe(() => {
        expect(console.error).toHaveBeenCalledWith('Reporting Effect Error:', error);
        done();
      });
    });
  });

  describe('Multiple Effects Sequence', () => {
    it('should handle multiple dashboard loads', (done) => {
      const action1 = ReportingActions.loadDashboard();
      const action2 = ReportingActions.refreshDashboard();

      actions$ = of(action1, action2);
      reportingService.getDashboardMetrics.and.returnValue(of(mockDashboard));

      const results: any[] = [];
      effects.loadDashboard$.subscribe((result) => {
        results.push(result);
        if (results.length === 2) {
          expect(results[0].type).toBe('[Reporting] Load Dashboard Success');
          expect(results[1].type).toBe('[Reporting] Load Dashboard Success');
          expect(reportingService.getDashboardMetrics).toHaveBeenCalledTimes(2);
          done();
        }
      });
    });

    it('should handle concurrent report loads', (done) => {
      const dashboardAction = ReportingActions.loadDashboard();
      const utilizationAction = ReportingActions.loadUtilization({ dateRange: mockDateRange });

      reportingService.getDashboardMetrics.and.returnValue(of(mockDashboard));
      reportingService.getTechnicianUtilization.and.returnValue(of(mockUtilization));

      // Test dashboard effect
      actions$ = of(dashboardAction);
      effects.loadDashboard$.subscribe((result) => {
        expect(result.type).toBe('[Reporting] Load Dashboard Success');
      });

      // Test utilization effect
      actions$ = of(utilizationAction);
      effects.loadUtilization$.subscribe((result) => {
        expect(result.type).toBe('[Reporting] Load Utilization Success');
        done();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null dashboard response', (done) => {
      const action = ReportingActions.loadDashboard();
      const outcome = ReportingActions.loadDashboardSuccess({ dashboard: null as any });

      actions$ = of(action);
      reportingService.getDashboardMetrics.and.returnValue(of(null as any));

      effects.loadDashboard$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle undefined error message', (done) => {
      const action = ReportingActions.loadUtilization({ dateRange: mockDateRange });
      const error = { message: undefined } as any;
      const outcome = ReportingActions.loadUtilizationFailure({ 
        error: 'Failed to load utilization report' 
      });

      actions$ = of(action);
      reportingService.getTechnicianUtilization.and.returnValue(throwError(() => error));

      effects.loadUtilization$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });

    it('should handle timeout errors', (done) => {
      const action = ReportingActions.loadJobPerformance({ dateRange: mockDateRange });
      const error = new Error('Request timeout');
      const outcome = ReportingActions.loadJobPerformanceFailure({ 
        error: 'Request timeout' 
      });

      actions$ = of(action);
      reportingService.getJobPerformance.and.returnValue(throwError(() => error));

      effects.loadJobPerformance$.subscribe((result) => {
        expect(result).toEqual(outcome);
        done();
      });
    });
  });
});
