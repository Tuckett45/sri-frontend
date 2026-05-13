/**
 * Property-based tests for PRC timer utility
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs (minimum 100 iterations each).
 *
 * Test runner: Karma/Jasmine
 */

import * as fc from 'fast-check';
import { computePRCDueDate, computePRCStatus, PRCStatus } from './prc-timer.util';

describe('PRC Timer Utility — Property-Based Tests', () => {

  // ── Property 13: PRC due date computation is 60 days from reference date ──
  // Feature: tech-credentials-onboarding, Property 13
  // **Validates: Requirements 15.3, 15.4**

  describe('Property 13: PRC due date computation is 60 days from reference date', () => {

    /** Arbitrary for a valid date within a reasonable range */
    const arbDate = fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31')
    }).filter(d => !isNaN(d.getTime()));

    it('should return a date exactly 60 days after the input date', () => {
      fc.assert(
        fc.property(
          arbDate,
          (inputDate) => {
            const result = computePRCDueDate(inputDate);

            const expected = new Date(inputDate);
            expected.setDate(expected.getDate() + 60);

            expect(result.getTime()).toBe(expected.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should always return a date strictly after the input date', () => {
      fc.assert(
        fc.property(
          arbDate,
          (inputDate) => {
            const result = computePRCDueDate(inputDate);
            expect(result.getTime()).toBeGreaterThan(inputDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate the input date', () => {
      fc.assert(
        fc.property(
          arbDate,
          (inputDate) => {
            const originalTime = inputDate.getTime();
            computePRCDueDate(inputDate);
            expect(inputDate.getTime()).toBe(originalTime);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be idempotent in the sense that two calls with the same input produce the same output', () => {
      fc.assert(
        fc.property(
          arbDate,
          (inputDate) => {
            const result1 = computePRCDueDate(new Date(inputDate));
            const result2 = computePRCDueDate(new Date(inputDate));
            expect(result1.getTime()).toBe(result2.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce a difference of exactly 60 days in milliseconds (accounting for DST)', () => {
      fc.assert(
        fc.property(
          arbDate,
          (inputDate) => {
            const result = computePRCDueDate(inputDate);

            // Verify using date arithmetic (setDate-based) rather than ms
            // because DST transitions can shift by ±1 hour
            const expected = new Date(inputDate);
            expected.setDate(expected.getDate() + 60);

            expect(result.getFullYear()).toBe(expected.getFullYear());
            expect(result.getMonth()).toBe(expected.getMonth());
            expect(result.getDate()).toBe(expected.getDate());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // ── Property 14: PRC status derivation is correct ─────────────────
  // Feature: tech-credentials-onboarding, Property 14
  // **Validates: Requirements 15.6, 15.7**

  describe('Property 14: PRC status derivation is correct', () => {

    /** Arbitrary for a valid date within a reasonable range */
    const arbDate = fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31')
    }).filter(d => !isNaN(d.getTime()));

    it('should return "completed" when completionDate is not null, regardless of other dates', () => {
      fc.assert(
        fc.property(
          arbDate,
          arbDate,
          arbDate,
          (dueDate, completionDate, referenceDate) => {
            const result = computePRCStatus(dueDate, completionDate, referenceDate);
            expect(result).toBe('completed');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return "overdue" when completionDate is null AND referenceDate > dueDate', () => {
      fc.assert(
        fc.property(
          arbDate,
          fc.integer({ min: 1, max: 3650 }),
          (dueDate, daysAfter) => {
            const referenceDate = new Date(dueDate);
            referenceDate.setDate(referenceDate.getDate() + daysAfter);

            const result = computePRCStatus(dueDate, null, referenceDate);
            expect(result).toBe('overdue');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return "upcoming" when completionDate is null AND referenceDate <= dueDate', () => {
      fc.assert(
        fc.property(
          arbDate,
          fc.integer({ min: 0, max: 3650 }),
          (dueDate, daysBefore) => {
            const referenceDate = new Date(dueDate);
            referenceDate.setDate(referenceDate.getDate() - daysBefore);

            const result = computePRCStatus(dueDate, null, referenceDate);
            expect(result).toBe('upcoming');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce exactly one of the three valid statuses for any input combination', () => {
      fc.assert(
        fc.property(
          arbDate,
          fc.option(arbDate, { nil: null }),
          arbDate,
          (dueDate, completionDate, referenceDate) => {
            const result = computePRCStatus(dueDate, completionDate, referenceDate);

            const validStatuses: PRCStatus[] = ['upcoming', 'overdue', 'completed'];
            expect(validStatuses).toContain(result);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize completionDate over date comparison (completed takes precedence)', () => {
      fc.assert(
        fc.property(
          arbDate,
          arbDate,
          fc.integer({ min: 1, max: 3650 }),
          (dueDate, completionDate, daysAfterDue) => {
            // Even when referenceDate > dueDate (would be overdue), completed wins
            const referenceDate = new Date(dueDate);
            referenceDate.setDate(referenceDate.getDate() + daysAfterDue);

            const result = computePRCStatus(dueDate, completionDate, referenceDate);
            expect(result).toBe('completed');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
