/**
 * Property-based tests for AtlasPayloadSerializer
 *
 * Uses fast-check to verify universal correctness properties
 * across randomly generated inputs.
 *
 * Test runner: Karma/Jasmine
 */

import * as fc from 'fast-check';
import {
  serializeTimeEntry,
  deserializeAtlasResponse,
  validateAtlasPayload,
  detectMismatch,
  calculateBackoffDelay
} from './atlas-payload-serializer';
import { TimeEntry, GeoLocation } from '../models/time-entry.model';
import { AtlasTimeEntryPayload } from '../../../models/time-payroll.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';

/** Helper: build a minimal TimeEntry with overrides */
function makeEntry(overrides: Partial<TimeEntry>): TimeEntry {
  return {
    id: 'e1',
    jobId: 'j1',
    technicianId: 't1',
    clockInTime: new Date('2024-06-15T08:00:00Z'),
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

/** Arbitrary for a non-empty alphanumeric string (used for IDs) */
const arbId = fc.stringMatching(/^[a-zA-Z0-9_-]+$/).filter(s => s.length > 0);

/** Arbitrary for a valid GeoLocation */
const arbGeoLocation: fc.Arbitrary<GeoLocation> = fc.record({
  latitude: fc.double({ min: -90, max: 90, noNaN: true }),
  longitude: fc.double({ min: -180, max: 180, noNaN: true }),
  accuracy: fc.double({ min: 0, max: 1000, noNaN: true }),
});

/** Arbitrary for a valid date that is guaranteed to be a real Date (no NaN) */
const arbValidDate = fc.integer({
  min: new Date('2000-01-01T00:00:00Z').getTime(),
  max: new Date('2099-12-31T23:59:59Z').getTime()
}).map(ts => new Date(ts));

/** Arbitrary for a valid TimeEntry with all serializable fields */
const arbTimeEntry: fc.Arbitrary<TimeEntry> = fc.record({
  id: arbId,
  jobId: arbId,
  technicianId: arbId,
  clockInTime: arbValidDate,
  clockOutTime: fc.option(arbValidDate, { nil: undefined }),
  clockInLocation: fc.option(arbGeoLocation, { nil: undefined }),
  clockOutLocation: fc.option(arbGeoLocation, { nil: undefined }),
  mileage: fc.option(
    fc.double({ min: 0, max: 99999, noNaN: true }),
    { nil: undefined }
  ),
  adjustmentReason: fc.option(
    fc.stringMatching(/^[a-zA-Z0-9 ]+$/).filter(s => s.length > 0),
    { nil: undefined }
  ),
  timeCategory: fc.constantFrom(TimeCategory.DriveTime, TimeCategory.OnSite),
  payType: fc.constantFrom(PayType.Regular, PayType.Overtime, PayType.Holiday, PayType.PTO),
  // Non-serialized fields with defaults
  totalHours: fc.constant(8),
  isManuallyAdjusted: fc.constant(false),
  isLocked: fc.constant(false),
  createdAt: fc.constant(new Date('2024-06-15T08:00:00Z')),
  updatedAt: fc.constant(new Date('2024-06-15T08:00:00Z')),
  syncStatus: fc.constant(SyncStatus.Synced),
}).map(data => data as unknown as TimeEntry);

describe('AtlasPayloadSerializer — Property-Based Tests', () => {

  // ── Property 22: ATLAS payload serialization round-trip ───────────
  // Feature: time-and-payroll, Property 22: ATLAS payload serialization round-trip
  // **Validates: Requirements 8.1, 8.2**

  describe('Feature: time-and-payroll, Property 22: ATLAS payload serialization round-trip', () => {

    it('should produce matching field values after serialize then deserialize', () => {
      fc.assert(
        fc.property(
          arbTimeEntry,
          (entry) => {
            const payload = serializeTimeEntry(entry);
            const deserialized = deserializeAtlasResponse(payload);

            // jobId and technicianId must match
            expect(deserialized.jobId).toBe(entry.jobId);
            expect(deserialized.technicianId).toBe(entry.technicianId);
            expect(deserialized.id).toBe(entry.id);

            // clockInTime round-trip
            expect(deserialized.clockInTime!.toISOString()).toBe(entry.clockInTime.toISOString());

            // clockOutTime round-trip
            if (entry.clockOutTime != null) {
              expect(deserialized.clockOutTime!.toISOString()).toBe(entry.clockOutTime.toISOString());
            } else {
              expect(deserialized.clockOutTime).toBeUndefined();
            }

            // clockInLocation round-trip
            if (entry.clockInLocation != null) {
              expect(deserialized.clockInLocation!.latitude).toBe(entry.clockInLocation.latitude);
              expect(deserialized.clockInLocation!.longitude).toBe(entry.clockInLocation.longitude);
            } else {
              expect(deserialized.clockInLocation).toBeUndefined();
            }

            // clockOutLocation round-trip
            if (entry.clockOutLocation != null) {
              expect(deserialized.clockOutLocation!.latitude).toBe(entry.clockOutLocation.latitude);
              expect(deserialized.clockOutLocation!.longitude).toBe(entry.clockOutLocation.longitude);
            } else {
              expect(deserialized.clockOutLocation).toBeUndefined();
            }

            // mileage round-trip
            if (entry.mileage != null) {
              expect(deserialized.mileage).toBe(entry.mileage);
            } else {
              expect(deserialized.mileage).toBeUndefined();
            }

            // adjustmentReason round-trip
            if (entry.adjustmentReason != null) {
              expect(deserialized.adjustmentReason).toBe(entry.adjustmentReason);
            } else {
              expect(deserialized.adjustmentReason).toBeUndefined();
            }

            // timeCategory and payType round-trip
            expect(deserialized.timeCategory).toBe(entry.timeCategory);
            expect(deserialized.payType).toBe(entry.payType);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should produce a valid payload for any valid TimeEntry', () => {
      fc.assert(
        fc.property(
          arbTimeEntry,
          (entry) => {
            const payload = serializeTimeEntry(entry);
            const validation = validateAtlasPayload(payload);
            expect(validation.valid).toBe(true);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // ── Property 23: Exponential backoff calculation ──────────────────
  // Feature: time-and-payroll, Property 23: Exponential backoff calculation
  // **Validates: Requirements 8.4**

  describe('Feature: time-and-payroll, Property 23: Exponential backoff calculation', () => {

    it('should return 2^(n+1) seconds for attempt n where 0 <= n < 3', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 2 }),
          (attempt) => {
            const delay = calculateBackoffDelay(attempt);
            const expected = Math.pow(2, attempt + 1);
            expect(delay).toBe(expected);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return null (no retry) for attempt n >= 3', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 100 }),
          (attempt) => {
            const delay = calculateBackoffDelay(attempt);
            expect(delay).toBeNull();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should produce specific values: 2s, 4s, 8s for attempts 0, 1, 2', () => {
      expect(calculateBackoffDelay(0)).toBe(2);
      expect(calculateBackoffDelay(1)).toBe(4);
      expect(calculateBackoffDelay(2)).toBe(8);
    });

    it('should cover the full range 0-5 with correct behavior', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 5 }),
          (attempt) => {
            const delay = calculateBackoffDelay(attempt);
            if (attempt < 3) {
              expect(delay).toBe(Math.pow(2, attempt + 1));
            } else {
              expect(delay).toBeNull();
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  // ── Property 24: Payload mismatch detection ───────────────────────
  // Feature: time-and-payroll, Property 24: Payload mismatch detection
  // **Validates: Requirements 8.7**

  describe('Feature: time-and-payroll, Property 24: Payload mismatch detection', () => {

    it('should return empty list when local serialized matches remote exactly', () => {
      fc.assert(
        fc.property(
          arbTimeEntry,
          (entry) => {
            // Serialize the entry and use the result as the remote payload
            const remote = serializeTimeEntry(entry);
            const mismatches = detectMismatch(entry, remote);
            expect(mismatches.length).toBe(0);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should detect exactly the differing fields when remote has modifications', () => {
      fc.assert(
        fc.property(
          arbTimeEntry,
          arbId,
          (entry, differentJobId) => {
            // Serialize the entry, then modify jobId in the remote
            const remote = serializeTimeEntry(entry);

            // Only test when the new jobId is actually different
            if (differentJobId === entry.jobId) {
              return;
            }

            remote.jobId = differentJobId;
            const mismatches = detectMismatch(entry, remote);
            expect(mismatches).toContain('jobId');
            // All other fields should still match, so only jobId should be mismatched
            expect(mismatches.length).toBe(1);
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should return non-empty list iff at least one field differs', () => {
      // Generate a subset of fields to modify in the remote payload
      const arbFieldsToModify = fc.subarray(
        ['jobId', 'technicianId', 'clockInTime', 'mileage', 'timeCategory', 'payType'] as const,
        { minLength: 0, maxLength: 6 }
      );

      fc.assert(
        fc.property(
          arbTimeEntry,
          arbFieldsToModify,
          (entry, fieldsToModify) => {
            const remote = serializeTimeEntry(entry);

            // Modify selected fields in the remote
            for (const field of fieldsToModify) {
              switch (field) {
                case 'jobId':
                  remote.jobId = remote.jobId + '_modified';
                  break;
                case 'technicianId':
                  remote.technicianId = remote.technicianId + '_modified';
                  break;
                case 'clockInTime':
                  remote.clockInTime = new Date('1999-01-01T00:00:00Z').toISOString();
                  break;
                case 'mileage':
                  remote.mileage = (remote.mileage ?? 0) + 999;
                  break;
                case 'timeCategory':
                  remote.timeCategory = remote.timeCategory === 'DriveTime' ? 'OnSite' : 'DriveTime';
                  break;
                case 'payType':
                  remote.payType = remote.payType === 'Regular' ? 'Overtime' : 'Regular';
                  break;
              }
            }

            const mismatches = detectMismatch(entry, remote);

            if (fieldsToModify.length === 0) {
              expect(mismatches.length).toBe(0);
            } else {
              expect(mismatches.length).toBeGreaterThan(0);
              // Every modified field should appear in mismatches
              for (const field of fieldsToModify) {
                expect(mismatches).toContain(field);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should detect mismatch when remote has undefined for a field that local has', () => {
      const entry = makeEntry({
        mileage: 42,
        adjustmentReason: 'test reason',
      });

      const remote = serializeTimeEntry(entry);
      // Remove mileage from remote
      delete (remote as any).mileage;
      remote.mileage = undefined as any;

      const mismatches = detectMismatch(entry, remote);
      expect(mismatches).toContain('mileage');
    });
  });
});
