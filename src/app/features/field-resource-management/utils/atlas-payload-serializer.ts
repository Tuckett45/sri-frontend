/**
 * Pure stateless serialization functions for ATLAS API payloads.
 *
 * These functions have no Angular dependencies and are designed for
 * easy property-based testing.
 *
 * Requirements: 8.1, 8.2, 8.4, 8.7
 */

import { TimeEntry, GeoLocation } from '../models/time-entry.model';
import { AtlasTimeEntryPayload } from '../../../models/time-payroll.model';
import { TimeCategory, PayType, SyncStatus } from '../../../models/time-payroll.enum';
import { ValidationResult } from '../validators/payroll-validators';

/**
 * Serialize a TimeEntry to the flat ATLAS API payload format.
 *
 * Converts Date fields to ISO 8601 strings and extracts latitude/longitude
 * from nested GeoLocation objects into flat fields.
 *
 * Validates: Requirement 8.1
 */
export function serializeTimeEntry(entry: TimeEntry): AtlasTimeEntryPayload {
  const payload: AtlasTimeEntryPayload = {
    id: entry.id,
    jobId: entry.jobId,
    technicianId: entry.technicianId,
    clockInTime: entry.clockInTime.toISOString(),
    timeCategory: entry.timeCategory,
    payType: entry.payType,
  };

  if (entry.clockOutTime != null) {
    payload.clockOutTime = entry.clockOutTime.toISOString();
  }

  if (entry.clockInLocation != null) {
    payload.clockInLatitude = entry.clockInLocation.latitude;
    payload.clockInLongitude = entry.clockInLocation.longitude;
  }

  if (entry.clockOutLocation != null) {
    payload.clockOutLatitude = entry.clockOutLocation.latitude;
    payload.clockOutLongitude = entry.clockOutLocation.longitude;
  }

  if (entry.mileage != null) {
    payload.mileage = entry.mileage;
  }

  if (entry.adjustmentReason != null) {
    payload.adjustmentReason = entry.adjustmentReason;
  }

  return payload;
}

/**
 * Deserialize an ATLAS API response payload to a partial TimeEntry.
 *
 * Converts ISO 8601 strings back to Date objects and reconstructs
 * GeoLocation objects from flat latitude/longitude fields. Maps
 * timeCategory and payType strings back to enum values.
 *
 * Returns Partial<TimeEntry> since not all fields are present in the payload.
 *
 * Validates: Requirement 8.1
 */
export function deserializeAtlasResponse(payload: AtlasTimeEntryPayload): Partial<TimeEntry> {
  const entry: Partial<TimeEntry> = {
    id: payload.id,
    jobId: payload.jobId,
    technicianId: payload.technicianId,
    clockInTime: new Date(payload.clockInTime),
  };

  if (payload.clockOutTime != null) {
    entry.clockOutTime = new Date(payload.clockOutTime);
  }

  if (payload.clockInLatitude != null && payload.clockInLongitude != null) {
    entry.clockInLocation = {
      latitude: payload.clockInLatitude,
      longitude: payload.clockInLongitude,
      accuracy: 0,
    };
  }

  if (payload.clockOutLatitude != null && payload.clockOutLongitude != null) {
    entry.clockOutLocation = {
      latitude: payload.clockOutLatitude,
      longitude: payload.clockOutLongitude,
      accuracy: 0,
    };
  }

  if (payload.mileage != null) {
    entry.mileage = payload.mileage;
  }

  if (payload.adjustmentReason != null) {
    entry.adjustmentReason = payload.adjustmentReason;
  }

  if (payload.timeCategory != null) {
    entry.timeCategory = payload.timeCategory as TimeCategory;
  }

  if (payload.payType != null) {
    entry.payType = payload.payType as PayType;
  }

  return entry;
}

/**
 * Validate an ATLAS API payload against the required schema.
 *
 * Checks that required fields (jobId, technicianId, clockInTime) are present,
 * that date strings are valid ISO 8601, and that latitude/longitude values
 * are within valid ranges.
 *
 * Validates: Requirement 8.2
 */
export function validateAtlasPayload(payload: AtlasTimeEntryPayload): ValidationResult {
  if (!payload.jobId || payload.jobId.trim().length === 0) {
    return { valid: false, message: 'jobId is required.' };
  }

  if (!payload.technicianId || payload.technicianId.trim().length === 0) {
    return { valid: false, message: 'technicianId is required.' };
  }

  if (!payload.clockInTime || payload.clockInTime.trim().length === 0) {
    return { valid: false, message: 'clockInTime is required.' };
  }

  if (!isValidIsoDate(payload.clockInTime)) {
    return { valid: false, message: 'clockInTime must be a valid ISO 8601 date string.' };
  }

  if (payload.clockOutTime != null && !isValidIsoDate(payload.clockOutTime)) {
    return { valid: false, message: 'clockOutTime must be a valid ISO 8601 date string.' };
  }

  if (payload.clockInLatitude != null && !isValidLatitude(payload.clockInLatitude)) {
    return { valid: false, message: 'clockInLatitude must be between -90 and 90.' };
  }

  if (payload.clockInLongitude != null && !isValidLongitude(payload.clockInLongitude)) {
    return { valid: false, message: 'clockInLongitude must be between -180 and 180.' };
  }

  if (payload.clockOutLatitude != null && !isValidLatitude(payload.clockOutLatitude)) {
    return { valid: false, message: 'clockOutLatitude must be between -90 and 90.' };
  }

  if (payload.clockOutLongitude != null && !isValidLongitude(payload.clockOutLongitude)) {
    return { valid: false, message: 'clockOutLongitude must be between -180 and 180.' };
  }

  return { valid: true };
}

/**
 * Detect mismatches between a local TimeEntry and a remote ATLAS payload.
 *
 * Serializes the local entry to get comparable field values, then compares
 * each field present in both the serialized local and the remote payload.
 * Returns the list of field names where values differ.
 *
 * Validates: Requirement 8.7
 */
export function detectMismatch(local: TimeEntry, remote: AtlasTimeEntryPayload): string[] {
  const serialized = serializeTimeEntry(local);
  const mismatches: string[] = [];

  const fieldsToCompare: (keyof AtlasTimeEntryPayload)[] = [
    'jobId',
    'technicianId',
    'clockInTime',
    'clockOutTime',
    'clockInLatitude',
    'clockInLongitude',
    'clockOutLatitude',
    'clockOutLongitude',
    'mileage',
    'adjustmentReason',
    'timeCategory',
    'payType',
  ];

  for (const field of fieldsToCompare) {
    const localVal = serialized[field];
    const remoteVal = remote[field];

    // Only compare fields that exist in both
    if (localVal === undefined && remoteVal === undefined) {
      continue;
    }

    if (localVal !== remoteVal) {
      mismatches.push(field);
    }
  }

  return mismatches;
}

/**
 * Calculate the backoff delay for a retry attempt.
 *
 * For attempt n where 0 <= n < 3, returns 2^(n+1) seconds (2, 4, 8).
 * For attempt n >= 3, returns null (no further retry).
 *
 * Validates: Requirement 8.4
 */
export function calculateBackoffDelay(attempt: number): number | null {
  if (attempt >= 3) {
    return null;
  }
  return Math.pow(2, attempt + 1);
}

/**
 * Check if a string is a valid ISO 8601 date.
 */
function isValidIsoDate(value: string): boolean {
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * Check if a latitude value is within the valid range [-90, 90].
 */
function isValidLatitude(lat: number): boolean {
  return Number.isFinite(lat) && lat >= -90 && lat <= 90;
}

/**
 * Check if a longitude value is within the valid range [-180, 180].
 */
function isValidLongitude(lng: number): boolean {
  return Number.isFinite(lng) && lng >= -180 && lng <= 180;
}
