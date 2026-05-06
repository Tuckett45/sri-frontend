/**
 * Property-based tests for credential status computation
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs (minimum 100 iterations each).
 *
 * Test runner: Karma/Jasmine
 */

import * as fc from 'fast-check';
import { computeCredentialStatus } from './credential-status.util';
import { CertificationStatus } from '../models/technician.model';

describe('Credential Status Utility — Property-Based Tests', () => {

  // ── Property 1: Credential status computation is correct ──────────
  // Feature: tech-credentials-onboarding, Property 1
  // **Validates: Requirements 5.4, 7.1, 7.2, 7.3**

  describe('Property 1: Credential status computation is correct', () => {

    /** Arbitrary for a reference date within a reasonable range */
    const arbReferenceDate = fc.date({
      min: new Date('2020-01-01'),
      max: new Date('2030-12-31')
    }).filter(d => !isNaN(d.getTime()));

    /** Arbitrary for a number of days offset (positive or negative) */
    const arbDaysOffset = fc.integer({ min: -3650, max: 3650 });

    it('should return Expired when expirationDate < referenceDate', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          fc.integer({ min: 1, max: 3650 }),
          (referenceDate, daysBefore) => {
            const expirationDate = new Date(referenceDate);
            expirationDate.setDate(expirationDate.getDate() - daysBefore);

            const result = computeCredentialStatus(expirationDate, referenceDate);
            expect(result).toBe(CertificationStatus.Expired);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return ExpiringSoon when expirationDate is within 30 days of referenceDate (inclusive)', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          fc.integer({ min: 0, max: 30 }),
          (referenceDate, daysAhead) => {
            const expirationDate = new Date(referenceDate);
            expirationDate.setDate(expirationDate.getDate() + daysAhead);

            const result = computeCredentialStatus(expirationDate, referenceDate);
            expect(result).toBe(CertificationStatus.ExpiringSoon);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return Active when expirationDate is more than 30 days after referenceDate', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          fc.integer({ min: 31, max: 3650 }),
          (referenceDate, daysAhead) => {
            const expirationDate = new Date(referenceDate);
            expirationDate.setDate(expirationDate.getDate() + daysAhead);

            const result = computeCredentialStatus(expirationDate, referenceDate);
            expect(result).toBe(CertificationStatus.Active);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce exactly one of the three statuses for any date pair (three-way partition)', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          arbDaysOffset,
          (referenceDate, daysOffset) => {
            const expirationDate = new Date(referenceDate);
            expirationDate.setDate(expirationDate.getDate() + daysOffset);

            const result = computeCredentialStatus(expirationDate, referenceDate);

            const validStatuses = [
              CertificationStatus.Expired,
              CertificationStatus.ExpiringSoon,
              CertificationStatus.Active
            ];
            expect(validStatuses).toContain(result);

            // Verify the partition is correct based on the offset
            if (daysOffset < 0) {
              expect(result).toBe(CertificationStatus.Expired);
            } else if (daysOffset <= 30) {
              expect(result).toBe(CertificationStatus.ExpiringSoon);
            } else {
              expect(result).toBe(CertificationStatus.Active);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be deterministic: same inputs always produce same output', () => {
      fc.assert(
        fc.property(
          arbReferenceDate,
          arbDaysOffset,
          (referenceDate, daysOffset) => {
            const expirationDate = new Date(referenceDate);
            expirationDate.setDate(expirationDate.getDate() + daysOffset);

            const result1 = computeCredentialStatus(new Date(expirationDate), new Date(referenceDate));
            const result2 = computeCredentialStatus(new Date(expirationDate), new Date(referenceDate));
            expect(result1).toBe(result2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
