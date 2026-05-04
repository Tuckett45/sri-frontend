/**
 * Pure validation functions for Time & Payroll
 *
 * These are standalone, stateless functions with no Angular dependencies.
 * They are designed for easy property-based testing.
 *
 * Requirements: 5.3, 7.2, 7.3, 2.5
 */

import { TimeEntry } from '../models/time-entry.model';
import { PayType } from '../../../models/time-payroll.enum';

/** Result of a validation check */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * Validate a customer bill rate value.
 *
 * A bill rate is valid when it is strictly positive and has at most
 * two decimal places (i.e. rate * 100 yields an integer).
 *
 * Validates: Requirement 5.3
 */
export function validateBillRate(rate: number): ValidationResult {
  if (!Number.isFinite(rate) || rate <= 0) {
    return { valid: false, message: 'Bill rate must be a positive number.' };
  }

  // Check at most 2 decimal places: rounding to 2 decimals must not change the value.
  // Use Number/toFixed round-trip to avoid floating-point precision issues with large numbers.
  if (Number(rate.toFixed(2)) !== rate) {
    return { valid: false, message: 'Bill rate must have at most two decimal places.' };
  }

  return { valid: true };
}

/**
 * Validate that a contract end date is strictly after its start date.
 *
 * Validates: Requirement 7.2
 */
export function validateContractDates(startDate: Date, endDate: Date): ValidationResult {
  if (endDate.getTime() <= startDate.getTime()) {
    return { valid: false, message: 'Contract end date must be after the start date.' };
  }

  return { valid: true };
}

/**
 * Validate that a job's scheduled dates fall within the contract period.
 *
 * Valid when jobStart >= contractStart AND jobEnd <= contractEnd.
 *
 * Validates: Requirement 7.3
 */
export function validateJobWithinContract(
  jobStart: Date,
  jobEnd: Date,
  contractStart: Date,
  contractEnd: Date
): ValidationResult {
  if (jobStart.getTime() < contractStart.getTime()) {
    return {
      valid: false,
      message: 'Job start date must not be before the contract start date.'
    };
  }

  if (jobEnd.getTime() > contractEnd.getTime()) {
    return {
      valid: false,
      message: 'Job end date must not be after the contract end date.'
    };
  }

  return { valid: true };
}

/**
 * Validate that no full-day PTO entry exists for the given date.
 *
 * Returns invalid when any entry in `existingEntries` has
 * `payType === PayType.PTO` and falls on the same calendar date.
 *
 * Validates: Requirement 2.5
 */
export function validateNoPtoConflict(
  date: Date,
  existingEntries: TimeEntry[]
): ValidationResult {
  const targetDate = stripTime(date);

  const hasPtoConflict = existingEntries.some(entry => {
    if (entry.payType !== PayType.PTO) {
      return false;
    }
    const entryDate = stripTime(entry.clockInTime);
    return entryDate === targetDate;
  });

  if (hasPtoConflict) {
    return {
      valid: false,
      message: 'A full-day PTO entry already exists for this date.'
    };
  }

  return { valid: true };
}

/**
 * Strip time portion from a Date, returning a comparable string 'YYYY-MM-DD'.
 * Uses local-time accessors so that dates created with or without time components
 * are compared consistently in the user's timezone.
 */
function stripTime(d: Date): string {
  // Ensure we are working with a Date object (handles string inputs from API responses)
  const date = d instanceof Date ? d : new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
