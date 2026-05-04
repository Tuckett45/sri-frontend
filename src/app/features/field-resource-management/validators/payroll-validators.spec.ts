import {
  validateBillRate,
  validateContractDates,
  validateJobWithinContract,
  validateNoPtoConflict
} from './payroll-validators';
import { TimeEntry } from '../models/time-entry.model';
import { PayType, TimeCategory, SyncStatus } from '../../../models/time-payroll.enum';

/** Helper to build a minimal TimeEntry for testing */
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

describe('PayrollValidators', () => {

  // ── validateBillRate ──────────────────────────────────────────────

  describe('validateBillRate', () => {
    it('should accept a positive integer', () => {
      expect(validateBillRate(50)).toEqual({ valid: true });
    });

    it('should accept a positive number with 1 decimal place', () => {
      expect(validateBillRate(25.5)).toEqual({ valid: true });
    });

    it('should accept a positive number with 2 decimal places', () => {
      expect(validateBillRate(99.99)).toEqual({ valid: true });
    });

    it('should reject zero', () => {
      const result = validateBillRate(0);
      expect(result.valid).toBe(false);
    });

    it('should reject negative numbers', () => {
      const result = validateBillRate(-10);
      expect(result.valid).toBe(false);
    });

    it('should reject numbers with more than 2 decimal places', () => {
      const result = validateBillRate(10.123);
      expect(result.valid).toBe(false);
    });

    it('should reject NaN', () => {
      const result = validateBillRate(NaN);
      expect(result.valid).toBe(false);
    });

    it('should reject Infinity', () => {
      const result = validateBillRate(Infinity);
      expect(result.valid).toBe(false);
    });
  });

  // ── validateContractDates ─────────────────────────────────────────

  describe('validateContractDates', () => {
    it('should accept end date after start date', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-12-31');
      expect(validateContractDates(start, end)).toEqual({ valid: true });
    });

    it('should reject end date equal to start date', () => {
      const d = new Date('2024-06-15');
      expect(validateContractDates(d, d).valid).toBe(false);
    });

    it('should reject end date before start date', () => {
      const start = new Date('2024-12-31');
      const end = new Date('2024-01-01');
      expect(validateContractDates(start, end).valid).toBe(false);
    });
  });

  // ── validateJobWithinContract ─────────────────────────────────────

  describe('validateJobWithinContract', () => {
    const contractStart = new Date('2024-01-01');
    const contractEnd = new Date('2024-12-31');

    it('should accept job dates within contract period', () => {
      const jobStart = new Date('2024-03-01');
      const jobEnd = new Date('2024-06-30');
      expect(validateJobWithinContract(jobStart, jobEnd, contractStart, contractEnd))
        .toEqual({ valid: true });
    });

    it('should accept job dates equal to contract boundaries', () => {
      expect(validateJobWithinContract(contractStart, contractEnd, contractStart, contractEnd))
        .toEqual({ valid: true });
    });

    it('should reject job start before contract start', () => {
      const jobStart = new Date('2023-12-01');
      const jobEnd = new Date('2024-06-30');
      expect(validateJobWithinContract(jobStart, jobEnd, contractStart, contractEnd).valid)
        .toBe(false);
    });

    it('should reject job end after contract end', () => {
      const jobStart = new Date('2024-03-01');
      const jobEnd = new Date('2025-01-15');
      expect(validateJobWithinContract(jobStart, jobEnd, contractStart, contractEnd).valid)
        .toBe(false);
    });
  });

  // ── validateNoPtoConflict ─────────────────────────────────────────

  describe('validateNoPtoConflict', () => {
    it('should return valid when no PTO entries exist', () => {
      const date = new Date('2024-06-15T00:00:00');
      expect(validateNoPtoConflict(date, [])).toEqual({ valid: true });
    });

    it('should return valid when PTO exists on a different date', () => {
      const date = new Date('2024-06-15T00:00:00');
      const entries = [
        makeEntry({ payType: PayType.PTO, clockInTime: new Date('2024-06-16T08:00:00') })
      ];
      expect(validateNoPtoConflict(date, entries)).toEqual({ valid: true });
    });

    it('should return invalid when PTO exists on the same date', () => {
      const date = new Date('2024-06-15T00:00:00');
      const entries = [
        makeEntry({ payType: PayType.PTO, clockInTime: new Date('2024-06-15T09:00:00') })
      ];
      expect(validateNoPtoConflict(date, entries).valid).toBe(false);
    });

    it('should ignore non-PTO entries on the same date', () => {
      const date = new Date('2024-06-15T00:00:00');
      const entries = [
        makeEntry({ payType: PayType.Regular, clockInTime: new Date('2024-06-15T08:00:00') }),
        makeEntry({ payType: PayType.Overtime, clockInTime: new Date('2024-06-15T08:00:00') })
      ];
      expect(validateNoPtoConflict(date, entries)).toEqual({ valid: true });
    });
  });
});
