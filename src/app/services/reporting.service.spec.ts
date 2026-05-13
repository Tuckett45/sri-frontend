import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ReportingService } from './reporting.service';
import { AuthService } from './auth.service';
import { RoleBasedDataService } from './role-based-data.service';
import { environment } from '../../environments/environments';
import {
  ProjectStatusReport,
  TechnicianPerformanceMetrics,
  TimeBillingReport,
  TrendAnalysis,
  ComparativeAnalytics,
  RecurringReportConfig,
  DataExportRequest,
  DataExportResponse,
  CustomReportConfig,
  ReportType
} from '../models/reporting.model';
import { DateRange } from '../features/field-resource-management/models/assignment.model';

describe('ReportingService', () => {
  let service: ReportingService;
  let httpMock: HttpTestingController;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let roleBasedDataServiceSpy: jasmine.SpyObj<RoleBasedDataService>;

  const mockDateRange: DateRange = {
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-01-31')
  };

  const mockCMUser = {
    id: 'cm-user-1',
    name: 'CM User',
    email: 'cm@test.com',
    role: 'CM',
    market: 'NYC'
  };

  const mockAdminUser = {
    id: 'admin-user-1',
    name: 'Admin User',
    email: 'admin@test.com',
    role: 'Admin',
    market: 'NYC'
  };

  beforeEach(() => {
    const authSpy = jasmine.createSpyObj('AuthService', [
      'isAdmin',
      'isCM',
      'getUser'
    ]);

    const roleBasedDataSpy = jasmine.createSpyObj('RoleBasedDataService', [
      'applyMarketFilter',
      'getRoleBasedQueryParams',
      'canAccessMarket',
      'getAccessibleMarkets'
    ]);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        ReportingService,
        { provide: AuthService, useValue: authSpy },
        { provide: RoleBasedDataService, useValue: roleBasedDataSpy }
      ]
    });

    service = TestBed.inject(ReportingService);
    httpMock = TestBed.inject(HttpTestingController);
    authServiceSpy = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;
    roleBasedDataServiceSpy = TestBed.inject(RoleBasedDataService) as jasmine.SpyObj<RoleBasedDataService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('generateProjectStatusReport', () => {
    it('should generate report for CM with market filtering', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      const mockReport: ProjectStatusReport = {
        reportId: 'report-1',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        market: 'NYC',
        projects: [],
        summary: {
          totalProjects: 5,
          activeProjects: 3,
          completedProjects: 2,
          averageProgress: 75,
          totalBudget: 100000,
          totalActualCost: 80000
        }
      };

      service.generateProjectStatusReport(mockDateRange).subscribe(report => {
        expect(report).toBeTruthy();
        expect(report.market).toBe('NYC');
        expect(report.generatedAt instanceof Date).toBe(true);
        done();
      });


      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/project-status` &&
               request.params.get('market') === 'NYC';
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockReport);
    });

    it('should generate report for Admin with all markets', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const mockReport: ProjectStatusReport = {
        reportId: 'report-2',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        projects: [],
        summary: {
          totalProjects: 15,
          activeProjects: 10,
          completedProjects: 5,
          averageProgress: 70,
          totalBudget: 500000,
          totalActualCost: 400000
        }
      };

      service.generateProjectStatusReport(mockDateRange).subscribe(report => {
        expect(report).toBeTruthy();
        expect(report.summary.totalProjects).toBe(15);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/project-status` &&
               !request.params.has('market');
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockReport);
    });

    it('should handle error responses', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      service.generateProjectStatusReport(mockDateRange).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('report');
          done();
        }
      });

      const req = httpMock.expectOne((request) => 
        request.url === `${environment.apiUrl}/reporting/project-status`
      );
      req.flush('Error', { status: 500, statusText: 'Server Error' });
    });
  });


  describe('getTechnicianPerformanceMetrics', () => {
    it('should get metrics for CM with market filtering', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      const mockMetrics: TechnicianPerformanceMetrics = {
        reportId: 'metrics-1',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        market: 'NYC',
        technicians: [],
        summary: {
          totalTechnicians: 10,
          averageUtilization: 85,
          averageOnTimeRate: 92,
          averageCustomerRating: 4.5,
          totalHoursWorked: 1600
        }
      };

      service.getTechnicianPerformanceMetrics(mockDateRange).subscribe(metrics => {
        expect(metrics).toBeTruthy();
        expect(metrics.market).toBe('NYC');
        expect(metrics.summary.totalTechnicians).toBe(10);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/technician-performance` &&
               request.params.get('market') === 'NYC';
      });
      expect(req.request.method).toBe('GET');
      req.flush(mockMetrics);
    });

    it('should get metrics for Admin with all markets', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const mockMetrics: TechnicianPerformanceMetrics = {
        reportId: 'metrics-2',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        technicians: [],
        summary: {
          totalTechnicians: 50,
          averageUtilization: 80,
          averageOnTimeRate: 90,
          averageCustomerRating: 4.3,
          totalHoursWorked: 8000
        }
      };

      service.getTechnicianPerformanceMetrics(mockDateRange).subscribe(metrics => {
        expect(metrics).toBeTruthy();
        expect(metrics.summary.totalTechnicians).toBe(50);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/technician-performance` &&
               !request.params.has('market');
      });
      req.flush(mockMetrics);
    });
  });


  describe('exportData', () => {
    it('should export data with role-based filtering for CM', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      const exportRequest: DataExportRequest = {
        dataType: 'projects',
        filters: {},
        format: 'csv',
        includeHeaders: true
      };

      const mockResponse: DataExportResponse = {
        exportId: 'export-1',
        fileName: 'projects-export.csv',
        fileSize: 1024,
        downloadUrl: 'https://example.com/download/export-1',
        expiresAt: new Date('2024-02-01T12:00:00Z')
      };

      service.exportData(exportRequest).subscribe(response => {
        expect(response).toBeTruthy();
        expect(response.fileName).toBe('projects-export.csv');
        expect(response.expiresAt instanceof Date).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/export`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.filters.market).toBe('NYC');
      req.flush(mockResponse);
    });

    it('should export data without market filtering for Admin', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const exportRequest: DataExportRequest = {
        dataType: 'technicians',
        filters: {},
        format: 'excel',
        includeHeaders: true
      };

      const mockResponse: DataExportResponse = {
        exportId: 'export-2',
        fileName: 'technicians-export.xlsx',
        fileSize: 2048,
        downloadUrl: 'https://example.com/download/export-2',
        expiresAt: new Date('2024-02-01T12:00:00Z')
      };

      service.exportData(exportRequest).subscribe(response => {
        expect(response).toBeTruthy();
        expect(response.fileName).toBe('technicians-export.xlsx');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/export`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.filters.market).toBeUndefined();
      req.flush(mockResponse);
    });
  });


  describe('getTimeBillingReport', () => {
    it('should get billing report for CM with market filtering', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      const mockReport: TimeBillingReport = {
        reportId: 'billing-1',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        market: 'NYC',
        entries: [],
        summary: {
          totalHours: 1000,
          billableHours: 900,
          nonBillableHours: 100,
          totalRevenue: 90000,
          approvedRevenue: 80000,
          pendingRevenue: 10000
        }
      };

      service.getTimeBillingReport(mockDateRange).subscribe(report => {
        expect(report).toBeTruthy();
        expect(report.market).toBe('NYC');
        expect(report.summary.totalRevenue).toBe(90000);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/time-billing` &&
               request.params.get('market') === 'NYC';
      });
      req.flush(mockReport);
    });

    it('should get billing report for Admin with all markets', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const mockReport: TimeBillingReport = {
        reportId: 'billing-2',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        entries: [],
        summary: {
          totalHours: 5000,
          billableHours: 4500,
          nonBillableHours: 500,
          totalRevenue: 450000,
          approvedRevenue: 400000,
          pendingRevenue: 50000
        }
      };

      service.getTimeBillingReport(mockDateRange).subscribe(report => {
        expect(report).toBeTruthy();
        expect(report.summary.totalRevenue).toBe(450000);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/time-billing` &&
               !request.params.has('market');
      });
      req.flush(mockReport);
    });
  });


  describe('getTrendAnalysis', () => {
    it('should get trend analysis with proper date mapping', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const mockTrend: TrendAnalysis = {
        reportId: 'trend-1',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        metric: 'utilization',
        dataPoints: [
          { date: new Date('2024-01-01'), value: 80 },
          { date: new Date('2024-01-15'), value: 85 },
          { date: new Date('2024-01-31'), value: 90 }
        ],
        insights: [
          {
            type: 'increase',
            description: 'Utilization increased by 10%',
            percentage: 10,
            significance: 'high'
          }
        ]
      };

      service.getTrendAnalysis('utilization', mockDateRange).subscribe(trend => {
        expect(trend).toBeTruthy();
        expect(trend.metric).toBe('utilization');
        expect(trend.dataPoints.length).toBe(3);
        expect(trend.dataPoints[0].date instanceof Date).toBe(true);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/trend-analysis` &&
               request.params.get('metric') === 'utilization';
      });
      req.flush(mockTrend);
    });
  });

  describe('scheduleRecurringReport', () => {
    it('should schedule recurring report with role-based filtering', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      const config: RecurringReportConfig = {
        id: 'recurring-1',
        reportType: ReportType.ProjectStatus,
        name: 'Weekly Project Status',
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 1,
          time: '09:00',
          timezone: 'America/New_York'
        },
        filters: {},
        recipients: ['cm@test.com'],
        format: 'pdf',
        isActive: true,
        createdBy: 'cm-user-1',
        createdAt: new Date('2024-01-31T12:00:00Z')
      };

      service.scheduleRecurringReport(config).subscribe(result => {
        expect(result).toBeTruthy();
        expect(result.name).toBe('Weekly Project Status');
        expect(result.createdAt instanceof Date).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/recurring`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body.filters.market).toBe('NYC');
      req.flush(config);
    });
  });


  describe('getRecurringReports', () => {
    it('should get recurring reports for CM (own reports only)', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      const mockReports: RecurringReportConfig[] = [
        {
          id: 'recurring-1',
          reportType: ReportType.ProjectStatus,
          name: 'Weekly Project Status',
          schedule: {
            frequency: 'weekly',
            dayOfWeek: 1,
            time: '09:00',
            timezone: 'America/New_York'
          },
          filters: { market: 'NYC' },
          recipients: ['cm@test.com'],
          format: 'pdf',
          isActive: true,
          createdBy: 'cm-user-1',
          createdAt: new Date('2024-01-31T12:00:00Z')
        }
      ];

      service.getRecurringReports().subscribe(reports => {
        expect(reports).toBeTruthy();
        expect(reports.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/recurring` &&
               request.params.get('userId') === 'cm-user-1';
      });
      req.flush(mockReports);
    });

    it('should get all recurring reports for Admin', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.isCM.and.returnValue(false);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const mockReports: RecurringReportConfig[] = [
        {
          id: 'recurring-1',
          reportType: ReportType.ProjectStatus,
          name: 'Weekly Project Status',
          schedule: {
            frequency: 'weekly',
            dayOfWeek: 1,
            time: '09:00',
            timezone: 'America/New_York'
          },
          filters: {},
          recipients: ['admin@test.com'],
          format: 'pdf',
          isActive: true,
          createdBy: 'admin-user-1',
          createdAt: new Date('2024-01-31T12:00:00Z')
        }
      ];

      service.getRecurringReports().subscribe(reports => {
        expect(reports).toBeTruthy();
        expect(reports.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne((request) => {
        return request.url === `${environment.apiUrl}/reporting/recurring` &&
               !request.params.has('userId');
      });
      req.flush(mockReports);
    });
  });


  describe('updateRecurringReport', () => {
    it('should update recurring report configuration', (done) => {
      const updatedConfig: RecurringReportConfig = {
        id: 'recurring-1',
        reportType: ReportType.ProjectStatus,
        name: 'Updated Weekly Report',
        schedule: {
          frequency: 'weekly',
          dayOfWeek: 2,
          time: '10:00',
          timezone: 'America/New_York'
        },
        filters: {},
        recipients: ['cm@test.com'],
        format: 'excel',
        isActive: true,
        createdBy: 'cm-user-1',
        createdAt: new Date('2024-01-31T12:00:00Z')
      };

      service.updateRecurringReport('recurring-1', { name: 'Updated Weekly Report' }).subscribe(result => {
        expect(result).toBeTruthy();
        expect(result.name).toBe('Updated Weekly Report');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/recurring/recurring-1`);
      expect(req.request.method).toBe('PUT');
      req.flush(updatedConfig);
    });
  });

  describe('deleteRecurringReport', () => {
    it('should delete recurring report configuration', (done) => {
      service.deleteRecurringReport('recurring-1').subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/recurring/recurring-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('getComparativeAnalytics', () => {
    it('should get comparative analytics for Admin', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const mockAnalytics: ComparativeAnalytics = {
        reportId: 'comp-1',
        generatedAt: new Date('2024-01-31T12:00:00Z'),
        dateRange: mockDateRange,
        markets: [
          {
            market: 'NYC',
            activeProjects: 10,
            totalTechnicians: 20,
            utilizationRate: 85,
            revenue: 100000,
            customerSatisfaction: 4.5,
            onTimeCompletionRate: 92,
            rank: 1
          },
          {
            market: 'LA',
            activeProjects: 8,
            totalTechnicians: 15,
            utilizationRate: 80,
            revenue: 80000,
            customerSatisfaction: 4.3,
            onTimeCompletionRate: 88,
            rank: 2
          }
        ],
        summary: {
          totalMarkets: 2,
          bestPerformingMarket: 'NYC',
          worstPerformingMarket: 'LA',
          averageUtilization: 82.5,
          totalRevenue: 180000,
          recommendations: ['Increase staffing in LA market']
        }
      };

      service.getComparativeAnalytics(mockDateRange).subscribe(analytics => {
        expect(analytics).toBeTruthy();
        expect(analytics.markets.length).toBe(2);
        expect(analytics.summary.bestPerformingMarket).toBe('NYC');
        done();
      });

      const req = httpMock.expectOne((request) => 
        request.url === `${environment.apiUrl}/reporting/comparative-analytics`
      );
      req.flush(mockAnalytics);
    });

    it('should throw error for non-Admin users', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      service.getComparativeAnalytics(mockDateRange).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Admin');
          done();
        }
      });
    });
  });


  describe('createCustomReport', () => {
    it('should create custom report for Admin', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const customConfig: CustomReportConfig = {
        id: 'custom-1',
        name: 'Custom Project Report',
        description: 'Custom report for project analysis',
        dataSource: 'projects',
        columns: [
          { field: 'name', label: 'Project Name', type: 'string', visible: true },
          { field: 'status', label: 'Status', type: 'string', visible: true }
        ],
        filters: {},
        createdBy: 'admin-user-1',
        createdAt: new Date('2024-01-31T12:00:00Z'),
        isPublic: false
      };

      service.createCustomReport(customConfig).subscribe(result => {
        expect(result).toBeTruthy();
        expect(result.name).toBe('Custom Project Report');
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/custom`);
      expect(req.request.method).toBe('POST');
      req.flush(customConfig);
    });

    it('should throw error for non-Admin users', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      const customConfig: CustomReportConfig = {
        name: 'Custom Report',
        dataSource: 'projects',
        columns: [],
        filters: {}
      };

      service.createCustomReport(customConfig).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Admin');
          done();
        }
      });
    });
  });

  describe('getCustomReports', () => {
    it('should get custom reports for Admin', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      const mockReports: CustomReportConfig[] = [
        {
          id: 'custom-1',
          name: 'Custom Report 1',
          dataSource: 'projects',
          columns: [],
          filters: {},
          createdBy: 'admin-user-1',
          createdAt: new Date('2024-01-31T12:00:00Z'),
          isPublic: true
        }
      ];

      service.getCustomReports().subscribe(reports => {
        expect(reports).toBeTruthy();
        expect(reports.length).toBe(1);
        done();
      });

      const req = httpMock.expectOne((request) => 
        request.url === `${environment.apiUrl}/reporting/custom`
      );
      req.flush(mockReports);
    });

    it('should throw error for non-Admin users', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      service.getCustomReports().subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Admin');
          done();
        }
      });
    });
  });


  describe('executeCustomReport', () => {
    it('should execute custom report', (done) => {
      const mockData = {
        columns: ['name', 'status'],
        rows: [
          { name: 'Project 1', status: 'active' },
          { name: 'Project 2', status: 'completed' }
        ]
      };

      service.executeCustomReport('custom-1').subscribe(data => {
        expect(data).toBeTruthy();
        expect(data.rows.length).toBe(2);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/custom/custom-1/execute`);
      expect(req.request.method).toBe('GET');
      req.flush(mockData);
    });
  });

  describe('deleteCustomReport', () => {
    it('should delete custom report for Admin', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      service.deleteCustomReport('custom-1').subscribe(() => {
        expect(true).toBe(true);
        done();
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/custom/custom-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });

    it('should throw error for non-Admin users', (done) => {
      authServiceSpy.isAdmin.and.returnValue(false);
      authServiceSpy.isCM.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockCMUser);

      service.deleteCustomReport('custom-1').subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Admin');
          done();
        }
      });
    });
  });

  describe('error handling', () => {
    it('should handle 400 Bad Request errors', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      service.generateProjectStatusReport(mockDateRange).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Invalid report parameters');
          done();
        }
      });

      const req = httpMock.expectOne((request) => 
        request.url === `${environment.apiUrl}/reporting/project-status`
      );
      req.flush('Bad Request', { status: 400, statusText: 'Bad Request' });
    });

    it('should handle 403 Forbidden errors', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      service.generateProjectStatusReport(mockDateRange).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('Access denied');
          done();
        }
      });

      const req = httpMock.expectOne((request) => 
        request.url === `${environment.apiUrl}/reporting/project-status`
      );
      req.flush('Forbidden', { status: 403, statusText: 'Forbidden' });
    });

    it('should handle 404 Not Found errors', (done) => {
      authServiceSpy.isAdmin.and.returnValue(true);
      authServiceSpy.getUser.and.returnValue(mockAdminUser);

      service.updateRecurringReport('non-existent', {}).subscribe({
        next: () => fail('should have failed'),
        error: (error) => {
          expect(error.message).toContain('not found');
          done();
        }
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/reporting/recurring/non-existent`);
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });
});
