import { BillRateService } from './bill-rate.service';
import { TimeEntry } from '../models/time-entry.model';
import { Job } from '../models/job.model';
import { PayType, TimeCategory, SyncStatus } from '../../../models/time-payroll.enum';
import { JobStatus, JobType, Priority } from '../models/job.model';

describe('BillRateService', () => {
  let service: BillRateService;

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

  /** Helper to create a minimal Job for testing */
  function makeJob(overrides: Partial<Job> = {}): Job {
    return {
      id: 'job-1',
      jobId: 'JOB-001',
      client: 'Test Client',
      siteName: 'Test Site',
      siteAddress: { street: '123 Main', city: 'Test', state: 'TX', zipCode: '75001' },
      jobType: JobType.Install,
      priority: Priority.Normal,
      status: JobStatus.NotStarted,
      scopeDescription: 'Test scope',
      requiredSkills: [],
      requiredCrewSize: 1,
      estimatedLaborHours: 8,
      scheduledStartDate: new Date('2024-01-15'),
      scheduledEndDate: new Date('2024-01-16'),
      attachments: [],
      notes: [],
      market: 'Test',
      company: 'Test Co',
      createdBy: 'admin',
      createdAt: new Date(),
      updatedAt: new Date(),
      standardBillRate: 50,
      overtimeBillRate: 75,
      ...overrides
    };
  }

  beforeEach(() => {
    service = new BillRateService();
  });

  describe('calculateBillableAmount', () => {
    it('should calculate standard billable amount for regular pay type', () => {
      const entry = makeEntry({ totalHours: 8, payType: PayType.Regular });
      const job = makeJob({ standardBillRate: 50, overtimeBillRate: 75 });

      const result = service.calculateBillableAmount(entry, job);

      expect(result.entryId).toBe('entry-1');
      expect(result.jobId).toBe('job-1');
      expect(result.hours).toBe(8);
      expect(result.rate).toBe(50);
      expect(result.isOvertime).toBe(false);
      expect(result.amount).toBe(400); // 8 * 50
    });

    it('should calculate overtime billable amount for overtime pay type', () => {
      const entry = makeEntry({ totalHours: 4, payType: PayType.Overtime });
      const job = makeJob({ standardBillRate: 50, overtimeBillRate: 75 });

      const result = service.calculateBillableAmount(entry, job);

      expect(result.hours).toBe(4);
      expect(result.rate).toBe(75);
      expect(result.isOvertime).toBe(true);
      expect(result.amount).toBe(300); // 4 * 75
    });

    it('should return 0 amount when job has no bill rates', () => {
      const entry = makeEntry({ totalHours: 8, payType: PayType.Regular });
      const job = makeJob({ standardBillRate: undefined, overtimeBillRate: undefined });

      const result = service.calculateBillableAmount(entry, job);

      expect(result.rate).toBe(0);
      expect(result.amount).toBe(0);
    });

    it('should handle entry with no totalHours', () => {
      const entry = makeEntry({ totalHours: undefined, payType: PayType.Regular });
      const job = makeJob({ standardBillRate: 50 });

      const result = service.calculateBillableAmount(entry, job);

      expect(result.hours).toBe(0);
      expect(result.amount).toBe(0);
    });

    it('should treat Holiday pay type as standard rate', () => {
      const entry = makeEntry({ totalHours: 8, payType: PayType.Holiday });
      const job = makeJob({ standardBillRate: 50, overtimeBillRate: 75 });

      const result = service.calculateBillableAmount(entry, job);

      expect(result.isOvertime).toBe(false);
      expect(result.rate).toBe(50);
      expect(result.amount).toBe(400);
    });
  });

  describe('calculatePeriodBillables', () => {
    it('should group entries by job and calculate billable amounts', () => {
      const entries = [
        makeEntry({ id: 'e1', jobId: 'job-1', totalHours: 8, regularHours: 8, overtimeHours: 0 }),
        makeEntry({ id: 'e2', jobId: 'job-1', totalHours: 4, regularHours: 4, overtimeHours: 0 }),
        makeEntry({ id: 'e3', jobId: 'job-2', totalHours: 6, regularHours: 6, overtimeHours: 0 })
      ];
      const jobs = [
        makeJob({ id: 'job-1', standardBillRate: 50, overtimeBillRate: 75 }),
        makeJob({ id: 'job-2', standardBillRate: 60, overtimeBillRate: 90 })
      ];

      const result = service.calculatePeriodBillables(entries, jobs);

      expect(result.length).toBe(2);

      const job1Summary = result.find(s => s.jobId === 'job-1');
      expect(job1Summary).toBeDefined();
      expect(job1Summary!.standardHours).toBe(12);
      expect(job1Summary!.standardAmount).toBe(600); // 12 * 50
      expect(job1Summary!.rateNotSet).toBe(false);

      const job2Summary = result.find(s => s.jobId === 'job-2');
      expect(job2Summary).toBeDefined();
      expect(job2Summary!.standardHours).toBe(6);
      expect(job2Summary!.standardAmount).toBe(360); // 6 * 60
      expect(job2Summary!.rateNotSet).toBe(false);
    });

    it('should flag rateNotSet when job has no bill rates', () => {
      const entries = [
        makeEntry({ id: 'e1', jobId: 'job-1', totalHours: 8, regularHours: 8 })
      ];
      const jobs = [
        makeJob({ id: 'job-1', standardBillRate: undefined, overtimeBillRate: undefined })
      ];

      const result = service.calculatePeriodBillables(entries, jobs);

      expect(result.length).toBe(1);
      expect(result[0].rateNotSet).toBe(true);
      expect(result[0].totalAmount).toBe(0);
    });

    it('should flag rateNotSet when job is not found in jobs array', () => {
      const entries = [
        makeEntry({ id: 'e1', jobId: 'unknown-job', totalHours: 8, regularHours: 8 })
      ];
      const jobs: Job[] = [];

      const result = service.calculatePeriodBillables(entries, jobs);

      expect(result.length).toBe(1);
      expect(result[0].rateNotSet).toBe(true);
      expect(result[0].totalAmount).toBe(0);
    });

    it('should return empty array for empty entries', () => {
      const result = service.calculatePeriodBillables([], []);
      expect(result).toEqual([]);
    });

    it('should calculate overtime amounts correctly', () => {
      const entries = [
        makeEntry({ id: 'e1', jobId: 'job-1', totalHours: 10, regularHours: 8, overtimeHours: 2 })
      ];
      const jobs = [
        makeJob({ id: 'job-1', standardBillRate: 50, overtimeBillRate: 75 })
      ];

      const result = service.calculatePeriodBillables(entries, jobs);

      expect(result.length).toBe(1);
      expect(result[0].standardHours).toBe(8);
      expect(result[0].overtimeHours).toBe(2);
      expect(result[0].standardAmount).toBe(400); // 8 * 50
      expect(result[0].overtimeAmount).toBe(150); // 2 * 75
      expect(result[0].totalAmount).toBe(550);
    });
  });

  describe('validateBillRate', () => {
    it('should return valid for a positive number with 2 decimal places', () => {
      expect(service.validateBillRate(50.25).valid).toBe(true);
    });

    it('should return valid for a positive integer', () => {
      expect(service.validateBillRate(100).valid).toBe(true);
    });

    it('should return invalid for zero', () => {
      expect(service.validateBillRate(0).valid).toBe(false);
    });

    it('should return invalid for negative numbers', () => {
      expect(service.validateBillRate(-10).valid).toBe(false);
    });

    it('should return invalid for numbers with more than 2 decimal places', () => {
      expect(service.validateBillRate(50.123).valid).toBe(false);
    });

    it('should return invalid for NaN', () => {
      expect(service.validateBillRate(NaN).valid).toBe(false);
    });

    it('should return invalid for Infinity', () => {
      expect(service.validateBillRate(Infinity).valid).toBe(false);
    });
  });
});
