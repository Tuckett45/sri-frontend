import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Custom Validators for Field Resource Management
 * 
 * Provides reusable validation functions for forms throughout the application.
 * Includes validators for phone numbers, date ranges, business rules, and more.
 * 
 * @example
 * // Use in reactive forms:
 * this.form = this.fb.group({
 *   phone: ['', [Validators.required, CustomValidators.phoneNumber()]],
 *   dateRange: this.fb.group({
 *     start: [''],
 *     end: ['']
 *   }, { validators: CustomValidators.dateRange('start', 'end') })
 * });
 */
export class CustomValidators {
  
  /**
   * Validates US phone number format
   * Accepts formats: (123) 456-7890, 123-456-7890, 1234567890, +1 123 456 7890
   * @returns Validator function
   */
  static phoneNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values (use Validators.required for that)
      }

      // Remove all non-digit characters for validation
      const cleaned = control.value.replace(/\D/g, '');
      
      // Check if it's a valid US phone number (10 or 11 digits)
      const isValid = /^1?\d{10}$/.test(cleaned);
      
      return isValid ? null : { phoneNumber: { value: control.value } };
    };
  }

  /**
   * Validates that end date is after or equal to start date
   * @param startDateField - Name of the start date field
   * @param endDateField - Name of the end date field
   * @returns Validator function for form group
   */
  static dateRange(startDateField: string, endDateField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startDate = control.get(startDateField)?.value;
      const endDate = control.get(endDateField)?.value;

      if (!startDate || !endDate) {
        return null; // Don't validate if either date is missing
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return { dateRange: { startDate, endDate } };
      }

      return null;
    };
  }

  /**
   * Validates that a number is greater than zero
   * @returns Validator function
   */
  static greaterThanZero(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null; // Don't validate empty values
      }

      const value = Number(control.value);
      
      if (isNaN(value) || value <= 0) {
        return { greaterThanZero: { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Validates that a number is greater than or equal to a minimum value
   * @param min - Minimum value
   * @returns Validator function
   */
  static minValue(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null; // Don't validate empty values
      }

      const value = Number(control.value);
      
      if (isNaN(value) || value < min) {
        return { minValue: { min, actual: value } };
      }

      return null;
    };
  }

  /**
   * Validates that a number is less than or equal to a maximum value
   * @param max - Maximum value
   * @returns Validator function
   */
  static maxValue(max: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null; // Don't validate empty values
      }

      const value = Number(control.value);
      
      if (isNaN(value) || value > max) {
        return { maxValue: { max, actual: value } };
      }

      return null;
    };
  }

  /**
   * Validates that crew size is a positive integer
   * @returns Validator function
   */
  static crewSize(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null; // Don't validate empty values
      }

      const value = Number(control.value);
      
      if (isNaN(value) || value < 1 || !Number.isInteger(value)) {
        return { crewSize: { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Validates that estimated hours is a positive number
   * @returns Validator function
   */
  static estimatedHours(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null; // Don't validate empty values
      }

      const value = Number(control.value);
      
      if (isNaN(value) || value <= 0) {
        return { estimatedHours: { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Validates that a date is not in the past
   * @returns Validator function
   */
  static futureDate(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values
      }

      const inputDate = new Date(control.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day

      if (inputDate < today) {
        return { futureDate: { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Validates that a date is not in the future
   * @returns Validator function
   */
  static pastDate(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values
      }

      const inputDate = new Date(control.value);
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Reset time to end of day

      if (inputDate > today) {
        return { pastDate: { value: control.value } };
      }

      return null;
    };
  }

  /**
   * Validates that certification expiration date is after issue date
   * @param issueDateField - Name of the issue date field
   * @param expirationDateField - Name of the expiration date field
   * @returns Validator function for form group
   */
  static certificationDates(issueDateField: string, expirationDateField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const issueDate = control.get(issueDateField)?.value;
      const expirationDate = control.get(expirationDateField)?.value;

      if (!issueDate || !expirationDate) {
        return null; // Don't validate if either date is missing
      }

      const issue = new Date(issueDate);
      const expiration = new Date(expirationDate);

      if (issue >= expiration) {
        return { certificationDates: { issueDate, expirationDate } };
      }

      return null;
    };
  }

  /**
   * Validates that at least one skill is selected
   * @returns Validator function
   */
  static requiredSkills(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;

      if (!value || (Array.isArray(value) && value.length === 0)) {
        return { requiredSkills: true };
      }

      return null;
    };
  }

  /**
   * Validates ZIP code format (US)
   * Accepts formats: 12345 or 12345-6789
   * @returns Validator function
   */
  static zipCode(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values
      }

      const isValid = /^\d{5}(-\d{4})?$/.test(control.value);
      
      return isValid ? null : { zipCode: { value: control.value } };
    };
  }

  /**
   * Validates that a string contains only alphanumeric characters and spaces
   * @returns Validator function
   */
  static alphanumeric(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value) {
        return null; // Don't validate empty values
      }

      const isValid = /^[a-zA-Z0-9\s]+$/.test(control.value);
      
      return isValid ? null : { alphanumeric: { value: control.value } };
    };
  }

  /**
   * Validates that hourly rate is within acceptable range
   * @returns Validator function
   */
  static hourlyRate(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null; // Don't validate empty values
      }

      const value = Number(control.value);
      
      // Hourly rate should be between $10 and $500
      if (isNaN(value) || value < 10 || value > 500) {
        return { hourlyRate: { value: control.value, min: 10, max: 500 } };
      }

      return null;
    };
  }

  /**
   * Validates that mileage is a non-negative number
   * @returns Validator function
   */
  static mileage(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      if (!control.value && control.value !== 0) {
        return null; // Don't validate empty values
      }

      const value = Number(control.value);
      
      if (isNaN(value) || value < 0) {
        return { mileage: { value: control.value } };
      }

      return null;
    };
  }
}
