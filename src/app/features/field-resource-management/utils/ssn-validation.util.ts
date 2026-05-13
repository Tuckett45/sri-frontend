import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Pattern that matches exactly four numeric digits.
 */
const SSN_LAST_FOUR_PATTERN = /^\d{4}$/;

/**
 * Validates that a string is exactly four numeric digits (SSN last four).
 *
 * @param value - The string to validate
 * @returns true if the value matches exactly four numeric digits, false otherwise
 */
export function validateSSNLastFour(value: string): boolean {
  return SSN_LAST_FOUR_PATTERN.test(value);
}

/**
 * Angular ValidatorFn that validates the SSN last four digits field.
 * Returns `{ ssnLastFour: true }` when the control value is invalid,
 * or `null` when valid.
 */
export const ssnLastFourValidator: ValidatorFn = (
  control: AbstractControl
): ValidationErrors | null => {
  if (!control.value) {
    return null;
  }
  return validateSSNLastFour(control.value) ? null : { ssnLastFour: true };
};
