import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ReportingService, ExportFormat, ReportType } from './reporting.service';
import { CacheService } from './cache.service';
import { Job, JobStatus, JobType, Priority } from '../models/job.model';
import { Technician, TechnicianRole, EmploymentType } from '../models/technician.model';
import { DateRange, Assignment } from '../models/assignment.model';
import { DataScope } from './data-scope.service';
import { DashboardMetrics, UtilizationReport, PerformanceReport, KPI, Trend, KPIStatus } from '../models/reporting.model';
import { of } from 'rxjs';

describe('ReportingService', () => {
  let service: ReportingService;
  let httpMock: HttpTestingController;
  let cacheService: jasmine.SpyObj<CacheService>;

  beforeEach(() => {
    const cacheServiceSpy = jasmine.createSpyObj('CacheService', [
      'get',
      'invalidatePattern'
    ]);

    TestBed.configureTestingModule({
      providers: [
        ReportingService,
        { provide: CacheService, useValue: cacheServiceSpy },
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ReportingService);
    httpMock = TestBed.inject(HttpTestingController);
    cacheService = TestBed.inject(CacheService) as jasmine.SpyObj<CacheService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('calculateKPIMetrics', () => {
    let mockJobs: Job[];
    let mockTechnicians: Technician[];
    let dateRange: DateRange;
    let userScope: DataScope[];

    beforeEach(() => {
      // Setup date range
      dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      // Setup user scope
      userScope = [{ scopeType: 'all' }];

      // Setup mock technicians
      mockTechnicians = [
        {
          id: 'tech-1',
          technicianId: 'T001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          role: TechnicianRole.Lead,
          employmentType: EmploymentType.W2,
          homeBase: 'Dallas',
          region: 'DALLAS',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          company: 'TEST_COMPANY',          updatedAt: new Date()
        },
        {
          id: 'tech-2',
          technicianId: 'T002',
          firstName: 'Jane',
          lastName: 'Smith',
          email: 'jane@example.com',
          phone: '555-0002',
          role: TechnicianRole.Installer,
          employmentType: EmploymentType.W2,
          homeBase: 'Dallas',
          region: 'DALLAS',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          company: 'TEST_COMPANY',          updatedAt: new Date()
        }
      ];

      // Setup mock jobs
      mockJobs = [
        {
          id: 'job-1',
          jobId: 'J001',
          client: 'Client A',
          siteName: 'Site 1',
          siteAddress: {
            street: '123 Main St',
            city: 'Dallas',
            state: 'TX',
            zipCode: '75001'
          },
          jobType: JobType.Install,
          priority: Priority.Normal,
          status: JobStatus.Completed,
          scopeDescription: 'Install equipment',
          requiredSkills: [],
          requiredCrewSize: 2,
          estimatedLaborHours: 8,
          scheduledStartDate: new Date('2024-01-10T08:00:00'),
          scheduledEndDate: new Date('2024-01-10T16:00:00'),
          actualStartDate: new Date('2024-01-10T08:00:00'),
          actualEndDate: new Date('2024-01-10T15:00:00'),
          attachments: [],
          notes: [],
          company: 'ACME',
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'job-2',
          jobId: 'J002',
          client: 'Client B',
          siteName: 'Site 2',
          siteAddress: {
            street: '456 Oak Ave',
            city: 'Dallas',
            state: 'TX',
            zipCode: '75002'
          },
          jobType: JobType.Decom,
          priority: Priority.P1,
          status: JobStatus.OnSite,
          scopeDescription: 'Decommission equipment',
          requiredSkills: [],
          requiredCrewSize: 1,
          estimatedLaborHours: 4,
          scheduledStartDate: new Date('2024-01-15T09:00:00'),
          scheduledEndDate: new Date('2024-01-15T13:00:00'),
          attachments: [],
          notes: [],
          company: 'ACME',
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'job-3',
          jobId: 'J003',
          client: 'Client C',
          siteName: 'Site 3',
          siteAddress: {
            street: '789 Pine Rd',
            city: 'Dallas',
            state: 'TX',
            zipCode: '75003'
          },
          jobType: JobType.PM,
          priority: Priority.Normal,
          status: JobStatus.NotStarted,
          scopeDescription: 'Preventive maintenance',
          requiredSkills: [],
          requiredCrewSize: 1,
          estimatedLaborHours: 2,
          scheduledStartDate: new Date('2024-01-20T10:00:00'),
          scheduledEndDate: new Date('2024-01-20T12:00:00'),
          attachments: [],
          notes: [],
          company: 'ACME',
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
    });

    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should calculate KPI metrics correctly with valid data', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics).toBeDefined();
      expect(metrics.totalJobs).toBe(3);
      expect(metrics.completedJobs).toBe(1);
      expect(metrics.inProgressJobs).toBe(1);
      expect(metrics.notStartedJobs).toBe(1);
      expect(metrics.cancelledJobs).toBe(0);
      expect(metrics.totalAvailableTechnicians).toBe(2);
      expect(metrics.totalEstimatedHours).toBe(14);
    });

    it('should calculate completion rate correctly', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      // 1 completed out of 3 total = 33.33%
      expect(metrics.completionRate).toBeCloseTo(33.33, 1);
    });

    it('should calculate on-time completion rate correctly', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      // 1 completed job, finished before scheduled end = 100%
      expect(metrics.onTimeCompletionRate).toBe(100);
    });

    it('should calculate utilization rate correctly', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      // 2 technicians * 8 hours/day * 31 days = 496 available hours
      // 7 actual hours worked
      // Utilization = (7 / 496) * 100 ≈ 1.41%
      expect(metrics.utilizationRate).toBeGreaterThan(0);
      expect(metrics.utilizationRate).toBeLessThan(100);
    });

    it('should calculate average job duration correctly', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      // Only 1 completed job with 7 hours duration
      expect(metrics.averageJobDuration).toBe(7);
    });

    it('should return zero metrics when no data exists', () => {
      const metrics = service.calculateKPIMetrics(
        [],
        [],
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(0);
      expect(metrics.completedJobs).toBe(0);
      expect(metrics.inProgressJobs).toBe(0);
      expect(metrics.notStartedJobs).toBe(0);
      expect(metrics.cancelledJobs).toBe(0);
      expect(metrics.completionRate).toBe(0);
      expect(metrics.utilizationRate).toBe(0);
      expect(metrics.onTimeCompletionRate).toBe(0);
      expect(metrics.averageJobDuration).toBe(0);
      expect(metrics.totalAvailableTechnicians).toBe(0);
    });

    it('should filter jobs by date range', () => {
      // Add a job outside the date range
      const jobOutsideRange: Job = {
        ...mockJobs[0],
        id: 'job-outside',
        scheduledStartDate: new Date('2024-02-01'),
        scheduledEndDate: new Date('2024-02-01')
      };

      const allJobs = [...mockJobs, jobOutsideRange];
      const metrics = service.calculateKPIMetrics(
        allJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      // Should only count the 3 jobs within range
      expect(metrics.totalJobs).toBe(3);
    });

    it('should only count active technicians', () => {
      const inactiveTechnician: Technician = {
        ...mockTechnicians[0],
        id: 'tech-inactive',
        isActive: false
      };

      const allTechnicians = [...mockTechnicians, inactiveTechnician];
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        allTechnicians,
        dateRange,
        userScope
      );

      // Should only count 2 active technicians
      expect(metrics.totalAvailableTechnicians).toBe(2);
    });

    it('should ensure all percentage values are between 0 and 100', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.completionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.completionRate).toBeLessThanOrEqual(100);
      expect(metrics.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(metrics.utilizationRate).toBeLessThanOrEqual(100);
      expect(metrics.onTimeCompletionRate).toBeGreaterThanOrEqual(0);
      expect(metrics.onTimeCompletionRate).toBeLessThanOrEqual(100);
    });

    it('should ensure all count values are non-negative integers', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(metrics.totalJobs)).toBe(true);
      expect(metrics.completedJobs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(metrics.completedJobs)).toBe(true);
      expect(metrics.inProgressJobs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(metrics.inProgressJobs)).toBe(true);
      expect(metrics.notStartedJobs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(metrics.notStartedJobs)).toBe(true);
      expect(metrics.cancelledJobs).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(metrics.cancelledJobs)).toBe(true);
    });

    it('should not mutate input arrays', () => {
      const jobsCopy = [...mockJobs];
      const techniciansCopy = [...mockTechnicians];

      service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(mockJobs).toEqual(jobsCopy);
      expect(mockTechnicians).toEqual(techniciansCopy);
    });

    it('should throw error when jobs is not an array', () => {
      expect(() => {
        service.calculateKPIMetrics(
          null as any,
          mockTechnicians,
          dateRange,
          userScope
        );
      }).toThrowError('jobs must be a valid array');
    });

    it('should throw error when technicians is not an array', () => {
      expect(() => {
        service.calculateKPIMetrics(
          mockJobs,
          null as any,
          dateRange,
          userScope
        );
      }).toThrowError('technicians must be a valid array');
    });

    it('should throw error when dateRange is invalid', () => {
      expect(() => {
        service.calculateKPIMetrics(
          mockJobs,
          mockTechnicians,
          null as any,
          userScope
        );
      }).toThrowError('dateRange must have valid startDate and endDate');
    });

    it('should throw error when startDate is after endDate', () => {
      const invalidDateRange: DateRange = {
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01')
      };

      expect(() => {
        service.calculateKPIMetrics(
          mockJobs,
          mockTechnicians,
          invalidDateRange,
          userScope
        );
      }).toThrowError('dateRange.startDate must be before or equal to dateRange.endDate');
    });

    it('should throw error when userScope is not an array', () => {
      expect(() => {
        service.calculateKPIMetrics(
          mockJobs,
          mockTechnicians,
          dateRange,
          null as any
        );
      }).toThrowError('userScope must be a valid array');
    });

    it('should handle cancelled jobs correctly', () => {
      const cancelledJob: Job = {
        ...mockJobs[0],
        id: 'job-cancelled',
        status: JobStatus.Cancelled
      };

      const jobsWithCancelled = [...mockJobs, cancelledJob];
      const metrics = service.calculateKPIMetrics(
        jobsWithCancelled,
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.cancelledJobs).toBe(1);
      expect(metrics.totalJobs).toBe(4);
    });

    it('should handle late completions correctly', () => {
      const lateJob: Job = {
        ...mockJobs[0],
        id: 'job-late',
        status: JobStatus.Completed,
        scheduledEndDate: new Date('2024-01-10T16:00:00'),
        actualEndDate: new Date('2024-01-10T18:00:00') // 2 hours late
      };

      const jobsWithLate = [lateJob];
      const metrics = service.calculateKPIMetrics(
        jobsWithLate,
        mockTechnicians,
        dateRange,
        userScope
      );

      // 0 out of 1 completed on time = 0%
      expect(metrics.onTimeCompletionRate).toBe(0);
    });

    it('should handle jobs without actual dates', () => {
      const jobWithoutActuals: Job = {
        ...mockJobs[0],
        id: 'job-no-actuals',
        status: JobStatus.Completed,
        actualStartDate: undefined,
        actualEndDate: undefined
      };

      const jobs = [jobWithoutActuals];
      const metrics = service.calculateKPIMetrics(
        jobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.completedJobs).toBe(1);
      expect(metrics.totalActualHours).toBe(0);
      expect(metrics.averageJobDuration).toBe(0);
    });

    it('should return dateRange in metrics', () => {
      const metrics = service.calculateKPIMetrics(
        mockJobs,
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.dateRange).toEqual(dateRange);
    });
  });

  describe('filterJobsByDateRange (via calculateKPIMetrics)', () => {
    let mockTechnicians: Technician[];
    let userScope: DataScope[];

    beforeEach(() => {
      userScope = [{ scopeType: 'all' }];
      mockTechnicians = [
        {
          id: 'tech-1',
          technicianId: 'T001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          role: TechnicianRole.Lead,
          employmentType: EmploymentType.W2,
          homeBase: 'Dallas',
          region: 'DALLAS',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          company: 'TEST_COMPANY',          updatedAt: new Date()
        }
      ];
    });

    it('should include jobs that start within the date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const jobInRange: Job = {
        id: 'job-1',
        jobId: 'J001',
        client: 'Client A',
        siteName: 'Site 1',
        siteAddress: {
          street: '123 Main St',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75001',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2024-01-15'),
        scheduledEndDate: new Date('2024-01-16'),
        estimatedLaborHours: 8,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metrics = service.calculateKPIMetrics(
        [jobInRange],
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(1);
    });

    it('should include jobs that end within the date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const jobEndingInRange: Job = {
        id: 'job-2',
        jobId: 'J002',
        client: 'Client B',
        siteName: 'Site 2',
        siteAddress: {
          street: '456 Oak Ave',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75002',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2023-12-28'), // Starts before range
        scheduledEndDate: new Date('2024-01-05'), // Ends within range
        estimatedLaborHours: 8,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metrics = service.calculateKPIMetrics(
        [jobEndingInRange],
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(1);
    });

    it('should include jobs that span the entire date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const jobSpanningRange: Job = {
        id: 'job-3',
        jobId: 'J003',
        client: 'Client C',
        siteName: 'Site 3',
        siteAddress: {
          street: '789 Pine Rd',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75003',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2023-12-15'), // Starts before range
        scheduledEndDate: new Date('2024-02-15'), // Ends after range
        estimatedLaborHours: 8,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metrics = service.calculateKPIMetrics(
        [jobSpanningRange],
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(1);
    });

    it('should exclude jobs that end before the date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const jobBeforeRange: Job = {
        id: 'job-4',
        jobId: 'J004',
        client: 'Client D',
        siteName: 'Site 4',
        siteAddress: {
          street: '321 Elm St',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75004',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2023-12-01'),
        scheduledEndDate: new Date('2023-12-31'), // Ends before range starts
        estimatedLaborHours: 8,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metrics = service.calculateKPIMetrics(
        [jobBeforeRange],
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(0);
    });

    it('should exclude jobs that start after the date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const jobAfterRange: Job = {
        id: 'job-5',
        jobId: 'J005',
        client: 'Client E',
        siteName: 'Site 5',
        siteAddress: {
          street: '654 Maple Dr',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75005',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2024-02-01'), // Starts after range ends
        scheduledEndDate: new Date('2024-02-15'),
        estimatedLaborHours: 8,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metrics = service.calculateKPIMetrics(
        [jobAfterRange],
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(0);
    });

    it('should handle jobs with same start and end date (single day jobs)', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const singleDayJob: Job = {
        id: 'job-6',
        jobId: 'J006',
        client: 'Client F',
        siteName: 'Site 6',
        siteAddress: {
          street: '987 Cedar Ln',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75006',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2024-01-15'),
        scheduledEndDate: new Date('2024-01-15'), // Same day
        estimatedLaborHours: 4,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metrics = service.calculateKPIMetrics(
        [singleDayJob],
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(1);
    });

    it('should handle jobs at the exact boundaries of the date range', () => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01T00:00:00'),
        endDate: new Date('2024-01-31T23:59:59')
      };

      const jobAtStartBoundary: Job = {
        id: 'job-7',
        jobId: 'J007',
        client: 'Client G',
        siteName: 'Site 7',
        siteAddress: {
          street: '111 Birch St',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75007',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2024-01-01T00:00:00'),
        scheduledEndDate: new Date('2024-01-01T08:00:00'),
        estimatedLaborHours: 8,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const jobAtEndBoundary: Job = {
        id: 'job-8',
        jobId: 'J008',
        client: 'Client H',
        siteName: 'Site 8',
        siteAddress: {
          street: '222 Spruce Ave',
          city: 'Dallas',
          state: 'TX',
          zipCode: '75008',
          latitude: 32.7767,
          longitude: -96.7970
        },
        jobType: JobType.Install,
        status: JobStatus.Completed,
        priority: Priority.Normal,
        company: 'Company A',
        scopeDescription: 'Test job',
        requiredCrewSize: 1,
        scheduledStartDate: new Date('2024-01-31T16:00:00'),
        scheduledEndDate: new Date('2024-01-31T23:59:59'),
        estimatedLaborHours: 8,
        requiredSkills: [],
        attachments: [],
        notes: [],
        createdBy: 'test-user',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const metrics = service.calculateKPIMetrics(
        [jobAtStartBoundary, jobAtEndBoundary],
        mockTechnicians,
        dateRange,
        userScope
      );

      expect(metrics.totalJobs).toBe(2);
    });
  });

  describe('HTTP API Methods', () => {
    it('should fetch dashboard metrics with caching', (done) => {
      const mockMetrics: DashboardMetrics = {
        totalActiveJobs: 100,
        totalAvailableTechnicians: 50,
        jobsByStatus: {
          [JobStatus.NotStarted]: 10,
          [JobStatus.EnRoute]: 5,
          [JobStatus.OnSite]: 15,
          [JobStatus.Completed]: 65,
          [JobStatus.Cancelled]: 5,
          [JobStatus.Issue]: 0
        },
        averageUtilization: 75,
        jobsRequiringAttention: [],
        recentActivity: [],
        kpis: []
      };

      cacheService.get.and.returnValue(of(mockMetrics));

      service.getDashboardMetrics().subscribe(metrics => {
        expect(metrics).toEqual(mockMetrics);
        expect(cacheService.get).toHaveBeenCalledWith(
          'dashboard-metrics',
          jasmine.any(Function),
          5 * 60 * 1000
        );
        done();
      });
    });

    it('should fetch technician utilization with filters', (done) => {
      const filters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        technicianId: 'tech-1',
        role: TechnicianRole.Lead,
        region: 'DALLAS'
      };

      const mockReport: UtilizationReport = {
        dateRange: filters.dateRange,
        technicians: [],
        averageUtilization: 75
      };

      cacheService.get.and.returnValue(of(mockReport));

      service.getTechnicianUtilization(filters).subscribe(report => {
        expect(report).toEqual(mockReport);
        expect(cacheService.get).toHaveBeenCalled();
        done();
      });
    });

    it('should fetch job performance with filters', (done) => {
      const filters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        },
        jobType: JobType.Install,
        priority: Priority.P1,
        client: 'Client A',
        region: 'DALLAS'
      };

      const mockReport: PerformanceReport = {
        dateRange: filters.dateRange,
        totalJobsCompleted: 50,
        totalJobsOpen: 10,
        averageLaborHours: 8,
        scheduleAdherence: 90,
        jobsByType: {} as any,
        topPerformers: []
      };

      cacheService.get.and.returnValue(of(mockReport));

      service.getJobPerformance(filters).subscribe(report => {
        expect(report).toEqual(mockReport);
        expect(cacheService.get).toHaveBeenCalled();
        done();
      });
    });

    it('should fetch KPIs with caching', (done) => {
      const mockKPIs: KPI[] = [
        { name: 'Completion Rate', value: 85, target: 90, unit: '%', trend: Trend.Up, status: KPIStatus.OnTrack },
        { name: 'Utilization', value: 75, target: 80, unit: '%', trend: Trend.Stable, status: KPIStatus.AtRisk }
      ];

      cacheService.get.and.returnValue(of(mockKPIs));

      service.getKPIs().subscribe(kpis => {
        expect(kpis).toEqual(mockKPIs);
        expect(cacheService.get).toHaveBeenCalledWith(
          'kpis',
          jasmine.any(Function),
          5 * 60 * 1000
        );
        done();
      });
    });

    it('should export report as CSV', (done) => {
      const filters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      };

      const mockBlob = new Blob(['test'], { type: 'text/csv' });

      service.exportReport(ReportType.Utilization, filters, ExportFormat.CSV).subscribe(blob => {
        expect(blob).toBeDefined();
        done();
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('/api/reports/export/utilization')
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('csv');
      req.flush(mockBlob);
    });

    it('should export report as PDF', (done) => {
      const filters = {
        dateRange: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-31')
        }
      };

      const mockBlob = new Blob(['test'], { type: 'application/pdf' });

      service.exportReport(ReportType.Performance, filters, ExportFormat.PDF).subscribe(blob => {
        expect(blob).toBeDefined();
        done();
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('/api/reports/export/performance')
      );
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('format')).toBe('pdf');
      req.flush(mockBlob);
    });

    it('should fetch schedule adherence metrics', (done) => {
      const dateRange: DateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      const mockMetrics = {
        dateRange,
        totalJobs: 100,
        onTimeJobs: 85,
        lateJobs: 15,
        adherencePercentage: 85,
        averageDelay: 2.5
      };

      service.getScheduleAdherence(dateRange).subscribe(metrics => {
        expect(metrics).toEqual(mockMetrics);
        done();
      });

      const req = httpMock.expectOne((request) => 
        request.url.includes('/api/reports/schedule-adherence')
      );
      expect(req.request.method).toBe('GET');
      req.flush(mockMetrics);
    });
  });

  describe('generateUtilizationReport', () => {
    let mockTechnicians: Technician[];
    let mockJobs: Job[];
    let mockAssignments: Assignment[];
    let dateRange: DateRange;

    beforeEach(() => {
      dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      mockTechnicians = [
        {
          id: 'tech-1',
          technicianId: 'T001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          role: TechnicianRole.Lead,
          employmentType: EmploymentType.W2,
          homeBase: 'Dallas',
          region: 'DALLAS',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          company: 'TEST_COMPANY',          updatedAt: new Date()
        }
      ];

      mockJobs = [
        {
          id: 'job-1',
          jobId: 'J001',
          client: 'Client A',
          siteName: 'Site 1',
          siteAddress: {
            street: '123 Main St',
            city: 'Dallas',
            state: 'TX',
            zipCode: '75001'
          },
          jobType: JobType.Install,
          priority: Priority.Normal,
          status: JobStatus.Completed,
          scopeDescription: 'Install equipment',
          requiredSkills: [],
          requiredCrewSize: 1,
          estimatedLaborHours: 8,
          scheduledStartDate: new Date('2024-01-10T08:00:00'),
          scheduledEndDate: new Date('2024-01-10T16:00:00'),
          actualStartDate: new Date('2024-01-10T08:00:00'),
          actualEndDate: new Date('2024-01-10T16:00:00'),
          attachments: [],
          notes: [],
          company: 'ACME',
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockAssignments = [
        {
          id: 'assign-1',
          jobId: 'job-1',
          technicianId: 'tech-1',
          assignedBy: 'admin',
          assignedAt: new Date('2024-01-09'),
          isActive: true
        }
      ];
    });

    it('should generate utilization report with valid data', () => {
      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      expect(report).toBeDefined();
      expect(report.dateRange).toEqual(dateRange);
      expect(report.technicians.length).toBe(1);
      expect(report.averageUtilization).toBeGreaterThanOrEqual(0);
      expect(report.averageUtilization).toBeLessThanOrEqual(100);
    });

    it('should calculate available hours correctly', () => {
      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      const techUtil = report.technicians[0];
      // 31 days * 8 hours/day = 248 hours
      expect(techUtil.availableHours).toBe(248);
    });

    it('should calculate worked hours from completed jobs', () => {
      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      const techUtil = report.technicians[0];
      expect(techUtil.workedHours).toBe(8);
      expect(techUtil.jobsCompleted).toBe(1);
    });

    it('should calculate utilization rate correctly', () => {
      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      const techUtil = report.technicians[0];
      // 8 worked / 248 available = 3.23%
      expect(techUtil.utilizationRate).toBeCloseTo(3.23, 1);
    });

    it('should handle inactive technicians', () => {
      mockTechnicians[0].isActive = false;

      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      const techUtil = report.technicians[0];
      expect(techUtil.availableHours).toBe(0);
      expect(techUtil.utilizationRate).toBe(0);
    });

    it('should cap utilization at 100%', () => {
      // Create scenario where worked hours exceed available hours
      mockJobs[0].actualStartDate = new Date('2024-01-01T00:00:00');
      mockJobs[0].actualEndDate = new Date('2024-02-01T00:00:00'); // 744 hours

      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      const techUtil = report.technicians[0];
      expect(techUtil.utilizationRate).toBeLessThanOrEqual(100);
    });

    it('should return zero metrics when no data exists', () => {
      const report = service.generateUtilizationReport(
        [],
        [],
        [],
        dateRange
      );

      expect(report.technicians.length).toBe(0);
      expect(report.averageUtilization).toBe(0);
    });

    it('should throw error when technicians is not an array', () => {
      expect(() => {
        service.generateUtilizationReport(
          null as any,
          mockJobs,
          mockAssignments,
          dateRange
        );
      }).toThrowError('technicians must be a valid array');
    });

    it('should throw error when jobs is not an array', () => {
      expect(() => {
        service.generateUtilizationReport(
          mockTechnicians,
          null as any,
          mockAssignments,
          dateRange
        );
      }).toThrowError('jobs must be a valid array');
    });

    it('should throw error when assignments is not an array', () => {
      expect(() => {
        service.generateUtilizationReport(
          mockTechnicians,
          mockJobs,
          null as any,
          dateRange
        );
      }).toThrowError('assignments must be a valid array');
    });

    it('should throw error when dateRange is invalid', () => {
      expect(() => {
        service.generateUtilizationReport(
          mockTechnicians,
          mockJobs,
          mockAssignments,
          null as any
        );
      }).toThrowError('dateRange must have valid startDate and endDate');
    });

    it('should throw error when startDate is after endDate', () => {
      const invalidDateRange: DateRange = {
        startDate: new Date('2024-01-31'),
        endDate: new Date('2024-01-01')
      };

      expect(() => {
        service.generateUtilizationReport(
          mockTechnicians,
          mockJobs,
          mockAssignments,
          invalidDateRange
        );
      }).toThrowError('dateRange.startDate must be before or equal to dateRange.endDate');
    });

    it('should not mutate input arrays', () => {
      const techniciansCopy = [...mockTechnicians];
      const jobsCopy = [...mockJobs];
      const assignmentsCopy = [...mockAssignments];

      service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      expect(mockTechnicians).toEqual(techniciansCopy);
      expect(mockJobs).toEqual(jobsCopy);
      expect(mockAssignments).toEqual(assignmentsCopy);
    });

    it('should include estimated hours for non-completed jobs', () => {
      mockJobs[0].status = JobStatus.OnSite;
      mockJobs[0].actualStartDate = undefined;
      mockJobs[0].actualEndDate = undefined;

      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      const techUtil = report.technicians[0];
      expect(techUtil.workedHours).toBe(8); // Uses estimatedLaborHours
    });

    it('should exclude cancelled jobs from utilization', () => {
      mockJobs[0].status = JobStatus.Cancelled;

      const report = service.generateUtilizationReport(
        mockTechnicians,
        mockJobs,
        mockAssignments,
        dateRange
      );

      const techUtil = report.technicians[0];
      expect(techUtil.workedHours).toBe(0);
      expect(techUtil.jobsCompleted).toBe(0);
    });
  });

  describe('generatePerformanceReport', () => {
    let mockTechnicians: Technician[];
    let mockJobs: Job[];
    let mockAssignments: Assignment[];
    let dateRange: DateRange;

    beforeEach(() => {
      dateRange = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };

      mockTechnicians = [
        {
          id: 'tech-1',
          technicianId: 'T001',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
          phone: '555-0001',
          role: TechnicianRole.Lead,
          employmentType: EmploymentType.W2,
          homeBase: 'Dallas',
          region: 'DALLAS',
          skills: [],
          certifications: [],
          availability: [],
          isActive: true,
          createdAt: new Date(),
          company: 'TEST_COMPANY',          updatedAt: new Date()
        }
      ];

      mockJobs = [
        {
          id: 'job-1',
          jobId: 'J001',
          client: 'Client A',
          siteName: 'Site 1',
          siteAddress: {
            street: '123 Main St',
            city: 'Dallas',
            state: 'TX',
            zipCode: '75001'
          },
          jobType: JobType.Install,
          priority: Priority.Normal,
          status: JobStatus.Completed,
          scopeDescription: 'Install equipment',
          requiredSkills: [],
          requiredCrewSize: 1,
          estimatedLaborHours: 8,
          scheduledStartDate: new Date('2024-01-10T08:00:00'),
          scheduledEndDate: new Date('2024-01-10T16:00:00'),
          actualStartDate: new Date('2024-01-10T08:00:00'),
          actualEndDate: new Date('2024-01-10T15:00:00'),
          attachments: [],
          notes: [],
          company: 'ACME',
          createdBy: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockAssignments = [
        {
          id: 'assign-1',
          jobId: 'job-1',
          technicianId: 'tech-1',
          assignedBy: 'admin',
          assignedAt: new Date('2024-01-09'),
          isActive: true
        }
      ];
    });

    it('should generate performance report with valid data', () => {
      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      expect(report).toBeDefined();
      expect(report.dateRange).toEqual(dateRange);
      expect(report.totalJobsCompleted).toBe(1);
      expect(report.totalJobsOpen).toBe(0);
    });

    it('should calculate average labor hours correctly', () => {
      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      // Job took 7 hours (8am to 3pm)
      expect(report.averageLaborHours).toBe(7);
    });

    it('should calculate schedule adherence correctly', () => {
      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      // Job finished before scheduled end time
      expect(report.scheduleAdherence).toBe(100);
    });

    it('should count jobs by type', () => {
      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      expect(report.jobsByType[JobType.Install]).toBe(1);
    });

    it('should sort top performers by jobs completed', () => {
      // Add another technician with more completed jobs
      const tech2: Technician = {
        ...mockTechnicians[0],
        id: 'tech-2',
        technicianId: 'T002',
        firstName: 'Jane'
      };
      mockTechnicians.push(tech2);

      const job2: Job = {
        ...mockJobs[0],
        id: 'job-2',
        jobId: 'J002'
      };
      const job3: Job = {
        ...mockJobs[0],
        id: 'job-3',
        jobId: 'J003'
      };
      mockJobs.push(job2, job3);

      mockAssignments.push(
        {
          id: 'assign-2',
          jobId: 'job-2',
          technicianId: 'tech-2',
          assignedBy: 'admin',
          assignedAt: new Date('2024-01-09'),
          isActive: true
        },
        {
          id: 'assign-3',
          jobId: 'job-3',
          technicianId: 'tech-2',
          assignedBy: 'admin',
          assignedAt: new Date('2024-01-09'),
          isActive: true
        }
      );

      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      expect(report.topPerformers.length).toBe(2);
      expect(report.topPerformers[0].jobsCompleted).toBeGreaterThanOrEqual(
        report.topPerformers[1].jobsCompleted
      );
    });

    it('should calculate technician performance metrics', () => {
      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      const performer = report.topPerformers[0];
      expect(performer.technician.id).toBe('tech-1');
      expect(performer.jobsCompleted).toBe(1);
      expect(performer.totalHours).toBe(7);
      expect(performer.averageJobDuration).toBe(7);
      expect(performer.onTimeCompletionRate).toBe(100);
    });

    it('should return zero metrics when no data exists', () => {
      const report = service.generatePerformanceReport(
        [],
        [],
        [],
        dateRange
      );

      expect(report.totalJobsCompleted).toBe(0);
      expect(report.totalJobsOpen).toBe(0);
      expect(report.averageLaborHours).toBe(0);
      expect(report.scheduleAdherence).toBe(0);
      expect(report.topPerformers.length).toBe(0);
    });

    it('should throw error when jobs is not an array', () => {
      expect(() => {
        service.generatePerformanceReport(
          null as any,
          mockTechnicians,
          mockAssignments,
          dateRange
        );
      }).toThrowError('jobs must be a valid array');
    });

    it('should throw error when technicians is not an array', () => {
      expect(() => {
        service.generatePerformanceReport(
          mockJobs,
          null as any,
          mockAssignments,
          dateRange
        );
      }).toThrowError('technicians must be a valid array');
    });

    it('should throw error when assignments is not an array', () => {
      expect(() => {
        service.generatePerformanceReport(
          mockJobs,
          mockTechnicians,
          null as any,
          dateRange
        );
      }).toThrowError('assignments must be a valid array');
    });

    it('should not mutate input arrays', () => {
      const jobsCopy = [...mockJobs];
      const techniciansCopy = [...mockTechnicians];
      const assignmentsCopy = [...mockAssignments];

      service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      expect(mockJobs).toEqual(jobsCopy);
      expect(mockTechnicians).toEqual(techniciansCopy);
      expect(mockAssignments).toEqual(assignmentsCopy);
    });

    it('should handle late job completions', () => {
      mockJobs[0].actualEndDate = new Date('2024-01-10T18:00:00'); // 2 hours late

      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      expect(report.scheduleAdherence).toBe(0);
    });

    it('should count open jobs correctly', () => {
      const openJob: Job = {
        ...mockJobs[0],
        id: 'job-2',
        status: JobStatus.OnSite
      };
      mockJobs.push(openJob);

      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      expect(report.totalJobsOpen).toBe(1);
    });

    it('should exclude cancelled jobs from open count', () => {
      const cancelledJob: Job = {
        ...mockJobs[0],
        id: 'job-2',
        status: JobStatus.Cancelled
      };
      mockJobs.push(cancelledJob);

      const report = service.generatePerformanceReport(
        mockJobs,
        mockTechnicians,
        mockAssignments,
        dateRange
      );

      expect(report.totalJobsOpen).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should invalidate all caches', () => {
      service.invalidateCache();

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        jasmine.any(RegExp)
      );
    });

    it('should invalidate specific report cache', () => {
      service.invalidateReportCache('dashboard');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        jasmine.any(RegExp)
      );
    });

    it('should invalidate utilization cache', () => {
      service.invalidateReportCache('utilization');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        jasmine.any(RegExp)
      );
    });

    it('should invalidate performance cache', () => {
      service.invalidateReportCache('performance');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        jasmine.any(RegExp)
      );
    });

    it('should invalidate kpis cache', () => {
      service.invalidateReportCache('kpis');

      expect(cacheService.invalidatePattern).toHaveBeenCalledWith(
        jasmine.any(RegExp)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle 400 Bad Request errors', (done) => {
      cacheService.get.and.callFake((key, factory) => factory());

      service.getDashboardMetrics().subscribe({
        error: (error) => {
          expect(error.message).toContain('Invalid request');
          done();
        }
      });

      const req = httpMock.expectOne('/api/reports/dashboard');
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 401 Unauthorized errors', (done) => {
      cacheService.get.and.callFake((key, factory) => factory());

      service.getDashboardMetrics().subscribe({
        error: (error) => {
          expect(error.message).toContain('Unauthorized');
          done();
        }
      });

      const req = httpMock.expectOne('/api/reports/dashboard');
      req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });
    });

    it('should handle 403 Forbidden errors', (done) => {
      cacheService.get.and.callFake((key, factory) => factory());

      service.getDashboardMetrics().subscribe({
        error: (error) => {
          expect(error.message).toContain('Access denied');
          done();
        }
      });

      const req = httpMock.expectOne('/api/reports/dashboard');
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 404 Not Found errors', (done) => {
      cacheService.get.and.callFake((key, factory) => factory());

      service.getDashboardMetrics().subscribe({
        error: (error) => {
          expect(error.message).toContain('Report not found');
          done();
        }
      });

      const req = httpMock.expectOne('/api/reports/dashboard');
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });

    it('should handle 500 Server errors', (done) => {
      cacheService.get.and.callFake((key, factory) => factory());

      service.getDashboardMetrics().subscribe({
        error: (error) => {
          expect(error.message).toContain('Server error');
          done();
        }
      });

      const req = httpMock.expectOne('/api/reports/dashboard');
      req.flush('Server Error', { status: 500, statusText: 'Server Error' });
    });

    it('should handle 503 Service Unavailable errors', (done) => {
      cacheService.get.and.callFake((key, factory) => factory());

      service.getDashboardMetrics().subscribe({
        error: (error) => {
          expect(error.message).toContain('service unavailable');
          done();
        }
      });

      const req = httpMock.expectOne('/api/reports/dashboard');
      req.flush('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
    });

    it('should handle client-side errors', (done) => {
      cacheService.get.and.callFake((key, factory) => factory());

      service.getDashboardMetrics().subscribe({
        error: (error) => {
          expect(error.message).toContain('Error');
          done();
        }
      });

      const req = httpMock.expectOne('/api/reports/dashboard');
      req.error(new ProgressEvent('error'));
    });
  });
});
