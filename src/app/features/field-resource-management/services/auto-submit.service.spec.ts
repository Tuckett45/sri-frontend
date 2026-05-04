import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { AutoSubmitService } from './auto-submit.service';
import { AuditLoggingService } from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';
import { AutoSubmitConfig, AutoSubmitResult } from '../../../models/time-payroll.model';
import { TIMECARD_ENDPOINTS } from '../api/api-endpoints';

describe('AutoSubmitService', () => {
  let service: AutoSubmitService;
  let httpMock: HttpTestingController;
  let auditSpy: jasmine.SpyObj<AuditLoggingService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  /** Helper to create a minimal AutoSubmitConfig */
  function makeConfig(overrides: Partial<AutoSubmitConfig> = {}): AutoSubmitConfig {
    return {
      id: 'config-1',
      region: 'US-East',
      dayOfWeek: 'Friday',
      timeOfDay: '17:00',
      enabled: true,
      maxRetries: 3,
      retryIntervalMinutes: 5,
      updatedBy: 'admin',
      updatedAt: new Date('2024-01-01'),
      ...overrides
    };
  }

  beforeEach(() => {
    auditSpy = jasmine.createSpyObj('AuditLoggingService', ['logBudgetAdjustment']);
    authSpy = jasmine.createSpyObj('AuthService', ['getUser']);
    authSpy.getUser.and.returnValue({ id: 'manager-1', name: 'Test Manager' });

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AutoSubmitService,
        { provide: AuditLoggingService, useValue: auditSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(AutoSubmitService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── getConfig ─────────────────────────────────────────────────────

  describe('getConfig', () => {
    it('should fetch and map auto-submit config for a region', () => {
      const mockResponse = {
        id: 'config-1',
        region: 'US-East',
        dayOfWeek: 'Friday',
        timeOfDay: '17:00',
        enabled: true,
        maxRetries: 3,
        retryIntervalMinutes: 5,
        updatedBy: 'admin',
        updatedAt: '2024-01-01T00:00:00Z'
      };

      service.getConfig('US-East').subscribe(config => {
        expect(config.id).toBe('config-1');
        expect(config.region).toBe('US-East');
        expect(config.dayOfWeek).toBe('Friday');
        expect(config.timeOfDay).toBe('17:00');
        expect(config.enabled).toBeTrue();
        expect(config.maxRetries).toBe(3);
        expect(config.retryIntervalMinutes).toBe(5);
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getAutoSubmitConfig('US-East'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle PascalCase API response format', () => {
      const mockResponse = {
        Id: 'config-2',
        Region: 'US-West',
        DayOfWeek: 'Monday',
        TimeOfDay: '09:00',
        Enabled: false,
        MaxRetries: 2,
        RetryIntervalMinutes: 10,
        UpdatedBy: 'admin',
        UpdatedAt: '2024-02-01T00:00:00Z'
      };

      service.getConfig('US-West').subscribe(config => {
        expect(config.id).toBe('config-2');
        expect(config.region).toBe('US-West');
        expect(config.dayOfWeek).toBe('Monday');
        expect(config.enabled).toBeFalse();
        expect(config.maxRetries).toBe(2);
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getAutoSubmitConfig('US-West'));
      req.flush(mockResponse);
    });

    it('should handle API errors gracefully', () => {
      service.getConfig('US-East').subscribe({
        error: (err) => {
          expect(err.message).toContain('not found');
        }
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getAutoSubmitConfig('US-East'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  // ─── updateConfig ──────────────────────────────────────────────────

  describe('updateConfig', () => {
    it('should send PUT request and record audit log entry', () => {
      const config = makeConfig({ dayOfWeek: 'Thursday', timeOfDay: '16:00' });

      const mockResponse = {
        id: 'config-1',
        region: 'US-East',
        dayOfWeek: 'Thursday',
        timeOfDay: '16:00',
        enabled: true,
        maxRetries: 3,
        retryIntervalMinutes: 5,
        updatedBy: 'manager-1',
        updatedAt: '2024-02-01T00:00:00Z'
      };

      service.updateConfig('US-East', config).subscribe(savedConfig => {
        expect(savedConfig.dayOfWeek).toBe('Thursday');
        expect(savedConfig.timeOfDay).toBe('16:00');
        expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledTimes(1);

        const auditArgs = auditSpy.logBudgetAdjustment.calls.first().args;
        expect(auditArgs[0]).toBe('manager-1'); // userId
        expect(auditArgs[1]).toBe('Test Manager'); // userName
        expect(auditArgs[2]).toBe('AutoSubmitConfig:US-East'); // resourceId
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.updateAutoSubmitConfig('US-East'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.region).toBe('US-East');
      expect(req.request.body.dayOfWeek).toBe('Thursday');
      expect(req.request.body.timeOfDay).toBe('16:00');
      req.flush(mockResponse);
    });

    it('should handle server errors on update', () => {
      const config = makeConfig();

      service.updateConfig('US-East', config).subscribe({
        error: (err) => {
          expect(err.message).toContain('Server error');
        }
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.updateAutoSubmitConfig('US-East'));
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ─── executeAutoSubmit ─────────────────────────────────────────────

  describe('executeAutoSubmit', () => {
    it('should execute auto-submit and return results', () => {
      const mockResponse = [
        {
          periodId: 'period-1',
          technicianId: 'tech-1',
          success: true,
          attempt: 1,
          timestamp: '2024-02-01T17:00:00Z'
        },
        {
          periodId: 'period-2',
          technicianId: 'tech-2',
          success: true,
          attempt: 1,
          timestamp: '2024-02-01T17:00:00Z'
        }
      ];

      service.executeAutoSubmit().subscribe(results => {
        expect(results.length).toBe(2);
        expect(results[0].periodId).toBe('period-1');
        expect(results[0].success).toBeTrue();
        expect(results[1].periodId).toBe('period-2');
        expect(results[1].technicianId).toBe('tech-2');
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.executeAutoSubmit());
      expect(req.request.method).toBe('POST');
      req.flush(mockResponse);
    });

    it('should record audit log entries for each auto-submitted timecard', () => {
      const mockResponse = [
        {
          periodId: 'period-1',
          technicianId: 'tech-1',
          success: true,
          attempt: 1,
          timestamp: '2024-02-01T17:00:00Z'
        },
        {
          periodId: 'period-2',
          technicianId: 'tech-2',
          success: false,
          attempt: 1,
          error: 'Validation failed',
          timestamp: '2024-02-01T17:00:00Z'
        }
      ];

      service.executeAutoSubmit().subscribe(() => {
        expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledTimes(2);

        // Verify first audit entry contains "Auto-Submitted"
        const firstArgs = auditSpy.logBudgetAdjustment.calls.argsFor(0);
        expect(firstArgs[4]).toContain('submissionType: Auto-Submitted');
        expect(firstArgs[2]).toBe('Timecard:period-1');

        // Verify second audit entry
        const secondArgs = auditSpy.logBudgetAdjustment.calls.argsFor(1);
        expect(secondArgs[4]).toContain('submissionType: Auto-Submitted');
        expect(secondArgs[2]).toBe('Timecard:period-2');
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.executeAutoSubmit());
      req.flush(mockResponse);
    });

    it('should handle $values response format', () => {
      const mockResponse = {
        $values: [
          {
            periodId: 'period-1',
            technicianId: 'tech-1',
            success: true,
            attempt: 1,
            timestamp: '2024-02-01T17:00:00Z'
          }
        ]
      };

      service.executeAutoSubmit().subscribe(results => {
        expect(results.length).toBe(1);
        expect(results[0].periodId).toBe('period-1');
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.executeAutoSubmit());
      req.flush(mockResponse);
    });

    it('should handle API errors during auto-submit', () => {
      service.executeAutoSubmit().subscribe({
        error: (err) => {
          expect(err.message).toContain('Server error');
        }
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.executeAutoSubmit());
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ─── retryAutoSubmit ───────────────────────────────────────────────

  describe('retryAutoSubmit', () => {
    it('should reject when attempt exceeds max retries', () => {
      service.retryAutoSubmit('period-1', 4).subscribe({
        error: (err) => {
          expect(err.message).toContain('failed after 3 retries');
        }
      });
    });

    it('should reject at exactly max retries + 1', () => {
      service.retryAutoSubmit('period-1', 4).subscribe({
        error: (err) => {
          expect(err.message).toContain('period-1');
          expect(err.message).toContain('3 retries');
        }
      });
    });
  });
});
