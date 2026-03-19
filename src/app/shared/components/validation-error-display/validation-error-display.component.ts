import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Validation Error Display Component
 * 
 * Displays inline validation error messages for form fields.
 * 
 * Features:
 * - Inline field-level error messages
 * - Form-level error summaries
 * - Support for multiple errors per field
 * - Customizable styling
 * 
 * Requirements: 18.3
 */
@Component({
  selector: 'app-validation-error-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './validation-error-display.component.html',
  styleUrls: ['./validation-error-display.component.scss']
})
export class ValidationErrorDisplayComponent {
  /**
   * Validation errors to display
   * Can be a single error message or an array of error objects
   */
  @Input() errors: string | ValidationError[] | null = null;

  /**
   * Display mode: 'inline' for field-level errors, 'summary' for form-level errors
   */
  @Input() mode: 'inline' | 'summary' = 'inline';

  /**
   * Field name for inline errors (optional)
   */
  @Input() fieldName?: string;

  /**
   * Check if there are any errors to display
   */
  get hasErrors(): boolean {
    if (!this.errors) {
      return false;
    }

    if (typeof this.errors === 'string') {
      return this.errors.length > 0;
    }

    return Array.isArray(this.errors) && this.errors.length > 0;
  }

  /**
   * Get errors as an array for display
   */
  get errorList(): ValidationError[] {
    if (!this.errors) {
      return [];
    }

    if (typeof this.errors === 'string') {
      return [{ field: this.fieldName || '', message: this.errors, code: 'VALIDATION_ERROR' }];
    }

    return this.errors;
  }
}

/**
 * Validation Error interface
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity?: 'error' | 'warning';
}
