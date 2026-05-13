import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { PayClassificationService } from './pay-classification.service';
import { AuditLoggingService } from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';
import { PayType, TimeCategory, SyncStatus } from '../../../models/time-payroll.enum';
import { Holiday } from '../../../models/time-payroll.model';
import { TimeEntry } from '../models/time-entry.model';

describe('PayClassificationService', () => {
  let service: PayClassificationService;
  let httpMock: HttpTestingController;
  let auditSpy: jasmine.SpyObj<AuditLoggingService>;
  let authSpy: jasmine.SpyObj<AuthService>;

  const mockUser = { id: 'user-1', name: 'Test User', market: 'ALL' };

  /**
   * Helper: build a local-time Date from 'YYYY-MM-DD' to avoid UTC-shift issues.
   */
  const localDate = (dateStr: string): Date => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const makeHoliday = (dateStr: string, name = 'Holiday'): Holiday => ({
    id: `h-${dateStr}`,
    name,
    date: localDate(dateStr),
    isRecurring: false,
    createdBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const makeEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
    id: 'entry-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date('2025-06-15T08:00:00'),
    clockOutTime: new Date('2025-06-15T16:00:00'),
    totalHours: 8,
    regularHours: 8,
    overtimeHours: 0,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Synced,
    ...overrides
  });

  beforeEach(() => {
    auditSpy = jasmine.createSpyObj('AuditLoggingService', ['logBudgetAdjustment']);
    authSpy = jasmine.createSpyObj('AuthService', ['getUser', 'isCM']);
    authSpy.getUser.and.returnValue(mockUser);
    authSpy.isCM.and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PayClassificationService,
        { provide: AuditLoggingService, useValue: auditSpy },
        { provide: AuthService, useValue: authSpy }
      ]
    });

    service = TestBed.inject(PayClassificationService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── classifyPayType ────────────────────────────────────────────

  describe('classifyPayType', () => {
    it('should return Holiday when date matches a holiday', () => {
      const holidays = [makeHoliday('2025-12-25', 'Christmas')];
      const result = service.classifyPayType(localDate('2025-12-25'), 'tech-1', holidays);
      expect(result).toBe(PayType.Holiday);
    });

    it('should return Regular when date does not match any holiday', () => {
      const holidays = [makeHoliday('2025-12-25', 'Christmas')];
      const result = service.classifyPayType(localDate('2025-06-15'), 'tech-1', holidays);
      expect(result).toBe(PayType.Regular);
    });

    it('should return Regular when holiday list is empty', () => {
      const result = service.classifyPayType(localDate('2025-12-25'), 'tech-1', []);
      expect(result).toBe(PayType.Regular);
    });

    it('should match holidays by calendar date ignoring time', () => {
      const holidays = [makeHoliday('2025-07-04')];
      const dateWithTime = new Date(2025, 6, 4, 14, 30, 0); // July 4 at 14:30 local
      const result = service.classifyPayType(dateWithTime, 'tech-1', holidays);
      expect(result).toBe(PayType.Holiday);
    });
  });

  // ─── isHoliday ──────────────────────────────────────────────────

  describe('isHoliday', () => {
    it('should return true for a matching holiday date', () => {
      const holidays = [makeHoliday('2025-01-01', 'New Year')];
      expect(service.isHoliday(localDate('2025-01-01'), holidays)).toBeTrue();
    });

    it('should return false for a non-holiday date', () => {
      const holidays = [makeHoliday('2025-01-01', 'New Year')];
      expect(service.isHoliday(localDate('2025-01-02'), holidays)).toBeFalse();
    });

    it('should handle multiple holidays', () => {
      const holidays = [
        makeHoliday('2025-01-01', 'New Year'),
        makeHoliday('2025-07-04', 'Independence Day'),
        makeHoliday('2025-12-25', 'Christmas')
      ];
      expect(service.isHoliday(localDate('2025-07-04'), holidays)).toBeTrue();
      expect(service.isHoliday(localDate('2025-03-15'), holidays)).toBeFalse();
    });
  });

  // ─── validatePtoEntry ───────────────────────────────────────────

  describe('validatePtoEntry', () => {
    it('should return valid when no PTO conflict exists', () => {
      const entries = [makeEntry({ payType: PayType.Regular })];
      const result = service.validatePtoEntry(localDate('2025-06-16'), 'tech-1', entries);
      expect(result.valid).toBeTrue();
    });

    it('should return invalid when a PTO entry exists for the same date', () => {
      const entries = [
        makeEntry({
          payType: PayType.PTO,
          clockInTime: new Date(2025, 5, 15, 0, 0, 0) // June 15 local
        })
      ];
      const result = service.validatePtoEntry(localDate('2025-06-15'), 'tech-1', entries);
      expect(result.valid).toBeFalse();
      expect(result.message).toContain('PTO');
    });

    it('should return valid when PTO exists on a different date', () => {
      const entries = [
        makeEntry({
          payType: PayType.PTO,
          clockInTime: new Date(2025, 5, 14, 0, 0, 0) // June 14 local
        })
      ];
      const result = service.validatePtoEntry(localDate('2025-06-15'), 'tech-1', entries);
      expect(result.valid).toBeTrue();
    });

    it('should return valid when entries list is empty', () => {
      const result = service.validatePtoEntry(localDate('2025-06-15'), 'tech-1', []);
      expect(result.valid).toBeTrue();
    });
  });

  // ─── requestPto ─────────────────────────────────────────────────

  describe('requestPto', () => {
    it('should create a PTO entry with correct payType and hours', () => {
      const date = new Date('2025-06-20');
      const hours = 8;

      service.requestPto('tech-1', date, hours).subscribe(entry => {
        expect(entry.payType).toBe(PayType.PTO);
        expect(entry.totalHours).toBe(hours);
        expect(entry.technicianId).toBe('tech-1');
        expect(entry.timeCategory).toBe(TimeCategory.OnSite);
      });

      const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/time-entries'));
      expect(req.request.body.payType).toBe(PayType.PTO);
      expect(req.request.body.totalHours).toBe(hours);

      req.flush({
        id: 'new-entry-1',
        technicianId: 'tech-1',
        jobId: 'PTO',
        totalHours: hours,
        payType: PayType.PTO,
        timeCategory: TimeCategory.OnSite,
        syncStatus: SyncStatus.Pending
      });
    });

    it('should log an audit entry on successful PTO request', () => {
      service.requestPto('tech-1', new Date('2025-06-20'), 8).subscribe();

      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush({ id: 'new-entry-1', totalHours: 8 });

      expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledOnceWith(
        'user-1',
        'Test User',
        'PTO:tech-1',
        8,
        jasmine.stringContaining('PTO requested'),
        0,
        8
      );
    });
  });

  // ─── getHolidays ────────────────────────────────────────────────

  describe('getHolidays', () => {
    it('should return mapped holidays from API', () => {
      service.getHolidays().subscribe(holidays => {
        expect(holidays.length).toBe(2);
        expect(holidays[0].name).toBe('New Year');
        expect(holidays[1].name).toBe('Christmas');
      });

      const req = httpMock.expectOne(r => r.url.includes('/holidays'));
      req.flush([
        { id: 'h1', name: 'New Year', date: '2025-01-01', isRecurring: true, createdBy: 'admin' },
        { id: 'h2', name: 'Christmas', date: '2025-12-25', isRecurring: true, createdBy: 'admin' }
      ]);
    });

    it('should handle $values response format', () => {
      service.getHolidays().subscribe(holidays => {
        expect(holidays.length).toBe(1);
      });

      const req = httpMock.expectOne(r => r.url.includes('/holidays'));
      req.flush({
        $values: [
          { id: 'h1', name: 'New Year', date: '2025-01-01', isRecurring: true, createdBy: 'admin' }
        ]
      });
    });
  });

  // ─── saveHolidays ───────────────────────────────────────────────

  describe('saveHolidays', () => {
    it('should POST holidays and return mapped result', () => {
      const holidays = [makeHoliday('2025-01-01', 'New Year')];

      service.saveHolidays(holidays).subscribe(result => {
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('New Year');
      });

      const req = httpMock.expectOne(r => r.method === 'POST' && r.url.includes('/holidays'));
      req.flush([
        { id: 'h1', name: 'New Year', date: '2025-01-01', isRecurring: false, createdBy: 'admin' }
      ]);
    });

    it('should log an audit entry on save', () => {
      const holidays = [makeHoliday('2025-01-01'), makeHoliday('2025-12-25')];

      service.saveHolidays(holidays).subscribe();

      const req = httpMock.expectOne(r => r.method === 'POST');
      req.flush([]);

      expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledOnceWith(
        'user-1',
        'Test User',
        'holidays',
        2,
        'Holiday calendar updated',
        0,
        2
      );
    });
  });

  // ─── flagAffectedEntries ────────────────────────────────────────

  describe('flagAffectedEntries', () => {
    it('should return entries matching the old holiday date', () => {
      const oldDate = localDate('2025-07-04');
      const newDate = localDate('2025-07-05');

      service.flagAffectedEntries(oldDate, newDate).subscribe(entries => {
        expect(entries.length).toBe(1);
        expect(entries[0].id).toBe('entry-match');
      });

      const req = httpMock.expectOne(r => r.url.includes('/time-entries'));
      // Use ISO strings with explicit time so they parse consistently
      req.flush([
        {
          id: 'entry-match',
          jobId: 'job-1',
          technicianId: 'tech-1',
          clockInTime: new Date(2025, 6, 4, 8, 0, 0).toISOString(),
          clockOutTime: new Date(2025, 6, 4, 16, 0, 0).toISOString(),
          isManuallyAdjusted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'entry-no-match',
          jobId: 'job-2',
          technicianId: 'tech-2',
          clockInTime: new Date(2025, 6, 3, 8, 0, 0).toISOString(),
          clockOutTime: new Date(2025, 6, 3, 16, 0, 0).toISOString(),
          isManuallyAdjusted: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    });

    it('should return empty array when no entries match', () => {
      service.flagAffectedEntries(localDate('2025-07-04'), localDate('2025-07-05')).subscribe(entries => {
        expect(entries.length).toBe(0);
      });

      const req = httpMock.expectOne(r => r.url.includes('/time-entries'));
      req.flush([]);
    });
  });
});
