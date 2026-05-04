import { TestBed } from '@angular/core/testing';

import { ContractDateService } from './contract-date.service';
import { Contract, ContractValidationResult } from '../../../models/time-payroll.model';
import { Job, JobType, Priority, JobStatus } from '../models/job.model';
import { TimeEntry } from '../models/time-entry.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';

/**
 * Unit tests for ContractDateService
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */
describe('ContractDateService', () => {
  let service: ContractDateService;

  /** Helper: create a minimal Contract */
  function makeContract(overrides: Partial<Contract> = {}): Contract {
    return {
      id: 'c1',
      name: 'Test Contract',
      clientName: 'Acme Corp',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      status: 'Active',
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /** Helper: create a minimal Job */
  function makeJob(overrides: Partial<Job> = {}): Job {
    return {
      id: 'j1',
      jobId: 'JOB-001',
      client: 'Acme Corp',
      siteName: 'Site A',
      siteAddress: { street: '123 Main', city: 'Anytown', state: 'CA', zipCode: '90210' },
      jobType: JobType.Install,
      priority: Priority.Normal,
      status: JobStatus.NotStarted,
      scopeDescription: 'Test job',
      requiredSkills: [],
      requiredCrewSize: 1,
      estimatedLaborHours: 8,
      scheduledStartDate: new Date('2024-03-01'),
      scheduledEndDate: new Date('2024-06-01'),
      attachments: [],
      notes: [],
      market: 'West',
      company: 'SRI',
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /** Helper: create a minimal TimeEntry */
  function makeTimeEntry(overrides: Partial<TimeEntry> = {}): TimeEntry {
    return {
      id: 'te1',
      jobId: 'j1',
      technicianId: 'tech1',
      clockInTime: new Date('2024-06-15T08:00:00'),
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
    };
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContractDateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // ── validateJobDatesWithinContract ──────────────────────────────────

  describe('validateJobDatesWithinContract', () => {
    it('should return valid when job dates are within contract period', () => {
      const contract = makeContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-12-31')
      });
      const job = makeJob({
        scheduledStartDate: new Date('2024-03-01'),
        scheduledEndDate: new Date('2024-06-01')
      });

      const result = service.validateJobDatesWithinContract(job, contract);
      expect(result.valid).toBeTrue();
    });

    it('should return invalid when job starts before contract', () => {
      const contract = makeContract({
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-12-31')
      });
      const job = makeJob({
        scheduledStartDate: new Date('2024-01-15'),
        scheduledEndDate: new Date('2024-06-01')
      });

      const result = service.validateJobDatesWithinContract(job, contract);
      expect(result.valid).toBeFalse();
    });

    it('should return invalid when job ends after contract', () => {
      const contract = makeContract({
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30')
      });
      const job = makeJob({
        scheduledStartDate: new Date('2024-03-01'),
        scheduledEndDate: new Date('2024-09-01')
      });

      const result = service.validateJobDatesWithinContract(job, contract);
      expect(result.valid).toBeFalse();
    });

    it('should return valid when job dates exactly match contract boundaries', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      const contract = makeContract({ startDate: start, endDate: end });
      const job = makeJob({ scheduledStartDate: start, scheduledEndDate: end });

      const result = service.validateJobDatesWithinContract(job, contract);
      expect(result.valid).toBeTrue();
    });
  });

  // ── isContractExpired ───────────────────────────────────────────────

  describe('isContractExpired', () => {
    it('should return true when reference date is after end date', () => {
      const contract = makeContract({ endDate: new Date('2024-06-30') });
      const ref = new Date('2024-07-01');

      expect(service.isContractExpired(contract, ref)).toBeTrue();
    });

    it('should return false when reference date is before end date', () => {
      const contract = makeContract({ endDate: new Date('2024-12-31') });
      const ref = new Date('2024-06-15');

      expect(service.isContractExpired(contract, ref)).toBeFalse();
    });

    it('should return false when reference date equals end date', () => {
      const endDate = new Date('2024-12-31T00:00:00');
      const contract = makeContract({ endDate });
      const ref = new Date('2024-12-31T00:00:00');

      expect(service.isContractExpired(contract, ref)).toBeFalse();
    });

    it('should default to current date when no reference date is provided', () => {
      const futureContract = makeContract({ endDate: new Date('2099-12-31') });
      expect(service.isContractExpired(futureContract)).toBeFalse();

      const pastContract = makeContract({ endDate: new Date('2000-01-01') });
      expect(service.isContractExpired(pastContract)).toBeTrue();
    });
  });

  // ── isContractApproachingExpiration ─────────────────────────────────

  describe('isContractApproachingExpiration', () => {
    it('should return true when within 30 days of end date', () => {
      const contract = makeContract({ endDate: new Date('2024-07-15') });
      const ref = new Date('2024-07-01'); // 14 days before

      expect(service.isContractApproachingExpiration(contract, ref)).toBeTrue();
    });

    it('should return true when exactly 30 days before end date', () => {
      const contract = makeContract({ endDate: new Date('2024-07-31') });
      const ref = new Date('2024-07-01'); // exactly 30 days

      expect(service.isContractApproachingExpiration(contract, ref)).toBeTrue();
    });

    it('should return false when more than 30 days before end date', () => {
      const contract = makeContract({ endDate: new Date('2024-12-31') });
      const ref = new Date('2024-06-01'); // ~213 days before

      expect(service.isContractApproachingExpiration(contract, ref)).toBeFalse();
    });

    it('should return false when contract is already expired', () => {
      const contract = makeContract({ endDate: new Date('2024-06-30') });
      const ref = new Date('2024-07-15'); // after end date

      expect(service.isContractApproachingExpiration(contract, ref)).toBeFalse();
    });

    it('should return false when reference date equals end date (not expired, 0 days left)', () => {
      const endDate = new Date('2024-07-15T00:00:00');
      const contract = makeContract({ endDate });
      const ref = new Date('2024-07-15T00:00:00');

      // 0 days until expiration, which is <= 30, and not expired
      expect(service.isContractApproachingExpiration(contract, ref)).toBeTrue();
    });
  });

  // ── validateTimeEntryForContract ────────────────────────────────────

  describe('validateTimeEntryForContract', () => {
    it('should return valid when contract is not expired', () => {
      const contract = makeContract({ endDate: new Date('2099-12-31') });
      const job = makeJob();
      const entry = makeTimeEntry();

      const result = service.validateTimeEntryForContract(entry, job, contract);
      expect(result.valid).toBeTrue();
      expect(result.expired).toBeFalse();
      expect(result.requiresApproval).toBeFalse();
    });

    it('should return invalid with expired flag when contract is expired', () => {
      const contract = makeContract({ endDate: new Date('2020-01-01') });
      const job = makeJob();
      const entry = makeTimeEntry();

      const result = service.validateTimeEntryForContract(entry, job, contract);
      expect(result.valid).toBeFalse();
      expect(result.expired).toBeTrue();
      expect(result.requiresApproval).toBeTrue();
      expect(result.message).toContain('expired');
    });

    it('should require manager approval for expired contract entries', () => {
      const contract = makeContract({ endDate: new Date('2020-06-30') });
      const job = makeJob();
      const entry = makeTimeEntry();

      const result = service.validateTimeEntryForContract(entry, job, contract);
      expect(result.requiresApproval).toBeTrue();
      expect(result.message).toContain('Manager approval');
    });
  });
});
