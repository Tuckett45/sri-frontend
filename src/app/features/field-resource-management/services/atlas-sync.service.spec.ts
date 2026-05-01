import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Store } from '@ngrx/store';

import { AtlasSyncService } from './atlas-sync.service';
import { AuditLoggingService } from './audit-logging.service';
import { AuthService } from '../../../services/auth.service';
import { TimeEntry } from '../models/time-entry.model';
import { AtlasTimeEntryPayload, PendingSyncEntry } from '../../../models/time-payroll.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';
import { TIMECARD_ENDPOINTS } from '../api/api-endpoints';
import { syncToAtlasFailure } from '../state/atlas-sync/atlas-sync.actions';

describe('AtlasSyncService', () => {
  let service: AtlasSyncService;
  let httpMock: HttpTestingController;
  let auditSpy: jasmine.SpyObj<AuditLoggingService>;
  let authSpy: jasmine.SpyObj<AuthService>;
  let storeSpy: jasmine.SpyObj<Store>;

  /** Helper to create a minimal valid TimeEntry */
  function makeTimeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
    return {
      id: 'entry-1',
      jobId: 'job-1',
      technicianId: 'tech-1',
      clockInTime: new Date('2024-06-01T08:00:00Z'),
      clockOutTime: new Date('2024-06-01T16:00:00Z'),
      totalHours: 8,
      regularHours: 8,
      overtimeHours: 0,
      isManuallyAdjusted: false,
      isLocked: false,
      createdAt: new Date('2024-06-01T08:00:00Z'),
      updatedAt: new Date('2024-06-01T16:00:00Z'),
      timeCategory: TimeCategory.OnSite,
      payType: PayType.Regular,
      syncStatus: SyncStatus.Pending,
      ...overrides
    };
  }

  beforeEach(() => {
    auditSpy = jasmine.createSpyObj('AuditLoggingService', ['logBudgetAdjustment']);
    authSpy = jasmine.createSpyObj('AuthService', ['getUser']);
    authSpy.getUser.and.returnValue({ id: 'user-1', name: 'Test User' });
    storeSpy = jasmine.createSpyObj('Store', ['dispatch']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        AtlasSyncService,
        { provide: AuditLoggingService, useValue: auditSpy },
        { provide: AuthService, useValue: authSpy },
        { provide: Store, useValue: storeSpy }
      ]
    });

    service = TestBed.inject(AtlasSyncService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  // ─── serializeToAtlasPayload ──────────────────────────────────────

  describe('serializeToAtlasPayload', () => {
    it('should delegate to serializeTimeEntry and return a valid payload', () => {
      const entry = makeTimeEntry();
      const payload = service.serializeToAtlasPayload(entry);

      expect(payload.jobId).toBe('job-1');
      expect(payload.technicianId).toBe('tech-1');
      expect(payload.clockInTime).toBe(entry.clockInTime.toISOString());
      expect(payload.clockOutTime).toBe(entry.clockOutTime!.toISOString());
      expect(payload.timeCategory).toBe('OnSite');
      expect(payload.payType).toBe('Regular');
    });

    it('should include location fields when present', () => {
      const entry = makeTimeEntry({
        clockInLocation: { latitude: 40.7128, longitude: -74.006, accuracy: 10 },
        clockOutLocation: { latitude: 40.7130, longitude: -74.005, accuracy: 15 }
      });
      const payload = service.serializeToAtlasPayload(entry);

      expect(payload.clockInLatitude).toBe(40.7128);
      expect(payload.clockInLongitude).toBe(-74.006);
      expect(payload.clockOutLatitude).toBe(40.7130);
      expect(payload.clockOutLongitude).toBe(-74.005);
    });

    it('should include mileage and adjustmentReason when present', () => {
      const entry = makeTimeEntry({ mileage: 25.5, adjustmentReason: 'Corrected hours' });
      const payload = service.serializeToAtlasPayload(entry);

      expect(payload.mileage).toBe(25.5);
      expect(payload.adjustmentReason).toBe('Corrected hours');
    });
  });

  // ─── validateAtlasPayload ─────────────────────────────────────────

  describe('validateAtlasPayload', () => {
    it('should return valid for a correct payload', () => {
      const entry = makeTimeEntry();
      const payload = service.serializeToAtlasPayload(entry);
      const result = service.validateAtlasPayload(payload);

      expect(result.valid).toBeTrue();
    });

    it('should return invalid when jobId is missing', () => {
      const payload: AtlasTimeEntryPayload = {
        jobId: '',
        technicianId: 'tech-1',
        clockInTime: new Date().toISOString()
      };
      const result = service.validateAtlasPayload(payload);

      expect(result.valid).toBeFalse();
      expect(result.message).toContain('jobId');
    });

    it('should return invalid when technicianId is missing', () => {
      const payload: AtlasTimeEntryPayload = {
        jobId: 'job-1',
        technicianId: '',
        clockInTime: new Date().toISOString()
      };
      const result = service.validateAtlasPayload(payload);

      expect(result.valid).toBeFalse();
      expect(result.message).toContain('technicianId');
    });
  });

  // ─── syncTimeEntry ────────────────────────────────────────────────

  describe('syncTimeEntry', () => {
    it('should POST to the sync endpoint and return a mapped result', () => {
      const entry = makeTimeEntry();
      const mockResponse = {
        entryId: 'entry-1',
        success: true,
        httpStatus: 200,
        payloadHash: 'abc123',
        timestamp: '2024-06-01T16:30:00Z'
      };

      service.syncTimeEntry(entry).subscribe(result => {
        expect(result.entryId).toBe('entry-1');
        expect(result.success).toBeTrue();
        expect(result.httpStatus).toBe(200);
        expect(result.timestamp).toEqual(jasmine.any(Date));
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.syncTimeEntry('entry-1'));
      expect(req.request.method).toBe('POST');
      expect(req.request.body.jobId).toBe('job-1');
      expect(req.request.body.technicianId).toBe('tech-1');
      req.flush(mockResponse);
    });

    it('should log a success audit entry on successful sync', () => {
      const entry = makeTimeEntry();
      const mockResponse = {
        entryId: 'entry-1',
        success: true,
        httpStatus: 200,
        timestamp: '2024-06-01T16:30:00Z'
      };

      service.syncTimeEntry(entry).subscribe(() => {
        expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledTimes(1);
        const args = auditSpy.logBudgetAdjustment.calls.first().args;
        expect(args[0]).toBe('user-1');
        expect(args[1]).toBe('Test User');
        expect(args[2]).toBe('TimeEntry:entry-1');
        expect(args[4]).toContain('ATLAS sync succeeded');
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.syncTimeEntry('entry-1'));
      req.flush(mockResponse);
    });

    it('should log a failure audit entry and throw on HTTP error', () => {
      const entry = makeTimeEntry();

      service.syncTimeEntry(entry).subscribe({
        error: (err) => {
          expect(err.message).toContain('Server error');
          expect(auditSpy.logBudgetAdjustment).toHaveBeenCalledTimes(1);
          const args = auditSpy.logBudgetAdjustment.calls.first().args;
          expect(args[4]).toContain('ATLAS sync failed');
        }
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.syncTimeEntry('entry-1'));
      req.flush({ message: 'Internal error' }, { status: 500, statusText: 'Internal Server Error' });
    });

    it('should fail immediately if payload validation fails', () => {
      const entry = makeTimeEntry({ jobId: '' });

      service.syncTimeEntry(entry).subscribe({
        error: (err) => {
          expect(err.message).toContain('Payload validation failed');
        }
      });

      // No HTTP request should be made
      httpMock.expectNone(TIMECARD_ENDPOINTS.syncTimeEntry('entry-1'));
    });
  });

  // ─── queueForRetry ────────────────────────────────────────────────

  describe('queueForRetry', () => {
    it('should dispatch syncToAtlasFailure action to the store', () => {
      const entry = makeTimeEntry();

      service.queueForRetry(entry, 1);

      expect(storeSpy.dispatch).toHaveBeenCalledTimes(1);
      const dispatchedAction = storeSpy.dispatch.calls.first().args[0];
      expect(dispatchedAction.type).toBe('[Atlas Sync] Sync Failure');
      expect((dispatchedAction as any).entryId).toBe('entry-1');
      expect((dispatchedAction as any).attempt).toBe(1);
    });

    it('should include the attempt number in the dispatched action', () => {
      const entry = makeTimeEntry({ id: 'entry-2' });

      service.queueForRetry(entry, 3);

      const dispatchedAction = storeSpy.dispatch.calls.first().args[0];
      expect((dispatchedAction as any).attempt).toBe(3);
      expect((dispatchedAction as any).entryId).toBe('entry-2');
    });
  });

  // ─── getPendingSyncs ──────────────────────────────────────────────

  describe('getPendingSyncs', () => {
    it('should fetch and map pending sync entries', () => {
      const mockResponse = [
        {
          entryId: 'entry-1',
          payload: { jobId: 'job-1', technicianId: 'tech-1', clockInTime: '2024-06-01T08:00:00Z' },
          attempt: 1,
          maxAttempts: 3,
          nextRetryAt: '2024-06-01T16:32:00Z',
          lastError: 'Timeout'
        }
      ];

      service.getPendingSyncs().subscribe(entries => {
        expect(entries.length).toBe(1);
        expect(entries[0].entryId).toBe('entry-1');
        expect(entries[0].attempt).toBe(1);
        expect(entries[0].maxAttempts).toBe(3);
        expect(entries[0].lastError).toBe('Timeout');
        expect(entries[0].nextRetryAt).toEqual(jasmine.any(Date));
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getPendingSyncs());
      expect(req.request.method).toBe('GET');
      req.flush(mockResponse);
    });

    it('should handle $values response format', () => {
      const mockResponse = {
        $values: [
          {
            entryId: 'entry-2',
            payload: { jobId: 'job-2', technicianId: 'tech-2', clockInTime: '2024-06-01T09:00:00Z' },
            attempt: 0,
            maxAttempts: 3,
            nextRetryAt: '2024-06-01T17:00:00Z'
          }
        ]
      };

      service.getPendingSyncs().subscribe(entries => {
        expect(entries.length).toBe(1);
        expect(entries[0].entryId).toBe('entry-2');
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getPendingSyncs());
      req.flush(mockResponse);
    });

    it('should handle API errors gracefully', () => {
      service.getPendingSyncs().subscribe({
        error: (err) => {
          expect(err.message).toContain('Server error');
        }
      });

      const req = httpMock.expectOne(TIMECARD_ENDPOINTS.getPendingSyncs());
      req.flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
    });
  });

  // ─── detectPayloadMismatch ────────────────────────────────────────

  describe('detectPayloadMismatch', () => {
    it('should return null when local and remote match', () => {
      const entry = makeTimeEntry();
      const payload = service.serializeToAtlasPayload(entry);

      const result = service.detectPayloadMismatch(entry, payload);

      expect(result).toBeNull();
    });

    it('should return a SyncConflict when fields differ', () => {
      const entry = makeTimeEntry();
      const remotePayload: AtlasTimeEntryPayload = {
        ...service.serializeToAtlasPayload(entry),
        jobId: 'different-job'
      };

      const result = service.detectPayloadMismatch(entry, remotePayload);

      expect(result).not.toBeNull();
      expect(result!.entryId).toBe('entry-1');
      expect(result!.mismatchedFields).toContain('jobId');
      expect(result!.localValues['jobId']).toBe('job-1');
      expect(result!.remoteValues['jobId']).toBe('different-job');
    });

    it('should detect multiple mismatched fields', () => {
      const entry = makeTimeEntry();
      const remotePayload: AtlasTimeEntryPayload = {
        ...service.serializeToAtlasPayload(entry),
        jobId: 'different-job',
        technicianId: 'different-tech'
      };

      const result = service.detectPayloadMismatch(entry, remotePayload);

      expect(result).not.toBeNull();
      expect(result!.mismatchedFields.length).toBe(2);
      expect(result!.mismatchedFields).toContain('jobId');
      expect(result!.mismatchedFields).toContain('technicianId');
    });

    it('should detect mismatch in optional fields like mileage', () => {
      const entry = makeTimeEntry({ mileage: 50 });
      const remotePayload: AtlasTimeEntryPayload = {
        ...service.serializeToAtlasPayload(entry),
        mileage: 75
      };

      const result = service.detectPayloadMismatch(entry, remotePayload);

      expect(result).not.toBeNull();
      expect(result!.mismatchedFields).toContain('mileage');
      expect(result!.localValues['mileage']).toBe(50);
      expect(result!.remoteValues['mileage']).toBe(75);
    });
  });
});
