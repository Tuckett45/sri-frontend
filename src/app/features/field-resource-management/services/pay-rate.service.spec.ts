import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PayRateService } from './pay-rate.service';
import { AuditLoggingService } from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';
import { TimeEntry } from '../models/time-entry.model';
import { TechnicianRole } from '../models/technician.model';
import { UserPayRate, PayRateChange, RoleLevelPayRate } from '../../../models/time-payroll.model';
import { PayType, TimeCategory, SyncStatus } from '../../../models/time-payroll.enum';
import { TIMECARD_ENDPOINTS } from '../api/api-endpoints';

describe('PayRateService', () => {
  let service: PayRateService;
  let httpMock: HttpTestingController;
  let auditSpy: jasmine.SpyObj<AuditLoggingService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  /** Helper to create a minimal TimeEntry for testing */
  function makeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
    return {
      id: 'entry-1',
      jobId: 'job-1',
      technicianId: 'tech-1',
      clockInTime: new Date('2024-01-15T08:00:00'),
      totalHours: 8,
      regularHours: 8,
      overtimeHours: 0,
      isManuallyAdjusted: false,
      isLocked: false,
      createdAt: new Date('2024-01-15T08:00:00'),
      updatedAt: new Date('2024-01-15T16:00:00'),
      timeCategory: TimeCategory.OnSite,
      payType: PayType.Regular,
      syncStatus: SyncStatus.Synced,
      ...overrides
    };
  }

  /** Helper to create a minimal UserPayRate */
  function makePayRate(overrides: Partial<UserPayRate> = {}): UserPayRate {
    return {
      id: 'rate-1',
      technicianId: 'tech-1',
      roleLevel: TechnicianRole.Level1,
      standardHourlyRate: 25,
      overtimeHourlyRate: 37.5,
      effectiveDate: new Date('2024-01-01'),
      createdBy: 'admin',
      createdAt: new Date('2024-01-01'),
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
        PayRateService,
        { provide: AuditLoggingService, useValue: auditSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(PayRateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── getPayRate ────────────────────────────────────────────────────

  describe('getPayRate', () => {
    it('should fetch and map a pay rate for a technician', () => {
      const mockResponse = {
        id: 'rate-1',
        technicianId: 'tech-1',
        roleLevel: 'Level2',
        standardHourlyRate: 30,
        overtimeHourlyRate: 45,
        effectiveDate: '2024-01-01T00:00:00Z',
        createdBy: 'admin',
        createdAt: '2024-01-01T00:00:00Z'
      };

      service.getPayRate('tech-1').subscribe(rate => {
        expect(rate.id).toBe('rate-1');
        expect(rate.technicianId).toBe('tech-1');
        expect(rate.standardHourlyRate).toBe(30);
        expect(rate.overtimeHourlyRate).toBe(45);
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getPayRate('tech-1'));
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle API errors gracefully', () => {
      service.getPayRate('tech-1').subscribe({
        error: (err) => {
          expect(err.message).toContain('not found');
        }
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getPayRate('tech-1'));
      req.flush('Not Found', { status: 404, statusText: 'Not Found' });
    });
  });

  // ─── setPayRate ────────────────────────────────────────────────────

  describe('setPayRate', () => {
    it('should send PUT request and record audit log entry', () => {
      const rate = makePayRate({ standardHourlyRate: 25, overtimeHourlyRate: 37.5 });
      const effectiveDate = new Date('2024-02-01');

      const mockResponse = {
        id: 'rate-2',
        technicianId: 'tech-1',
        roleLevel: 'Level1',
        standardHourlyRate: 25,
        overtimeHourlyRate: 37.5,
        effectiveDate: '2024-02-01T00:00:00Z',
        createdBy: 'manager-1',
        createdAt: '2024-02-01T00:00:00Z'
      };

      service.setPayRate('tech-1', rate, effectiveDate).subscribe(savedRate => {
        expect(savedRate.standardHourlyRate).toBe(25);
        expect(savedRate.overtimeHourlyRate).toBe(37.5);
        expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledTimes(1);

        // Verify audit log was called with correct parameters
        const auditArgs = auditSpy.logBudgetAdjustment.calls.first().args;
        expect(auditArgs[0]).toBe('manager-1'); // userId
        expect(auditArgs[1]).toBe('Test Manager'); // userName
        expect(auditArgs[2]).toBe('PayRate:tech-1'); // resourceId
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.setPayRate('tech-1'));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.technicianId).toBe('tech-1');
      expect(req.request.body.effectiveDate).toBe(effectiveDate.toISOString());
      req.flush(mockResponse);
    });
  });

  // ─── getDefaultRates ───────────────────────────────────────────────

  describe('getDefaultRates', () => {
    it('should fetch and map default rates for all role levels', () => {
      const mockResponse = [
        { roleLevel: 'Level1', standardHourlyRate: 20, overtimeHourlyRate: 30, updatedBy: 'admin', updatedAt: '2024-01-01' },
        { roleLevel: 'Level2', standardHourlyRate: 25, overtimeHourlyRate: 37.5, updatedBy: 'admin', updatedAt: '2024-01-01' }
      ];

      service.getDefaultRates().subscribe(rates => {
        expect(rates.length).toBe(2);
        expect(rates[0].standardHourlyRate).toBe(20);
        expect(rates[1].standardHourlyRate).toBe(25);
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getDefaultRates());
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle $values response format', () => {
      const mockResponse = {
        $values: [
          { roleLevel: 'Installer', standardHourlyRate: 18, overtimeHourlyRate: 27, updatedBy: 'admin', updatedAt: '2024-01-01' }
        ]
      };

      service.getDefaultRates().subscribe(rates => {
        expect(rates.length).toBe(1);
        expect(rates[0].standardHourlyRate).toBe(18);
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getDefaultRates());
      req.flush(mockResponse);
    });
  });

  // ─── setDefaultRate ────────────────────────────────────────────────

  describe('setDefaultRate', () => {
    it('should send PUT request and record audit log', () => {
      const rate: RoleLevelPayRate = {
        roleLevel: TechnicianRole.Lead,
        standardHourlyRate: 35,
        overtimeHourlyRate: 52.5,
        updatedBy: 'admin',
        updatedAt: new Date()
      };

      const mockResponse = {
        roleLevel: 'Lead',
        standardHourlyRate: 35,
        overtimeHourlyRate: 52.5,
        updatedBy: 'manager-1',
        updatedAt: '2024-02-01'
      };

      service.setDefaultRate(TechnicianRole.Lead, rate).subscribe(savedRate => {
        expect(savedRate.standardHourlyRate).toBe(35);
        expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledTimes(1);
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.setDefaultRate());
      expect(req.request.method).toBe('PUT');
      expect(req.request.body.roleLevel).toBe(TechnicianRole.Lead);
      req.flush(mockResponse);
    });
  });

  // ─── calculateLaborCost ────────────────────────────────────────────

  describe('calculateLaborCost', () => {
    it('should calculate labor cost for regular hours only', () => {
      const entries = [
        makeEntry({ regularHours: 8, overtimeHours: 0 }),
        makeEntry({ id: 'entry-2', regularHours: 8, overtimeHours: 0 })
      ];
      const payRate = makePayRate({ standardHourlyRate: 25, overtimeHourlyRate: 37.5 });

      const result = service.calculateLaborCost(entries, payRate);

      expect(result.regularHours).toBe(16);
      expect(result.overtimeHours).toBe(0);
      expect(result.regularCost).toBe(400); // 16 * 25
      expect(result.overtimeCost).toBe(0);
      expect(result.totalCost).toBe(400);
      expect(result.technicianId).toBe('tech-1');
    });

    it('should calculate labor cost with overtime hours', () => {
      const entries = [
        makeEntry({ regularHours: 8, overtimeHours: 2 })
      ];
      const payRate = makePayRate({ standardHourlyRate: 25, overtimeHourlyRate: 37.5 });

      const result = service.calculateLaborCost(entries, payRate);

      expect(result.regularHours).toBe(8);
      expect(result.overtimeHours).toBe(2);
      expect(result.regularCost).toBe(200); // 8 * 25
      expect(result.overtimeCost).toBe(75); // 2 * 37.5
      expect(result.totalCost).toBe(275);
    });

    it('should return zero costs for empty entries', () => {
      const payRate = makePayRate();

      const result = service.calculateLaborCost([], payRate);

      expect(result.regularHours).toBe(0);
      expect(result.overtimeHours).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.technicianId).toBe('tech-1'); // from payRate
    });

    it('should fall back to totalHours when regularHours is undefined', () => {
      const entries = [
        makeEntry({ totalHours: 10, regularHours: undefined, overtimeHours: 0 })
      ];
      const payRate = makePayRate({ standardHourlyRate: 20 });

      const result = service.calculateLaborCost(entries, payRate);

      expect(result.regularHours).toBe(10);
      expect(result.regularCost).toBe(200); // 10 * 20
    });
  });

  // ─── resolvePayRateForEntry ────────────────────────────────────────

  describe('resolvePayRateForEntry', () => {
    it('should resolve the most recent applicable rate', () => {
      const entry = makeEntry({ createdAt: new Date('2024-03-15') });
      const rateHistory: PayRateChange[] = [
        {
          id: 'change-1',
          technicianId: 'tech-1',
          previousStandardRate: 20,
          previousOvertimeRate: 30,
          newStandardRate: 25,
          newOvertimeRate: 37.5,
          effectiveDate: new Date('2024-01-01'),
          changedBy: 'admin',
          changedAt: new Date('2024-01-01')
        },
        {
          id: 'change-2',
          technicianId: 'tech-1',
          previousStandardRate: 25,
          previousOvertimeRate: 37.5,
          newStandardRate: 30,
          newOvertimeRate: 45,
          effectiveDate: new Date('2024-03-01'),
          changedBy: 'admin',
          changedAt: new Date('2024-03-01')
        }
      ];

      const result = service.resolvePayRateForEntry(entry, rateHistory);

      expect(result).toBeDefined();
      expect(result!.standardHourlyRate).toBe(30);
      expect(result!.overtimeHourlyRate).toBe(45);
    });

    it('should return undefined when no applicable rate exists', () => {
      const entry = makeEntry({ createdAt: new Date('2023-01-01') });
      const rateHistory: PayRateChange[] = [
        {
          id: 'change-1',
          technicianId: 'tech-1',
          previousStandardRate: 0,
          previousOvertimeRate: 0,
          newStandardRate: 25,
          newOvertimeRate: 37.5,
          effectiveDate: new Date('2024-01-01'),
          changedBy: 'admin',
          changedAt: new Date('2024-01-01')
        }
      ];

      const result = service.resolvePayRateForEntry(entry, rateHistory);

      expect(result).toBeUndefined();
    });

    it('should return the only rate when entry is created on the effective date', () => {
      const entry = makeEntry({ createdAt: new Date('2024-01-01') });
      const rateHistory: PayRateChange[] = [
        {
          id: 'change-1',
          technicianId: 'tech-1',
          previousStandardRate: 0,
          previousOvertimeRate: 0,
          newStandardRate: 25,
          newOvertimeRate: 37.5,
          effectiveDate: new Date('2024-01-01'),
          changedBy: 'admin',
          changedAt: new Date('2024-01-01')
        }
      ];

      const result = service.resolvePayRateForEntry(entry, rateHistory);

      expect(result).toBeDefined();
      expect(result!.standardHourlyRate).toBe(25);
    });
  });
});
