import { Injectable } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

/**
 * Validation Message Service
 * 
 * Provides user-friendly error messages for form validation errors.
 * Maps validation error keys to human-readable messages.
 * 
 * @example
 * // In component template:
 * <mat-error *ngIf="form.get('email')?.hasError('required')">
 *   {{ validationMessageService.getErrorMessage('email', form.get('email')?.errors) }}
 * </mat-error>
 */
@Injectable({
  providedIn: 'root'
})
export class ValidationMessageService {

  /**
   * Gets user-friendly error message for a form field
   * @param fieldName - Name of the field (for context in message)
   * @param errors - Validation errors object
   * @returns User-friendly error message
   */
  getErrorMessage(fieldName: string, errors: ValidationErrors | null): string {
    if (!errors) {
      return '';
    }

    // Check for each error type and return appropriate message
    if (errors['required']) {
      return this.getRequiredMessage(fieldName);
    }

    if (errors['email']) {
      return 'Please enter a valid email address';
    }

    if (errors['phoneNumber']) {
      return 'Please enter a valid phone number (e.g., 123-456-7890)';
    }

    if (errors['dateRange']) {
      return 'End date must be after or equal to start date';
    }

    if (errors['greaterThanZero']) {
      return `${this.capitalize(fieldName)} must be greater than zero`;
    }

    if (errors['minValue']) {
      return `${this.capitalize(fieldName)} must be at least ${errors['minValue'].min}`;
    }

    if (errors['maxValue']) {
      return `${this.capitalize(fieldName)} must be at most ${errors['maxValue'].max}`;
    }

    if (errors['crewSize']) {
      return 'Crew size must be a positive whole number';
    }

    if (errors['estimatedHours']) {
      return 'Estimated hours must be greater than zero';
    }

    if (errors['futureDate']) {
      return 'Date must be in the future';
    }

    if (errors['pastDate']) {
      return 'Date must be in the past';
    }

    if (errors['certificationDates']) {
      return 'Expiration date must be after issue date';
    }

    if (errors['requiredSkills']) {
      return 'At least one skill must be selected';
    }

    if (errors['zipCode']) {
      return 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)';
    }

    if (errors['alphanumeric']) {
      return `${this.capitalize(fieldName)} can only contain letters, numbers, and spaces`;
    }

    if (errors['hourlyRate']) {
      return `Hourly rate must be between $${errors['hourlyRate'].min} and $${errors['hourlyRate'].max}`;
    }

    if (errors['mileage']) {
      return 'Mileage must be a non-negative number';
    }

    if (errors['minlength']) {
      return `${this.capitalize(fieldName)} must be at least ${errors['minlength'].requiredLength} characters`;
    }

    if (errors['maxlength']) {
      return `${this.capitalize(fieldName)} must be at most ${errors['maxlength'].requiredLength} characters`;
    }

    if (errors['pattern']) {
      return `${this.capitalize(fieldName)} format is invalid`;
    }

    if (errors['min']) {
      return `${this.capitalize(fieldName)} must be at least ${errors['min'].min}`;
    }

    if (errors['max']) {
      return `${this.capitalize(fieldName)} must be at most ${errors['max'].max}`;
    }

    // Default message for unknown errors
    return `${this.capitalize(fieldName)} is invalid`;
  }

  /**
   * Gets required field message based on field name
   * @param fieldName - Name of the field
   * @returns Required field message
   */
  private getRequiredMessage(fieldName: string): string {
    // Special cases for specific field names
    const specialCases: { [key: string]: string } = {
      'email': 'Email is required',
      'phone': 'Phone number is required',
      'password': 'Password is required',
      'firstName': 'First name is required',
      'lastName': 'Last name is required',
      'client': 'Client is required',
      'siteName': 'Site name is required',
      'siteAddress': 'Site address is required',
      'jobType': 'Job type is required',
      'priority': 'Priority is required',
      'scheduledStartDate': 'Scheduled start date is required',
      'role': 'Role is required',
      'homeBase': 'Home base is required',
      'region': 'Region is required'
    };

    if (specialCases[fieldName]) {
      return specialCases[fieldName];
    }

    // Default required message
    return `${this.capitalize(fieldName)} is required`;
  }

  /**
   * Capitalizes the first letter of a string
   * @param str - String to capitalize
   * @returns Capitalized string
   */
  private capitalize(str: string): string {
    if (!str) {
      return '';
    }

    // Convert camelCase to Title Case
    const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
  }

  /**
   * Checks if a form field has any errors
   * @param errors - Validation errors object
   * @returns True if field has errors
   */
  hasError(errors: ValidationErrors | null): boolean {
    return errors !== null && Object.keys(errors).length > 0;
  }

  /**
   * Gets all error messages for a field
   * @param fieldName - Name of the field
   * @param errors - Validation errors object
   * @returns Array of error messages
   */
  getAllErrorMessages(fieldName: string, errors: ValidationErrors | null): string[] {
    if (!errors) {
      return [];
    }

    return Object.keys(errors).map(errorKey => {
      const errorObj: ValidationErrors = {};
      errorObj[errorKey] = errors[errorKey];
      return this.getErrorMessage(fieldName, errorObj);
    });
  }
}
