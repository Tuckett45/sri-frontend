/**
 * Property-based tests for TimecardCalculations
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs (minimum 100 iterations each).
 *
 * Test runner: Karma/Jasmine
 */

import * as fc from 'fast-check';
import {
  calculateHoursByCategory,
  calculateHoursByPayType,
  calculatePeriodBillablesByJob,
  calculateLaborCost,
  resolveApplicableRate
} from './timecard-calculations';
import { TimeEntry } from '../models/time-entry.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';
import { PayRateChange } from '../../../models/time-payroll.model';

/** Helper: build a minimal TimeEntry with overrides */
function makeEntry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    jobId: 'j1',
    technicianId: 't1',
    clockInTime: new Date('2024-06-15T08:00:00'),
    totalHours: 8,
    isManuallyAdjusted: false,
    isLocked: false,
    createdAt: new Date('2024-06-15T08:00:00'),
    updatedAt: new Date('2024-06-15T08:00:00'),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Synced,
    ...overrides
  } as TimeEntry;
}

describe('TimecardCalculations — Property-Based Tests', () => {

  // ── Property 4: Category hours summation is correct ───────────────
  // Feature: time-and-payroll, Property 4: Category hours summation is correct
  // **Validates: Requirements 1.7**

  describe('Feature: time-and-payroll, Property 4: Category hours summation is correct', () => {

    /** Arbitrary for a time entry with a random category and positive hours */
    const arbCategoryEntry = fc.record({
      timeCategory: fc.constantFrom(TimeCategory.DriveTime, TimeCategory.OnSite),
      totalHours: fc.integer({ min: 0, max: 10000 }).map(n => n / 100)
    });

    it('should return driveTimeHours + onSiteHours === totalHours for any entry list', () => {
      fc.assert(
        fc.property(
          fc.array(arbCategoryEntry, { minLength: 0, maxLength: 50 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({ id: `e${i}`, timeCategory: d.timeCategory, totalHours: d.totalHours })
            );
            const result = calculateHoursByCategory(entries);
            expect(result.driveTimeHours + result.onSiteHours).toBeCloseTo(result.totalHours, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sum driveTimeHours correctly for DriveTime entries', () => {
      fc.assert(
        fc.property(
          fc.array(arbCategoryEntry, { minLength: 1, maxLength: 50 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({ id: `e${i}`, timeCategory: d.timeCategory, totalHours: d.totalHours })
            );
            const result = calculateHoursByCategory(entries);

            const expectedDriveTime = entryData
              .filter(d => d.timeCategory === TimeCategory.DriveTime)
              .reduce((sum, d) => sum + d.totalHours, 0);

            expect(result.driveTimeHours).toBeCloseTo(expectedDriveTime, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sum onSiteHours correctly for OnSite entries', () => {
      fc.assert(
        fc.property(
          fc.array(arbCategoryEntry, { minLength: 1, maxLength: 50 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({ id: `e${i}`, timeCategory: d.timeCategory, totalHours: d.totalHours })
            );
            const result = calculateHoursByCategory(entries);

            const expectedOnSite = entryData
              .filter(d => d.timeCategory === TimeCategory.OnSite)
              .reduce((sum, d) => sum + d.totalHours, 0);

            expect(result.onSiteHours).toBeCloseTo(expectedOnSite, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all zeros for an empty entry list', () => {
      const result = calculateHoursByCategory([]);
      expect(result.driveTimeHours).toBe(0);
      expect(result.onSiteHours).toBe(0);
      expect(result.totalHours).toBe(0);
    });
  });

  // ── Property 7: Pay type hours summation is correct ───────────────
  // Feature: time-and-payroll, Property 7: Pay type hours summation is correct
  // **Validates: Requirements 2.4**

  describe('Feature: time-and-payroll, Property 7: Pay type hours summation is correct', () => {

    /** Arbitrary for a time entry with a random pay type and positive hours */
    const arbPayTypeEntry = fc.record({
      payType: fc.constantFrom(PayType.Regular, PayType.Overtime, PayType.Holiday, PayType.PTO),
      totalHours: fc.integer({ min: 0, max: 10000 }).map(n => n / 100)
    });

    it('should satisfy regularHours + overtimeHours + holidayHours + ptoHours === totalHours', () => {
      fc.assert(
        fc.property(
          fc.array(arbPayTypeEntry, { minLength: 0, maxLength: 50 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({ id: `e${i}`, payType: d.payType, totalHours: d.totalHours })
            );
            const result = calculateHoursByPayType(entries);
            const sumOfParts = result.regularHours + result.overtimeHours + result.holidayHours + result.ptoHours;
            expect(sumOfParts).toBeCloseTo(result.totalHours, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should sum each pay type correctly', () => {
      fc.assert(
        fc.property(
          fc.array(arbPayTypeEntry, { minLength: 1, maxLength: 50 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({ id: `e${i}`, payType: d.payType, totalHours: d.totalHours })
            );
            const result = calculateHoursByPayType(entries);

            const expectedRegular = entryData
              .filter(d => d.payType === PayType.Regular)
              .reduce((sum, d) => sum + d.totalHours, 0);
            const expectedOvertime = entryData
              .filter(d => d.payType === PayType.Overtime)
              .reduce((sum, d) => sum + d.totalHours, 0);
            const expectedHoliday = entryData
              .filter(d => d.payType === PayType.Holiday)
              .reduce((sum, d) => sum + d.totalHours, 0);
            const expectedPto = entryData
              .filter(d => d.payType === PayType.PTO)
              .reduce((sum, d) => sum + d.totalHours, 0);

            expect(result.regularHours).toBeCloseTo(expectedRegular, 10);
            expect(result.overtimeHours).toBeCloseTo(expectedOvertime, 10);
            expect(result.holidayHours).toBeCloseTo(expectedHoliday, 10);
            expect(result.ptoHours).toBeCloseTo(expectedPto, 10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all zeros for an empty entry list', () => {
      const result = calculateHoursByPayType([]);
      expect(result.regularHours).toBe(0);
      expect(result.overtimeHours).toBe(0);
      expect(result.holidayHours).toBe(0);
      expect(result.ptoHours).toBe(0);
      expect(result.totalHours).toBe(0);
    });
  });


  // ── Property 16: Period billable amounts by job ───────────────────
  // Feature: time-and-payroll, Property 16: Period billable amounts by job
  // **Validates: Requirements 5.4, 5.5, 5.6**

  describe('Feature: time-and-payroll, Property 16: Period billable amounts by job', () => {

    /** Arbitrary for a job ID from a small pool */
    const arbJobId = fc.constantFrom('job-A', 'job-B', 'job-C');

    /** Arbitrary for a time entry with random job, regular hours, and overtime hours */
    const arbBillableEntry = fc.record({
      jobId: arbJobId,
      regularHours: fc.integer({ min: 0, max: 5000 }).map(n => n / 100),
      overtimeHours: fc.integer({ min: 0, max: 2000 }).map(n => n / 100),
      totalHours: fc.constant(0) // will be computed
    }).map(d => ({ ...d, totalHours: d.regularHours + d.overtimeHours }));

    /** Arbitrary for a job rate (may or may not have rates set) */
    const arbJobRate = fc.record({
      hasRates: fc.boolean(),
      standardBillRate: fc.integer({ min: 1, max: 50000 }).map(n => n / 100),
      overtimeBillRate: fc.integer({ min: 1, max: 75000 }).map(n => n / 100)
    });

    it('should compute correct standard and overtime amounts when rates are set', () => {
      fc.assert(
        fc.property(
          fc.array(arbBillableEntry, { minLength: 1, maxLength: 30 }),
          arbJobRate.filter(r => r.hasRates),
          (entryData, jobRate) => {
            // All entries go to a single job with rates
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                jobId: d.jobId,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.totalHours
              })
            );

            // Build jobs map with the same rate for all jobs
            const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>();
            for (const jid of ['job-A', 'job-B', 'job-C']) {
              jobs.set(jid, {
                standardBillRate: jobRate.standardBillRate,
                overtimeBillRate: jobRate.overtimeBillRate
              });
            }

            const result = calculatePeriodBillablesByJob(entries, jobs);

            for (const summary of result) {
              expect(summary.rateNotSet).toBe(false);
              expect(summary.standardAmount).toBeCloseTo(
                summary.standardHours * jobRate.standardBillRate, 5
              );
              expect(summary.overtimeAmount).toBeCloseTo(
                summary.overtimeHours * jobRate.overtimeBillRate, 5
              );
              expect(summary.totalAmount).toBeCloseTo(
                summary.standardAmount + summary.overtimeAmount, 5
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should flag rateNotSet when a job has no bill rates', () => {
      fc.assert(
        fc.property(
          fc.array(arbBillableEntry, { minLength: 1, maxLength: 20 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                jobId: d.jobId,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.totalHours
              })
            );

            // Empty jobs map — no rates for any job
            const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>();

            const result = calculatePeriodBillablesByJob(entries, jobs);

            for (const summary of result) {
              expect(summary.rateNotSet).toBe(true);
              expect(summary.standardAmount).toBe(0);
              expect(summary.overtimeAmount).toBe(0);
              expect(summary.totalAmount).toBe(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce one summary per unique jobId', () => {
      fc.assert(
        fc.property(
          fc.array(arbBillableEntry, { minLength: 1, maxLength: 30 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                jobId: d.jobId,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.totalHours
              })
            );

            const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>();

            const result = calculatePeriodBillablesByJob(entries, jobs);
            const uniqueJobIds = new Set(entryData.map(d => d.jobId));
            expect(result.length).toBe(uniqueJobIds.size);

            const resultJobIds = new Set(result.map(s => s.jobId));
            expect(resultJobIds.size).toBe(uniqueJobIds.size);
            for (const jid of uniqueJobIds) {
              expect(resultJobIds.has(jid)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly aggregate hours across entries for the same job', () => {
      fc.assert(
        fc.property(
          fc.array(arbBillableEntry, { minLength: 1, maxLength: 30 }),
          arbJobRate.filter(r => r.hasRates),
          (entryData, jobRate) => {
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                jobId: d.jobId,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.totalHours
              })
            );

            const jobs = new Map<string, { standardBillRate?: number; overtimeBillRate?: number }>();
            for (const jid of ['job-A', 'job-B', 'job-C']) {
              jobs.set(jid, {
                standardBillRate: jobRate.standardBillRate,
                overtimeBillRate: jobRate.overtimeBillRate
              });
            }

            const result = calculatePeriodBillablesByJob(entries, jobs);

            // Verify aggregated hours per job
            for (const summary of result) {
              const jobEntries = entryData.filter(d => d.jobId === summary.jobId);
              const expectedStdHours = jobEntries.reduce((s, d) => s + d.regularHours, 0);
              const expectedOtHours = jobEntries.reduce((s, d) => s + d.overtimeHours, 0);

              expect(summary.standardHours).toBeCloseTo(expectedStdHours, 5);
              expect(summary.overtimeHours).toBeCloseTo(expectedOtHours, 5);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 17: Labor cost calculation with rate history ─────────
  // Feature: time-and-payroll, Property 17: Labor cost calculation with rate history
  // **Validates: Requirements 6.5, 6.7**

  describe('Feature: time-and-payroll, Property 17: Labor cost calculation with rate history', () => {

    /**
     * Arbitrary for a PayRateChange with an effective date within a range.
     * Uses integer cents to avoid floating-point issues.
     * Filters out Invalid Date values that fast-check v4 can generate.
     */
    const arbRateChange = (minDate: Date, maxDate: Date) =>
      fc.record({
        id: fc.uuid(),
        technicianId: fc.constant('t1'),
        previousStandardRate: fc.integer({ min: 100, max: 10000 }).map(n => n / 100),
        previousOvertimeRate: fc.integer({ min: 100, max: 15000 }).map(n => n / 100),
        newStandardRate: fc.integer({ min: 100, max: 10000 }).map(n => n / 100),
        newOvertimeRate: fc.integer({ min: 100, max: 15000 }).map(n => n / 100),
        effectiveDate: fc.date({ min: minDate, max: maxDate }).filter(d => !isNaN(d.getTime())),
        changedBy: fc.constant('manager1'),
        changedAt: fc.date({ min: minDate, max: maxDate }).filter(d => !isNaN(d.getTime()))
      });

    /** Arbitrary for a time entry with a createdAt date and hours */
    const arbLaborEntry = (minDate: Date, maxDate: Date) =>
      fc.record({
        createdAt: fc.date({ min: minDate, max: maxDate }).filter(d => !isNaN(d.getTime())),
        regularHours: fc.integer({ min: 0, max: 2000 }).map(n => n / 100),
        overtimeHours: fc.integer({ min: 0, max: 1000 }).map(n => n / 100)
      });

    const dateMin = new Date('2023-01-01');
    const dateMax = new Date('2025-12-31');

    it('should apply the most recent rate whose effectiveDate <= entry.createdAt', () => {
      fc.assert(
        fc.property(
          fc.array(arbLaborEntry(dateMin, dateMax), { minLength: 1, maxLength: 10 }),
          fc.array(arbRateChange(dateMin, dateMax), { minLength: 1, maxLength: 5 }),
          (entryData, rateHistory) => {
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                createdAt: d.createdAt,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.regularHours + d.overtimeHours
              })
            );

            const totalCost = calculateLaborCost(entries, rateHistory);

            // Manually compute expected cost
            let expectedCost = 0;
            for (const d of entryData) {
              const entryTime = d.createdAt.getTime();
              // Find the most recent rate change with effectiveDate <= createdAt
              let bestChange: typeof rateHistory[0] | undefined;
              for (const change of rateHistory) {
                const effTime = new Date(change.effectiveDate).getTime();
                if (effTime <= entryTime) {
                  if (!bestChange || new Date(change.effectiveDate).getTime() > new Date(bestChange.effectiveDate).getTime()) {
                    bestChange = change;
                  }
                }
              }
              if (bestChange) {
                expectedCost += d.regularHours * bestChange.newStandardRate
                  + d.overtimeHours * bestChange.newOvertimeRate;
              }
            }

            expect(totalCost).toBeCloseTo(expectedCost, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when no rate history exists', () => {
      fc.assert(
        fc.property(
          fc.array(arbLaborEntry(dateMin, dateMax), { minLength: 1, maxLength: 10 }),
          (entryData) => {
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                createdAt: d.createdAt,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.regularHours + d.overtimeHours
              })
            );

            const totalCost = calculateLaborCost(entries, []);
            expect(totalCost).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0 when all rate effective dates are after all entry dates', () => {
      fc.assert(
        fc.property(
          fc.array(arbLaborEntry(dateMin, new Date('2023-06-30')), { minLength: 1, maxLength: 10 }),
          fc.array(arbRateChange(new Date('2024-01-01'), dateMax), { minLength: 1, maxLength: 5 }),
          (entryData, rateHistory) => {
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                createdAt: d.createdAt,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.regularHours + d.overtimeHours
              })
            );

            const totalCost = calculateLaborCost(entries, rateHistory);
            expect(totalCost).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use the single rate for all entries when only one rate exists before all entries', () => {
      fc.assert(
        fc.property(
          fc.array(arbLaborEntry(new Date('2024-06-01'), dateMax), { minLength: 1, maxLength: 10 }),
          arbRateChange(dateMin, new Date('2024-05-31')),
          (entryData, singleRate) => {
            const entries = entryData.map((d, i) =>
              makeEntry({
                id: `e${i}`,
                createdAt: d.createdAt,
                regularHours: d.regularHours,
                overtimeHours: d.overtimeHours,
                totalHours: d.regularHours + d.overtimeHours
              })
            );

            const totalCost = calculateLaborCost(entries, [singleRate]);

            // Mirror the function's logic: regularHours ?? totalHours ?? 0
            let expectedCost = 0;
            for (const entry of entries) {
              const regularHrs = entry.regularHours ?? entry.totalHours ?? 0;
              const overtimeHrs = entry.overtimeHours ?? 0;
              expectedCost += regularHrs * singleRate.newStandardRate + overtimeHrs * singleRate.newOvertimeRate;
            }

            expect(totalCost).toBeCloseTo(expectedCost, 5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
