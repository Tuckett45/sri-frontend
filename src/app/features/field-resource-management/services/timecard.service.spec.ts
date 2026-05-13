import { TimecardService } from './timecard.service';
import { TimeEntry, Expense, ExpenseType, TimecardLockConfig } from '../models/time-entry.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';

describe('TimecardService', () => {
  let service: TimecardService;

  const createEntry = (overrides: Partial<TimeEntry> = {}): TimeEntry => ({
    id: 'entry-1',
    jobId: 'job-1',
    technicianId: 'tech-1',
    clockInTime: new Date('2024-01-15T08:00:00'),
    clockOutTime: new Date('2024-01-15T16:00:00'),
    totalHours: 8,
    mileage: 0,
    breakMinutes: 0,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Synced,
    ...overrides
  });

  const defaultConfig: TimecardLockConfig = {
    enabled: true,
    lockDay: 'Friday',
    lockTime: '17:00',
    gracePeriodHours: 0,
    allowManagerUnlock: true,
    requireUnlockReason: true,
    autoRelockAfterHours: 24
  };

  beforeEach(() => {
    service = new TimecardService();
  });

  // --- calculateHours: total = regular + overtime ---
  describe('calculateHours', () => {
    it('should return correct regular/overtime/total for entries under 40 hours', () => {
      // 3 entries of 8 hours each = 24 hours total
      const entries = [
        createEntry({ id: 'e1', clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T16:00:00') }),
        createEntry({ id: 'e2', clockInTime: new Date('2024-01-16T08:00:00'), clockOutTime: new Date('2024-01-16T16:00:00') }),
        createEntry({ id: 'e3', clockInTime: new Date('2024-01-17T08:00:00'), clockOutTime: new Date('2024-01-17T16:00:00') })
      ];

      const result = service.calculateHours(entries);
      expect(result.total).toBe(24);
      expect(result.regular).toBe(24);
      expect(result.overtime).toBe(0);
      expect(result.total).toBe(result.regular + result.overtime);
    });

    it('should calculate overtime when total exceeds 40 hours', () => {
      // 6 entries of 8 hours each = 48 hours total
      const entries = Array.from({ length: 6 }, (_, i) =>
        createEntry({
          id: `e${i}`,
          clockInTime: new Date(`2024-01-${15 + i}T08:00:00`),
          clockOutTime: new Date(`2024-01-${15 + i}T16:00:00`)
        })
      );

      const result = service.calculateHours(entries);
      expect(result.total).toBe(48);
      expect(result.regular).toBe(40);
      expect(result.overtime).toBe(8);
      expect(result.total).toBe(result.regular + result.overtime);
    });

    it('should satisfy invariant: total = regular + overtime', () => {
      const entries = [
        createEntry({ id: 'e1', clockInTime: new Date('2024-01-15T06:00:00'), clockOutTime: new Date('2024-01-15T18:30:00') })
      ];

      const result = service.calculateHours(entries);
      expect(result.total).toBeCloseTo(result.regular + result.overtime, 10);
    });

    it('should satisfy invariant: regular <= 40', () => {
      const entries = Array.from({ length: 7 }, (_, i) =>
        createEntry({
          id: `e${i}`,
          clockInTime: new Date(`2024-01-${15 + i}T06:00:00`),
          clockOutTime: new Date(`2024-01-${15 + i}T18:00:00`)
        })
      );

      const result = service.calculateHours(entries);
      expect(result.regular).toBeLessThanOrEqual(40);
    });

    it('should return zero for empty entries', () => {
      const result = service.calculateHours([]);
      expect(result.total).toBe(0);
      expect(result.regular).toBe(0);
      expect(result.overtime).toBe(0);
    });
  });

  // --- calculateEntryHours ---
  describe('calculateEntryHours', () => {
    it('should calculate hours for a completed entry', () => {
      const entry = createEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T16:00:00')
      });
      expect(service.calculateEntryHours(entry)).toBe(8);
    });

    it('should subtract breakMinutes from total hours', () => {
      const entry = createEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T16:00:00'),
        breakMinutes: 30
      });
      expect(service.calculateEntryHours(entry)).toBe(7.5);
    });

    it('should return 0 when clockInTime is falsy', () => {
      const entry = createEntry({ clockInTime: null as any });
      expect(service.calculateEntryHours(entry)).toBe(0);
    });

    it('should never return negative hours', () => {
      const entry = createEntry({
        clockInTime: new Date('2024-01-15T08:00:00'),
        clockOutTime: new Date('2024-01-15T08:10:00'),
        breakMinutes: 60
      });
      expect(service.calculateEntryHours(entry)).toBeGreaterThanOrEqual(0);
    });
  });

  // --- groupEntriesByDate ---
  describe('groupEntriesByDate', () => {
    it('should group entries by clockInTime date', () => {
      const entries = [
        createEntry({ id: 'e1', clockInTime: new Date('2024-01-15T08:00:00') }),
        createEntry({ id: 'e2', clockInTime: new Date('2024-01-15T13:00:00') }),
        createEntry({ id: 'e3', clockInTime: new Date('2024-01-16T09:00:00') })
      ];

      const grouped = service.groupEntriesByDate(entries);
      expect(grouped.size).toBe(2);

      const jan15Key = new Date('2024-01-15T08:00:00').toDateString();
      const jan16Key = new Date('2024-01-16T09:00:00').toDateString();
      expect(grouped.get(jan15Key)!.length).toBe(2);
      expect(grouped.get(jan16Key)!.length).toBe(1);
    });

    it('should preserve all entries (no loss or duplication)', () => {
      const entries = [
        createEntry({ id: 'e1', clockInTime: new Date('2024-01-15T08:00:00') }),
        createEntry({ id: 'e2', clockInTime: new Date('2024-01-16T08:00:00') }),
        createEntry({ id: 'e3', clockInTime: new Date('2024-01-17T08:00:00') })
      ];

      const grouped = service.groupEntriesByDate(entries);
      let totalEntries = 0;
      grouped.forEach(group => { totalEntries += group.length; });
      expect(totalEntries).toBe(entries.length);
    });

    it('should return empty map for empty entries', () => {
      const grouped = service.groupEntriesByDate([]);
      expect(grouped.size).toBe(0);
    });
  });

  // --- createDailySummaries ---
  describe('createDailySummaries', () => {
    it('should return sorted summaries with correct hours', () => {
      const entries = [
        createEntry({ id: 'e1', clockInTime: new Date('2024-01-16T08:00:00'), clockOutTime: new Date('2024-01-16T16:00:00') }),
        createEntry({ id: 'e2', clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T12:00:00') })
      ];
      const expenses: Expense[] = [];

      const summaries = service.createDailySummaries(entries, expenses, defaultConfig);

      expect(summaries.length).toBe(2);
      // Should be sorted by date ascending
      expect(summaries[0].date.getTime()).toBeLessThan(summaries[1].date.getTime());
      expect(summaries[0].totalHours).toBe(4); // Jan 15: 4 hours
      expect(summaries[1].totalHours).toBe(8); // Jan 16: 8 hours
    });

    it('should calculate regularHours and overtimeHours per day', () => {
      // 10 hour day: 8 regular + 2 overtime
      const entries = [
        createEntry({
          id: 'e1',
          clockInTime: new Date('2024-01-15T06:00:00'),
          clockOutTime: new Date('2024-01-15T16:00:00')
        })
      ];

      const summaries = service.createDailySummaries(entries, [], defaultConfig);
      expect(summaries.length).toBe(1);
      expect(summaries[0].totalHours).toBe(10);
      expect(summaries[0].regularHours).toBe(8);
      expect(summaries[0].overtimeHours).toBe(2);
    });

    it('should count jobs per day', () => {
      const entries = [
        createEntry({ id: 'e1', jobId: 'j1', clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T12:00:00') }),
        createEntry({ id: 'e2', jobId: 'j2', clockInTime: new Date('2024-01-15T13:00:00'), clockOutTime: new Date('2024-01-15T17:00:00') })
      ];

      const summaries = service.createDailySummaries(entries, [], defaultConfig);
      expect(summaries[0].jobCount).toBe(2);
    });
  });

  // --- calculateHours: category and pay-type breakdowns ---
  describe('calculateHours - category/pay-type breakdowns', () => {
    it('should return category breakdown with driveTime and onSite hours', () => {
      const entries = [
        createEntry({ id: 'e1', totalHours: 2, timeCategory: TimeCategory.DriveTime }),
        createEntry({ id: 'e2', totalHours: 6, timeCategory: TimeCategory.OnSite }),
        createEntry({ id: 'e3', totalHours: 3, timeCategory: TimeCategory.DriveTime })
      ];

      const result = service.calculateHours(entries);
      expect(result.categoryBreakdown.driveTimeHours).toBe(5);
      expect(result.categoryBreakdown.onSiteHours).toBe(6);
      expect(result.categoryBreakdown.totalHours).toBe(11);
    });

    it('should return pay-type breakdown with all pay types', () => {
      const entries = [
        createEntry({ id: 'e1', totalHours: 8, payType: PayType.Regular }),
        createEntry({ id: 'e2', totalHours: 4, payType: PayType.Overtime }),
        createEntry({ id: 'e3', totalHours: 8, payType: PayType.Holiday }),
        createEntry({ id: 'e4', totalHours: 8, payType: PayType.PTO })
      ];

      const result = service.calculateHours(entries);
      expect(result.payTypeBreakdown.regularHours).toBe(8);
      expect(result.payTypeBreakdown.overtimeHours).toBe(4);
      expect(result.payTypeBreakdown.holidayHours).toBe(8);
      expect(result.payTypeBreakdown.ptoHours).toBe(8);
      expect(result.payTypeBreakdown.totalHours).toBe(28);
    });

    it('should return empty breakdowns for empty entries', () => {
      const result = service.calculateHours([]);
      expect(result.categoryBreakdown.driveTimeHours).toBe(0);
      expect(result.categoryBreakdown.onSiteHours).toBe(0);
      expect(result.categoryBreakdown.totalHours).toBe(0);
      expect(result.payTypeBreakdown.regularHours).toBe(0);
      expect(result.payTypeBreakdown.overtimeHours).toBe(0);
      expect(result.payTypeBreakdown.holidayHours).toBe(0);
      expect(result.payTypeBreakdown.ptoHours).toBe(0);
      expect(result.payTypeBreakdown.totalHours).toBe(0);
    });

    it('should still return correct regular/overtime/total alongside breakdowns', () => {
      const entries = Array.from({ length: 6 }, (_, i) =>
        createEntry({
          id: `e${i}`,
          clockInTime: new Date(`2024-01-${15 + i}T08:00:00`),
          clockOutTime: new Date(`2024-01-${15 + i}T16:00:00`),
          totalHours: 8,
          timeCategory: i % 2 === 0 ? TimeCategory.DriveTime : TimeCategory.OnSite,
          payType: PayType.Regular
        })
      );

      const result = service.calculateHours(entries);
      expect(result.total).toBe(48);
      expect(result.regular).toBe(40);
      expect(result.overtime).toBe(8);
      expect(result.categoryBreakdown.driveTimeHours).toBe(24);
      expect(result.categoryBreakdown.onSiteHours).toBe(24);
    });
  });

  // --- createWeeklySummary: category/pay-type subtotals and billable amounts ---
  describe('createWeeklySummary - category/pay-type subtotals', () => {
    const weekStart = new Date('2024-01-15T00:00:00');
    const weekEnd = new Date('2024-01-21T23:59:59');

    it('should include driveTimeHours and onSiteHours in summary', () => {
      const entries = [
        createEntry({ id: 'e1', totalHours: 3, timeCategory: TimeCategory.DriveTime, clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T11:00:00') }),
        createEntry({ id: 'e2', totalHours: 5, timeCategory: TimeCategory.OnSite, clockInTime: new Date('2024-01-15T12:00:00'), clockOutTime: new Date('2024-01-15T17:00:00') })
      ];

      const summary = service.createWeeklySummary(weekStart, weekEnd, entries, [], defaultConfig);
      expect(summary.driveTimeHours).toBe(3);
      expect(summary.onSiteHours).toBe(5);
    });

    it('should include holidayHours and ptoHours in summary', () => {
      const entries = [
        createEntry({ id: 'e1', totalHours: 8, payType: PayType.Holiday, clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T16:00:00') }),
        createEntry({ id: 'e2', totalHours: 8, payType: PayType.PTO, clockInTime: new Date('2024-01-16T08:00:00'), clockOutTime: new Date('2024-01-16T16:00:00') }),
        createEntry({ id: 'e3', totalHours: 8, payType: PayType.Regular, clockInTime: new Date('2024-01-17T08:00:00'), clockOutTime: new Date('2024-01-17T16:00:00') })
      ];

      const summary = service.createWeeklySummary(weekStart, weekEnd, entries, [], defaultConfig);
      expect(summary.holidayHours).toBe(8);
      expect(summary.ptoHours).toBe(8);
    });

    it('should calculate totalBillableAmount when jobs map is provided', () => {
      const entries = [
        createEntry({ id: 'e1', jobId: 'j1', totalHours: 8, regularHours: 8, overtimeHours: 0, payType: PayType.Regular, clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T16:00:00') }),
        createEntry({ id: 'e2', jobId: 'j1', totalHours: 4, regularHours: 4, overtimeHours: 0, payType: PayType.Overtime, clockInTime: new Date('2024-01-16T08:00:00'), clockOutTime: new Date('2024-01-16T12:00:00') })
      ];

      const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>();
      jobs.set('j1', { standardBillRate: 50, overtimeBillRate: 75 });

      const summary = service.createWeeklySummary(weekStart, weekEnd, entries, [], defaultConfig, jobs);
      expect(summary.totalBillableAmount).toBe(12 * 50 + 0 * 75); // 12 regular hours * $50
      expect(summary.jobBillableSummaries.length).toBe(1);
      expect(summary.jobBillableSummaries[0].jobId).toBe('j1');
    });

    it('should default billable fields to zero/empty when no jobs map provided', () => {
      const entries = [
        createEntry({ id: 'e1', totalHours: 8, clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T16:00:00') })
      ];

      const summary = service.createWeeklySummary(weekStart, weekEnd, entries, [], defaultConfig);
      expect(summary.totalBillableAmount).toBe(0);
      expect(summary.jobBillableSummaries).toEqual([]);
    });

    it('should flag rateNotSet when job has no bill rates', () => {
      const entries = [
        createEntry({ id: 'e1', jobId: 'j1', totalHours: 8, regularHours: 8, overtimeHours: 0, clockInTime: new Date('2024-01-15T08:00:00'), clockOutTime: new Date('2024-01-15T16:00:00') })
      ];

      const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>();
      jobs.set('j1', { standardBillRate: undefined, overtimeBillRate: undefined });

      const summary = service.createWeeklySummary(weekStart, weekEnd, entries, [], defaultConfig, jobs);
      expect(summary.jobBillableSummaries[0].rateNotSet).toBe(true);
      expect(summary.totalBillableAmount).toBe(0);
    });
  });
});
