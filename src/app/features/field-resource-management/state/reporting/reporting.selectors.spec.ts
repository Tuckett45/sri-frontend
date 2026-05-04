/**
 * Reporting Selectors Unit Tests
 * Tests all selectors for reporting state management
 */

import * as fromReportingSelectors from './reporting.selectors';
import { ReportingState } from './reporting.state';
import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI, KPIStatus, Trend, TechnicianUtilization, TechnicianPerformance } from '../../models/reporting.model';
import { JobStatus, JobType, Job } from '../../models/job.model';
import { Technician, TechnicianRole } from '../../models/technician.model';
import { User } from '../../../../models/user.model';
import { DataScope } from '../../services/data-scope.service';

describe('Reporting Selectors', () => {
  const mockTechnician1: Technician = {
    id: 'tech-1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
    phone: '555-0001',
    role: TechnicianRole.Installer,
    region: 'DALLAS',
    skills: [],
    certifications: [],
    availability: [],
    createdAt: new Date(),
    company: 'TEST_COMPANY',    updatedAt: new Date()
  };

  const mockTechnician2: Technician = {
    id: 'tech-2',
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane@example.com',
    phone: '555-0002',
    role: TechnicianRole.Installer,
    region: 'AUSTIN',
    skills: [],
    certifications: [],
    availability: [],
    createdAt: new Date(),
    company: 'TEST_COMPANY',    updatedAt: new Date()
  };

  const mockJob1: Job = {
    id: 'job-1',
    siteName: 'Installation Job',
    scopeDescription: 'Install equipment',
    status: JobStatus.NotStarted,
    priority: 'High' as any,
    company: 'ACME_CORP',
    location: {
      address: '123 Main St',
      city: 'Dallas',
      state: 'TX',
      zipCode: '75001',
      coordinates: { latitude: 32.7767, longitude: -96.7970, accuracy: 10 }
    },
    scheduledStartDate: new Date('2024-01-15'),
    scheduledEnd: new Date('2024-01-15'),
    requiredSkills: [],
    assignedTechnicians: [],
    estimatedHours: 4,
    notes: [],
    createdBy: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockTechUtilization1: TechnicianUtilization = {
    technician: mockTechnician1,
    availableHours: 160,
    workedHours: 120,
    utilizationRate: 75,
    jobsCompleted: 10
  };

  const mockTechUtilization2: TechnicianUtilization = {
    technician: mockTechnician2,
    availableHours: 160,
    workedHours: 80,
    utilizationRate: 50,
    jobsCompleted: 5
  };

  const mockTechPerformance1: TechnicianPerformance = {
    technician: mockTechnician1,
    jobsCompleted: 10,
    totalHours: 120,
    averageJobDuration: 12,
    onTimeCompletionRate: 90
  };

  const mockTechPerformance2: TechnicianPerformance = {
    technician: mockTechnician2,
    jobsCompleted: 5,
    totalHours: 80,
    averageJobDuration: 16,
    onTimeCompletionRate: 80
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
      value: 92,
      target: 80,
      unit: '%',
      trend: Trend.Stable,
      status: KPIStatus.OnTrack
    },
    {
      name: 'Schedule Adherence',
      value: 70,
      target: 85,
      unit: '%',
      trend: Trend.Down,
      status: KPIStatus.BelowTarget
    }
  ];

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
    jobsRequiringAttention: [mockJob1],
    recentActivity: [
      {
        id: 'activity-1',
        type: 'job_created',
        description: 'New job created',
        timestamp: new Date('2024-01-15T10:00:00'),
        userId: 'user-1'
      }
    ],
    kpis: mockKPIs
  };

  const mockUtilization: UtilizationReport = {
    dateRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    technicians: [mockTechUtilization1, mockTechUtilization2],
    averageUtilization: 62.5
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
    topPerformers: [mockTechPerformance1, mockTechPerformance2]
  };

  const mockDateRange = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  };

  const mockAdminUser: User = {
    id: 'user-admin',
    email: 'admin@example.com',
    role: 'Admin',
    market: 'ALL',
    company: 'INTERNAL',
    name: 'Admin User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const mockCMUser: User = {
    id: 'user-cm',
    email: 'cm@example.com',
    role: 'ConstructionManager',
    company: 'INTERNAL',
    name: 'CM User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const mockPMUser: User = {
    id: 'user-pm',
    email: 'pm@example.com',
    role: 'ProjectManager',
    company: 'ACME_CORP',
    name: 'PM User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const mockTechUser: User = {
    id: 'tech-1',
    email: 'tech@example.com',
    role: 'Technician',
    company: 'ACME_CORP',
    name: 'Tech User',
    password: 'password123',
    createdDate: new Date(),
    isApproved: true
  };

  const adminDataScopes: DataScope[] = [{ scopeType: 'all', scopeValues: [] }];
  const cmDataScopes: DataScope[] = [{ scopeType: 'market', scopeValues: ['DALLAS'] }];
  const pmDataScopes: DataScope[] = [{ scopeType: 'company', scopeValues: ['ACME_CORP'] }];
  const techDataScopes: DataScope[] = [{ scopeType: 'self', scopeValues: ['tech-1'] }];

  let initialState: ReportingState;

  beforeEach(() => {
    initialState = {
      dashboard: mockDashboard,
      utilization: mockUtilization,
      performance: mockPerformance,
      kpis: mockKPIs,
      dateRange: mockDateRange,
      loading: false,
      error: null
    };
  });

  describe('Basic Selectors', () => {
    it('should select dashboard', () => {
      const result = fromReportingSelectors.selectDashboard.projector(initialState);
      expect(result).toEqual(mockDashboard);
    });

    it('should select utilization report', () => {
      const result = fromReportingSelectors.selectUtilizationReport.projector(initialState);
      expect(result).toEqual(mockUtilization);
    });

    it('should select performance report', () => {
      const result = fromReportingSelectors.selectPerformanceReport.projector(initialState);
      expect(result).toEqual(mockPerformance);
    });

    it('should select KPIs', () => {
      const result = fromReportingSelectors.selectKPIs.projector(initialState);
      expect(result).toEqual(mockKPIs);
    });

    it('should select loading state', () => {
      const result = fromReportingSelectors.selectReportingLoading.projector(initialState);
      expect(result).toBe(false);
    });

    it('should select error state', () => {
      const result = fromReportingSelectors.selectReportingError.projector(initialState);
      expect(result).toBeNull();
    });

    it('should select date range', () => {
      const result = fromReportingSelectors.selectDateRange.projector(initialState);
      expect(result).toEqual(mockDateRange);
    });
  });

  describe('Dashboard Selectors', () => {
    it('should select total active jobs', () => {
      const result = fromReportingSelectors.selectTotalActiveJobs.projector(mockDashboard);
      expect(result).toBe(25);
    });

    it('should return 0 when dashboard is null', () => {
      const result = fromReportingSelectors.selectTotalActiveJobs.projector(null);
      expect(result).toBe(0);
    });

    it('should select total available technicians', () => {
      const result = fromReportingSelectors.selectTotalAvailableTechnicians.projector(mockDashboard);
      expect(result).toBe(15);
    });

    it('should select jobs by status', () => {
      const result = fromReportingSelectors.selectJobsByStatus.projector(mockDashboard);
      expect(result).toEqual(mockDashboard.jobsByStatus);
    });

    it('should select average utilization', () => {
      const result = fromReportingSelectors.selectAverageUtilization.projector(mockDashboard);
      expect(result).toBe(75.5);
    });

    it('should select jobs requiring attention', () => {
      const result = fromReportingSelectors.selectJobsRequiringAttention.projector(mockDashboard);
      expect(result).toEqual([mockJob1]);
    });

    it('should select recent activity', () => {
      const result = fromReportingSelectors.selectRecentActivity.projector(mockDashboard);
      expect(result.length).toBe(1);
    });

    it('should select dashboard KPIs', () => {
      const result = fromReportingSelectors.selectDashboardKPIs.projector(mockDashboard);
      expect(result).toEqual(mockKPIs);
    });

    it('should select jobs requiring attention count', () => {
      const result = fromReportingSelectors.selectJobsRequiringAttentionCount.projector([mockJob1]);
      expect(result).toBe(1);
    });
  });

  describe('Utilization Report Selectors', () => {
    it('should select utilization technicians', () => {
      const result = fromReportingSelectors.selectUtilizationTechnicians.projector(mockUtilization);
      expect(result).toEqual([mockTechUtilization1, mockTechUtilization2]);
    });

    it('should select utilization average', () => {
      const result = fromReportingSelectors.selectUtilizationAverage.projector(mockUtilization);
      expect(result).toBe(62.5);
    });

    it('should select utilization date range', () => {
      const result = fromReportingSelectors.selectUtilizationDateRange.projector(mockUtilization);
      expect(result).toEqual(mockDateRange);
    });

    it('should return empty array when utilization is null', () => {
      const result = fromReportingSelectors.selectUtilizationTechnicians.projector(null);
      expect(result).toEqual([]);
    });
  });

  describe('Performance Report Selectors', () => {
    it('should select total jobs completed', () => {
      const result = fromReportingSelectors.selectTotalJobsCompleted.projector(mockPerformance);
      expect(result).toBe(50);
    });

    it('should select total jobs open', () => {
      const result = fromReportingSelectors.selectTotalJobsOpen.projector(mockPerformance);
      expect(result).toBe(25);
    });

    it('should select average labor hours', () => {
      const result = fromReportingSelectors.selectAverageLaborHours.projector(mockPerformance);
      expect(result).toBe(6.5);
    });

    it('should select schedule adherence', () => {
      const result = fromReportingSelectors.selectScheduleAdherence.projector(mockPerformance);
      expect(result).toBe(85.2);
    });

    it('should select jobs by type', () => {
      const result = fromReportingSelectors.selectJobsByType.projector(mockPerformance);
      expect(result).toEqual(mockPerformance.jobsByType);
    });

    it('should select top performers', () => {
      const result = fromReportingSelectors.selectTopPerformers.projector(mockPerformance);
      expect(result).toEqual([mockTechPerformance1, mockTechPerformance2]);
    });

    it('should select performance date range', () => {
      const result = fromReportingSelectors.selectPerformanceDateRange.projector(mockPerformance);
      expect(result).toEqual(mockDateRange);
    });
  });

  describe('KPI Selectors', () => {
    it('should select KPI by name', () => {
      const result = fromReportingSelectors.selectKPIByName('Job Completion Rate').projector(mockKPIs);
      expect(result).toEqual(mockKPIs[0]);
    });

    it('should return undefined for non-existent KPI', () => {
      const result = fromReportingSelectors.selectKPIByName('Non-existent').projector(mockKPIs);
      expect(result).toBeUndefined();
    });

    it('should select KPIs on track', () => {
      const result = fromReportingSelectors.selectKPIsOnTrack.projector(mockKPIs);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Technician Utilization');
    });

    it('should select KPIs at risk', () => {
      const result = fromReportingSelectors.selectKPIsAtRisk.projector(mockKPIs);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Job Completion Rate');
    });

    it('should select KPIs below target', () => {
      const result = fromReportingSelectors.selectKPIsBelowTarget.projector(mockKPIs);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Schedule Adherence');
    });

    it('should select KPIs count', () => {
      const result = fromReportingSelectors.selectKPIsCount.projector(mockKPIs);
      expect(result).toBe(3);
    });
  });

  describe('Computed Selectors', () => {
    it('should calculate job completion rate', () => {
      const result = fromReportingSelectors.selectJobCompletionRate.projector(50, 25);
      expect(result).toBeCloseTo(66.67, 2);
    });

    it('should return 0 when no jobs', () => {
      const result = fromReportingSelectors.selectJobCompletionRate.projector(0, 0);
      expect(result).toBe(0);
    });

    it('should check if has reports', () => {
      const result = fromReportingSelectors.selectHasReports.projector(mockDashboard, mockUtilization, mockPerformance);
      expect(result).toBe(true);
    });

    it('should return false when no reports', () => {
      const result = fromReportingSelectors.selectHasReports.projector(null, null, null);
      expect(result).toBe(false);
    });

    it('should calculate total utilization hours', () => {
      const technicians = [mockTechUtilization1, mockTechUtilization2];
      const result = fromReportingSelectors.selectTotalUtilizationHours.projector(technicians);
      expect(result).toBe(200);
    });

    it('should calculate total available hours', () => {
      const technicians = [mockTechUtilization1, mockTechUtilization2];
      const result = fromReportingSelectors.selectTotalAvailableHours.projector(technicians);
      expect(result).toBe(320);
    });

    it('should calculate overall utilization rate', () => {
      const result = fromReportingSelectors.selectOverallUtilizationRate.projector(200, 320);
      expect(result).toBe(62.5);
    });

    it('should return 0 when no available hours', () => {
      const result = fromReportingSelectors.selectOverallUtilizationRate.projector(100, 0);
      expect(result).toBe(0);
    });
  });

  describe('Utilization Distribution Selectors', () => {
    it('should select underutilized technicians', () => {
      const technicians = [mockTechUtilization1, mockTechUtilization2];
      const result = fromReportingSelectors.selectUnderutilizedTechnicians.projector(technicians);
      expect(result.length).toBe(1);
      expect(result[0].technician.id).toBe('tech-2');
    });

    it('should select overutilized technicians', () => {
      const overutilizedTech: TechnicianUtilization = {
        ...mockTechUtilization1,
        utilizationRate: 95
      };
      const technicians = [overutilizedTech, mockTechUtilization2];
      const result = fromReportingSelectors.selectOverutilizedTechnicians.projector(technicians);
      expect(result.length).toBe(1);
      expect(result[0].utilizationRate).toBe(95);
    });

    it('should select optimally utilized technicians', () => {
      const technicians = [mockTechUtilization1, mockTechUtilization2];
      const result = fromReportingSelectors.selectOptimallyUtilizedTechnicians.projector(technicians);
      expect(result.length).toBe(1);
      expect(result[0].technician.id).toBe('tech-1');
    });

    it('should calculate utilization distribution', () => {
      const under = [mockTechUtilization2];
      const optimal = [mockTechUtilization1];
      const over: TechnicianUtilization[] = [];
      const result = fromReportingSelectors.selectUtilizationDistribution.projector(under, optimal, over);
      expect(result.underutilized).toBe(1);
      expect(result.optimal).toBe(1);
      expect(result.overutilized).toBe(0);
      expect(result.total).toBe(2);
    });
  });

  describe('Top Performers Selectors', () => {
    it('should select top performers by jobs completed', () => {
      const performers = [mockTechPerformance1, mockTechPerformance2];
      const result = fromReportingSelectors.selectTopPerformersByJobsCompleted(5).projector(performers);
      expect(result[0].jobsCompleted).toBe(10);
      expect(result[1].jobsCompleted).toBe(5);
    });

    it('should limit results to specified count', () => {
      const performers = [mockTechPerformance1, mockTechPerformance2];
      const result = fromReportingSelectors.selectTopPerformersByJobsCompleted(1).projector(performers);
      expect(result.length).toBe(1);
    });

    it('should select top performers by on-time rate', () => {
      const performers = [mockTechPerformance1, mockTechPerformance2];
      const result = fromReportingSelectors.selectTopPerformersByOnTimeRate(5).projector(performers);
      expect(result[0].onTimeCompletionRate).toBe(90);
      expect(result[1].onTimeCompletionRate).toBe(80);
    });

    it('should calculate average on-time completion rate', () => {
      const performers = [mockTechPerformance1, mockTechPerformance2];
      const result = fromReportingSelectors.selectAverageOnTimeCompletionRate.projector(performers);
      expect(result).toBe(85);
    });

    it('should return 0 when no performers', () => {
      const result = fromReportingSelectors.selectAverageOnTimeCompletionRate.projector([]);
      expect(result).toBe(0);
    });
  });

  describe('Job Statistics Selectors', () => {
    it('should calculate total jobs', () => {
      const result = fromReportingSelectors.selectTotalJobs.projector(50, 25);
      expect(result).toBe(75);
    });

    it('should calculate job completion percentage', () => {
      const result = fromReportingSelectors.selectJobCompletionPercentage.projector(50, 75);
      expect(result).toBeCloseTo(66.67, 2);
    });

    it('should return 0 when no total jobs', () => {
      const result = fromReportingSelectors.selectJobCompletionPercentage.projector(0, 0);
      expect(result).toBe(0);
    });

    it('should select jobs by type as array', () => {
      const jobsByType = mockPerformance.jobsByType;
      const result = fromReportingSelectors.selectJobsByTypeArray.projector(jobsByType);
      expect(result.length).toBe(4);
      expect(result[0].type).toBe(JobType.Install);
      expect(result[0].count).toBe(20);
    });
  });

  describe('KPI Summary Selectors', () => {
    it('should calculate KPI summary', () => {
      const result = fromReportingSelectors.selectKPISummary.projector(mockKPIs);
      expect(result.total).toBe(3);
      expect(result.onTrack).toBe(1);
      expect(result.atRisk).toBe(1);
      expect(result.belowTarget).toBe(1);
      expect(result.onTrackPercentage).toBeCloseTo(33.33, 2);
      expect(result.atRiskPercentage).toBeCloseTo(33.33, 2);
      expect(result.belowTargetPercentage).toBeCloseTo(33.33, 2);
    });

    it('should handle empty KPIs array', () => {
      const result = fromReportingSelectors.selectKPISummary.projector([]);
      expect(result.total).toBe(0);
      expect(result.onTrackPercentage).toBe(0);
    });

    it('should calculate average KPI achievement', () => {
      const result = fromReportingSelectors.selectAverageKPIAchievement.projector(mockKPIs);
      expect(result).toBeCloseTo(96.11, 2);
    });

    it('should select KPIs below threshold', () => {
      const result = fromReportingSelectors.selectKPIsBelowThreshold.projector(mockKPIs);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Schedule Adherence');
    });

    it('should select KPIs exceeding target', () => {
      const result = fromReportingSelectors.selectKPIsExceedingTarget.projector(mockKPIs);
      expect(result.length).toBe(1);
      expect(result[0].name).toBe('Technician Utilization');
    });
  });

  describe('Technician Efficiency Selectors', () => {
    it('should calculate technician efficiency scores', () => {
      const technicians = [mockTechUtilization1, mockTechUtilization2];
      const result = fromReportingSelectors.selectTechnicianEfficiencyScores.projector(technicians);
      expect(result.length).toBe(2);
      expect(result[0].efficiencyScore).toBeCloseTo(0.0833, 4);
      expect(result[1].efficiencyScore).toBe(0.0625);
    });

    it('should sort by efficiency score descending', () => {
      const technicians = [mockTechUtilization1, mockTechUtilization2];
      const result = fromReportingSelectors.selectTechnicianEfficiencyScores.projector(technicians);
      expect(result[0].efficiencyScore).toBeGreaterThan(result[1].efficiencyScore);
    });

    it('should select most efficient technician', () => {
      const scores = [
        { technicianId: 'tech-1', technicianName: 'John Doe', efficiencyScore: 0.1, jobsCompleted: 10, workedHours: 100 },
        { technicianId: 'tech-2', technicianName: 'Jane Smith', efficiencyScore: 0.05, jobsCompleted: 5, workedHours: 100 }
      ];
      const result = fromReportingSelectors.selectMostEfficientTechnician.projector(scores);
      expect(result?.technicianId).toBe('tech-1');
    });

    it('should return null when no scores', () => {
      const result = fromReportingSelectors.selectMostEfficientTechnician.projector([]);
      expect(result).toBeNull();
    });

    it('should calculate average job duration', () => {
      const performers = [mockTechPerformance1, mockTechPerformance2];
      const result = fromReportingSelectors.selectAverageJobDuration.projector(performers);
      expect(result).toBe(14);
    });
  });

  describe('Activity Selectors', () => {
    it('should count activity by type', () => {
      const activities = [
        { id: '1', type: 'job_created', description: 'Job created', timestamp: new Date(), userId: 'user-1' },
        { id: '2', type: 'job_created', description: 'Job created', timestamp: new Date(), userId: 'user-1' },
        { id: '3', type: 'job_completed', description: 'Job completed', timestamp: new Date(), userId: 'user-1' }
      ];
      const result = fromReportingSelectors.selectActivityCountByType.projector(activities);
      expect(result['job_created']).toBe(2);
      expect(result['job_completed']).toBe(1);
    });

    it('should sort recent activity by timestamp', () => {
      const activities = [
        { id: '1', type: 'job_created', description: 'Job 1', timestamp: new Date('2024-01-15T10:00:00'), userId: 'user-1' },
        { id: '2', type: 'job_created', description: 'Job 2', timestamp: new Date('2024-01-15T12:00:00'), userId: 'user-1' },
        { id: '3', type: 'job_completed', description: 'Job 3', timestamp: new Date('2024-01-15T11:00:00'), userId: 'user-1' }
      ];
      const result = fromReportingSelectors.selectRecentActivitySorted.projector(activities);
      expect(result[0].id).toBe('2');
      expect(result[1].id).toBe('3');
      expect(result[2].id).toBe('1');
    });
  });

  describe('Capacity Metrics Selectors', () => {
    it('should calculate capacity metrics', () => {
      const result = fromReportingSelectors.selectCapacityMetrics.projector(15, 25, 75.5);
      expect(result.availableTechnicians).toBe(15);
      expect(result.activeJobs).toBe(25);
      expect(result.averageUtilization).toBe(75.5);
      expect(result.techsPerJob).toBe(0.6);
      expect(result.hasCapacity).toBe(true);
    });

    it('should indicate no capacity when utilization is high', () => {
      const result = fromReportingSelectors.selectCapacityMetrics.projector(15, 25, 90);
      expect(result.hasCapacity).toBe(false);
    });

    it('should handle zero active jobs', () => {
      const result = fromReportingSelectors.selectCapacityMetrics.projector(15, 0, 50);
      expect(result.techsPerJob).toBe(0);
    });
  });

  describe('Performance Trends Selectors', () => {
    it('should calculate performance trends with good status', () => {
      const result = fromReportingSelectors.selectPerformanceTrends.projector(92, 91, 85);
      expect(result.scheduleAdherence.status).toBe('good');
      expect(result.onTimeCompletion.status).toBe('good');
      expect(result.jobCompletion.status).toBe('good');
    });

    it('should calculate performance trends with warning status', () => {
      const result = fromReportingSelectors.selectPerformanceTrends.projector(80, 80, 70);
      expect(result.scheduleAdherence.status).toBe('warning');
      expect(result.onTimeCompletion.status).toBe('warning');
      expect(result.jobCompletion.status).toBe('warning');
    });

    it('should calculate performance trends with critical status', () => {
      const result = fromReportingSelectors.selectPerformanceTrends.projector(70, 70, 50);
      expect(result.scheduleAdherence.status).toBe('critical');
      expect(result.onTimeCompletion.status).toBe('critical');
      expect(result.jobCompletion.status).toBe('critical');
    });
  });

  describe('Reports Stale Selector', () => {
    it('should return true when no reports', () => {
      const result = fromReportingSelectors.selectReportsAreStale.projector(null, false);
      expect(result).toBe(true);
    });

    it('should return true when no date range', () => {
      const result = fromReportingSelectors.selectReportsAreStale.projector(null, true);
      expect(result).toBe(true);
    });

    it('should return true when date range is old', () => {
      const oldDateRange = {
        startDate: new Date('2023-01-01'),
        endDate: new Date('2023-01-31')
      };
      const result = fromReportingSelectors.selectReportsAreStale.projector(oldDateRange, true);
      expect(result).toBe(true);
    });

    it('should return false when date range is recent', () => {
      const recentDateRange = {
        startDate: new Date(),
        endDate: new Date()
      };
      const result = fromReportingSelectors.selectReportsAreStale.projector(recentDateRange, true);
      expect(result).toBe(false);
    });
  });

  describe('Scope-Filtered Selectors', () => {
    describe('Admin Scope (all)', () => {
      it('should return all data for admin in dashboard', () => {
        const result = fromReportingSelectors.selectScopedDashboard(mockAdminUser, adminDataScopes).projector(mockDashboard);
        expect(result?.jobsRequiringAttention.length).toBe(1);
      });

      it('should return all technicians for admin in utilization', () => {
        const result = fromReportingSelectors.selectScopedUtilizationReport(mockAdminUser, adminDataScopes).projector(mockUtilization);
        expect(result?.technicians.length).toBe(2);
      });

      it('should return all performers for admin in performance', () => {
        const result = fromReportingSelectors.selectScopedPerformanceReport(mockAdminUser, adminDataScopes).projector(mockPerformance);
        expect(result?.topPerformers.length).toBe(2);
      });
    });

    describe('CM Scope (market)', () => {
      it('should filter dashboard jobs by market for CM', () => {
        const result = fromReportingSelectors.selectScopedDashboard(mockCMUser, cmDataScopes).projector(mockDashboard);
        expect(result?.jobsRequiringAttention.length).toBe(1);
        expect(result?.jobsRequiringAttention[0].market).toBe('DALLAS');
      });

      it('should filter utilization technicians by market for CM', () => {
        const result = fromReportingSelectors.selectScopedUtilizationReport(mockCMUser, cmDataScopes).projector(mockUtilization);
        expect(result?.technicians.length).toBe(1);
        expect(result?.technicians[0].technician.region).toBe('DALLAS');
      });

      it('should recalculate average utilization for filtered technicians', () => {
        const result = fromReportingSelectors.selectScopedUtilizationReport(mockCMUser, cmDataScopes).projector(mockUtilization);
        expect(result?.averageUtilization).toBe(75);
      });

      it('should filter performance top performers by market for CM', () => {
        const result = fromReportingSelectors.selectScopedPerformanceReport(mockCMUser, cmDataScopes).projector(mockPerformance);
        expect(result?.topPerformers.length).toBe(1);
        expect(result?.topPerformers[0].technician.region).toBe('DALLAS');
      });

      it('should return all data for RG market CM', () => {
        const rgCMUser = { ...mockCMUser, market: 'RG' };
        const result = fromReportingSelectors.selectScopedUtilizationReport(rgCMUser, cmDataScopes).projector(mockUtilization);
        expect(result?.technicians.length).toBe(2);
      });
    });

    describe('PM Scope (company + market)', () => {
      it('should filter utilization by company and market for PM', () => {
        const result = fromReportingSelectors.selectScopedUtilizationReport(mockPMUser, pmDataScopes).projector(mockUtilization);
        expect(result?.technicians.length).toBe(1);
        expect(result?.technicians[0].technician.region).toBe('DALLAS');
      });

      it('should filter performance by company and market for PM', () => {
        const result = fromReportingSelectors.selectScopedPerformanceReport(mockPMUser, pmDataScopes).projector(mockPerformance);
        expect(result?.topPerformers.length).toBe(1);
        expect(result?.topPerformers[0].technician.region).toBe('DALLAS');
      });
    });

    describe('Technician Scope (self)', () => {
      it('should filter utilization to only self for technician', () => {
        const result = fromReportingSelectors.selectScopedUtilizationReport(mockTechUser, techDataScopes).projector(mockUtilization);
        expect(result?.technicians.length).toBe(1);
        expect(result?.technicians[0].technician.id).toBe('tech-1');
      });

      it('should filter performance to only self for technician', () => {
        const result = fromReportingSelectors.selectScopedPerformanceReport(mockTechUser, techDataScopes).projector(mockPerformance);
        expect(result?.topPerformers.length).toBe(1);
        expect(result?.topPerformers[0].technician.id).toBe('tech-1');
      });

      it('should return empty array for technician not in data', () => {
        const otherTechUser = { ...mockTechUser, id: 'tech-999' };
        const result = fromReportingSelectors.selectScopedUtilizationReport(otherTechUser, techDataScopes).projector(mockUtilization);
        expect(result?.technicians.length).toBe(0);
      });
    });

    describe('Scoped Derived Selectors', () => {
      it('should select scoped utilization technicians', () => {
        const scopedReport = fromReportingSelectors.selectScopedUtilizationReport(mockCMUser, cmDataScopes).projector(mockUtilization);
        const result = fromReportingSelectors.selectScopedUtilizationTechnicians(mockCMUser, cmDataScopes).projector(scopedReport);
        expect(result.length).toBe(1);
      });

      it('should select scoped utilization average', () => {
        const scopedReport = fromReportingSelectors.selectScopedUtilizationReport(mockCMUser, cmDataScopes).projector(mockUtilization);
        const result = fromReportingSelectors.selectScopedUtilizationAverage(mockCMUser, cmDataScopes).projector(scopedReport);
        expect(result).toBe(75);
      });

      it('should select scoped top performers', () => {
        const scopedReport = fromReportingSelectors.selectScopedPerformanceReport(mockCMUser, cmDataScopes).projector(mockPerformance);
        const result = fromReportingSelectors.selectScopedTopPerformers(mockCMUser, cmDataScopes).projector(scopedReport);
        expect(result.length).toBe(1);
      });

      it('should select scoped jobs requiring attention', () => {
        const scopedDashboard = fromReportingSelectors.selectScopedDashboard(mockCMUser, cmDataScopes).projector(mockDashboard);
        const result = fromReportingSelectors.selectScopedJobsRequiringAttention(mockCMUser, cmDataScopes).projector(scopedDashboard);
        expect(result.length).toBe(1);
      });

      it('should select scoped underutilized technicians', () => {
        const scopedTechnicians = [mockTechUtilization2];
        const result = fromReportingSelectors.selectScopedUnderutilizedTechnicians(mockCMUser, cmDataScopes).projector(scopedTechnicians);
        expect(result.length).toBe(1);
      });

      it('should select scoped overutilized technicians', () => {
        const overutilizedTech = { ...mockTechUtilization1, utilizationRate: 95 };
        const scopedTechnicians = [overutilizedTech];
        const result = fromReportingSelectors.selectScopedOverutilizedTechnicians(mockCMUser, cmDataScopes).projector(scopedTechnicians);
        expect(result.length).toBe(1);
      });

      it('should select scoped optimally utilized technicians', () => {
        const scopedTechnicians = [mockTechUtilization1];
        const result = fromReportingSelectors.selectScopedOptimallyUtilizedTechnicians(mockCMUser, cmDataScopes).projector(scopedTechnicians);
        expect(result.length).toBe(1);
      });

      it('should calculate scoped utilization distribution', () => {
        const under = [mockTechUtilization2];
        const optimal = [mockTechUtilization1];
        const over: TechnicianUtilization[] = [];
        const result = fromReportingSelectors.selectScopedUtilizationDistribution(mockCMUser, cmDataScopes).projector(under, optimal, over);
        expect(result.total).toBe(2);
      });

      it('should calculate scoped total utilization hours', () => {
        const scopedTechnicians = [mockTechUtilization1];
        const result = fromReportingSelectors.selectScopedTotalUtilizationHours(mockCMUser, cmDataScopes).projector(scopedTechnicians);
        expect(result).toBe(120);
      });

      it('should calculate scoped total available hours', () => {
        const scopedTechnicians = [mockTechUtilization1];
        const result = fromReportingSelectors.selectScopedTotalAvailableHours(mockCMUser, cmDataScopes).projector(scopedTechnicians);
        expect(result).toBe(160);
      });

      it('should calculate scoped overall utilization rate', () => {
        const result = fromReportingSelectors.selectScopedOverallUtilizationRate(mockCMUser, cmDataScopes).projector(120, 160);
        expect(result).toBe(75);
      });

      it('should select scoped top performers by jobs completed', () => {
        const scopedPerformers = [mockTechPerformance1];
        const result = fromReportingSelectors.selectScopedTopPerformersByJobsCompleted(5, mockCMUser, cmDataScopes).projector(scopedPerformers);
        expect(result.length).toBe(1);
      });

      it('should select scoped top performers by on-time rate', () => {
        const scopedPerformers = [mockTechPerformance1];
        const result = fromReportingSelectors.selectScopedTopPerformersByOnTimeRate(5, mockCMUser, cmDataScopes).projector(scopedPerformers);
        expect(result.length).toBe(1);
      });

      it('should calculate scoped average on-time completion rate', () => {
        const scopedPerformers = [mockTechPerformance1];
        const result = fromReportingSelectors.selectScopedAverageOnTimeCompletionRate(mockCMUser, cmDataScopes).projector(scopedPerformers);
        expect(result).toBe(90);
      });

      it('should calculate scoped technician efficiency scores', () => {
        const scopedTechnicians = [mockTechUtilization1];
        const result = fromReportingSelectors.selectScopedTechnicianEfficiencyScores(mockCMUser, cmDataScopes).projector(scopedTechnicians);
        expect(result.length).toBe(1);
      });

      it('should select scoped most efficient technician', () => {
        const scores = [
          { technicianId: 'tech-1', technicianName: 'John Doe', efficiencyScore: 0.1, jobsCompleted: 10, workedHours: 100 }
        ];
        const result = fromReportingSelectors.selectScopedMostEfficientTechnician(mockCMUser, cmDataScopes).projector(scores);
        expect(result?.technicianId).toBe('tech-1');
      });

      it('should calculate scoped average job duration', () => {
        const scopedPerformers = [mockTechPerformance1];
        const result = fromReportingSelectors.selectScopedAverageJobDuration(mockCMUser, cmDataScopes).projector(scopedPerformers);
        expect(result).toBe(12);
      });

      it('should count scoped jobs requiring attention', () => {
        const scopedJobs = [mockJob1];
        const result = fromReportingSelectors.selectScopedJobsRequiringAttentionCount(mockCMUser, cmDataScopes).projector(scopedJobs);
        expect(result).toBe(1);
      });

      it('should calculate scoped performance trends', () => {
        const scopedReport = mockPerformance;
        const result = fromReportingSelectors.selectScopedPerformanceTrends(mockCMUser, cmDataScopes).projector(scopedReport, 90);
        expect(result.scheduleAdherence.value).toBe(85.2);
        expect(result.onTimeCompletion.value).toBe(90);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null dashboard', () => {
        const result = fromReportingSelectors.selectScopedDashboard(mockAdminUser, adminDataScopes).projector(null);
        expect(result).toBeNull();
      });

      it('should handle null utilization report', () => {
        const result = fromReportingSelectors.selectScopedUtilizationReport(mockAdminUser, adminDataScopes).projector(null);
        expect(result).toBeNull();
      });

      it('should handle null performance report', () => {
        const result = fromReportingSelectors.selectScopedPerformanceReport(mockAdminUser, adminDataScopes).projector(null);
        expect(result).toBeNull();
      });

      it('should handle null user', () => {
        const result = fromReportingSelectors.selectScopedDashboard(null as any, adminDataScopes).projector(mockDashboard);
        expect(result).toEqual(mockDashboard);
      });

      it('should handle empty data scopes', () => {
        const result = fromReportingSelectors.selectScopedDashboard(mockAdminUser, []).projector(mockDashboard);
        expect(result).toEqual(mockDashboard);
      });

      it('should handle empty technicians array', () => {
        const emptyUtilization = { ...mockUtilization, technicians: [] };
        const result = fromReportingSelectors.selectScopedUtilizationReport(mockAdminUser, adminDataScopes).projector(emptyUtilization);
        expect(result?.technicians.length).toBe(0);
        expect(result?.averageUtilization).toBe(0);
      });

      it('should handle empty performers array', () => {
        const emptyPerformance = { ...mockPerformance, topPerformers: [] };
        const result = fromReportingSelectors.selectScopedPerformanceReport(mockAdminUser, adminDataScopes).projector(emptyPerformance);
        expect(result?.topPerformers.length).toBe(0);
      });
    });
  });
});
