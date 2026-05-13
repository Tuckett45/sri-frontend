/**
 * Unit tests for timecard-calculations utility functions.
 *
 * Tests specific examples and edge cases for each calculation function.
 */

import {
  calculateHoursByCategory,
  calculateHoursByPayType,
  calculateEntryBillableAmount,
  calculatePeriodBillablesByJob,
  calculateLaborCost,
  resolveApplicableRate
} from './timecard-calculations';
import { TimeEntry } from '../models/time-entry.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';
import { PayRateChange } from '../../../models/time-payroll.model';

/** Helper to build a minimal TimeEntry for testing */
function makeEntry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    jobId: 'j1',
    technicianId: 't1',
    clockInTime: new Date('2024-06-01T08:00:00Z'),
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date('2024-06-01T08:00:00Z'),
    updatedAt: new Date('2024-06-01T08:00:00Z'),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Synced,
    ...overrides
  } as TimeEntry;
}

// ---------------------------------------------------------------------------
// calculateHoursByCategory
// ---------------------------------------------------------------------------
describe('calculateHoursByCategory', () => {
  it('should return zeros for an empty entry list', () => {
    const result = calculateHoursByCategory([]);
    expect(result).toEqual({ driveTimeHours: 0, onSiteHours: 0, totalHours: 0 });
  });

  it('should sum drive time and on site hours separately', () => {
    const entries = [
      makeEntry({ timeCategory: TimeCategory.DriveTime, totalHours: 2 }),
      makeEntry({ timeCategory: TimeCategory.OnSite, totalHours: 6 }),
      makeEntry({ timeCategory: TimeCategory.DriveTime, totalHours: 1.5 })
    ];
    const result = calculateHoursByCategory(entries);
    expect(result.driveTimeHours).toBe(3.5);
    expect(result.onSiteHours).toBe(6);
    expect(result.totalHours).toBe(9.5);
  });

  it('should satisfy driveTimeHours + onSiteHours === totalHours', () => {
    const entries = [
      makeEntry({ timeCategory: TimeCategory.DriveTime, totalHours: 4 }),
      makeEntry({ timeCategory: TimeCategory.OnSite, totalHours: 3 })
    ];
    const result = calculateHoursByCategory(entries);
    expect(result.driveTimeHours + result.onSiteHours).toBe(result.totalHours);
  });

  it('should treat entries with undefined totalHours as 0', () => {
    const entries = [
      makeEntry({ timeCategory: TimeCategory.OnSite, totalHours: undefined })
    ];
    const result = calculateHoursByCategory(entries);
    expect(result.totalHours).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculateHoursByPayType
// ---------------------------------------------------------------------------
describe('calculateHoursByPayType', () => {
  it('should return zeros for an empty entry list', () => {
    const result = calculateHoursByPayType([]);
    expect(result).toEqual({
      regularHours: 0,
      overtimeHours: 0,
      holidayHours: 0,
      ptoHours: 0,
      totalHours: 0
    });
  });

  it('should sum hours by each pay type', () => {
    const entries = [
      makeEntry({ payType: PayType.Regular, totalHours: 8 }),
      makeEntry({ payType: PayType.Overtime, totalHours: 2 }),
      makeEntry({ payType: PayType.Holiday, totalHours: 8 }),
      makeEntry({ payType: PayType.PTO, totalHours: 8 })
    ];
    const result = calculateHoursByPayType(entries);
    expect(result.regularHours).toBe(8);
    expect(result.overtimeHours).toBe(2);
    expect(result.holidayHours).toBe(8);
    expect(result.ptoHours).toBe(8);
    expect(result.totalHours).toBe(26);
  });

  it('should satisfy all pay types summing to totalHours', () => {
    const entries = [
      makeEntry({ payType: PayType.Regular, totalHours: 5 }),
      makeEntry({ payType: PayType.PTO, totalHours: 3 })
    ];
    const result = calculateHoursByPayType(entries);
    expect(result.regularHours + result.overtimeHours + result.holidayHours + result.ptoHours)
      .toBe(result.totalHours);
  });
});

// ---------------------------------------------------------------------------
// calculateEntryBillableAmount
// ---------------------------------------------------------------------------
describe('calculateEntryBillableAmount', () => {
  it('should use standard rate for non-overtime', () => {
    const amount = calculateEntryBillableAmount(8, false, {
      standardBillRate: 50,
      overtimeBillRate: 75
    });
    expect(amount).toBe(400);
  });

  it('should use overtime rate for overtime', () => {
    const amount = calculateEntryBillableAmount(4, true, {
      standardBillRate: 50,
      overtimeBillRate: 75
    });
    expect(amount).toBe(300);
  });

  it('should return 0 when rate is not set', () => {
    const amount = calculateEntryBillableAmount(8, false, {
      standardBillRate: undefined,
      overtimeBillRate: undefined
    });
    expect(amount).toBe(0);
  });

  it('should return 0 for zero hours', () => {
    const amount = calculateEntryBillableAmount(0, false, {
      standardBillRate: 50,
      overtimeBillRate: 75
    });
    expect(amount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// calculatePeriodBillablesByJob
// ---------------------------------------------------------------------------
describe('calculatePeriodBillablesByJob', () => {
  it('should return empty array for no entries', () => {
    const result = calculatePeriodBillablesByJob([], new Map());
    expect(result).toEqual([]);
  });

  it('should group entries by job and compute amounts', () => {
    const entries = [
      makeEntry({ jobId: 'j1', regularHours: 8, overtimeHours: 2, totalHours: 10 }),
      makeEntry({ jobId: 'j1', regularHours: 6, overtimeHours: 1, totalHours: 7 }),
      makeEntry({ jobId: 'j2', regularHours: 4, overtimeHours: 0, totalHours: 4 })
    ];
    const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>([
      ['j1', { standardBillRate: 50, overtimeBillRate: 75 }],
      ['j2', { standardBillRate: 60, overtimeBillRate: 90 }]
    ]);

    const result = calculatePeriodBillablesByJob(entries, jobs);
    expect(result.length).toBe(2);

    const j1 = result.find(s => s.jobId === 'j1')!;
    expect(j1.standardHours).toBe(14);
    expect(j1.overtimeHours).toBe(3);
    expect(j1.standardAmount).toBe(14 * 50);
    expect(j1.overtimeAmount).toBe(3 * 75);
    expect(j1.totalAmount).toBe(14 * 50 + 3 * 75);
    expect(j1.rateNotSet).toBe(false);

    const j2 = result.find(s => s.jobId === 'j2')!;
    expect(j2.standardHours).toBe(4);
    expect(j2.overtimeHours).toBe(0);
    expect(j2.standardAmount).toBe(4 * 60);
    expect(j2.rateNotSet).toBe(false);
  });

  it('should flag rateNotSet when job has no bill rates', () => {
    const entries = [
      makeEntry({ jobId: 'j1', regularHours: 8, overtimeHours: 0, totalHours: 8 })
    ];
    const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>();

    const result = calculatePeriodBillablesByJob(entries, jobs);
    expect(result.length).toBe(1);
    expect(result[0].rateNotSet).toBe(true);
    expect(result[0].totalAmount).toBe(0);
  });

  it('should flag rateNotSet when job exists but rates are undefined', () => {
    const entries = [
      makeEntry({ jobId: 'j1', regularHours: 8, overtimeHours: 0, totalHours: 8 })
    ];
    const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>([
      ['j1', { standardBillRate: undefined, overtimeBillRate: undefined }]
    ]);

    const result = calculatePeriodBillablesByJob(entries, jobs);
    expect(result[0].rateNotSet).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveApplicableRate
// ---------------------------------------------------------------------------
describe('resolveApplicableRate', () => {
  const baseChange: PayRateChange = {
    id: 'r1',
    technicianId: 't1',
    previousStandardRate: 0,
    previousOvertimeRate: 0,
    newStandardRate: 25,
    newOvertimeRate: 37.5,
    effectiveDate: new Date('2024-01-01'),
    changedBy: 'manager1',
    changedAt: new Date('2024-01-01')
  };

  it('should return undefined when rate history is empty', () => {
    const result = resolveApplicableRate(new Date('2024-06-01'), []);
    expect(result).toBeUndefined();
  });

  it('should return undefined when no rate is effective before entry date', () => {
    const history: PayRateChange[] = [
      { ...baseChange, effectiveDate: new Date('2025-01-01') }
    ];
    const result = resolveApplicableRate(new Date('2024-06-01'), history);
    expect(result).toBeUndefined();
  });

  it('should return the most recent rate not after the entry date', () => {
    const history: PayRateChange[] = [
      { ...baseChange, id: 'r1', effectiveDate: new Date('2024-01-01'), newStandardRate: 20, newOvertimeRate: 30 },
      { ...baseChange, id: 'r2', effectiveDate: new Date('2024-03-01'), newStandardRate: 25, newOvertimeRate: 37.5 },
      { ...baseChange, id: 'r3', effectiveDate: new Date('2024-07-01'), newStandardRate: 30, newOvertimeRate: 45 }
    ];

    const result = resolveApplicableRate(new Date('2024-05-15'), history);
    expect(result).toBeDefined();
    expect(result!.standardHourlyRate).toBe(25);
    expect(result!.overtimeHourlyRate).toBe(37.5);
  });

  it('should include a rate whose effective date equals the entry date', () => {
    const history: PayRateChange[] = [
      { ...baseChange, effectiveDate: new Date('2024-06-01'), newStandardRate: 28, newOvertimeRate: 42 }
    ];

    const result = resolveApplicableRate(new Date('2024-06-01'), history);
    expect(result).toBeDefined();
    expect(result!.standardHourlyRate).toBe(28);
  });
});

// ---------------------------------------------------------------------------
// calculateLaborCost
// ---------------------------------------------------------------------------
describe('calculateLaborCost', () => {
  const rateHistory: PayRateChange[] = [
    {
      id: 'r1',
      technicianId: 't1',
      previousStandardRate: 0,
      previousOvertimeRate: 0,
      newStandardRate: 20,
      newOvertimeRate: 30,
      effectiveDate: new Date('2024-01-01'),
      changedBy: 'manager1',
      changedAt: new Date('2024-01-01')
    },
    {
      id: 'r2',
      technicianId: 't1',
      previousStandardRate: 20,
      previousOvertimeRate: 30,
      newStandardRate: 25,
      newOvertimeRate: 37.5,
      effectiveDate: new Date('2024-04-01'),
      changedBy: 'manager1',
      changedAt: new Date('2024-04-01')
    }
  ];

  it('should return 0 for empty entries', () => {
    expect(calculateLaborCost([], rateHistory)).toBe(0);
  });

  it('should apply the correct rate based on entry creation date', () => {
    const entries = [
      makeEntry({
        createdAt: new Date('2024-02-15'),
        regularHours: 8,
        overtimeHours: 2,
        totalHours: 10
      })
    ];
    // Rate effective 2024-01-01: standard=20, overtime=30
    const cost = calculateLaborCost(entries, rateHistory);
    expect(cost).toBe(8 * 20 + 2 * 30); // 160 + 60 = 220
  });

  it('should apply the updated rate for entries after the rate change', () => {
    const entries = [
      makeEntry({
        createdAt: new Date('2024-05-01'),
        regularHours: 8,
        overtimeHours: 1,
        totalHours: 9
      })
    ];
    // Rate effective 2024-04-01: standard=25, overtime=37.5
    const cost = calculateLaborCost(entries, rateHistory);
    expect(cost).toBe(8 * 25 + 1 * 37.5); // 200 + 37.5 = 237.5
  });

  it('should skip entries with no applicable rate', () => {
    const entries = [
      makeEntry({
        createdAt: new Date('2023-06-01'), // before any rate
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8
      })
    ];
    const cost = calculateLaborCost(entries, rateHistory);
    expect(cost).toBe(0);
  });

  it('should sum costs across multiple entries with different rates', () => {
    const entries = [
      makeEntry({
        createdAt: new Date('2024-02-01'),
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8
      }),
      makeEntry({
        createdAt: new Date('2024-05-01'),
        regularHours: 8,
        overtimeHours: 0,
        totalHours: 8
      })
    ];
    // Entry 1: 8 * 20 = 160
    // Entry 2: 8 * 25 = 200
    const cost = calculateLaborCost(entries, rateHistory);
    expect(cost).toBe(360);
  });
});
