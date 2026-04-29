/**
 * Property-based tests for PayrollValidators
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs (minimum 100 iterations each).
 *
 * Test runner: Karma/Jasmine
 */

import * as fc from 'fast-check';
import {
  validateBillRate,
  validateContractDates,
  validateJobWithinContract,
  validateNoPtoConflict
} from './payroll-validators';
import { TimeEntry } from '../models/time-entry.model';
import { PayType, TimeCategory, SyncStatus } from '../../../models/time-payroll.enum';

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
    createdAt: new Date(),
    updatedAt: new Date(),
    timeCategory: TimeCategory.OnSite,
    payType: PayType.Regular,
    syncStatus: SyncStatus.Synced,
    ...overrides
  } as TimeEntry;
}

/**
 * Helper: determine if a number has at most 2 decimal places.
 * We check whether rounding to 2 decimals produces the same value.
 */
function hasAtMostTwoDecimals(n: number): boolean {
  if (!Number.isFinite(n)) return false;
  // Use toFixed(2) round-trip to avoid floating-point edge cases
  return Number(n.toFixed(2)) === n;
}

describe('PayrollValidators — Property-Based Tests', () => {

  // ── Property 15: Bill rate validation ─────────────────────────────
  // Feature: time-and-payroll, Property 15: Bill rate validation
  // **Validates: Requirements 5.3**

  describe('Feature: time-and-payroll, Property 15: Bill rate validation', () => {

    it('should return valid for any strictly positive number with at most 2 decimal places', () => {
      fc.assert(
        fc.property(
          // Generate positive numbers with 0, 1, or 2 decimal places
          fc.integer({ min: 1, max: 99999999 }).map(n => n / 100),
          (rate) => {
            const result = validateBillRate(rate);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return invalid for zero', () => {
      const result = validateBillRate(0);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for any negative number', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1e9, max: -Number.MIN_VALUE, noNaN: true }),
          (rate) => {
            const result = validateBillRate(rate);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return invalid for numbers with more than 2 decimal places', () => {
      fc.assert(
        fc.property(
          // Generate integers that are NOT multiples of 10 (ensuring 3+ decimals when divided by 1000)
          fc.integer({ min: 1, max: 999999 }).filter(n => n % 10 !== 0).map(n => n / 1000),
          (rate) => {
            const result = validateBillRate(rate);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return invalid for NaN and Infinity', () => {
      expect(validateBillRate(NaN).valid).toBe(false);
      expect(validateBillRate(Infinity).valid).toBe(false);
      expect(validateBillRate(-Infinity).valid).toBe(false);
    });

    it('should satisfy: valid iff strictly positive AND at most 2 decimal places', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // Positive integers (valid)
            fc.integer({ min: 1, max: 99999999 }).map(n => n / 100),
            // Negative numbers
            fc.double({ min: -1e6, max: -0.01, noNaN: true }),
            // Zero
            fc.constant(0),
            // Numbers with 3+ decimal places
            fc.integer({ min: 1, max: 999999 }).filter(n => n % 10 !== 0).map(n => n / 1000),
            // Large positive with 2 decimals
            fc.integer({ min: 1, max: 9999999 }).map(n => n / 100)
          ),
          (rate) => {
            const result = validateBillRate(rate);
            const expectedValid = Number.isFinite(rate) && rate > 0 && hasAtMostTwoDecimals(rate);
            expect(result.valid).toBe(expectedValid);
          }
        ),
        { numRuns: 200 }
      );
    });
  });

  // ── Property 19: Contract date validation ─────────────────────────
  // Feature: time-and-payroll, Property 19: Contract date validation
  // **Validates: Requirements 7.2**

  describe('Feature: time-and-payroll, Property 19: Contract date validation', () => {

    it('should return valid iff endDate is strictly after startDate', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          (dateA, dateB) => {
            const result = validateContractDates(dateA, dateB);
            const expectedValid = dateB.getTime() > dateA.getTime();
            expect(result.valid).toBe(expectedValid);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should return invalid when startDate equals endDate', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          (date) => {
            const result = validateContractDates(date, new Date(date.getTime()));
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return invalid when endDate is before startDate', () => {
      fc.assert(
        fc.property(
          // Generate two distinct dates and ensure start > end
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          fc.integer({ min: 1, max: 365 * 50 }),
          (endDate, daysBefore) => {
            const startDate = new Date(endDate.getTime() + daysBefore * 86400000);
            const result = validateContractDates(startDate, endDate);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 20: Job dates within contract period ─────────────────
  // Feature: time-and-payroll, Property 20: Job dates within contract period
  // **Validates: Requirements 7.3**

  describe('Feature: time-and-payroll, Property 20: Job dates within contract period', () => {

    it('should return valid iff jobStart >= contractStart AND jobEnd <= contractEnd', () => {
      fc.assert(
        fc.property(
          // Generate 4 timestamps and use them as dates
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          (jobStart, jobEnd, contractStart, contractEnd) => {
            const result = validateJobWithinContract(jobStart, jobEnd, contractStart, contractEnd);
            const expectedValid =
              jobStart.getTime() >= contractStart.getTime() &&
              jobEnd.getTime() <= contractEnd.getTime();
            expect(result.valid).toBe(expectedValid);
          }
        ),
        { numRuns: 200 }
      );
    });

    it('should return valid when job dates exactly match contract boundaries', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          fc.date({ min: new Date('2000-01-01'), max: new Date('2099-12-31') }),
          (dateA, dateB) => {
            // Use the earlier date as start, later as end
            const start = dateA.getTime() <= dateB.getTime() ? dateA : dateB;
            const end = dateA.getTime() <= dateB.getTime() ? dateB : dateA;
            const result = validateJobWithinContract(start, end, start, end);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return invalid when job starts before contract', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2010-01-01'), max: new Date('2090-12-31') }),
          fc.integer({ min: 1, max: 365 * 10 }),
          fc.integer({ min: 0, max: 365 * 5 }),
          (contractStart, daysBeforeContract, jobDuration) => {
            const jobStart = new Date(contractStart.getTime() - daysBeforeContract * 86400000);
            const jobEnd = new Date(jobStart.getTime() + jobDuration * 86400000);
            const contractEnd = new Date(contractStart.getTime() + 365 * 20 * 86400000);
            const result = validateJobWithinContract(jobStart, jobEnd, contractStart, contractEnd);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return invalid when job ends after contract', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2010-01-01'), max: new Date('2050-12-31') }),
          fc.integer({ min: 30, max: 365 * 5 }),
          fc.integer({ min: 1, max: 365 * 10 }),
          (contractStart, contractDays, daysAfterContract) => {
            const contractEnd = new Date(contractStart.getTime() + contractDays * 86400000);
            const jobStart = new Date(contractStart.getTime());
            const jobEnd = new Date(contractEnd.getTime() + daysAfterContract * 86400000);
            const result = validateJobWithinContract(jobStart, jobEnd, contractStart, contractEnd);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 8: PTO and regular entry mutual exclusion ────────────
  // Feature: time-and-payroll, Property 8: PTO and regular entry mutual exclusion
  // **Validates: Requirements 2.5**

  describe('Feature: time-and-payroll, Property 8: PTO and regular entry mutual exclusion', () => {

    /** Arbitrary for a date (year 2020-2030, day precision) */
    const arbDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') });

    it('should return invalid when a PTO entry exists on the same date', () => {
      fc.assert(
        fc.property(
          arbDate,
          fc.integer({ min: 0, max: 23 }),
          fc.integer({ min: 0, max: 23 }),
          (baseDate, ptoHour, queryHour) => {
            // Create a PTO entry on the same calendar date but possibly different hour
            const ptoTime = new Date(baseDate);
            ptoTime.setHours(ptoHour, 0, 0, 0);

            const queryDate = new Date(baseDate);
            queryDate.setHours(queryHour, 0, 0, 0);

            const entries = [makeEntry({ payType: PayType.PTO, clockInTime: ptoTime })];
            const result = validateNoPtoConflict(queryDate, entries);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid when no PTO entries exist', () => {
      fc.assert(
        fc.property(
          arbDate,
          (date) => {
            const result = validateNoPtoConflict(date, []);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid when only non-PTO entries exist on the same date', () => {
      fc.assert(
        fc.property(
          arbDate,
          fc.array(
            fc.constantFrom(PayType.Regular, PayType.Overtime, PayType.Holiday),
            { minLength: 1, maxLength: 5 }
          ),
          (date, payTypes) => {
            const entries = payTypes.map(pt =>
              makeEntry({ payType: pt, clockInTime: new Date(date) })
            );
            const result = validateNoPtoConflict(date, entries);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return valid when PTO entries exist only on different dates', () => {
      fc.assert(
        fc.property(
          arbDate,
          fc.integer({ min: 1, max: 365 }),
          (date, dayOffset) => {
            const differentDate = new Date(date.getTime() + dayOffset * 86400000);
            const entries = [makeEntry({ payType: PayType.PTO, clockInTime: differentDate })];
            const result = validateNoPtoConflict(date, entries);
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect PTO conflict regardless of other non-PTO entries on the same date', () => {
      fc.assert(
        fc.property(
          arbDate,
          fc.array(
            fc.constantFrom(PayType.Regular, PayType.Overtime, PayType.Holiday),
            { minLength: 0, maxLength: 5 }
          ),
          (date, extraPayTypes) => {
            // Mix of non-PTO entries plus one PTO entry, all on the same date
            const entries = [
              ...extraPayTypes.map(pt =>
                makeEntry({ payType: pt, clockInTime: new Date(date) })
              ),
              makeEntry({ payType: PayType.PTO, clockInTime: new Date(date) })
            ];
            const result = validateNoPtoConflict(date, entries);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
