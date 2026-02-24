import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SystemConfigurationService } from './system-configuration.service';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environments';
import {
  SystemConfiguration,
  ConfigurationUpdateRequest,
  MarketDefinition,
  MarketDefinitionUpdateRequest,
  ConfigurationHistoryEntry,
  ConfigurationExport
} from '../models/system-configuration.model';
import { WorkflowConfiguration } from '../models/workflow.model';
import { UserRole } from '../models/role.enum';

describe('SystemConfigurationService', () => {
  let service: SystemConfigurationService;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  const mockUser = {
    id: 'admin-1',
    name: 'Admin User',
    email: 'admin@test.com',
    role: UserRole.Admin,
    market: 'ALL'
  };

  beforeEach(() => {
    const authServiceSpy = jasmine.createSpyObj('AuthService', ['isAdmin', 'getUser']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        SystemConfigurationService,
        { provide: AuthService, useValue: authServiceSpy }
      ]
    });

    service = TestBed.inject(SystemConfigurationService);
    httpMock = TestBed.inject(HttpTestingController);
    authService = TestBed.inject(AuthService) as jasmine.SpyObj<AuthService>;

    // Default to admin user
    authService.isAdmin.and.returnValue(true);
    authService.getUser.and.returnValue(mockUser);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('getConfiguration', () => {
    it('should retrieve system configuration settings', () => {
      const mockConfigs: SystemConfiguration[] = [
        {
          key: 'max_upload_size',
          value: 10485760,
          category: 'file_management',
          dataType: 'number',
          isEditable: true
        },
        {
          key: 'session_timeout',
          value: 3600,
          category: 'security',
          dataType: 'number',
          isEditable: true
        }
      ];

      service.getConfiguration().subscribe(configs => {
        expect(configs).toEqual(mockConfigs);
        expect(configs.length).toBe(2);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/settings`);
      expect(req.request.method).toBe('GET');
      req.flush(mockConfigs);
    });

    it('should apply filters when provided', () => {
      const filters = {
        category: 'security',
        isEditable: true,
        searchTerm: 'timeout'
      };

      service.getConfiguration(filters).subscribe();

      const req = httpMock.expectOne(
        `${environment.apiUrl}/system-configuration/settings?category=security&isEditable=true&search=timeout`
      );
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });

    it('should throw error if user is not admin', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.getConfiguration()).toThrowError('Unauthorized: Admin access required');
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration with validation', () => {
      const request: ConfigurationUpdateRequest = {
        key: 'max_upload_size',
        value: 20971520,
        reason: 'Increased for large file uploads',
        applyImmediately: true
      };

      const mockResponse: SystemConfiguration = {
        key: 'max_upload_size',
        value: 20971520,
        category: 'file_management',
        dataType: 'number',
        isEditable: true,
        lastModifiedBy: 'admin-1',
        lastModifiedAt: new Date()
      };

      service.updateConfiguration(request).subscribe(config => {
        expect(config.key).toBe('max_upload_size');
        expect(config.value).toBe(20971520);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/settings/max_upload_size`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should validate required fields', (done) => {
      const invalidRequest: ConfigurationUpdateRequest = {
        key: '',
        value: undefined as any
      };

      service.updateConfiguration(invalidRequest).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Configuration key and value are required');
          done();
        }
      });
    });

    it('should throw error if user is not admin', () => {
      authService.isAdmin.and.returnValue(false);

      const request: ConfigurationUpdateRequest = {
        key: 'test',
        value: 'value'
      };

      expect(() => service.updateConfiguration(request)).toThrowError('Unauthorized: Admin access required');
    });
  });

  describe('getMarketDefinitions', () => {
    it('should retrieve market definitions', () => {
      const mockMarkets: MarketDefinition[] = [
        {
          marketCode: 'NYC',
          marketName: 'New York City',
          isActive: true,
          filteringRules: []
        },
        {
          marketCode: 'LAX',
          marketName: 'Los Angeles',
          isActive: true,
          filteringRules: []
        }
      ];

      service.getMarketDefinitions().subscribe(markets => {
        expect(markets).toEqual(mockMarkets);
        expect(markets.length).toBe(2);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/markets`);
      expect(req.request.method).toBe('GET');
      req.flush(mockMarkets);
    });

    it('should throw error if user is not admin', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.getMarketDefinitions()).toThrowError('Unauthorized: Admin access required');
    });
  });

  describe('updateMarketDefinitions', () => {
    it('should update market definitions with filtering rules', () => {
      const request: MarketDefinitionUpdateRequest = {
        marketCode: 'NYC',
        updates: {
          marketName: 'New York City Metro',
          filteringRules: [
            {
              ruleType: 'exclude',
              entityType: 'street_sheet',
              conditions: { marketType: 'RG' },
              priority: 1
            }
          ]
        },
        reason: 'Updated filtering rules for RG markets'
      };

      const mockResponse: MarketDefinition = {
        marketCode: 'NYC',
        marketName: 'New York City Metro',
        isActive: true,
        filteringRules: request.updates.filteringRules!
      };

      service.updateMarketDefinitions(request).subscribe(market => {
        expect(market.marketCode).toBe('NYC');
        expect(market.marketName).toBe('New York City Metro');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/markets/NYC`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(request);
      req.flush(mockResponse);
    });

    it('should validate market code is provided', (done) => {
      const invalidRequest: MarketDefinitionUpdateRequest = {
        marketCode: '',
        updates: {}
      };

      service.updateMarketDefinitions(invalidRequest).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Market code is required');
          done();
        }
      });
    });
  });

  describe('getApprovalWorkflows', () => {
    it('should retrieve approval workflow configurations', () => {
      const mockWorkflows: WorkflowConfiguration[] = [
        {
          workflowType: 'street_sheet_approval',
          name: 'Street Sheet Approval',
          approvalLevels: [
            { level: 1, requiredRole: 'CM', marketScoped: true }
          ],
          escalationRules: [],
          notificationSettings: {
            notifyOnSubmission: true,
            notifyOnApproval: true,
            notifyOnRejection: true,
            notifyOnEscalation: true
          },
          isActive: true
        }
      ];

      service.getApprovalWorkflows().subscribe(workflows => {
        expect(workflows).toEqual(mockWorkflows);
        expect(workflows.length).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/workflows`);
      expect(req.request.method).toBe('GET');
      req.flush(mockWorkflows);
    });
  });

  describe('updateApprovalWorkflows', () => {
    it('should update workflow configuration with validation', () => {
      const config: WorkflowConfiguration = {
        id: 'workflow-1',
        workflowType: 'street_sheet_approval',
        name: 'Street Sheet Approval',
        approvalLevels: [
          { level: 1, requiredRole: 'CM', marketScoped: true },
          { level: 2, requiredRole: 'Admin', marketScoped: false }
        ],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true
        },
        isActive: true
      };

      service.updateApprovalWorkflows(config).subscribe(workflow => {
        expect(workflow.workflowType).toBe('street_sheet_approval');
        expect(workflow.approvalLevels.length).toBe(2);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/workflows/workflow-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(config);
      req.flush(config);
    });

    it('should create new workflow if no id provided', () => {
      const config: WorkflowConfiguration = {
        workflowType: 'new_workflow',
        name: 'New Workflow',
        approvalLevels: [
          { level: 1, requiredRole: 'CM', marketScoped: true }
        ],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true
        },
        isActive: true
      };

      service.updateApprovalWorkflows(config).subscribe();

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/workflows`);
      expect(req.request.method).toBe('POST');
      req.flush(config);
    });

    it('should validate workflow configuration', (done) => {
      const invalidConfig: WorkflowConfiguration = {
        workflowType: '',
        name: '',
        approvalLevels: [],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: false,
          notifyOnApproval: false,
          notifyOnRejection: false,
          notifyOnEscalation: false
        },
        isActive: true
      };

      service.updateApprovalWorkflows(invalidConfig).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Workflow validation failed');
          done();
        }
      });
    });

    it('should validate approval level sequence', (done) => {
      const invalidConfig: WorkflowConfiguration = {
        workflowType: 'test',
        name: 'Test',
        approvalLevels: [
          { level: 1, requiredRole: 'CM', marketScoped: true },
          { level: 3, requiredRole: 'Admin', marketScoped: false } // Missing level 2
        ],
        escalationRules: [],
        notificationSettings: {
          notifyOnSubmission: true,
          notifyOnApproval: true,
          notifyOnRejection: true,
          notifyOnEscalation: true
        },
        isActive: true
      };

      service.updateApprovalWorkflows(invalidConfig).subscribe({
        next: () => fail('Should have thrown error'),
        error: (error) => {
          expect(error.message).toContain('Missing level 2');
          done();
        }
      });
    });
  });

  describe('exportConfiguration', () => {
    it('should export configuration for backup', () => {
      const mockExport: ConfigurationExport = {
        exportedAt: new Date(),
        exportedBy: 'admin-1',
        version: '1.0',
        configurations: [],
        marketDefinitions: []
      };

      service.exportConfiguration().subscribe(exportData => {
        expect(exportData.exportedBy).toBe('admin-1');
        expect(exportData.version).toBe('1.0');
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/export`);
      expect(req.request.method).toBe('GET');
      req.flush(mockExport);
    });
  });

  describe('getConfigurationHistory', () => {
    it('should retrieve configuration history with audit trail', () => {
      const mockHistory: ConfigurationHistoryEntry[] = [
        {
          id: 'history-1',
          configurationKey: 'max_upload_size',
          previousValue: 10485760,
          newValue: 20971520,
          changedBy: 'admin-1',
          changedByName: 'Admin User',
          changedAt: new Date(),
          reason: 'Increased for large files',
          changeType: 'update'
        }
      ];

      service.getConfigurationHistory().subscribe(history => {
        expect(history).toEqual(mockHistory);
        expect(history.length).toBe(1);
      });

      const req = httpMock.expectOne(`${environment.apiUrl}/system-configuration/history`);
      expect(req.request.method).toBe('GET');
      req.flush(mockHistory);
    });

    it('should apply filters to history query', () => {
      const fromDate = new Date('2024-01-01');
      const toDate = new Date('2024-12-31');

      service.getConfigurationHistory('max_upload_size', fromDate, toDate).subscribe();

      const expectedUrl = `${environment.apiUrl}/system-configuration/history?key=max_upload_size&from=${fromDate.toISOString()}&to=${toDate.toISOString()}`;
      const req = httpMock.expectOne(expectedUrl);
      expect(req.request.method).toBe('GET');
      req.flush([]);
    });
  });

  describe('authorization', () => {
    it('should enforce admin-only access for all methods', () => {
      authService.isAdmin.and.returnValue(false);

      expect(() => service.getConfiguration()).toThrowError('Unauthorized: Admin access required');
      expect(() => service.getMarketDefinitions()).toThrowError('Unauthorized: Admin access required');
      expect(() => service.getApprovalWorkflows()).toThrowError('Unauthorized: Admin access required');
      expect(() => service.exportConfiguration()).toThrowError('Unauthorized: Admin access required');
      expect(() => service.getConfigurationHistory()).toThrowError('Unauthorized: Admin access required');
    });
  });
});
